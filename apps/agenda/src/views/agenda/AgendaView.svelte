<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { format } from "date-fns";
  import { pb } from "../../lib/pb";
  import { loadTurns as loadCachedTurns } from "../../lib/turnsCache";
  import { computeTableAssignments } from "../../lib/tableAssignment";
  import type { Reservation, ReservationTurn, Table, TableGroup, Zone } from "../../lib/types";
  import AgendaHeader from "./AgendaHeader.svelte";
  import AgendaTable from "./AgendaTable.svelte";
  import FloorplanCanvas from "../floorplan/FloorplanCanvas.svelte";
  import { slide } from "svelte/transition";
  import { CircleAlert, WifiOff, X } from "lucide-svelte";

  const POLL_INTERVAL = 3000;
  const AUTH_REFRESH_INTERVAL = 4 * 60 * 60 * 1000; // 4 Stunden
  const STORAGE_KEY_SHOW_ARRIVED = "pulpo_agenda_show_arrived";
  const STORAGE_KEY_VIEW_MODE = "pulpo_agenda_view_mode";
  const STORAGE_KEY_DISPLAY = "pulpo_agenda_display";

  // --- URL PARAMS ---
  const urlParams = new URLSearchParams(window.location.search);

  // --- STATE ---
  let date = urlParams.get("date") || format(new Date(), "yyyy-MM-dd");
  let reservations: Reservation[] = [];
  let loading = true;
  let isRefetching = true;
  let error: string | null = null;
  let isOnline = navigator.onLine;
  let turns: ReservationTurn[] = [];
  let selectedTurn: string | null = null;
  let abortController: AbortController | null = null;
  let pollTimeout: ReturnType<typeof setTimeout> | null = null;
  let polling = false;
  let pollGeneration = 0;
  let lastAuthRefresh = Date.now();

  // Floorplan data
  let zones: Zone[] = [];
  let allTables: Table[] = [];
  let groups: TableGroup[] = [];
  let activeZoneId: string | null = null;

  // Display mode: list or floorplan
  let display: "list" | "floorplan" = "list";
  try {
    const saved = localStorage.getItem(STORAGE_KEY_DISPLAY);
    if (saved === "list" || saved === "floorplan") display = saved;
  } catch {}

  $: try { localStorage.setItem(STORAGE_KEY_DISPLAY, display); } catch {}

  // Belegungsdaten für Floorplan
  $: floorplanState = (allTables.length && reservations.length)
    ? computeTableAssignments(reservations, allTables, groups)
    : null;

  $: occupiedTableIds = (() => {
    if (!floorplanState) return new Set<string>();
    const ids = new Set<string>();
    for (const tIds of floorplanState.assignments.values()) {
      for (const tId of tIds) ids.add(tId);
    }
    return ids;
  })();

  $: occupancyLabels = (() => {
    if (!floorplanState) return new Map<string, string>();
    const labels = new Map<string, string>();
    for (const [resId, tIds] of floorplanState.assignments) {
      const res = reservations.find((r) => r.id === resId);
      if (!res) continue;
      const start = (res.time || "00:00").substring(0, 5);
      const label = `${res.name || "?"} · ${start} · ${res.person_count}p`;
      for (const tId of tIds) labels.set(tId, label);
    }
    return labels;
  })();

  $: unassignedReservations = floorplanState?.unassigned ?? [];

  $: visibleTables = activeZoneId
    ? allTables.filter((t) => t.zone === activeZoneId)
    : allTables;

  $: styledTables = visibleTables.map((t) => ({
    ...t,
    _style: {
      fill: occupiedTableIds.has(t.id) ? "var(--error-bg)" : "var(--surface)",
      stroke: occupiedTableIds.has(t.id) ? "var(--error-text)" : "var(--border-default)",
      strokeW: occupiedTableIds.has(t.id) ? "0.4" : "0.3",
      textColor: occupiedTableIds.has(t.id) ? "var(--error-text)" : "var(--fg-secondary)",
      cursor: "cursor-default",
      label: occupancyLabels.get(t.id),
    },
  }));

  // Settings with localStorage persistence
  let showArrived = true;
  try {
    const saved = localStorage.getItem(STORAGE_KEY_SHOW_ARRIVED);
    if (saved !== null) showArrived = saved === "true";
  } catch {}

  let viewMode: "all" | "tabs" = "all";
  try {
    const saved = localStorage.getItem(STORAGE_KEY_VIEW_MODE);
    if (saved === "all" || saved === "tabs") viewMode = saved;
  } catch {}

  // Persist settings on change
  $: try {
    localStorage.setItem(STORAGE_KEY_SHOW_ARRIVED, String(showArrived));
  } catch {}
  $: try {
    localStorage.setItem(STORAGE_KEY_VIEW_MODE, viewMode);
  } catch {}

  // --- TURN MATCHING ---
  function getTurnForTime(
    time: string,
    turnsList: ReservationTurn[],
  ): ReservationTurn | null {
    if (!turnsList.length || !time) return null;
    const t = time.substring(0, 5);
    const exact = turnsList.find((turn) => turn.start.substring(0, 5) === t);
    if (exact) return exact;
    const sorted = [...turnsList].sort((a, b) =>
      a.start.localeCompare(b.start),
    );
    for (let i = sorted.length - 1; i >= 0; i--) {
      if (sorted[i].start.substring(0, 5) <= t) return sorted[i];
    }
    return null;
  }

  // Filtered & sorted reservations (reactive)
  $: filteredReservations = reservations
    .filter((r) => (showArrived ? true : !r.arrived))
    .filter((r) => {
      if (viewMode !== "tabs" || selectedTurn === null) return true;
      const turn = getTurnForTime(r.time, turns);
      return turn?.id === selectedTurn;
    })
    .sort((a, b) => {
      const timeCompare = a.time.localeCompare(b.time);
      if (timeCompare !== 0) return timeCompare;
      return a.name.localeCompare(b.name);
    });

  // --- TURNS (cached) ---
  function initTurns() {
    const { cached, fresh } = loadCachedTurns();
    if (cached) turns = cached;
    fresh.then((t) => (turns = t)).catch(() => {});
  }


  // --- POLLING ---
  function startPolling() {
    if (pollTimeout) clearTimeout(pollTimeout);
    polling = true;
    pollGeneration++;
    scheduleNext();
  }

  function stopPolling() {
    polling = false;
    if (pollTimeout) {
      clearTimeout(pollTimeout);
      pollTimeout = null;
    }
  }

  function resetPolling() {
    if (!polling) return;
    pollGeneration++;
    if (pollTimeout) clearTimeout(pollTimeout);
    if (abortController) abortController.abort();
    scheduleNext();
  }

  function scheduleNext() {
    if (!polling) return;
    const gen = pollGeneration;
    pollTimeout = setTimeout(async () => {
      await fetchData(true);
      if (gen === pollGeneration) scheduleNext();
    }, POLL_INTERVAL);
  }

  // --- DATA FETCHING ---
  async function fetchData(silent = false) {
    if (!isOnline) {
      if (!silent) loading = false;
      return;
    }

    // Token periodisch erneuern (Tablet das dauerhaft offen bleibt)
    if (Date.now() - lastAuthRefresh > AUTH_REFRESH_INTERVAL) {
      try {
        await pb.collection("users").authRefresh();
        lastAuthRefresh = Date.now();
      } catch {
        // Token ungültig → Login-Seite
        window.location.href = "/login";
        return;
      }
    }

    if (abortController) abortController.abort();
    abortController = new AbortController();
    const signal = abortController.signal;

    if (!silent) loading = true;

    error = null;

    try {
      const result = await pb.collection("reservations").getFullList<Reservation>({
        filter: `date = "${date}"`,
        sort: "time,name",
        expand: "user",
        signal,
      });

      if (signal.aborted) return;
      const newData = result;

      if (JSON.stringify(newData) !== JSON.stringify(reservations)) {
        reservations = newData;
      }
    } catch (e: any) {
      if (signal.aborted) return;
      console.error(e);
      if (!navigator.onLine) isOnline = false;
      else error = "No se pudieron cargar los datos.";
    } finally {
      if (!signal.aborted) {
        loading = false;
        isRefetching = false;
      }
    }
  }

  // --- ACTIONS ---
  function setDate(newDate: string) {
    if (newDate === date) return;

    date = newDate;
    reservations = [];
    loading = true;

    const url = new URL(window.location.href);
    url.searchParams.set("date", newDate);
    window.history.pushState({}, "", url);

    fetchData();
  }

  async function toggleArrived(reservation: Reservation) {
    if (!isOnline) {
      error = "Sin conexión: no se puede realizar el cambio.";
      setTimeout(() => (error = null), 3000);
      return;
    }

    const newState = !reservation.arrived;

    // Reset polling to prevent stale data from overwriting optimistic update
    resetPolling();

    // Optimistic Update
    reservations = reservations.map((r) =>
      r.id === reservation.id ? { ...r, arrived: newState } : r,
    );

    try {
      await pb.collection("reservations").update(reservation.id, { arrived: newState });
    } catch (e) {
      // Rollback
      reservations = reservations.map((r) =>
        r.id === reservation.id ? { ...r, arrived: !newState } : r,
      );
      error = "No se pudo guardar el estado.";
      setTimeout(() => (error = null), 3000);
    }
  }

  // --- EVENT HANDLERS ---
  function handlePopState() {
    const params = new URLSearchParams(window.location.search);
    const urlDate = params.get("date");
    if (urlDate && urlDate !== date) {
      date = urlDate;
      reservations = [];
      loading = true;
      fetchData();
    }
  }

  function handleOnlineStatus() {
    isOnline = navigator.onLine;
    if (isOnline) error = null;
  }

  async function handleVisibilityChange() {
    if (document.visibilityState === "visible") {
      if (abortController) abortController.abort();

      if (!pb.authStore.isValid) {
        try {
          await pb.collection("users").authRefresh();
          lastAuthRefresh = Date.now();
        } catch {
          // Network error or invalid token — don't redirect,
          // let fetchData handle it and show error to user
        }
      }

      fetchData(true);
      startPolling();
    } else {
      stopPolling();
    }
  }

  // --- LIFECYCLE ---
  async function loadFloorplanData() {
    try {
      [zones, allTables, groups] = await Promise.all([
        pb.collection("reservations_zones").getFullList<Zone>({ sort: "sort,label" }),
        pb.collection("reservations_tables").getFullList<Table>({ sort: "label" }),
        pb.collection("reservations_table_groups").getFullList<TableGroup>({ sort: "sort,label" }),
      ]);
      if (zones.length > 0 && !activeZoneId) activeZoneId = zones[0].id;
    } catch {}
  }

  onMount(() => {
    fetchData();
    initTurns();
    loadFloorplanData();
    startPolling();

    window.addEventListener("popstate", handlePopState);
    window.addEventListener("online", handleOnlineStatus);
    window.addEventListener("offline", handleOnlineStatus);
    document.addEventListener("visibilitychange", handleVisibilityChange);
  });

  onDestroy(() => {
    stopPolling();
    abortController?.abort();

    window.removeEventListener("popstate", handlePopState);
    window.removeEventListener("online", handleOnlineStatus);
    window.removeEventListener("offline", handleOnlineStatus);
    document.removeEventListener("visibilitychange", handleVisibilityChange);
  });
</script>

<div class="flex flex-col h-full animate-fade-in">
  <!-- Sticky Header Section -->
  <div
    class="shrink-0 bg-surface px-3 md:px-8 pt-4 md:pt-8 pb-3 md:pb-4 space-y-3 md:space-y-4"
  >
    <AgendaHeader
      dateStr={date}
      onDateChange={(newDate) => setDate(newDate)}
      {showArrived}
      {isRefetching}
      {display}
      onToggleFilter={() => (showArrived = !showArrived)}
      onToggleDisplay={() => (display = display === "list" ? "floorplan" : "list")}
    />

    {#if !isOnline}
      <div
        transition:slide={{ axis: "y", duration: 300 }}
        class="rounded-md border border-warning-border bg-warning-bg p-4 flex items-center gap-3 shadow-sm max-w-7xl mx-auto"
        role="alert"
      >
        <div class="bg-warning-icon-bg p-2 rounded-full text-warning-icon">
          <WifiOff size={18} />
        </div>
        <div class="flex-1">
          <h3 class="text-sm font-semibold text-warning-text">
            Sin conexión a Internet
          </h3>
          <p class="text-sm text-warning-text/80 leading-snug">
            La agenda está en modo sin conexión. Los cambios no se guardarán. La
            conexión se restablecerá automáticamente.
          </p>
        </div>
      </div>
    {/if}

    {#if error}
      <div
        transition:slide={{ axis: "y", duration: 300 }}
        class="rounded-md border border-error-border bg-error-bg p-4 flex items-start gap-3 shadow-sm backdrop-blur-sm max-w-7xl mx-auto"
      >
        <CircleAlert size={20} class="text-error-icon shrink-0 mt-0.5" />
        <div class="flex-1">
          <h3 class="text-sm font-medium text-error-text">Aviso</h3>
          <p class="text-sm text-error-text/90 mt-0.5 leading-relaxed">
            {error}
          </p>
        </div>

        <button
          on:click={() => (error = null)}
          class="text-error-text hover:text-error-icon transition-colors p-1"
          aria-label="Cerrar"
        >
          <X size={16} />
        </button>
      </div>
    {/if}
  </div>

  <!-- Content -->
  {#if display === "list"}
    <div class="flex-1 min-h-0 px-0 md:px-8 pb-0 md:pb-4">
      <AgendaTable
        reservations={filteredReservations}
        {loading}
        {isRefetching}
        {showArrived}
        dateStr={date}
        {turns}
        {viewMode}
        {selectedTurn}
        onSelectTurn={(turnId) => (selectedTurn = turnId)}
        onToggleViewMode={() => (viewMode = viewMode === "all" ? "tabs" : "all")}
        onToggleFilter={() => (showArrived = !showArrived)}
        onToggleArrived={(res) => toggleArrived(res)}
      />
    </div>
  {:else}
    <!-- Zone Tabs -->
    {#if zones.length > 1}
      <div class="shrink-0 flex items-center gap-1.5 px-3 md:px-8 py-2 bg-surface border-b border-border-default overflow-x-auto no-scrollbar">
        {#each zones as zone (zone.id)}
          <button
            on:click={() => (activeZoneId = zone.id)}
            class="shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors {activeZoneId === zone.id
              ? 'bg-primary text-white'
              : 'bg-surface-alt text-fg-muted hover:text-fg-secondary hover:bg-surface-hover'}"
          >
            {zone.label}
          </button>
        {/each}
      </div>
    {/if}

    <!-- Floorplan -->
    <div class="flex-1 min-h-0 p-2 md:p-4">
      <div class="w-full h-full relative">
        <FloorplanCanvas
          tables={styledTables}
          occupancyMode={true}
          onStartDrag={() => {}}
          onDrag={() => {}}
          onEndDrag={() => {}}
          onSelectTable={() => {}}
        >
          <svelte:fragment slot="empty">
            <p class="font-serif text-lg mb-1">Sin mesas</p>
            <p class="text-sm">Configura el plano en la sección de edición</p>
          </svelte:fragment>
        </FloorplanCanvas>

        {#if unassignedReservations.length > 0}
          <div class="absolute bottom-3 left-3 right-3 p-3 bg-error-bg border border-error-border rounded-lg shadow-sm">
            <p class="text-xs font-medium text-error-text mb-1">
              {unassignedReservations.length} reserva{unassignedReservations.length > 1 ? "s" : ""} sin mesa disponible:
            </p>
            <div class="space-y-0.5">
              {#each unassignedReservations as res}
                <p class="text-[11px] text-error-text/80">
                  {res.name || "?"} · {res.time?.substring(0, 5)} · {res.person_count}p
                </p>
              {/each}
            </div>
          </div>
        {/if}

      </div>
    </div>
  {/if}
</div>
