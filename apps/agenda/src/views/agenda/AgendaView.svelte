<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { format } from "date-fns";
  import { directus, isTokenExpired } from "../../lib/directus";
  import { readItems, updateItem, withOptions } from "@directus/sdk";
  import {
    loadTurns as loadCachedTurns,
    fetchTurns,
    invalidateTurns,
  } from "../../lib/turnsCache";
  import type { Reservation, ReservationTurn } from "../../lib/types";
  import AgendaHeader from "./AgendaHeader.svelte";
  import AgendaTable from "./AgendaTable.svelte";
  import { slide } from "svelte/transition";
  import { CircleAlert, WifiOff, X } from "lucide-svelte";

  const POLL_INTERVAL = 3000;
  const STORAGE_KEY_SHOW_ARRIVED = "pulpo_agenda_show_arrived";
  const STORAGE_KEY_VIEW_MODE = "pulpo_agenda_view_mode";

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
    if (cached) {
      turns = cached;
    } else if (fresh) {
      fresh.then((t) => (turns = t)).catch(() => {});
    }
  }

  function refreshTurns() {
    invalidateTurns();
    fetchTurns()
      .then((t) => (turns = t))
      .catch(() => {});
  }

  // --- POLLING ---
  function startPolling() {
    polling = true;
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

    if (abortController) abortController.abort();
    abortController = new AbortController();
    const signal = abortController.signal;

    if (!silent) loading = true;

    error = null;

    try {
      const result = await directus.request(
        withOptions(
          readItems("reservations", {
            filter: { date: { _eq: date } },
            sort: ["time", "name"],
            fields: ["*", "user.*", "user.avatar.*"],
          }),
          { signal },
        ),
      );

      if (signal.aborted) return;
      const newData = result as Reservation[];

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
      await directus.request(
        updateItem("reservations", reservation.id, { arrived: newState }),
      );
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

      if (isTokenExpired()) {
        try {
          await directus.refresh();
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
  onMount(() => {
    fetchData();
    initTurns();
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
      onToggleFilter={() => (showArrived = !showArrived)}
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

  <!-- Scrollable Table Section -->
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
      onRefreshTurns={refreshTurns}
      onToggleFilter={() => (showArrived = !showArrived)}
      onToggleArrived={(res) => toggleArrived(res)}
    />
  </div>
</div>
