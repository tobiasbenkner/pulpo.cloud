import { writable } from "svelte/store";

export interface ReservationDraft {
  date: string;
  time: string;
  name: string;
  contact: string;
  person_count: string;
  notes: string;
  user: string;
  duration: number;
  reservations_tables: string[];
}

const STORAGE_KEY = "pulpo_reservation_draft";

function loadFromStorage(): ReservationDraft | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveToStorage(draft: ReservationDraft | null) {
  try {
    if (draft) localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {}
}

const initial = loadFromStorage();
export const reservationDraft = writable<ReservationDraft | null>(initial);

reservationDraft.subscribe((value) => {
  saveToStorage(value);
});

export function clearDraft() {
  reservationDraft.set(null);
}
