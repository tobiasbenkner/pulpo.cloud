<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { writable, derived, get } from "svelte/store";
  import { format } from "date-fns";
  import { directus } from "../../lib/directus";
  import { readItems, updateItem } from "@directus/sdk";
  import { useDirectusRealtime } from "../../hooks/useDirectusRealtime";
  import type { Reservation } from "../../lib/types";
  import AgendaHeader from "./AgendaHeader.svelte";
  import AgendaTable from "./AgendaTable.svelte";
  import { slide } from "svelte/transition";
  import { CircleAlert, WifiOff, X } from "lucide-svelte";

  // --- CONSTANTS ---
  const STORAGE_KEY_SHOW_ARRIVED = "pulpo_agenda_show_arrived";

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

  // Settings Store mit LocalStorage Persistenz
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

  // Derived Store für gefilterte & sortierte Reservierungen
  const filteredReservations = derived(
    [reservations, showArrived],
    ([$reservations, $showArrived]) => {
      return $reservations
        .filter((r) => ($showArrived ? true : !r.arrived))
        .sort((a, b) => {
          const timeCompare = a.time.localeCompare(b.time);
          if (timeCompare !== 0) return timeCompare;
          return a.name.localeCompare(b.name);
        });
    }
  );

  // --- INTERNAL STATE ---
  let abortController: AbortController | null = null;
  let refetchDebounceTimer: ReturnType<typeof setTimeout>;

  // --- REALTIME HOOK ---
  const realtime = useDirectusRealtime<Reservation>({
    collection: "reservations",
    query: {
      filter: { date: { _eq: get(date) } },
    },
    onMessage: (message) => {
      // Bei jeder Realtime-Nachricht: Daten neu laden (debounced)
      if (message.event === "create" || message.event === "update" || message.event === "delete") {
        clearTimeout(refetchDebounceTimer);
        refetchDebounceTimer = setTimeout(() => fetchData(true), 300);
      }
    },
    onConnect: () => {
      console.log("[Agenda] Realtime verbunden");
      // Sync Gap Fix: Nach Verbindung sofort Daten aktualisieren
      fetchData(true);
    },
    onDisconnect: () => {
      console.log("[Agenda] Realtime getrennt");
    },
    onError: (err) => {
      console.error("[Agenda] Realtime Fehler:", err);
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
          fields: ["*", "user_created.*", "user_created.avatar.*"],
        })
      );

      if (signal.aborted) return;

      reservations.set(result as Reservation[]);
    } catch (e: any) {
      if (signal.aborted) return;

      console.error(e);
      if (!navigator.onLine) isOnline.set(false);
      else error.set("Daten konnten nicht geladen werden.");
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

    // Realtime mit neuem Filter neu verbinden
    realtime.setQuery({ filter: { date: { _eq: newDate } } });
    realtime.reconnect();
  }

  async function toggleArrived(reservation: Reservation) {
    if (!get(isOnline)) {
      error.set("Offline: Änderung nicht möglich.");
      setTimeout(() => error.set(null), 3000);
      return;
    }

    const newState = !reservation.arrived;

    // Optimistic Update
    reservations.update((all) =>
      all.map((r) =>
        r.id === reservation.id ? { ...r, arrived: newState } : r
      )
    );

    try {
      await directus.request(
        updateItem("reservations", reservation.id, { arrived: newState })
      );
    } catch (e) {
      // Rollback bei Fehler
      reservations.update((all) =>
        all.map((r) =>
          r.id === reservation.id ? { ...r, arrived: !newState } : r
        )
      );
      error.set("Status konnte nicht gespeichert werden.");
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
      fetchData(true);
    }
  }

  // --- LIFECYCLE ---
  onMount(() => {
    // Initial fetch
    fetchData();

    // Browser Events
    window.addEventListener("popstate", handlePopState);
    window.addEventListener("online", handleOnlineStatus);
    window.addEventListener("offline", handleOnlineStatus);
  });

  onDestroy(() => {
    if (abortController) abortController.abort();
    clearTimeout(refetchDebounceTimer);
    unsubShowArrived();

    window.removeEventListener("popstate", handlePopState);
    window.removeEventListener("online", handleOnlineStatus);
    window.removeEventListener("offline", handleOnlineStatus);
  });
</script>

<div class="flex flex-col h-full animate-fade-in">
  <!-- Sticky Header Section -->
  <div class="shrink-0 bg-white px-4 md:px-8 pt-8 pb-4 space-y-4">
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
        class="rounded-md border border-amber-200 bg-amber-50 p-4 flex items-center gap-3 shadow-sm max-w-7xl mx-auto"
        role="alert"
      >
        <div class="bg-amber-100 p-2 rounded-full text-amber-600">
          <WifiOff size={18} />
        </div>
        <div class="flex-1">
          <h3 class="text-sm font-semibold text-amber-900">
            Sin conexión a Internet
          </h3>
          <p class="text-sm text-amber-800/80 leading-snug">
            La agenda está en modo sin conexión. Los cambios no se guardarán. La
            conexión se restablecerá automáticamente.
          </p>
        </div>
      </div>
    {/if}

    {#if $error}
      <div
        transition:slide={{ axis: "y", duration: 300 }}
        class="rounded-md border border-red-100 bg-red-50/80 p-4 flex items-start gap-3 shadow-sm backdrop-blur-sm max-w-7xl mx-auto"
      >
        <CircleAlert size={20} class="text-red-800 shrink-0 mt-0.5" />
        <div class="flex-1">
          <h3 class="text-sm font-medium text-red-900">Hinweis</h3>
          <p class="text-sm text-red-800/90 mt-0.5 leading-relaxed">
            {$error}
          </p>
        </div>

        <button
          on:click={() => ($error = null)}
          class="text-red-700 hover:text-red-900 transition-colors p-1"
          aria-label="Schließen"
        >
          <X size={16} />
        </button>
      </div>
    {/if}
  </div>

  <!-- Scrollable Table Section -->
  <div class="flex-1 min-h-0 px-4 md:px-8 pb-4">
    <AgendaTable
      reservations={$filteredReservations}
      loading={$loading}
      isRefetching={$isRefetching}
      showArrived={$showArrived}
      dateStr={$date}
      onToggleFilter={() => ($showArrived = !$showArrived)}
      onToggleArrived={(res) => toggleArrived(res)}
    />
  </div>
</div>
