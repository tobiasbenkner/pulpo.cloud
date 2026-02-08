<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { writable, derived, get } from "svelte/store";
  import { format } from "date-fns";
  import { directus } from "../../lib/directus";
  import { readItems, updateItem } from "@directus/sdk";
  import { useDirectusRealtime, SessionExpiredError } from "../../hooks/useDirectusRealtime";
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

  // --- CONSTANTS ---
  const STORAGE_KEY_SHOW_ARRIVED = "pulpo_agenda_show_arrived";
  const STORAGE_KEY_VIEW_MODE = "pulpo_agenda_view_mode";

  // --- URL PARAMS ---
  const urlParams = new URLSearchParams(window.location.search);
  const initialDate = urlParams.get("date") || format(new Date(), "yyyy-MM-dd");

  // --- STORES ---
  const date = writable(initialDate);
  const reservations = writable<Reservation[]>([]);
  const loading = writable(true);
  const isRefetching = writable(false);
  const error = writable<string | null>(null);
  const isOnline = writable(navigator.onLine);

  // Settings Stores mit LocalStorage Persistenz
  const showArrived = writable(true);
  try {
    const saved = localStorage.getItem(STORAGE_KEY_SHOW_ARRIVED);
    if (saved !== null) showArrived.set(saved === "true");
  } catch (e) {
    console.warn("LocalStorage nicht verfügbar", e);
  }
  const unsubShowArrived = showArrived.subscribe((val) => {
    try {
      localStorage.setItem(STORAGE_KEY_SHOW_ARRIVED, String(val));
    } catch (e) {}
  });

  // View Mode: "all" (flat list) oder "tabs" (grouped by turn)
  const viewMode = writable<"all" | "tabs">("all");
  try {
    const saved = localStorage.getItem(STORAGE_KEY_VIEW_MODE);
    if (saved === "all" || saved === "tabs") viewMode.set(saved);
  } catch (e) {}
  const unsubViewMode = viewMode.subscribe((val) => {
    try {
      localStorage.setItem(STORAGE_KEY_VIEW_MODE, val);
    } catch (e) {}
  });

  // Selected turn for tab filtering (not persisted)
  const selectedTurn = writable<string | null>(null);

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

  // Derived Store für gefilterte & sortierte Reservierungen
  const filteredReservations = derived(
    [reservations, showArrived, viewMode, selectedTurn],
    ([$reservations, $showArrived, $viewMode, $selectedTurn]) => {
      return $reservations
        .filter((r) => ($showArrived ? true : !r.arrived))
        .filter((r) => {
          if ($viewMode !== "tabs" || $selectedTurn === null) return true;
          const turn = getTurnForTime(r.time, turns);
          return turn?.id === $selectedTurn;
        })
        .sort((a, b) => {
          const timeCompare = a.time.localeCompare(b.time);
          if (timeCompare !== 0) return timeCompare;
          return a.name.localeCompare(b.name);
        });
    },
  );

  // --- INTERNAL STATE ---
  let abortController: AbortController | null = null;
  let turns: ReservationTurn[] = [];

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

  // --- REALTIME HOOK ---
  const realtime = useDirectusRealtime<Reservation>({
    collection: "reservations",
    query: {
      // Nur IDs im init-Event laden — die echten Daten kommen per REST
      fields: ["id"],
      limit: 1,
    },
    onMessage: (message) => {
      if (!message.event || !message.data) {
        return;
      }

      if (
        message.event !== "create" &&
        message.event !== "update" &&
        message.event !== "delete"
      ) {
        return;
      }

      const items = Array.isArray(message.data) ? message.data : [message.data];
      const currentDate = get(date);
      const currentReservations = get(reservations);

      console.log("[Agenda] Event:", message.event, "Items:", items);

      const isRelevant = items.some((item) => {
        if (!item) return false;
        const isDelete = message.event === "delete";

        const itemId = isDelete ? item : item.id;
        const itemDate = isDelete ? null : item.date;

        const wasInList = currentReservations.some((r) => r.id === itemId);
        const matchesDate = itemDate === currentDate;

        return matchesDate || wasInList;
      });

      if (isRelevant) {
        fetchData(true);
      }
    },
    onConnect: () => {
      console.log("[Agenda] Realtime verbunden");
    },
    onDisconnect: () => {
      console.log("[Agenda] Realtime getrennt");
    },
    onError: (err) => {
      console.error("[Agenda] Realtime Fehler:", err);
      if (err instanceof SessionExpiredError) {
        window.location.href = "/login";
      }
    },
    onResume: () => {
      // Daten synchronisieren bei: Tab-Rückkehr, Internet zurück
      fetchData(true);
    },
    autoReconnect: true,
    reconnectInterval: 2000,
    maxReconnectAttempts: 20,
  });

  // Realtime State Store extrahieren
  const realtimeState = realtime.state;

  // Verbindungsstatus aus Realtime-State ableiten
  $: if (!$realtimeState.connected && $realtimeState.error) {
    // Nur Offline setzen wenn es ein Netzwerkproblem ist
    if (!navigator.onLine) {
      isOnline.set(false);
    }
  }

  // --- DATA FETCHING (REST) ---
  async function fetchData(silent = false) {
    if (!get(isOnline)) {
      if (!silent) loading.set(false);
      return;
    }

    const currentDate = get(date);

    // Race Condition Prevention
    if (abortController) abortController.abort();
    abortController = new AbortController();
    const signal = abortController.signal;

    if (!silent) loading.set(true);
    else isRefetching.set(true);

    error.set(null);

    try {
      const result = await directus.request(
        readItems("reservations", {
          filter: { date: { _eq: currentDate } },
          sort: ["time", "name"],
          fields: ["*", "user.*", "user.avatar.*"],
        }),
      );

      if (signal.aborted) return;

      reservations.set(result as Reservation[]);
    } catch (e: any) {
      if (signal.aborted) return;

      console.error(e);
      if (!navigator.onLine) isOnline.set(false);
      else error.set("No se pudieron cargar los datos.");
    } finally {
      if (!signal.aborted) {
        loading.set(false);
        isRefetching.set(false);
      }
    }
  }

  // --- ACTIONS ---
  function setDate(newDate: string) {
    if (newDate === get(date)) return;

    date.set(newDate);
    reservations.set([]);
    loading.set(true);

    // URL im Browser ändern
    const url = new URL(window.location.href);
    url.searchParams.set("date", newDate);
    window.history.pushState({}, "", url);

    // Daten für neues Datum laden
    fetchData();
  }

  async function toggleArrived(reservation: Reservation) {
    if (!get(isOnline)) {
      error.set("Sin conexión: no se puede realizar el cambio.");
      setTimeout(() => error.set(null), 3000);
      return;
    }

    const newState = !reservation.arrived;

    // Optimistic Update
    reservations.update((all) =>
      all.map((r) =>
        r.id === reservation.id ? { ...r, arrived: newState } : r,
      ),
    );

    try {
      await directus.request(
        updateItem("reservations", reservation.id, { arrived: newState }),
      );
    } catch (e) {
      // Rollback bei Fehler
      reservations.update((all) =>
        all.map((r) =>
          r.id === reservation.id ? { ...r, arrived: !newState } : r,
        ),
      );
      error.set("No se pudo guardar el estado.");
      setTimeout(() => error.set(null), 3000);
    }
  }

  // --- EVENT HANDLERS ---
  function handlePopState() {
    const urlParams = new URLSearchParams(window.location.search);
    const urlDate = urlParams.get("date");
    if (urlDate && urlDate !== get(date)) {
      date.set(urlDate);
      reservations.set([]);
      loading.set(true);
      fetchData();
    }
  }

  function handleOnlineStatus() {
    const online = navigator.onLine;
    isOnline.set(online);
    if (online) {
      error.set(null);
    }
  }

  // --- LIFECYCLE ---
  onMount(() => {
    // Initial fetch
    fetchData();

    // Turns laden (mit localStorage Cache)
    initTurns();

    // Browser Events (popstate für URL-History, online/offline für UI-State)
    // Visibility und Reconnect-Fetches werden vom Hook via onResume gehandhabt
    window.addEventListener("popstate", handlePopState);
    window.addEventListener("online", handleOnlineStatus);
    window.addEventListener("offline", handleOnlineStatus);
  });

  onDestroy(() => {
    if (abortController) abortController.abort();
    unsubShowArrived();
    unsubViewMode();

    window.removeEventListener("popstate", handlePopState);
    window.removeEventListener("online", handleOnlineStatus);
    window.removeEventListener("offline", handleOnlineStatus);
  });
</script>

<div class="flex flex-col h-full animate-fade-in">
  <!-- Sticky Header Section -->
  <div
    class="shrink-0 bg-surface px-3 md:px-8 pt-4 md:pt-8 pb-3 md:pb-4 space-y-3 md:space-y-4"
  >
    <AgendaHeader
      dateStr={$date}
      onDateChange={(newDate) => setDate(newDate)}
      showArrived={$showArrived}
      isRefetching={$isRefetching}
      onToggleFilter={() => ($showArrived = !$showArrived)}
    />

    {#if !$isOnline}
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

    {#if $error}
      <div
        transition:slide={{ axis: "y", duration: 300 }}
        class="rounded-md border border-error-border bg-error-bg p-4 flex items-start gap-3 shadow-sm backdrop-blur-sm max-w-7xl mx-auto"
      >
        <CircleAlert size={20} class="text-error-icon shrink-0 mt-0.5" />
        <div class="flex-1">
          <h3 class="text-sm font-medium text-error-text">Aviso</h3>
          <p class="text-sm text-error-text/90 mt-0.5 leading-relaxed">
            {$error}
          </p>
        </div>

        <button
          on:click={() => ($error = null)}
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
      reservations={$filteredReservations}
      loading={$loading}
      isRefetching={$isRefetching}
      showArrived={$showArrived}
      dateStr={$date}
      {turns}
      viewMode={$viewMode}
      selectedTurn={$selectedTurn}
      onSelectTurn={(turnId) => ($selectedTurn = turnId)}
      onToggleViewMode={() =>
        ($viewMode = $viewMode === "all" ? "tabs" : "all")}
      onRefreshTurns={refreshTurns}
      onToggleFilter={() => ($showArrived = !$showArrived)}
      onToggleArrived={(res) => toggleArrived(res)}
    />
  </div>
</div>
