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

  // Settings Store mit LocalStorage Init
  const showArrived = writable(true);

  if (typeof window !== "undefined") {
    const saved = localStorage.getItem(STORAGE_KEY_SHOW_ARRIVED);
    if (saved !== null) showArrived.set(saved === "true");

    // Subscribe to changes to save to LocalStorage
    showArrived.subscribe((val) => {
      localStorage.setItem(STORAGE_KEY_SHOW_ARRIVED, String(val));
    });
  }

  // --- Derived Store (Filter & Sort) ---
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

  // --- Actions ---

  async function fetchData(silent = false) {
    const currentDate = get(date);
    if (!silent) loading.set(true);
    else isRefetching.set(true);

    try {
      const result = await directus.request(
        readItems("reservations", {
          filter: { date: { _eq: currentDate } },
          sort: ["time", "name"],
          fields: ["*", "user_created.*", "user_created.avatar.*"],
        })
      );
      reservations.set(result as Reservation[]);
    } catch (error) {
      console.error("API Error:", error);
    } finally {
      loading.set(false);
      isRefetching.set(false);
    }
  }

  async function toggleArrived(reservation: Reservation) {
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
      // Rollback
      reservations.update((all) =>
        all.map((r) =>
          r.id === reservation.id ? { ...r, arrived: !newState } : r
        )
      );
      alert("Fehler beim Speichern.");
    }
  }

  // --- Realtime & Visibility ---
  let unsubscribeRealtime: (() => void) | null = null;

  async function initRealtime() {
    if (unsubscribeRealtime) unsubscribeRealtime();

    const currentDate = get(date);
    try {
      const { subscription, unsubscribe } = await directus.subscribe(
        "reservations",
        {
          query: { filter: { date: { _eq: currentDate } } },
        }
      );
      unsubscribeRealtime = unsubscribe;

      for await (const message of subscription) {
        fetchData(true);
      }
    } catch (e) {
      console.warn("Realtime failed:", e);
    }
  }

  function handleVisibilityChange() {
    if (document.visibilityState === "visible") {
      fetchData(true);
    }
  }

  // Helper zum Aufräumen
  function cleanup() {
    if (unsubscribeRealtime) unsubscribeRealtime();
    if (typeof document !== "undefined") {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    }
  }

  // Init Listener
  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", handleVisibilityChange);
  }

  return {
    date,
    reservations, // Raw data if needed
    filteredReservations, // View data
    loading,
    isRefetching,
    showArrived,
    fetchData,
    initRealtime,
    toggleArrived,
    cleanup,
  };
}
