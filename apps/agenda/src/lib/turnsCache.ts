import { pb } from "./pb";
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
  const result = await pb.collection("reservations_turns").getFullList<ReservationTurn>({
    sort: "start",
  });
  writeToCache(result);
  return result;
}

export function loadTurns(): { cached: ReservationTurn[] | null; fresh: Promise<ReservationTurn[]> } {
  const cached = getFromCache();
  return { cached, fresh: fetchTurns() };
}

export function invalidateTurns() {
  localStorage.removeItem(STORAGE_KEY);
}
