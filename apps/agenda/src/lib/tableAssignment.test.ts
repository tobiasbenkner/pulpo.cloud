import { describe, it, expect } from "vitest";
import {
  addMinutes,
  suggestTables,
  computeTableAssignments,
  displaceAndReassign,
  buildAssignmentLabels,
  getOccupiedTableIds,
} from "./tableAssignment";
import type { Reservation, Table, TableGroup } from "./types";

// --- Test helpers ---

function makeTable(id: string, seats: number, opts?: Partial<Table>): Table {
  return {
    id, label: id, seats, min_seats: 0, max_seats: 0,
    x: 0, y: 0, shape: "rect", rotation: 0, width: 1, zone: "z1",
    collectionId: "", collectionName: "", created: "", updated: "",
    ...opts,
  } as Table;
}

function makeGroup(id: string, tableIds: string[], opts?: Partial<TableGroup>): TableGroup {
  return {
    id, label: id, tables: tableIds, zone: "z1", sort: 0, color: "#6366f1",
    collectionId: "", collectionName: "", created: "", updated: "",
    ...opts,
  } as TableGroup;
}

function makeRes(id: string, time: string, pax: number, opts?: Partial<Reservation>): Reservation {
  return {
    id, date: "2026-03-28", time, name: id,
    person_count: String(pax), contact: "", notes: "",
    arrived: false, user: "", duration: 90,
    reservations_tables: [],
    collectionId: "", collectionName: "", created: "", updated: "",
    ...opts,
  } as Reservation;
}

// --- addMinutes ---

describe("addMinutes", () => {
  it("adds minutes to time", () => {
    expect(addMinutes("13:00", 90)).toBe("14:30");
    expect(addMinutes("23:00", 120)).toBe("01:00");
    expect(addMinutes("08:45", 15)).toBe("09:00");
  });
});

// --- suggestTables ---

describe("suggestTables", () => {
  const tables = [
    makeTable("t1", 2),
    makeTable("t2", 4, { min_seats: 3, max_seats: 5 }),
    makeTable("t3", 4, { min_seats: 3, max_seats: 5 }),
    makeTable("t4", 2),
  ];

  it("finds smallest single table for party", () => {
    const result = suggestTables(2, tables, [], new Set());
    expect(result).not.toBeNull();
    expect(result!.tables).toHaveLength(1);
    expect(result!.tables[0].seats).toBe(2);
    expect(result!.isGroup).toBe(false);
  });

  it("skips occupied tables", () => {
    const result = suggestTables(2, tables, [], new Set(["t1", "t4"]));
    expect(result).not.toBeNull();
    expect(result!.tables[0].seats).toBe(4); // only 4-seat tables left
  });

  it("returns null when no table fits", () => {
    const result = suggestTables(2, tables, [], new Set(["t1", "t2", "t3", "t4"]));
    expect(result).toBeNull();
  });

  it("uses group when no single table fits", () => {
    const group = makeGroup("g1", ["t2", "t3"]);
    const result = suggestTables(8, tables, [group], new Set());
    expect(result).not.toBeNull();
    expect(result!.isGroup).toBe(true);
    expect(result!.groupId).toBe("g1");
    expect(result!.tables).toHaveLength(2);
  });

  it("picks smallest group", () => {
    const small = makeGroup("g-small", ["t1", "t4"]); // 4 seats
    const big = makeGroup("g-big", ["t1", "t2", "t3", "t4"]); // 12 seats
    const result = suggestTables(3, tables, [small, big], new Set(["t2", "t3"])); // 4-seat tables occupied
    // t1+t4 are free (4 total seats >= 3) → small group matches
    expect(result).not.toBeNull();
    expect(result!.groupId).toBe("g-small");
  });

  it("skips group if not all tables free", () => {
    const group = makeGroup("g1", ["t1", "t2"]);
    const result = suggestTables(6, tables, [group], new Set(["t1"]));
    expect(result).toBeNull(); // t1 occupied, group can't be used, no single table fits 6
  });
});

// --- computeTableAssignments ---

describe("computeTableAssignments", () => {
  const tables = [
    makeTable("t1", 2),
    makeTable("t2", 4),
    makeTable("t3", 4),
    makeTable("t4", 2),
  ];

  it("assigns each reservation a table", () => {
    const reservations = [
      makeRes("r1", "13:00", 2),
      makeRes("r2", "13:00", 4),
    ];
    const { assignments, unassigned } = computeTableAssignments(reservations, tables, []);
    expect(assignments.size).toBe(2);
    expect(unassigned).toHaveLength(0);
  });

  it("processes larger parties first at same time", () => {
    const reservations = [
      makeRes("r-small", "13:00", 2),
      makeRes("r-big", "13:00", 4),
    ];
    const { assignments } = computeTableAssignments(reservations, tables, []);
    // r-big should get a 4-seat table, r-small a 2-seat
    const bigTables = assignments.get("r-big")!;
    const bigTable = tables.find((t) => t.id === bigTables[0])!;
    expect(bigTable.seats).toBe(4);
  });

  it("fixed reservations get priority", () => {
    const reservations = [
      makeRes("r-auto", "13:00", 4),
      makeRes("r-fixed", "13:00", 2, { reservations_tables: ["t2"] }),
    ];
    const { assignments } = computeTableAssignments(reservations, tables, []);
    expect(assignments.get("r-fixed")).toEqual(["t2"]);
    // r-auto should NOT get t2
    expect(assignments.get("r-auto")![0]).not.toBe("t2");
  });

  it("marks unassignable reservations", () => {
    const reservations = [
      makeRes("r1", "13:00", 2),
      makeRes("r2", "13:00", 2),
      makeRes("r3", "13:00", 2),
      makeRes("r4", "13:00", 2),
      makeRes("r5", "13:00", 2), // 5 reservations but only 4 tables
    ];
    const { unassigned } = computeTableAssignments(reservations, tables, []);
    expect(unassigned).toHaveLength(1);
  });

  it("allows same table at different non-overlapping times", () => {
    const reservations = [
      makeRes("r1", "12:00", 2, { duration: 60 }), // 12:00-13:15 (with buffer)
      makeRes("r2", "14:00", 2, { duration: 60 }), // 14:00-15:15
    ];
    const smallTables = [makeTable("t1", 2)];
    const { assignments, unassigned } = computeTableAssignments(reservations, smallTables, []);
    expect(assignments.size).toBe(2);
    expect(unassigned).toHaveLength(0);
    // Both should get t1 since they don't overlap
    expect(assignments.get("r1")).toEqual(["t1"]);
    expect(assignments.get("r2")).toEqual(["t1"]);
  });

  it("detects overlapping times", () => {
    const reservations = [
      makeRes("r1", "13:00", 2, { duration: 90 }), // 13:00-14:45
      makeRes("r2", "14:00", 2, { duration: 90 }), // 14:00 overlaps with r1's slot (13:00-14:45+buffer)
    ];
    const smallTables = [makeTable("t1", 2)];
    const { unassigned } = computeTableAssignments(reservations, smallTables, []);
    expect(unassigned).toHaveLength(1);
  });

  it("excludes reservation by ID", () => {
    const reservations = [
      makeRes("r1", "13:00", 2),
      makeRes("r2", "13:00", 2),
    ];
    const { assignments } = computeTableAssignments(reservations, tables, [], "r1");
    expect(assignments.has("r1")).toBe(false);
    expect(assignments.has("r2")).toBe(true);
  });

  it("stores group ID when group is used", () => {
    const bigTables = [makeTable("t1", 4), makeTable("t2", 4)];
    const group = makeGroup("g1", ["t1", "t2"]);
    const reservations = [makeRes("r1", "13:00", 7)];
    const { assignmentGroups } = computeTableAssignments(reservations, bigTables, [group]);
    expect(assignmentGroups.get("r1")).toBe("g1");
  });
});

// --- displaceAndReassign ---

describe("displaceAndReassign", () => {
  const tables = [
    makeTable("t1", 2),
    makeTable("t2", 4),
    makeTable("t3", 4),
  ];

  it("displaces auto-assigned reservation to next free table", () => {
    const reservations = [
      makeRes("r1", "13:00", 2),
      makeRes("r2", "13:00", 4),
    ];
    const base = computeTableAssignments(reservations, tables, []);
    const r1Table = base.assignments.get("r1")![0];

    // User selects r1's table
    const result = displaceAndReassign(base, [r1Table], "13:00", 90, reservations, tables, []);
    // r1 should be reassigned to a different table
    expect(result.assignments.get("r1")).toBeDefined();
    expect(result.assignments.get("r1")![0]).not.toBe(r1Table);
  });

  it("does not displace fixed reservations", () => {
    const reservations = [
      makeRes("r-fixed", "13:00", 2, { reservations_tables: ["t1"] }),
      makeRes("r-auto", "13:00", 4),
    ];
    const base = computeTableAssignments(reservations, tables, []);

    // User selects t1 (fixed reservation's table)
    const result = displaceAndReassign(base, ["t1"], "13:00", 90, reservations, tables, []);
    // Fixed reservation should NOT be displaced
    expect(result.assignments.get("r-fixed")).toEqual(["t1"]);
  });

  it("puts displaced reservation in unassigned if no table free", () => {
    const smallTables = [makeTable("t1", 2), makeTable("t2", 2)];
    const reservations = [
      makeRes("r1", "13:00", 2),
      makeRes("r2", "13:00", 2),
    ];
    const base = computeTableAssignments(reservations, smallTables, []);

    // User takes one table → displaced reservation has no options
    const r1Table = base.assignments.get("r1")![0];
    const r2Table = base.assignments.get("r2")![0];
    const result = displaceAndReassign(base, [r1Table, r2Table], "13:00", 90, reservations, smallTables, []);
    expect(result.unassigned.length).toBeGreaterThan(0);
  });
});

// --- buildAssignmentLabels ---

describe("buildAssignmentLabels", () => {
  const tables = [makeTable("t1", 2), makeTable("t2", 4)];
  const group = makeGroup("g1", ["t1", "t2"], { color: "#ff0000" });
  const groupColorMap = new Map([["g1", "#ff0000"]]);

  it("builds labels for all assignments without time filter", () => {
    const reservations = [makeRes("r1", "13:00", 2), makeRes("r2", "20:00", 4)];
    const state = computeTableAssignments(reservations, tables, []);
    const { labels } = buildAssignmentLabels(state, reservations, [], groupColorMap);
    expect(labels.size).toBe(2);
  });

  it("filters by time window", () => {
    const reservations = [makeRes("r1", "13:00", 2), makeRes("r2", "20:00", 4)];
    const state = computeTableAssignments(reservations, tables, []);
    const { labels } = buildAssignmentLabels(state, reservations, [], groupColorMap, "13:00", 120);
    expect(labels.size).toBe(1); // only r1's table
  });

  it("returns group color in tableColors", () => {
    const bigTables = [makeTable("t1", 4, { max_seats: 5 }), makeTable("t2", 4, { max_seats: 5 })];
    const bigGroup = makeGroup("g1", ["t1", "t2"], { color: "#ff0000" });
    const reservations = [makeRes("r1", "13:00", 8)]; // 8p needs group (2x4=8, max 2x5=10)
    const state = computeTableAssignments(reservations, bigTables, [bigGroup]);
    expect(state.assignmentGroups.get("r1")).toBe("g1");
    const { tableColors } = buildAssignmentLabels(state, reservations, [bigGroup], new Map([["g1", "#ff0000"]]));
    expect(tableColors.get("t1")).toBe("#ff0000");
    expect(tableColors.get("t2")).toBe("#ff0000");
  });

  it("no group color for single table assignments", () => {
    const reservations = [makeRes("r1", "13:00", 2)];
    const state = computeTableAssignments(reservations, tables, []);
    const { tableColors } = buildAssignmentLabels(state, reservations, [], groupColorMap);
    expect(tableColors.size).toBe(0);
  });
});

// --- getOccupiedTableIds ---

describe("getOccupiedTableIds", () => {
  it("returns occupied tables for time window", () => {
    const reservations = [
      makeRes("r1", "13:00", 2, { reservations_tables: ["t1"] }),
    ];
    const occupied = getOccupiedTableIds(reservations, "2026-03-28", "13:00", 90);
    expect(occupied.has("t1")).toBe(true);
  });

  it("ignores reservations without fixed tables", () => {
    const reservations = [makeRes("r1", "13:00", 2)]; // no reservations_tables
    const occupied = getOccupiedTableIds(reservations, "2026-03-28", "13:00", 90);
    expect(occupied.size).toBe(0);
  });

  it("excludes reservation by ID", () => {
    const reservations = [
      makeRes("r1", "13:00", 2, { reservations_tables: ["t1"] }),
    ];
    const occupied = getOccupiedTableIds(reservations, "2026-03-28", "13:00", 90, 15, "r1");
    expect(occupied.size).toBe(0);
  });

  it("ignores non-overlapping times", () => {
    const reservations = [
      makeRes("r1", "08:00", 2, { reservations_tables: ["t1"], duration: 60 }),
    ];
    const occupied = getOccupiedTableIds(reservations, "2026-03-28", "20:00", 90);
    expect(occupied.size).toBe(0);
  });
});
