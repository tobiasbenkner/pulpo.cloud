<script lang="ts">
  import { Check, X, Clock, Users, Link } from "lucide-svelte";
  import type { Reservation, Table, TableGroup } from "../../lib/types";

  export let date: string;
  export let time: string;
  export let pax: number;
  export let reservationId: string;
  export let reservations: Reservation[] = [];
  export let selectedTableIds: string[] = [];
  export let tables: Table[] = [];
  export let groups: TableGroup[] = [];
  export let occupiedTableIds: Set<string> = new Set();
  export let fixedTableIds: Set<string> = new Set();
  export let saving = false;

  export let onSelect: (tableIds: string[]) => void = () => {};
  export let onSave: () => void = () => {};
  export let onCancel: () => void = () => {};

  $: selectedTables = selectedTableIds.map((id) => tables.find((t) => t.id === id)).filter(Boolean) as Table[];
  $: totalSeats = selectedTables.reduce((s, t) => s + t.seats, 0);

  // Gruppen: alle Tische frei?
  $: availableGroups = groups
    .map((g) => {
      const groupTables = g.tables.map((id) => tables.find((t) => t.id === id)).filter(Boolean) as Table[];
      const allFree = g.tables.every((id) => !fixedTableIds.has(id));
      const seats = groupTables.reduce((s, t) => s + t.seats, 0);
      return { ...g, groupTables, allFree, totalSeats: seats };
    })
    .filter((g) => g.allFree && g.groupTables.length > 0);

  function selectGroup(group: typeof availableGroups[0]) {
    onSelect(group.groupTables.map((t) => t.id));
  }

  function clearSelection() {
    onSelect([]);
  }

  $: matchedGroup = selectedTableIds.length > 1
    ? groups.find((g) => g.tables.length === selectedTableIds.length && selectedTableIds.every((id) => g.tables.includes(id)))
    : null;
</script>

<div class="shrink-0 w-full md:w-80 border-t md:border-t-0 md:border-l border-border-default bg-surface p-4 space-y-4 overflow-y-auto">
  <div class="flex items-center justify-between">
    <h2 class="text-sm font-medium text-fg">Asignar mesa</h2>
    <button on:click={onCancel} class="p-1 text-fg-muted hover:text-fg-secondary"><X size={16} /></button>
  </div>

  <!-- Context -->
  <div class="space-y-1.5 p-3 bg-surface-alt rounded-lg border border-border-default">
    <div class="flex items-center gap-2 text-xs text-fg-secondary">
      <Clock size={13} />
      <span>{date} · {time}</span>
    </div>
    <div class="flex items-center gap-2 text-xs text-fg-secondary">
      <Users size={13} />
      <span>{pax} comensales</span>
    </div>
  </div>

  <!-- Current selection -->
  {#if selectedTables.length > 0}
    <div class="space-y-1.5 p-3 rounded-lg border border-arrived-check/30 bg-arrived-bg">
      <div class="flex items-center justify-between">
        <span class="text-xs font-semibold uppercase tracking-wider text-arrived-text">Selección</span>
        <button on:click={clearSelection} class="text-[10px] text-fg-muted hover:text-error-text">Quitar</button>
      </div>
      <div class="flex flex-wrap gap-1.5">
        {#each selectedTables as table}
          <span class="px-2 py-0.5 text-xs rounded bg-arrived-check/10 text-arrived-text font-medium">
            {table.label} · {table.seats}p
          </span>
        {/each}
      </div>
      {#if matchedGroup}
        <p class="text-[10px] text-arrived-text">Grupo: {matchedGroup.label}</p>
      {/if}
      <p class="text-[10px] text-fg-muted">
        Total: {totalSeats}p
        {#if totalSeats < pax}
          <span class="text-error-text"> — faltan {pax - totalSeats}</span>
        {:else}
          <span class="text-arrived-text"> — suficiente</span>
        {/if}
      </p>
    </div>
  {:else}
    <p class="text-xs text-fg-muted italic">Pulsa una mesa en el plano o selecciona un grupo.</p>
  {/if}

  <!-- Available groups -->
  {#if availableGroups.length > 0}
    <div class="space-y-1.5">
      <span class="text-xs font-semibold uppercase tracking-wider text-fg-muted flex items-center gap-1.5">
        <Link size={11} /> Grupos disponibles
      </span>
      <div class="space-y-1">
        {#each availableGroups as group (group.id)}
          {@const isChosen = selectedTableIds.length > 1 && group.groupTables.every((t) => selectedTableIds.includes(t.id)) && selectedTableIds.length === group.groupTables.length}
          {@const fits = group.totalSeats >= pax}
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <div
            on:click={() => selectGroup(group)}
            on:keydown={() => {}}
            class="px-3 py-2.5 rounded-md border cursor-pointer transition-colors {isChosen
              ? 'border-arrived-check bg-arrived-bg'
              : 'border-border-default hover:bg-surface-alt'}"
          >
            <div class="flex items-center gap-2.5">
              <span class="text-sm font-medium text-fg">{group.label}</span>
              <span class="text-xs text-fg-muted">{group.totalSeats}p</span>
              <div class="flex-1"></div>
              {#if fits}
                <span class="text-[10px] text-arrived-text">✓</span>
              {/if}
            </div>
            <div class="flex flex-wrap gap-1 mt-1">
              {#each group.groupTables as table}
                <span class="text-[10px] text-fg-muted">{table.label}</span>
              {/each}
            </div>
          </div>
        {/each}
      </div>
    </div>
  {/if}

  <!-- Actions -->
  <div class="flex gap-2 pt-2 border-t border-border-light sticky bottom-0 bg-surface pb-1">
    <button on:click={onCancel}
      class="flex-1 px-4 py-2.5 text-xs font-medium text-fg-secondary border border-border-default rounded-sm hover:bg-surface-hover transition-colors">
      Cancelar
    </button>
    <button on:click={onSave} disabled={saving || selectedTableIds.length === 0}
      class="flex-1 px-4 py-2.5 text-xs font-medium bg-btn-primary-bg text-btn-primary-text rounded-sm hover:bg-btn-primary-hover disabled:opacity-50 flex items-center justify-center gap-1.5">
      {#if saving}<span>...</span>{:else}<Check size={14} /> Asignar{/if}
    </button>
  </div>
</div>
