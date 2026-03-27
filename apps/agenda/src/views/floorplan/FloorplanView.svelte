<script lang="ts">
  import { onMount } from "svelte";
  import { pb } from "../../lib/pb";
  import type { Table, Zone } from "../../lib/types";
  import {
    ArrowLeft,
    Plus,
    Pencil,
    Trash2,
    Loader2,
    AlertTriangle,
    Check,
    X,
    Lock,
  } from "lucide-svelte";

  let zones: Zone[] = [];
  let tables: Table[] = [];
  let loading = true;
  let error: string | null = null;
  let editing = false;
  let saving = false;

  // Active zone tab
  let activeZoneId: string | null = null;

  // Selection & editing
  let selectedId: string | null = null;
  let editForm = { label: "", seats: 2, min_seats: 0, max_seats: 0, shape: "round" as "round" | "rect", rotation: 0, width: 1 };

  // Drag state
  let dragging: string | null = null;
  let dragOffset = { x: 0, y: 0 };
  let svgRef: SVGSVGElement;

  // Delete confirmation
  let deletingId: string | null = null;

  // Zone management
  let showNewZone = false;
  let newZoneLabel = "";
  let renamingZoneId: string | null = null;
  let renameZoneLabel = "";

  $: selectedTable = tables.find((t) => t.id === selectedId) ?? null;

  // Live-preview: editForm-Änderungen direkt auf Canvas spiegeln
  $: if (selectedId && editForm) {
    tables = tables.map((t) =>
      t.id === selectedId ? { ...t, ...editForm } : t,
    );
  }

  $: visibleTables = activeZoneId
    ? tables.filter((t) => t.zone === activeZoneId)
    : tables.filter((t) => !t.zone);

  onMount(async () => {
    await loadData();
  });

  async function loadData() {
    loading = true;
    try {
      [zones, tables] = await Promise.all([
        pb.collection("reservations_zones").getFullList<Zone>({ sort: "sort,label" }),
        pb.collection("reservations_tables").getFullList<Table>({ sort: "label" }),
      ]);
      // Default to first zone if exists
      if (zones.length > 0 && activeZoneId === null) {
        activeZoneId = zones[0].id;
      }
    } catch {
      error = "No se pudieron cargar los datos.";
    } finally {
      loading = false;
    }
  }

  // --- SVG coordinate helpers ---
  function svgPoint(e: MouseEvent | TouchEvent): { x: number; y: number } {
    const svg = svgRef;
    const rect = svg.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    return {
      x: ((clientX - rect.left) / rect.width) * 100,
      y: ((clientY - rect.top) / rect.height) * 100,
    };
  }

  // --- Drag handlers ---
  function startDrag(e: MouseEvent | TouchEvent, table: Table) {
    if (!editing) return;
    e.preventDefault();
    const pt = svgPoint(e);
    dragging = table.id;
    dragOffset = { x: pt.x - table.x, y: pt.y - table.y };
  }

  function onDrag(e: MouseEvent | TouchEvent) {
    if (!dragging) return;
    e.preventDefault();
    const pt = svgPoint(e);
    const x = Math.max(3, Math.min(97, pt.x - dragOffset.x));
    const y = Math.max(3, Math.min(97, pt.y - dragOffset.y));
    tables = tables.map((t) => (t.id === dragging ? { ...t, x, y } : t));
  }

  async function endDrag() {
    if (!dragging) return;
    const table = tables.find((t) => t.id === dragging);
    dragging = null;
    if (!table) return;
    try {
      await pb.collection("reservations_tables").update(table.id, { x: table.x, y: table.y });
    } catch {
      error = "No se pudo guardar la posición.";
      setTimeout(() => (error = null), 3000);
    }
  }

  // --- Table selection ---
  function selectTable(id: string) {
    if (dragging || !editing) return;
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
    error = null;
    try {
      await pb.collection("reservations_tables").update(selectedId, editForm);
      await loadData();
      selectedId = null;
    } catch {
      error = "No se pudo guardar la mesa.";
    } finally {
      saving = false;
    }
  }

  async function createTable() {
    saving = true;
    error = null;
    try {
      const zoneTables = tables.filter((t) => t.zone === activeZoneId);
      await pb.collection("reservations_tables").create({
        label: `Mesa ${tables.length + 1}`,
        seats: 4,
        min_seats: 3,
        max_seats: 5,
        x: 50,
        y: 50,
        shape: "rect",
        rotation: 0,
        width: 2,
        zone: activeZoneId || "",
      });
      await loadData();
    } catch {
      error = "No se pudo crear la mesa.";
    } finally {
      saving = false;
    }
  }

  async function deleteTable(id: string) {
    saving = true;
    error = null;
    try {
      await pb.collection("reservations_tables").delete(id);
      if (selectedId === id) selectedId = null;
      deletingId = null;
      await loadData();
    } catch {
      error = "No se pudo eliminar la mesa.";
    } finally {
      saving = false;
    }
  }

  // --- Zone CRUD ---
  async function createZone() {
    if (!newZoneLabel.trim()) return;
    saving = true;
    try {
      const zone = await pb.collection("reservations_zones").create<Zone>({
        label: newZoneLabel.trim(),
        sort: zones.length,
      });
      await loadData();
      activeZoneId = zone.id;
      showNewZone = false;
      newZoneLabel = "";
    } catch {
      error = "No se pudo crear la zona.";
    } finally {
      saving = false;
    }
  }

  function startRenameZone(zone: Zone) {
    renamingZoneId = zone.id;
    renameZoneLabel = zone.label;
  }

  async function saveRenameZone() {
    if (!renamingZoneId || !renameZoneLabel.trim()) return;
    saving = true;
    try {
      await pb.collection("reservations_zones").update(renamingZoneId, { label: renameZoneLabel.trim() });
      await loadData();
      renamingZoneId = null;
    } catch {
      error = "No se pudo renombrar la zona.";
    } finally {
      saving = false;
    }
  }

  async function deleteZone(id: string) {
    saving = true;
    try {
      // Unassign tables from this zone first
      const zoneTables = tables.filter((t) => t.zone === id);
      for (const t of zoneTables) {
        await pb.collection("reservations_tables").update(t.id, { zone: "" });
      }
      await pb.collection("reservations_zones").delete(id);
      await loadData();
      activeZoneId = zones.length > 0 ? zones[0].id : null;
    } catch {
      error = "No se pudo eliminar la zona.";
    } finally {
      saving = false;
    }
  }

  function goBack() {
    window.location.href = "/";
  }

  // Table dimensions in SVG units
  const TABLE_RADIUS = 5;
  const UNIT = 6; // Einzeltisch-Größe
  const GAP = 0.5; // Abstand zwischen Einzeltischen

  function tableRect(table: Table) {
    const w = table.width || 1;
    const totalW = w * UNIT + (w - 1) * GAP;
    const totalH = UNIT;
    // Rotation: swap w/h for 90/270
    const rot = table.rotation || 0;
    const isVertical = rot === 90 || rot === 270;
    return {
      w: isVertical ? totalH : totalW,
      h: isVertical ? totalW : totalH,
      unitCount: w,
      rotation: rot,
      rawW: totalW,
      rawH: totalH,
    };
  }
</script>

<div class="flex flex-col h-full animate-fade-in">
  <!-- Header -->
  <div class="shrink-0 bg-surface px-3 md:px-8 pt-4 md:pt-6 pb-3 space-y-3">
    <div class="flex items-center justify-between max-w-7xl mx-auto">
      <div class="flex items-center gap-2.5">
        <button
          on:click={goBack}
          class="p-2.5 -ml-2.5 hover:bg-surface-hover rounded-full transition-colors text-fg-muted"
          aria-label="Volver"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 class="text-sm font-medium text-fg-muted">Plano del restaurante</h1>
      </div>
      <div class="flex items-center gap-2">
        {#if editing}
          <button
            on:click={createTable}
            disabled={saving || (!activeZoneId && zones.length > 0)}
            class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-surface border border-border-default rounded-md text-fg-secondary hover:bg-surface-hover transition-colors disabled:opacity-70"
          >
            <Plus size={14} />
            <span>Añadir mesa</span>
          </button>
        {/if}
        <button
          on:click={() => { editing = !editing; selectedId = null; deletingId = null; }}
          class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors {editing
            ? 'bg-btn-primary-bg text-btn-primary-text hover:bg-btn-primary-hover'
            : 'bg-surface border border-border-default text-fg-secondary hover:bg-surface-hover'}"
        >
          {#if editing}
            <Lock size={14} />
            <span>Bloquear</span>
          {:else}
            <Pencil size={14} />
            <span>Editar</span>
          {/if}
        </button>
      </div>
    </div>

    {#if error}
      <div class="max-w-7xl mx-auto p-3 bg-error-bg border border-error-border text-error-text text-sm rounded-md flex items-start gap-2">
        <AlertTriangle size={16} class="mt-0.5 shrink-0" />
        <span>{error}</span>
      </div>
    {/if}
  </div>

  {#if loading}
    <div class="flex-1 flex items-center justify-center">
      <Loader2 class="animate-spin text-primary" size={32} />
    </div>
  {:else}
    <!-- Zone Tabs -->
    <div class="shrink-0 flex items-center gap-1.5 px-3 md:px-8 py-2 bg-surface border-b border-border-default overflow-x-auto no-scrollbar">
      {#each zones as zone (zone.id)}
        {#if renamingZoneId === zone.id}
          <form
            on:submit|preventDefault={saveRenameZone}
            class="shrink-0 inline-flex items-center gap-1"
          >
            <input
              type="text"
              bind:value={renameZoneLabel}
              class="w-28 px-2 py-1 text-xs bg-input-bg border border-border-default rounded-full text-fg focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <button type="submit" disabled={saving || !renameZoneLabel.trim()} class="p-1 text-arrived-check hover:bg-surface-hover rounded-full disabled:opacity-50">
              <Check size={14} />
            </button>
            <button type="button" on:click={() => (renamingZoneId = null)} class="p-1 text-fg-muted hover:text-fg-secondary rounded-full">
              <X size={14} />
            </button>
          </form>
        {:else}
          <button
            on:click={() => { activeZoneId = zone.id; selectedId = null; }}
            on:dblclick={() => { if (editing) startRenameZone(zone); }}
            class="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors {activeZoneId === zone.id
              ? 'bg-primary text-white'
              : 'bg-surface-alt text-fg-muted hover:text-fg-secondary hover:bg-surface-hover'}"
          >
            {zone.label}
            <span class="opacity-60">({tables.filter(t => t.zone === zone.id).length})</span>
          </button>
        {/if}
      {/each}

      {#if !zones.length && !editing}
        <span class="text-xs text-fg-muted">Sin zonas definidas — activa el modo edición para añadir zonas</span>
      {/if}

      {#if editing}
        {#if showNewZone}
          <form
            on:submit|preventDefault={createZone}
            class="shrink-0 inline-flex items-center gap-1"
          >
            <input
              type="text"
              bind:value={newZoneLabel}
              placeholder="Nombre..."
              class="w-28 px-2 py-1 text-xs bg-input-bg border border-border-default rounded-full text-fg placeholder-fg-muted focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <button
              type="submit"
              disabled={saving || !newZoneLabel.trim()}
              class="p-1 text-arrived-check hover:bg-surface-hover rounded-full disabled:opacity-50"
            >
              <Check size={14} />
            </button>
            <button
              type="button"
              on:click={() => { showNewZone = false; newZoneLabel = ""; }}
              class="p-1 text-fg-muted hover:text-fg-secondary rounded-full"
            >
              <X size={14} />
            </button>
          </form>
        {:else}
          <button
            on:click={() => (showNewZone = true)}
            class="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border border-dashed border-border-default text-fg-muted hover:text-fg-secondary hover:border-fg-muted transition-colors"
          >
            <Plus size={12} />
            Zona
          </button>
        {/if}

        {#if activeZoneId}
          <button
            on:click={() => { if (confirm("¿Eliminar esta zona? Las mesas se desasignarán.")) deleteZone(activeZoneId); }}
            class="shrink-0 p-1.5 text-fg-muted hover:text-error-text rounded-full transition-colors"
            aria-label="Eliminar zona"
          >
            <Trash2 size={13} />
          </button>
        {/if}
      {/if}
    </div>

    <div class="flex-1 min-h-0 flex flex-col md:flex-row">
      <!-- SVG Floor Plan -->
      <div class="flex-1 min-h-0 p-2 md:p-4">
        <div class="w-full h-full bg-surface-alt border border-border-default rounded-lg overflow-hidden relative">
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <svg
            bind:this={svgRef}
            viewBox="0 0 100 100"
            class="w-full h-full select-none"
            style="touch-action: none; -webkit-tap-highlight-color: transparent;"
            on:mousemove={onDrag}
            on:mouseup={endDrag}
            on:mouseleave={endDrag}
            on:touchmove={onDrag}
            on:touchend={endDrag}
          >
            <!-- Grid (subtle) -->
            {#each Array(9) as _, i}
              <line
                x1={(i + 1) * 10} y1="0" x2={(i + 1) * 10} y2="100"
                stroke="var(--border-light)" stroke-width="0.15"
              />
              <line
                x1="0" y1={(i + 1) * 10} x2="100" y2={(i + 1) * 10}
                stroke="var(--border-light)" stroke-width="0.15"
              />
            {/each}

            <!-- Tables -->
            {#each visibleTables as table (table.id)}
              {@const isSelected = editing && selectedId === table.id}
              {@const tr = tableRect(table)}
              <!-- svelte-ignore a11y_no_static_element_interactions -->
              <g
                on:mousedown={(e) => startDrag(e, table)}
                on:touchstart={(e) => startDrag(e, table)}
                on:click|stopPropagation={() => selectTable(table.id)}
                on:keydown={() => {}}
                class={editing ? "cursor-grab active:cursor-grabbing" : "cursor-default"}
                style="outline: none; -webkit-tap-highlight-color: transparent;"
              >
                {#if table.shape === "round"}
                  <circle
                    cx={table.x} cy={table.y} r={TABLE_RADIUS}
                    fill={isSelected ? "var(--btn-primary-bg)" : "var(--surface)"}
                    stroke={isSelected ? "var(--btn-primary-bg)" : "var(--border-default)"}
                    stroke-width="0.3"
                  />
                {:else}
                  <g transform="rotate({tr.rotation}, {table.x}, {table.y})">
                    {#each Array(tr.unitCount) as _, i}
                      <rect
                        x={table.x - tr.rawW / 2 + i * (UNIT + GAP)}
                        y={table.y - tr.rawH / 2}
                        width={UNIT}
                        height={UNIT}
                        rx="0.4"
                        fill={isSelected ? "var(--btn-primary-bg)" : "var(--surface)"}
                        stroke={isSelected ? "var(--btn-primary-bg)" : "var(--border-default)"}
                        stroke-width="0.3"
                      />
                    {/each}
                  </g>
                {/if}
                <text
                  x={table.x} y={table.y + tr.h / 2 + 2.5}
                  text-anchor="middle"
                  dominant-baseline="central"
                  font-size="2.2"
                  font-weight="500"
                  fill="var(--fg-secondary)"
                >
                  {table.label} · {table.seats}p
                </text>
              </g>
            {/each}
          </svg>

          {#if visibleTables.length === 0}
            <div class="absolute inset-0 flex flex-col items-center justify-center text-fg-muted pointer-events-none">
              {#if zones.length === 0}
                <p class="font-serif text-lg mb-1">Sin zonas</p>
                <p class="text-sm">Activa el modo edición para crear zonas y mesas</p>
              {:else}
                <p class="font-serif text-lg mb-1">Sin mesas en esta zona</p>
                {#if editing}
                  <p class="text-sm">Pulsa "Añadir mesa" para empezar</p>
                {/if}
              {/if}
            </div>
          {/if}
        </div>
      </div>

      <!-- Side Panel (selected table) -->
      {#if editing && selectedTable}
        <div class="shrink-0 w-full md:w-72 border-t md:border-t-0 md:border-l border-border-default bg-surface p-4 space-y-4 overflow-y-auto">
          <div class="flex items-center justify-between">
            <h2 class="text-sm font-medium text-fg">Editar mesa</h2>
            <button
              on:click={() => (selectedId = null)}
              class="p-1 text-fg-muted hover:text-fg-secondary"
            >
              <X size={16} />
            </button>
          </div>

          <div class="space-y-3">
            <div class="space-y-1">
              <label for="table-label" class="text-xs font-semibold uppercase tracking-wider text-fg-muted">
                Nombre
              </label>
              <input
                id="table-label"
                type="text"
                bind:value={editForm.label}
                class="w-full px-3 py-2 bg-input-bg border border-border-default rounded-sm text-sm text-fg focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div class="space-y-1">
              <span class="text-xs font-semibold uppercase tracking-wider text-fg-muted block">Comensales</span>
              <div class="grid grid-cols-3 gap-2">
                <div>
                  <label for="table-min" class="text-[10px] text-fg-muted">Mín</label>
                  <input id="table-min" type="number" min="1" max="20" bind:value={editForm.min_seats}
                    class="w-full px-2 py-1.5 bg-input-bg border border-border-default rounded-sm text-sm text-fg text-center focus:outline-none focus:ring-1 focus:ring-primary" />
                </div>
                <div>
                  <label for="table-seats" class="text-[10px] text-fg-muted">Normal</label>
                  <input id="table-seats" type="number" min="1" max="20" bind:value={editForm.seats}
                    class="w-full px-2 py-1.5 bg-input-bg border border-border-default rounded-sm text-sm text-fg text-center focus:outline-none focus:ring-1 focus:ring-primary" />
                </div>
                <div>
                  <label for="table-max" class="text-[10px] text-fg-muted">Máx</label>
                  <input id="table-max" type="number" min="1" max="20" bind:value={editForm.max_seats}
                    class="w-full px-2 py-1.5 bg-input-bg border border-border-default rounded-sm text-sm text-fg text-center focus:outline-none focus:ring-1 focus:ring-primary" />
                </div>
              </div>
            </div>

            <div class="space-y-1">
              <span class="text-xs font-semibold uppercase tracking-wider text-fg-muted block">Forma</span>
              <div class="flex gap-2">
                <button
                  type="button"
                  on:click={() => (editForm.shape = "round")}
                  class="flex-1 py-2 text-xs font-medium rounded-md border transition-colors {editForm.shape === 'round'
                    ? 'border-btn-active-border bg-btn-active-bg text-btn-active-text'
                    : 'border-border-default bg-input-bg text-fg-secondary hover:bg-surface-hover'}"
                >
                  Redonda
                </button>
                <button
                  type="button"
                  on:click={() => (editForm.shape = "rect")}
                  class="flex-1 py-2 text-xs font-medium rounded-md border transition-colors {editForm.shape === 'rect'
                    ? 'border-btn-active-border bg-btn-active-bg text-btn-active-text'
                    : 'border-border-default bg-input-bg text-fg-secondary hover:bg-surface-hover'}"
                >
                  Rectangular
                </button>
              </div>
            </div>

            {#if editForm.shape === "rect"}
              <div class="space-y-1">
                <label for="table-width" class="text-xs font-semibold uppercase tracking-wider text-fg-muted">
                  Mesas individuales
                </label>
                <input
                  id="table-width"
                  type="number"
                  min="1"
                  max="10"
                  bind:value={editForm.width}
                  class="w-full px-3 py-2 bg-input-bg border border-border-default rounded-sm text-sm text-fg focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div class="space-y-1">
                <span class="text-xs font-semibold uppercase tracking-wider text-fg-muted block">Rotación</span>
                <div class="flex gap-1.5">
                  {#each [0, 90, 180, 270] as r}
                    <button
                      type="button"
                      on:click={() => (editForm.rotation = r)}
                      class="flex-1 py-2 text-xs font-medium rounded-md border transition-colors {editForm.rotation === r
                        ? 'border-btn-active-border bg-btn-active-bg text-btn-active-text'
                        : 'border-border-default bg-input-bg text-fg-secondary hover:bg-surface-hover'}"
                    >
                      {r}°
                    </button>
                  {/each}
                </div>
              </div>
            {/if}
          </div>

          <div class="flex items-center justify-between pt-2 border-t border-border-light">
            {#if deletingId === selectedId}
              <div class="flex items-center gap-2 text-xs">
                <span class="text-error-text">¿Eliminar?</span>
                <button
                  on:click={() => deleteTable(selectedId)}
                  disabled={saving}
                  class="px-2 py-1 font-medium text-error-text hover:bg-error-bg rounded transition-colors disabled:opacity-70"
                >
                  Sí
                </button>
                <button
                  on:click={() => (deletingId = null)}
                  class="px-2 py-1 text-fg-muted hover:text-fg-secondary"
                >
                  No
                </button>
              </div>
            {:else}
              <button
                on:click={() => (deletingId = selectedId)}
                class="text-xs text-fg-muted hover:text-error-text flex items-center gap-1 transition-colors"
              >
                <Trash2 size={13} />
                Eliminar
              </button>
            {/if}
            <button
              on:click={saveTable}
              disabled={saving}
              class="px-4 py-2 text-xs font-medium bg-btn-primary-bg text-btn-primary-text rounded-sm hover:bg-btn-primary-hover disabled:opacity-70 flex items-center gap-1.5"
            >
              {#if saving}
                <Loader2 class="animate-spin" size={13} />
              {:else}
                <Check size={13} />
              {/if}
              Guardar
            </button>
          </div>
        </div>
      {/if}
    </div>
  {/if}
</div>
