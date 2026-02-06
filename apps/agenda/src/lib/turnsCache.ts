import { listReservationTurns } from "@pulpo/cms";
import { directus } from "./directus";
import type { ReservationTurn } from "./types";

const STORAGE_KEY = "pulpo_agenda_turns";
const TTL_MS = 24 * 60 * 60 * 1000; // 24h

function getFromCache(): ReservationTurn[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const { data, timestamp } = JSON.parse(raw);
    if (Date.now() - timestamp > TTL_MS) return null;
    return data;
  } catch {
    return null;
  }
}

function writeToCache(data: ReservationTurn[]) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ data, timestamp: Date.now() }),
    );
  } catch {}
}

export async function fetchTurns(): Promise<ReservationTurn[]> {
  const data = await listReservationTurns(directus);
  writeToCache(data);
  return data;
}

export function loadTurns(): { cached: ReservationTurn[] | null; fresh: Promise<ReservationTurn[]> | null } {
  const cached = getFromCache();
  if (cached) return { cached, fresh: null };
  return { cached: null, fresh: fetchTurns() };
}

export function invalidateTurns() {
  localStorage.removeItem(STORAGE_KEY);
}
