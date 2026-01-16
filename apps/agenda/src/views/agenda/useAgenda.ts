import { writable, derived, get } from "svelte/store";
import { directus } from "../../lib/directus";
import { readItems, updateItem } from "@directus/sdk";
import type { Reservation } from "../../lib/types";

const STORAGE_KEY_SHOW_ARRIVED = "pulpo_agenda_show_arrived";

export function useAgenda(initialDate: string) {
  // --- STORES ---
  const date = writable(initialDate);
  const reservations = writable<Reservation[]>([]);
  const loading = writable(false);
  const isRefetching = writable(false);
  const error = writable<string | null>(null);
  const isOnline = writable(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );

  // Settings Store (mit LocalStorage Persistenz)
  const showArrived = writable(true);

  if (typeof window !== "undefined") {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SHOW_ARRIVED);
      if (saved !== null) showArrived.set(saved === "true");
    } catch (e) {
      console.warn("LocalStorage nicht verfügbar", e);
    }

    showArrived.subscribe((val) => {
      try {
        localStorage.setItem(STORAGE_KEY_SHOW_ARRIVED, String(val));
      } catch (e) {}
    });
  }

  // Derived Store (Filterung & Sortierung)
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
  let unsubscribeRealtime: (() => void) | null = null;

  // Timers für Debouncing
  let realtimeDebounceTimer: ReturnType<typeof setTimeout>;
  let refetchDebounceTimer: ReturnType<typeof setTimeout>;

  // --- 1. CORE: DATA FETCHING (REST) ---
  async function fetchData(silent = false) {
    // Offline Guard
    if (!get(isOnline)) {
      if (!silent) loading.set(false);
      return;
    }

    const currentDate = get(date);

    // A) Race Condition Prevention:
    // Breche vorherige, noch laufende Requests ab.
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

      // B) Logical Cancellation:
      // Wenn der User in der Zwischenzeit das Datum gewechselt hat (signal.aborted),
      // ignorieren wir die ankommenden Daten komplett.
      if (signal.aborted) return;

      reservations.set(result as Reservation[]);
    } catch (e: any) {
      // Fehler von abgebrochenen Requests ignorieren wir
      if (signal.aborted) return;

      console.error(e);
      // Netz-Check, falls Browser-Event versagt hat
      if (!navigator.onLine) isOnline.set(false);
      else error.set("Daten konnten nicht geladen werden.");
    } finally {
      // Loading State nur zurücksetzen, wenn wir der "aktuelle" Request sind
      if (!signal.aborted) {
        loading.set(false);
        isRefetching.set(false);
      }
    }
  }

  // --- 2. CORE: REALTIME (WEBSOCKETS) ---
  async function initRealtime() {
    // A) Cleanup alter Subscriptions
    if (unsubscribeRealtime) {
      try {
        unsubscribeRealtime();
      } catch (e) {}
      unsubscribeRealtime = null;
    }

    // B) Offline Guard
    if (!get(isOnline)) return;

    const targetDate = get(date);

    try {
      const { subscription, unsubscribe } = await directus.subscribe(
        "reservations",
        {
          query: { filter: { date: { _eq: targetDate } } },
        }
      );

      // C) Race Guard:
      // Hat der User während des Verbindungsaufbaus schon wieder geklickt?
      if (get(date) !== targetDate) {
        unsubscribe();
        return;
      }

      unsubscribeRealtime = unsubscribe;

      // D) SYNC GAP FIX:
      // Wir holen sofort nochmal die allerneuesten Daten per REST.
      // Damit fangen wir Events ab, die während des 500ms Debounce-Timers passiert sind.
      fetchData(true);

      for await (const _ of subscription) {
        // E) Update Debounce:
        // Bei Massen-Updates (10 Events gleichzeitig) fetchen wir nur 1x am Ende.
        clearTimeout(refetchDebounceTimer);
        refetchDebounceTimer = setTimeout(() => fetchData(true), 300);
      }
    } catch (e) {
      console.warn("Realtime Verbindung fehlgeschlagen", e);
    }
  }

  // Wrapper: Verzögert den Socket-Aufbau beim schnellen Klicken
  function scheduleRealtime() {
    clearTimeout(realtimeDebounceTimer);
    // 500ms Ruhezeit abwarten, bevor teurer Handshake startet
    realtimeDebounceTimer = setTimeout(() => {
      initRealtime();
    }, 500);
  }

  // --- 3. ACTIONS & UI LOGIC ---

  // Soft Navigation (Kein Page Reload)
  function setDate(newDate: string) {
    if (newDate === get(date)) return;

    // State sofort ändern
    date.set(newDate);

    // Tabelle leeren ("Ghost Data" vermeiden) & Loading anzeigen
    reservations.set([]);
    loading.set(true);

    // URL im Browser ändern (für History/Back-Button)
    const url = new URL(window.location.href);
    url.searchParams.set("date", newDate);
    window.history.pushState({}, "", url);
  }

  // Toggle Status Logic
  async function toggleArrived(reservation: Reservation) {
    if (!get(isOnline)) {
      error.set("Offline: Änderung nicht möglich.");
      setTimeout(() => error.set(null), 3000);
      return;
    }

    const newState = !reservation.arrived;

    // Optimistic Update (UI sofort ändern)
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

  // --- 4. EVENT HANDLERS ---

  function handleVisibilityChange() {
    // Wenn User zurück zum Tab kommt -> Alles auffrischen
    if (document.visibilityState === "visible" && get(isOnline)) {
      fetchData(true);
      scheduleRealtime();
    }
  }

  function handleOnlineStatus() {
    const online = navigator.onLine;
    isOnline.set(online);

    if (online) {
      // "Recover": Verbindung war weg, jetzt wieder da -> Syncen!
      error.set(null);
      fetchData(true);
      scheduleRealtime();
    }
  }

  function handlePopState() {
    // Browser Back-Button gedrückt? Store synchronisieren.
    const urlParams = new URLSearchParams(window.location.search);
    const urlDate = urlParams.get("date");
    if (urlDate && urlDate !== get(date)) {
      date.set(urlDate);
      // setDate logic manuell triggern für clean state
      reservations.set([]);
      loading.set(true);
    }
  }

  // --- 5. LIFECYCLE ---

  function init() {
    // Wenn sich das Datum ändert (durch Klick oder Back-Button):
    // 1. REST Fetch starten (cancelt alte Requests autom.)
    // 2. Realtime verzögert starten (debounce)
    const unsubDate = date.subscribe(() => {
      fetchData();
      scheduleRealtime();
    });

    if (typeof window !== "undefined") {
      document.addEventListener("visibilitychange", handleVisibilityChange);
      window.addEventListener("online", handleOnlineStatus);
      window.addEventListener("offline", handleOnlineStatus);
      window.addEventListener("popstate", handlePopState);
    }

    // Cleanup Funktion zurückgeben
    return () => {
      unsubDate();
      cleanup();
    };
  }

  function cleanup() {
    if (abortController) abortController.abort();
    if (unsubscribeRealtime) unsubscribeRealtime();
    clearTimeout(realtimeDebounceTimer);
    clearTimeout(refetchDebounceTimer);

    if (typeof window !== "undefined") {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("online", handleOnlineStatus);
      window.removeEventListener("offline", handleOnlineStatus);
      window.removeEventListener("popstate", handlePopState);
    }
  }

  return {
    // Read-only Stores für UI
    date: { subscribe: date.subscribe },
    reservations: { subscribe: reservations.subscribe },
    filteredReservations,
    loading: { subscribe: loading.subscribe },
    isRefetching: { subscribe: isRefetching.subscribe },
    error: { subscribe: error.subscribe },
    isOnline: { subscribe: isOnline.subscribe },

    // Writable Store für Two-Way Binding (falls nötig, hier Toggle)
    showArrived,

    // Methods
    setDate,
    toggleArrived,

    // Lifecycle
    init,
    cleanup,
  };
}
