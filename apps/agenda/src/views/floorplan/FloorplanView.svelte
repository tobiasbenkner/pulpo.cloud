<script lang="ts">
  import { onMount } from "svelte";
  import { pb } from "../../lib/pb";
  import type { Reservation, Table, TableGroup, Zone } from "../../lib/types";
  import { getOccupiedTableIds } from "../../lib/tableAssignment";
  import { reservationDraft } from "../../stores/reservationDraftStore";
  import { ArrowLeft, Plus, Pencil, Trash2, Loader2, AlertTriangle, Check, X, Lock, Link } from "lucide-svelte";
  import FloorplanCanvas from "./FloorplanCanvas.svelte";
  import TableEditPanel from "./TableEditPanel.svelte";
  import GroupPanel from "./GroupPanel.svelte";
  import OccupancyPanel from "./OccupancyPanel.svelte";

  let zones: Zone[] = [];
  let tables: Table[] = [];
  let groups: TableGroup[] = [];
  let loading = true;
  let error: string | null = null;
  let editing = false;
  let saving = false;

  let activeZoneId: string | null = null;
  let selectedId: string | null = null;
  let editForm = { label: "", seats: 2, min_seats: 0, max_seats: 0, shape: "round" as "round" | "rect", rotation: 0, width: 1 };
  let deletingId: string | null = null;

  let dragging: string | null = null;
  let dragOffset = { x: 0, y: 0 };
  let svgRef: SVGSVGElement;

  let showNewZone = false;
  let newZoneLabel = "";
  let renamingZoneId: string | null = null;
  let renameZoneLabel = "";

  let showGroupPanel = false;
  let activeGroupId: string | null = null;

  // Occupancy mode (from query params)
  const urlParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const occDate = urlParams.get("date") || "";
  const occTime = urlParams.get("time") || "";
  const occPax = parseInt(urlParams.get("pax") || "0");
  const occReservationId = urlParams.get("reservation") || "";
  const occupancyMode = !!(occDate && occTime && occPax);

  let allReservations: Reservation[] = [];
  let occSelectedTableIds: string[] = [];

  $: occupiedTableIds = occupancyMode && allReservations.length
    ? getOccupiedTableIds(allReservations, occDate, occTime, 90, 15, occReservationId)
    : new Set<string>();

  $: occupancyLabels = new Map(
    allReservations
      .filter((r) => r.date === occDate && r.reservations_tables?.length)
      .flatMap((r) => r.reservations_tables.map((tId) => [tId, `${r.name || "?"} · ${r.time?.substring(0, 5)}`] as [string, string]))
  );

  $: selectedTable = tables.find((t) => t.id === selectedId) ?? null;
  $: if (selectedId && editForm) {
    tables = tables.map((t) => t.id === selectedId ? { ...t, ...editForm } : t);
  }

  const GROUP_COLORS = ["#6366f1", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"];
  $: groupColorMap = new Map(groups.map((g, i) => [g.id, GROUP_COLORS[i % GROUP_COLORS.length]]));
  $: zoneGroups = groups.filter((g) => g.zone === activeZoneId);

  $: activeGroupTables = new Set(
    activeGroupId ? (groups.find(g => g.id === activeGroupId)?.tables ?? []) : []
  );
  $: activeGroupColor = activeGroupId ? groupColorMap.get(activeGroupId) ?? "#6366f1" : "#6366f1";

  $: visibleTables = (() => {
    void activeGroupId;
    void occSelectedTableIds;
    return activeZoneId
      ? tables.filter((t) => t.zone === activeZoneId)
      : tables.filter((t) => !t.zone);
  })();

  $: if (!showGroupPanel) activeGroupId = null;

  onMount(async () => { await loadData(); });

  async function loadData() {
    loading = true;
    try {
      const promises: [Promise<Zone[]>, Promise<Table[]>, Promise<TableGroup[]>, Promise<Reservation[]>] = [
        pb.collection("reservations_zones").getFullList<Zone>({ sort: "sort,label" }),
        pb.collection("reservations_tables").getFullList<Table>({ sort: "label" }),
        pb.collection("reservations_table_groups").getFullList<TableGroup>({ sort: "sort,label" }),
        occupancyMode
          ? pb.collection("reservations").getFullList<Reservation>({ filter: `date = "${occDate}"`, sort: "time" })
          : Promise.resolve([]),
      ];
      [zones, tables, groups, allReservations] = await Promise.all(promises);
      if (zones.length > 0 && activeZoneId === null) activeZoneId = zones[0].id;

      // Load previously fixed tables if editing existing reservation
      if (occupancyMode && occReservationId && occSelectedTableIds.length === 0) {
        const existing = allReservations.find((r) => r.id === occReservationId);
        if (existing?.reservations_tables?.length) {
          occSelectedTableIds = [...existing.reservations_tables];
        }
      }
    } catch { error = "No se pudieron cargar los datos."; }
    finally { loading = false; }
  }

  // --- SVG drag (needs svgRef from canvas — we handle coords here) ---
  function startDrag(e: MouseEvent | TouchEvent, table: Table) {
    if (!editing || activeGroupId) return;
    e.preventDefault();
    const pt = svgPoint(e);
    dragging = table.id;
    dragOffset = { x: pt.x - table.x, y: pt.y - table.y };
  }

  function onDrag(e: MouseEvent | TouchEvent) {
    if (!dragging) return;
    e.preventDefault();
    const pt = svgPoint(e);
    tables = tables.map((t) => t.id === dragging ? { ...t,
      x: Math.max(3, Math.min(97, pt.x - dragOffset.x)),
      y: Math.max(3, Math.min(97, pt.y - dragOffset.y)),
    } : t);
  }

  async function endDrag() {
    if (!dragging) return;
    const table = tables.find((t) => t.id === dragging);
    dragging = null;
    if (!table) return;
    try { await pb.collection("reservations_tables").update(table.id, { x: table.x, y: table.y }); }
    catch { error = "No se pudo guardar la posición."; setTimeout(() => (error = null), 3000); }
  }

  function svgPoint(e: MouseEvent | TouchEvent) {
    const svg = document.querySelector<SVGSVGElement>(".floorplan-svg")!;
    const rect = svg.getBoundingClientRect();
    const cx = "touches" in e ? e.touches[0].clientX : e.clientX;
    const cy = "touches" in e ? e.touches[0].clientY : e.clientY;
    return { x: ((cx - rect.left) / rect.width) * 100, y: ((cy - rect.top) / rect.height) * 100 };
  }

  function selectTable(id: string) {
    if (dragging) return;

    // Occupancy mode: click on canvas to select single table
    if (occupancyMode) {
      if (occupiedTableIds.has(id)) return;
      occSelectedTableIds = [id];
      return;
    }

    if (!editing) return;
    if (activeGroupId) { toggleTableInGroup(id, activeGroupId); return; }
    selectedId = selectedId === id ? null : id;
    deletingId = null;
    if (selectedId) {
      const t = tables.find((t) => t.id === selectedId)!;
      editForm = { label: t.label, seats: t.seats, min_seats: t.min_seats || 0, max_seats: t.max_seats || 0, shape: t.shape, rotation: t.rotation || 0, width: t.width || 1 };
    }
  }

  // --- Table CRUD ---
  async function saveTable() {
    if (!selectedId || !editForm.label.trim()) return;
    saving = true;
    try { await pb.collection("reservations_tables").update(selectedId, editForm); await loadData(); selectedId = null; }
    catch { error = "No se pudo guardar la mesa."; } finally { saving = false; }
  }

  async function createTable() {
    saving = true;
    try {
      await pb.collection("reservations_tables").create({
        label: `Mesa ${tables.length + 1}`, seats: 4, min_seats: 3, max_seats: 5,
        x: 50, y: 50, shape: "rect", rotation: 0, width: 2, zone: activeZoneId || "",
      });
      await loadData();
    } catch { error = "No se pudo crear la mesa."; } finally { saving = false; }
  }

  async function deleteTable(id: string) {
    saving = true;
    try { await pb.collection("reservations_tables").delete(id); if (selectedId === id) selectedId = null; deletingId = null; await loadData(); }
    catch { error = "No se pudo eliminar la mesa."; } finally { saving = false; }
  }

  // --- Zone CRUD ---
  async function createZone() {
    if (!newZoneLabel.trim()) return;
    saving = true;
    try {
      const zone = await pb.collection("reservations_zones").create<Zone>({ label: newZoneLabel.trim(), sort: zones.length });
      await loadData(); activeZoneId = zone.id; showNewZone = false; newZoneLabel = "";
    } catch { error = "No se pudo crear la zona."; } finally { saving = false; }
  }

  function startRenameZone(zone: Zone) { renamingZoneId = zone.id; renameZoneLabel = zone.label; }

  async function saveRenameZone() {
    if (!renamingZoneId || !renameZoneLabel.trim()) return;
    saving = true;
    try { await pb.collection("reservations_zones").update(renamingZoneId, { label: renameZoneLabel.trim() }); await loadData(); renamingZoneId = null; }
    catch { error = "No se pudo renombrar la zona."; } finally { saving = false; }
  }

  async function deleteZone(id: string) {
    saving = true;
    try {
      for (const t of tables.filter((t) => t.zone === id)) await pb.collection("reservations_tables").update(t.id, { zone: "" });
      await pb.collection("reservations_zones").delete(id); await loadData();
      activeZoneId = zones.length > 0 ? zones[0].id : null;
    } catch { error = "No se pudo eliminar la zona."; } finally { saving = false; }
  }

  // --- Group CRUD ---
  async function createGroup(label: string) {
    saving = true;
    try {
      const g = await pb.collection("reservations_table_groups").create<TableGroup>({ label, tables: [], zone: activeZoneId || "", sort: groups.length });
      await loadData(); activeGroupId = g.id;
    } catch { error = "No se pudo crear el grupo."; } finally { saving = false; }
  }

  async function deleteGroup(id: string) {
    saving = true;
    try { await pb.collection("reservations_table_groups").delete(id); if (activeGroupId === id) activeGroupId = null; await loadData(); }
    catch { error = "No se pudo eliminar el grupo."; } finally { saving = false; }
  }

  async function moveGroup(id: string, direction: "up" | "down") {
    const idx = zoneGroups.findIndex((g) => g.id === id);
    if (idx < 0) return;
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= zoneGroups.length) return;
    saving = true;
    try {
      const a = zoneGroups[idx];
      const b = zoneGroups[swapIdx];
      await Promise.all([
        pb.collection("reservations_table_groups").update(a.id, { sort: b.sort }),
        pb.collection("reservations_table_groups").update(b.id, { sort: a.sort }),
      ]);
      await loadData();
    } catch { error = "No se pudo reordenar."; }
    finally { saving = false; }
  }

  async function renameGroup(id: string, label: string) {
    saving = true;
    try { await pb.collection("reservations_table_groups").update(id, { label }); await loadData(); }
    catch { error = "No se pudo renombrar el grupo."; } finally { saving = false; }
  }

  async function toggleTableInGroup(tableId: string, groupId: string) {
    saving = true;
    try {
      const group = groups.find((g) => g.id === groupId);
      if (!group) return;
      const has = group.tables.includes(tableId);
      await pb.collection("reservations_table_groups").update(groupId, {
        tables: has ? group.tables.filter((id) => id !== tableId) : [...group.tables, tableId],
      });
      await loadData();
    } catch { error = "No se pudo actualizar el grupo."; } finally { saving = false; }
  }

  async function saveOccupancy() {
    if (occReservationId) {
      saving = true;
      try {
        await pb.collection("reservations").update(occReservationId, { reservations_tables: occSelectedTableIds });
      } catch { error = "No se pudo asignar las mesas."; saving = false; return; }
      finally { saving = false; }
      window.location.href = `/edit?id=${occReservationId}`;
    } else {
      // New reservation — update draft with selected tables
      const draft = $reservationDraft;
      if (draft) {
        reservationDraft.set({ ...draft, reservations_tables: occSelectedTableIds });
      }
      window.location.href = `/new`;
    }
  }

  function cancelOccupancy() {
    window.history.back();
  }

  function goBack() {
    if (occupancyMode) { cancelOccupancy(); return; }
    window.location.href = "/";
  }
</script>

<div class="flex flex-col h-full animate-fade-in">
  <!-- Header -->
  <div class="shrink-0 bg-surface px-3 md:px-8 pt-4 md:pt-6 pb-3 space-y-3">
    <div class="flex items-center justify-between max-w-7xl mx-auto">
      <div class="flex items-center gap-2.5">
        <button on:click={goBack} class="p-2.5 -ml-2.5 hover:bg-surface-hover rounded-full transition-colors text-fg-muted" aria-label="Volver">
          <ArrowLeft size={20} />
        </button>
        <h1 class="text-sm font-medium text-fg-muted">
          {occupancyMode ? "Asignar mesa" : "Plano del restaurante"}
        </h1>
      </div>
      <div class="flex items-center gap-2">
        {#if editing && !occupancyMode}
          <button on:click={createTable} disabled={saving || (!activeZoneId && zones.length > 0)}
            class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-surface border border-border-default rounded-md text-fg-secondary hover:bg-surface-hover transition-colors disabled:opacity-70">
            <Plus size={14} /><span>Añadir mesa</span>
          </button>
          <button on:click={() => { showGroupPanel = !showGroupPanel; selectedId = null; }}
            class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors {showGroupPanel
              ? 'bg-[#6366f1] text-white'
              : 'bg-surface border border-border-default text-fg-secondary hover:bg-surface-hover'}">
            <Link size={14} /><span>Grupos</span>
          </button>
        {/if}
        {#if !occupancyMode}<button on:click={() => { editing = !editing; selectedId = null; deletingId = null; showGroupPanel = false; activeGroupId = null; }}
          class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors {editing
            ? 'bg-btn-primary-bg text-btn-primary-text hover:bg-btn-primary-hover'
            : 'bg-surface border border-border-default text-fg-secondary hover:bg-surface-hover'}">
          {#if editing}<Lock size={14} /><span>Bloquear</span>{:else}<Pencil size={14} /><span>Editar</span>{/if}
        </button>{/if}
      </div>
    </div>

    {#if error}
      <div class="max-w-7xl mx-auto p-3 bg-error-bg border border-error-border text-error-text text-sm rounded-md flex items-start gap-2">
        <AlertTriangle size={16} class="mt-0.5 shrink-0" /><span>{error}</span>
      </div>
    {/if}
  </div>

  {#if loading}
    <div class="flex-1 flex items-center justify-center"><Loader2 class="animate-spin text-primary" size={32} /></div>
  {:else}
    <!-- Zone Tabs -->
    <div class="shrink-0 flex items-center gap-1.5 px-3 md:px-8 py-2 bg-surface border-b border-border-default overflow-x-auto no-scrollbar">
      {#each zones as zone (zone.id)}
        {#if renamingZoneId === zone.id}
          <form on:submit|preventDefault={saveRenameZone} class="shrink-0 inline-flex items-center gap-1">
            <input type="text" bind:value={renameZoneLabel} class="w-28 px-2 py-1 text-xs bg-input-bg border border-border-default rounded-full text-fg focus:outline-none focus:ring-1 focus:ring-primary" />
            <button type="submit" disabled={saving || !renameZoneLabel.trim()} class="p-1 text-arrived-check hover:bg-surface-hover rounded-full disabled:opacity-50"><Check size={14} /></button>
            <button type="button" on:click={() => (renamingZoneId = null)} class="p-1 text-fg-muted hover:text-fg-secondary rounded-full"><X size={14} /></button>
          </form>
        {:else}
          <button on:click={() => { activeZoneId = zone.id; selectedId = null; activeGroupId = null; }}
            on:dblclick={() => { if (editing) startRenameZone(zone); }}
            class="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors {activeZoneId === zone.id
              ? 'bg-primary text-white' : 'bg-surface-alt text-fg-muted hover:text-fg-secondary hover:bg-surface-hover'}">
            {zone.label}<span class="opacity-60">({tables.filter(t => t.zone === zone.id).length})</span>
          </button>
        {/if}
      {/each}
      {#if !zones.length && !editing}
        <span class="text-xs text-fg-muted">Sin zonas definidas — activa el modo edición para añadir zonas</span>
      {/if}
      {#if editing}
        {#if showNewZone}
          <form on:submit|preventDefault={createZone} class="shrink-0 inline-flex items-center gap-1">
            <input type="text" bind:value={newZoneLabel} placeholder="Nombre..." class="w-28 px-2 py-1 text-xs bg-input-bg border border-border-default rounded-full text-fg placeholder-fg-muted focus:outline-none focus:ring-1 focus:ring-primary" />
            <button type="submit" disabled={saving || !newZoneLabel.trim()} class="p-1 text-arrived-check hover:bg-surface-hover rounded-full disabled:opacity-50"><Check size={14} /></button>
            <button type="button" on:click={() => { showNewZone = false; newZoneLabel = ""; }} class="p-1 text-fg-muted hover:text-fg-secondary rounded-full"><X size={14} /></button>
          </form>
        {:else}
          <button on:click={() => (showNewZone = true)} class="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border border-dashed border-border-default text-fg-muted hover:text-fg-secondary hover:border-fg-muted transition-colors">
            <Plus size={12} /> Zona
          </button>
        {/if}
        {#if activeZoneId}
          <button on:click={() => { if (confirm("¿Eliminar esta zona? Las mesas se desasignarán.")) deleteZone(activeZoneId); }}
            class="shrink-0 p-1.5 text-fg-muted hover:text-error-text rounded-full transition-colors" aria-label="Eliminar zona"><Trash2 size={13} /></button>
        {/if}
      {/if}
    </div>

    <!-- Main content -->
    <div class="flex-1 min-h-0 flex flex-col md:flex-row">
      <div class="flex-1 min-h-0 p-2 md:p-4">
        <FloorplanCanvas
          tables={visibleTables}
          editing={occupancyMode ? false : editing}
          {activeGroupId}
          {selectedId}
          {showGroupPanel}
          {activeGroupTables}
          {activeGroupColor}
          {occupancyMode}
          {occupiedTableIds}
          selectedTableIds={occSelectedTableIds}
          {occupancyLabels}
          onStartDrag={startDrag}
          {onDrag}
          onEndDrag={endDrag}
          onSelectTable={selectTable}
        >
          <svelte:fragment slot="empty">
            {#if zones.length === 0}
              <p class="font-serif text-lg mb-1">Sin zonas</p>
              <p class="text-sm">Activa el modo edición para crear zonas y mesas</p>
            {:else}
              <p class="font-serif text-lg mb-1">Sin mesas en esta zona</p>
              {#if editing}<p class="text-sm">Pulsa "Añadir mesa" para empezar</p>{/if}
            {/if}
          </svelte:fragment>
        </FloorplanCanvas>
      </div>

      {#if occupancyMode}
        <OccupancyPanel
          date={occDate}
          time={occTime}
          pax={occPax}
          reservationId={occReservationId}
          reservations={allReservations}
          selectedTableIds={occSelectedTableIds}
          {tables}
          groups={zoneGroups}
          {occupiedTableIds}
          {saving}
          onSelect={(ids) => (occSelectedTableIds = ids)}
          onSave={saveOccupancy}
          onCancel={cancelOccupancy}
        />
      {:else if showGroupPanel}
        <GroupPanel
          groups={zoneGroups}
          {tables}
          {activeGroupId}
          {saving}
          {groupColorMap}
          onClose={() => (showGroupPanel = false)}
          onSelectGroup={(id) => (activeGroupId = id)}
          onCreateGroup={createGroup}
          onRenameGroup={renameGroup}
          onDeleteGroup={deleteGroup}
          onMoveGroup={moveGroup}
        />
      {:else if editing && selectedTable}
        <TableEditPanel
          bind:editForm
          {saving}
          {deletingId}
          {selectedId}
          onSave={saveTable}
          onClose={() => (selectedId = null)}
          onDelete={deleteTable}
          onRequestDelete={() => (deletingId = selectedId)}
          onCancelDelete={() => (deletingId = null)}
        />
      {/if}
    </div>
  {/if}
</div>
