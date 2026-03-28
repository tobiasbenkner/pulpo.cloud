import type { Reservation, Table, TableGroup } from "./types";

const DEFAULT_DURATION = 90;
const DEFAULT_BUFFER = 15;

/**
 * Berechnet das Ende einer Reservierung (HH:MM) basierend auf Startzeit + Dauer + Puffer.
 */
function endTime(time: string, duration: number, buffer: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + duration + buffer;
  const eh = Math.floor(total / 60) % 24;
  const em = total % 60;
  return `${String(eh).padStart(2, "0")}:${String(em).padStart(2, "0")}`;
}

/**
 * Prüft ob zwei Zeitfenster sich überlappen.
 */
function overlaps(
  startA: string, endA: string,
  startB: string, endB: string,
): boolean {
  return startA < endB && startB < endA;
}

/**
 * Gibt alle Tisch-IDs zurück, die zu einem Zeitfenster belegt sind.
 */
export function getOccupiedTableIds(
  reservations: Reservation[],
  date: string,
  time: string,
  duration: number,
  buffer: number = DEFAULT_BUFFER,
  excludeReservationId?: string,
): Set<string> {
  const occupied = new Set<string>();
  const queryEnd = endTime(time, duration, 0); // ohne Puffer für die Anfrage selbst

  for (const res of reservations) {
    if (res.date !== date) continue;
    if (excludeReservationId && res.id === excludeReservationId) continue;
    if (!res.reservations_tables?.length) continue;

    const resDuration = res.duration || DEFAULT_DURATION;
    const resEnd = endTime(res.time, resDuration, buffer);

    if (overlaps(time, queryEnd, res.time, resEnd)) {
      for (const tableId of res.reservations_tables) {
        occupied.add(tableId);
      }
    }
  }

  return occupied;
}

export interface AssignmentResult {
  tables: Table[];
  totalSeats: number;
  isGroup: boolean;
  groupLabel?: string;
}

/**
 * Findet den besten Tisch oder die beste Tischgruppe für eine gegebene Personenzahl.
 * Berücksichtigt nur freie Tische (nicht belegt zum gegebenen Zeitpunkt).
 */
export function suggestTables(
  partySize: number,
  allTables: Table[],
  groups: TableGroup[],
  occupiedIds: Set<string>,
  zone?: string,
): AssignmentResult | null {
  // Nur Tische der richtigen Zone und die frei sind
  const freeTables = allTables.filter((t) =>
    !occupiedIds.has(t.id) && (!zone || t.zone === zone)
  );

  // 1. Einzeltisch suchen (kleinster passender)
  const singleCandidates = freeTables
    .filter((t) => (t.max_seats || t.seats) >= partySize && (t.min_seats || 1) <= partySize)
    .sort((a, b) => a.seats - b.seats);

  if (singleCandidates.length > 0) {
    const best = singleCandidates[0];
    return { tables: [best], totalSeats: best.seats, isGroup: false };
  }

  // 2. Auch Tische prüfen, die nur über seats (normal) passen, nicht über min/max
  const flexCandidates = freeTables
    .filter((t) => t.seats >= partySize)
    .sort((a, b) => a.seats - b.seats);

  if (flexCandidates.length > 0) {
    const best = flexCandidates[0];
    return { tables: [best], totalSeats: best.seats, isGroup: false };
  }

  // 3. Gruppen durchsuchen — kleinste passende Kombination
  const groupResults: AssignmentResult[] = [];

  for (const group of groups) {
    if (zone && group.zone !== zone) continue;

    const groupTables = group.tables
      .map((id) => freeTables.find((t) => t.id === id))
      .filter((t): t is Table => !!t);

    const totalSeats = groupTables.reduce((s, t) => s + t.seats, 0);
    const totalMax = groupTables.reduce((s, t) => s + (t.max_seats || t.seats), 0);

    // Alle Tische der Gruppe müssen frei sein
    if (groupTables.length !== group.tables.length) continue;

    if (totalMax >= partySize) {
      groupResults.push({
        tables: groupTables,
        totalSeats,
        isGroup: true,
        groupLabel: group.label,
      });
    }
  }

  // Kleinste Gruppe bevorzugen
  groupResults.sort((a, b) => a.totalSeats - b.totalSeats);

  return groupResults[0] ?? null;
}
