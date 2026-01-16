import { writable, derived, get } from "svelte/store";
import { directus } from "../../lib/directus";
import { readItems, updateItem } from "@directus/sdk";
import type { Reservation } from "../../lib/types";

const STORAGE_KEY_SHOW_ARRIVED = "pulpo_agenda_show_arrived";

export function useAgenda(initialDate: string) {
  // --- Stores ---
  const date = writable(initialDate);
  const reservations = writable<Reservation[]>([]);
  const loading = writable(true);
  const isRefetching = writable(false);
  const error = writable<string | null>(null);
  
  const isOnline = writable(typeof navigator !== "undefined" ? navigator.onLine : true);

  // Settings
  const showArrived = writable(true);
  if (typeof window !== "undefined") {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SHOW_ARRIVED);
      if (saved !== null) showArrived.set(saved === "true");
    } catch (e) {}
    showArrived.subscribe((val) => {
      try { localStorage.setItem(STORAGE_KEY_SHOW_ARRIVED, String(val)); } catch (e) {}
    });
  }

  // Derived
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

  // Internal
  let abortController: AbortController | null = null;
  let debounceTimer: ReturnType<typeof setTimeout>;
  let unsubscribeRealtime: (() => void) | null = null;

  // --- Actions ---

  async function fetchData(silent = false) {
    // Wenn wir wissen, dass wir offline sind, gar nicht erst versuchen
    if (!get(isOnline)) {
        if (!silent) loading.set(false);
        return; 
    }

    const currentDate = get(date);
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
      console.error("API Error:", e);
      // Unterscheidung: Ist es ein Netzwerkfehler?
      if (!navigator.onLine) {
         isOnline.set(false); // Fallback, falls Event nicht gefeuert hat
      } else {
         error.set("Verbindungsfehler: Daten konnten nicht geladen werden.");
      }
    } finally {
      if (!signal.aborted) {
        loading.set(false);
        isRefetching.set(false);
      }
    }
  }

  function debouncedRefetch() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => fetchData(true), 300);
  }

  async function toggleArrived(reservation: Reservation) {
    // Guard: Keine Aktionen wenn offline
    if (!get(isOnline)) {
        error.set("Sie sind offline. Änderungen werden nicht gespeichert.");
        setTimeout(() => error.set(null), 3000);
        return;
    }

    const newState = !reservation.arrived;
    reservations.update((all) =>
      all.map((r) => (r.id === reservation.id ? { ...r, arrived: newState } : r))
    );

    try {
      await directus.request(
        updateItem("reservations", reservation.id, { arrived: newState })
      );
    } catch (e) {
      reservations.update((all) =>
        all.map((r) => (r.id === reservation.id ? { ...r, arrived: !newState } : r))
      );
      error.set("Status konnte nicht gespeichert werden.");
      setTimeout(() => error.set(null), 3000);
    }
  }

  // --- Connectivity Management ---

  async function initRealtime() {
    if (unsubscribeRealtime) {
        try { unsubscribeRealtime(); } catch(e) {}
        unsubscribeRealtime = null;
    }

    // Offline? Kein Socket aufbauen.
    if (!get(isOnline)) return;

    const currentDate = get(date);
    try {
      const { subscription, unsubscribe } = await directus.subscribe("reservations", {
        query: { filter: { date: { _eq: currentDate } } },
      });
      unsubscribeRealtime = unsubscribe;
      for await (const _ of subscription) {
        debouncedRefetch();
      }
    } catch (e) {
      console.warn("Realtime failed", e);
    }
  }

  function handleVisibilityChange() {
    if (document.visibilityState === "visible" && get(isOnline)) {
      fetchData(true);
      initRealtime();
    }
  }

  // Netz-Status Handler
  function handleOnlineStatus() {
    const online = navigator.onLine;
    isOnline.set(online);

    if (online) {
        console.log("Verbindung wiederhergestellt.");
        error.set(null); // Alte Fehler löschen
        fetchData(true); // Sofort Syncen
        initRealtime();  // Socket neu verbinden
    } else {
        console.log("Verbindung verloren.");
        // Optional: Socket schließen um Ressourcen zu sparen, 
        // passiert aber meist eh durch Browser
    }
  }

  // --- Lifecycle ---
  
  function init() {
    // Initial Check
    if (typeof navigator !== "undefined") isOnline.set(navigator.onLine);

    fetchData();
    initRealtime();

    if (typeof window !== "undefined") {
      document.addEventListener("visibilitychange", handleVisibilityChange);
      window.addEventListener("online", handleOnlineStatus);
      window.addEventListener("offline", handleOnlineStatus);
    }
  }

  function cleanup() {
    if (abortController) abortController.abort();
    if (unsubscribeRealtime) unsubscribeRealtime();
    clearTimeout(debounceTimer);
    if (typeof window !== "undefined") {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("online", handleOnlineStatus);
      window.removeEventListener("offline", handleOnlineStatus);
    }
  }

  return {
    date,
    reservations: { subscribe: reservations.subscribe },
    filteredReservations,
    loading: { subscribe: loading.subscribe },
    isRefetching: { subscribe: isRefetching.subscribe },
    error: { subscribe: error.subscribe },
    isOnline: { subscribe: isOnline.subscribe },
    showArrived,
    fetchData,
    toggleArrived,
    init,
    cleanup
  };
}