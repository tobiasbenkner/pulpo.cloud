import type { Reservation, Table, TableGroup } from "./types";

const DEFAULT_DURATION = 90;
const DEFAULT_BUFFER = 15;

// --- Helpers ---

export function addMinutes(time: string, mins: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + mins;
  return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function overlaps(startA: string, endA: string, startB: string, endB: string): boolean {
  return startA < endB && startB < endA;
}

function getOccupiedAtTime(
  tableSlots: Map<string, { start: string; end: string }[]>,
  start: string,
  end: string,
): Set<string> {
  const occupied = new Set<string>();
  for (const [tId, slots] of tableSlots) {
    if (slots.some((s) => overlaps(start, end, s.start, s.end))) occupied.add(tId);
  }
  return occupied;
}

function occupyTable(
  tableSlots: Map<string, { start: string; end: string }[]>,
  tableId: string,
  start: string,
  end: string,
) {
  if (!tableSlots.has(tableId)) tableSlots.set(tableId, []);
  tableSlots.get(tableId)!.push({ start, end });
}

// --- Existing exports (kept for backwards compat) ---

export function getOccupiedTableIds(
  reservations: Reservation[],
  date: string,
  time: string,
  duration: number,
  buffer: number = DEFAULT_BUFFER,
  excludeReservationId?: string,
): Set<string> {
  const occupied = new Set<string>();
  const queryEnd = addMinutes(time, duration);

  for (const res of reservations) {
    if (res.date !== date) continue;
    if (excludeReservationId && res.id === excludeReservationId) continue;
    if (!res.reservations_tables?.length) continue;

    const resDuration = res.duration || DEFAULT_DURATION;
    const resEnd = addMinutes(res.time, resDuration + buffer);

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

export function suggestTables(
  partySize: number,
  allTables: Table[],
  groups: TableGroup[],
  occupiedIds: Set<string>,
  zone?: string,
): AssignmentResult | null {
  const freeTables = allTables.filter((t) =>
    !occupiedIds.has(t.id) && (!zone || t.zone === zone)
  );

  // 1. Einzeltisch (min/max range)
  const singleCandidates = freeTables
    .filter((t) => (t.max_seats || t.seats) >= partySize && (t.min_seats || 1) <= partySize)
    .sort((a, b) => a.seats - b.seats);

  if (singleCandidates.length > 0) {
    return { tables: [singleCandidates[0]], totalSeats: singleCandidates[0].seats, isGroup: false };
  }

  // 2. Einzeltisch (nur seats)
  const flexCandidates = freeTables
    .filter((t) => t.seats >= partySize)
    .sort((a, b) => a.seats - b.seats);

  if (flexCandidates.length > 0) {
    return { tables: [flexCandidates[0]], totalSeats: flexCandidates[0].seats, isGroup: false };
  }

  // 3. Gruppen
  const groupResults: AssignmentResult[] = [];
  for (const group of groups) {
    if (zone && group.zone !== zone) continue;
    const groupTables = group.tables
      .map((id) => freeTables.find((t) => t.id === id))
      .filter((t): t is Table => !!t);
    if (groupTables.length !== group.tables.length) continue;
    const totalSeats = groupTables.reduce((s, t) => s + t.seats, 0);
    const totalMax = groupTables.reduce((s, t) => s + (t.max_seats || t.seats), 0);
    if (totalMax >= partySize) {
      groupResults.push({ tables: groupTables, totalSeats, isGroup: true, groupLabel: group.label });
    }
  }
  groupResults.sort((a, b) => a.totalSeats - b.totalSeats);
  return groupResults[0] ?? null;
}

// --- New: Consolidated assignment logic ---

export interface AssignmentState {
  /** resId → assigned table IDs */
  assignments: Map<string, string[]>;
  /** tableId → occupied time slots */
  tableSlots: Map<string, { start: string; end: string }[]>;
  /** Reservations that could not be assigned */
  unassigned: Reservation[];
}

/**
 * Berechnet Tisch-Zuweisungen für alle Reservierungen.
 * Fixierte Reservierungen (mit reservations_tables) werden zuerst verarbeitet,
 * dann Auto-Zuweisung via suggestTables().
 */
export function computeTableAssignments(
  reservations: Reservation[],
  tables: Table[],
  groups: TableGroup[],
  excludeReservationId?: string,
): AssignmentState {
  const assignments = new Map<string, string[]>();
  const tableSlots = new Map<string, { start: string; end: string }[]>();
  const unassigned: Reservation[] = [];

  // Sortierung: fixierte zuerst, dann nach Zeit, bei gleicher Zeit größere Gruppen zuerst
  // (größere Gruppen haben weniger Optionen und müssen Vorrang bekommen)
  const sorted = reservations
    .filter((r) => !excludeReservationId || r.id !== excludeReservationId)
    .sort((a, b) => {
      const af = (a.reservations_tables?.length || 0) > 0 ? 0 : 1;
      const bf = (b.reservations_tables?.length || 0) > 0 ? 0 : 1;
      if (af !== bf) return af - bf;
      const timeComp = (a.time || "").localeCompare(b.time || "");
      if (timeComp !== 0) return timeComp;
      // Bei gleicher Zeit: größere Gruppen zuerst (schwerer zu platzieren)
      const aPax = parseInt(a.person_count) || 0;
      const bPax = parseInt(b.person_count) || 0;
      return bPax - aPax;
    });

  for (const res of sorted) {
    const start = (res.time || "00:00").substring(0, 5);
    const end = addMinutes(start, (res.duration || DEFAULT_DURATION) + DEFAULT_BUFFER);

    if (res.reservations_tables?.length) {
      assignments.set(res.id, res.reservations_tables);
      for (const tId of res.reservations_tables) {
        occupyTable(tableSlots, tId, start, end);
      }
    } else {
      const occupied = getOccupiedAtTime(tableSlots, start, end);
      const partySize = parseInt(res.person_count) || 2;
      const suggestion = suggestTables(partySize, tables, groups, occupied);
      if (suggestion) {
        const ids = suggestion.tables.map((t) => t.id);
        assignments.set(res.id, ids);
        for (const tId of ids) {
          occupyTable(tableSlots, tId, start, end);
        }
      } else {
        unassigned.push(res);
      }
    }
  }

  return { assignments, tableSlots, unassigned };
}

/**
 * Verdrängt auto-zugewiesene Reservierungen von den ausgewählten Tischen
 * und weist nur diese verdrängten Reservierungen neu zu.
 * Die restlichen Zuweisungen bleiben stabil.
 */
export function displaceAndReassign(
  base: AssignmentState,
  selectedTableIds: string[],
  selectedTime: string,
  selectedDuration: number,
  reservations: Reservation[],
  tables: Table[],
  groups: TableGroup[],
): AssignmentState {
  // Kopieren
  const assignments = new Map(base.assignments);
  const unassigned = [...base.unassigned];

  const selStart = selectedTime;
  const selEnd = addMinutes(selectedTime, selectedDuration + DEFAULT_BUFFER);

  // Finde verdrängte (nur auto-zugewiesene, nicht fixierte)
  const displacedResIds: string[] = [];
  for (const [resId, tIds] of assignments) {
    const res = reservations.find((r) => r.id === resId);
    if (!res || res.reservations_tables?.length) continue; // fixierte nicht verdrängen
    const resStart = (res.time || "00:00").substring(0, 5);
    const resEnd = addMinutes(resStart, (res.duration || DEFAULT_DURATION) + DEFAULT_BUFFER);
    // Nur verdrängen wenn Zeitfenster überlappt UND Tisch betroffen
    if (overlaps(selStart, selEnd, resStart, resEnd) && tIds.some((tId) => selectedTableIds.includes(tId))) {
      displacedResIds.push(resId);
      assignments.delete(resId);
    }
  }

  // Slots neu aufbauen: User-Auswahl + verbleibende Zuweisungen
  const tableSlots = new Map<string, { start: string; end: string }[]>();

  for (const tId of selectedTableIds) {
    occupyTable(tableSlots, tId, selStart, selEnd);
  }

  for (const [resId, tIds] of assignments) {
    const res = reservations.find((r) => r.id === resId);
    if (!res) continue;
    const start = (res.time || "00:00").substring(0, 5);
    const end = addMinutes(start, (res.duration || DEFAULT_DURATION) + DEFAULT_BUFFER);
    for (const tId of tIds) {
      occupyTable(tableSlots, tId, start, end);
    }
  }

  // Verdrängte neu zuweisen
  for (const resId of displacedResIds) {
    const res = reservations.find((r) => r.id === resId);
    if (!res) continue;
    const start = (res.time || "00:00").substring(0, 5);
    const end = addMinutes(start, (res.duration || DEFAULT_DURATION) + DEFAULT_BUFFER);
    const occupied = getOccupiedAtTime(tableSlots, start, end);
    const partySize = parseInt(res.person_count) || 2;
    const suggestion = suggestTables(partySize, tables, groups, occupied);
    if (suggestion) {
      const ids = suggestion.tables.map((t) => t.id);
      assignments.set(resId, ids);
      for (const tId of ids) {
        occupyTable(tableSlots, tId, start, end);
      }
    } else {
      unassigned.push(res);
    }
  }

  return { assignments, tableSlots, unassigned };
}

/**
 * Baut Labels und kategorisierte IDs aus einem AssignmentState.
 * Filtert optional auf ein Zeitfenster (für Floorplan-Anzeige).
 */
export function buildAssignmentLabels(
  state: AssignmentState,
  reservations: Reservation[],
  queryTime?: string,
  queryDuration?: number,
): { fixedIds: Set<string>; autoIds: Set<string>; labels: Map<string, string> } {
  const fixedIds = new Set<string>();
  const autoIds = new Set<string>();
  const labels = new Map<string, string>();

  const queryStart = queryTime;
  const queryEnd = queryTime ? addMinutes(queryTime, (queryDuration || DEFAULT_DURATION) + DEFAULT_BUFFER) : null;

  for (const [resId, tIds] of state.assignments) {
    const res = reservations.find((r) => r.id === resId);
    if (!res) continue;

    const start = (res.time || "00:00").substring(0, 5);
    const end = addMinutes(start, (res.duration || DEFAULT_DURATION) + DEFAULT_BUFFER);

    // Zeitfenster-Filter
    if (queryStart && queryEnd && !overlaps(queryStart, queryEnd, start, end)) continue;

    const label = `${res.name || "?"} · ${start} · ${res.person_count}p`;
    const isFixed = !!(res.reservations_tables?.length);

    for (const tId of tIds) {
      if (isFixed) fixedIds.add(tId); else autoIds.add(tId);
      labels.set(tId, label);
    }
  }

  return { fixedIds, autoIds, labels };
}
