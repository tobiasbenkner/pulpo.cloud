<script lang="ts">
  import { Check, X, Trash2, Loader2 } from "lucide-svelte";

  export let editForm: { label: string; seats: number; min_seats: number; max_seats: number; shape: "round" | "rect"; rotation: number; width: number };
  export let saving = false;
  export let deletingId: string | null = null;
  export let selectedId: string | null = null;

  export let onSave: () => void = () => {};
  export let onClose: () => void = () => {};
  export let onDelete: (id: string) => void = () => {};
  export let onRequestDelete: () => void = () => {};
  export let onCancelDelete: () => void = () => {};
</script>

<div class="shrink-0 w-full md:w-72 border-t md:border-t-0 md:border-l border-border-default bg-surface p-4 space-y-4 overflow-y-auto">
  <div class="flex items-center justify-between">
    <h2 class="text-sm font-medium text-fg">Editar mesa</h2>
    <button on:click={onClose} class="p-1 text-fg-muted hover:text-fg-secondary"><X size={16} /></button>
  </div>

  <div class="space-y-3">
    <div class="space-y-1">
      <label for="table-label" class="text-xs font-semibold uppercase tracking-wider text-fg-muted">Nombre</label>
      <input id="table-label" type="text" bind:value={editForm.label}
        class="w-full px-3 py-2 bg-input-bg border border-border-default rounded-sm text-sm text-fg focus:outline-none focus:ring-1 focus:ring-primary" />
    </div>

    <div class="space-y-1">
      <span class="text-xs font-semibold uppercase tracking-wider text-fg-muted block">Comensales</span>
      <div class="grid grid-cols-3 gap-2">
        <div><label for="table-min" class="text-[10px] text-fg-muted">Mín</label>
          <input id="table-min" type="number" min="1" max="20" bind:value={editForm.min_seats} class="w-full px-2 py-1.5 bg-input-bg border border-border-default rounded-sm text-sm text-fg text-center focus:outline-none focus:ring-1 focus:ring-primary" /></div>
        <div><label for="table-seats" class="text-[10px] text-fg-muted">Normal</label>
          <input id="table-seats" type="number" min="1" max="20" bind:value={editForm.seats} class="w-full px-2 py-1.5 bg-input-bg border border-border-default rounded-sm text-sm text-fg text-center focus:outline-none focus:ring-1 focus:ring-primary" /></div>
        <div><label for="table-max" class="text-[10px] text-fg-muted">Máx</label>
          <input id="table-max" type="number" min="1" max="20" bind:value={editForm.max_seats} class="w-full px-2 py-1.5 bg-input-bg border border-border-default rounded-sm text-sm text-fg text-center focus:outline-none focus:ring-1 focus:ring-primary" /></div>
      </div>
    </div>

    <div class="space-y-1">
      <span class="text-xs font-semibold uppercase tracking-wider text-fg-muted block">Forma</span>
      <div class="flex gap-2">
        <button type="button" on:click={() => (editForm.shape = "round")}
          class="flex-1 py-2 text-xs font-medium rounded-md border transition-colors {editForm.shape === 'round'
            ? 'border-btn-active-border bg-btn-active-bg text-btn-active-text'
            : 'border-border-default bg-input-bg text-fg-secondary hover:bg-surface-hover'}">Redonda</button>
        <button type="button" on:click={() => (editForm.shape = "rect")}
          class="flex-1 py-2 text-xs font-medium rounded-md border transition-colors {editForm.shape === 'rect'
            ? 'border-btn-active-border bg-btn-active-bg text-btn-active-text'
            : 'border-border-default bg-input-bg text-fg-secondary hover:bg-surface-hover'}">Rectangular</button>
      </div>
    </div>

    {#if editForm.shape === "rect"}
      <div class="space-y-1">
        <label for="table-width" class="text-xs font-semibold uppercase tracking-wider text-fg-muted">Mesas individuales</label>
        <input id="table-width" type="number" min="1" max="10" bind:value={editForm.width}
          class="w-full px-3 py-2 bg-input-bg border border-border-default rounded-sm text-sm text-fg focus:outline-none focus:ring-1 focus:ring-primary" />
      </div>
      <div class="space-y-1">
        <span class="text-xs font-semibold uppercase tracking-wider text-fg-muted block">Rotación</span>
        <div class="flex gap-1.5">
          {#each [0, 90, 180, 270] as r}
            <button type="button" on:click={() => (editForm.rotation = r)}
              class="flex-1 py-2 text-xs font-medium rounded-md border transition-colors {editForm.rotation === r
                ? 'border-btn-active-border bg-btn-active-bg text-btn-active-text'
                : 'border-border-default bg-input-bg text-fg-secondary hover:bg-surface-hover'}">{r}°</button>
          {/each}
        </div>
      </div>
    {/if}
  </div>

  <div class="flex items-center justify-between pt-2 border-t border-border-light">
    {#if deletingId === selectedId}
      <div class="flex items-center gap-2 text-xs">
        <span class="text-error-text">¿Eliminar?</span>
        <button on:click={() => onDelete(selectedId)} disabled={saving} class="px-2 py-1 font-medium text-error-text hover:bg-error-bg rounded transition-colors disabled:opacity-70">Sí</button>
        <button on:click={onCancelDelete} class="px-2 py-1 text-fg-muted hover:text-fg-secondary">No</button>
      </div>
    {:else}
      <button on:click={onRequestDelete} class="text-xs text-fg-muted hover:text-error-text flex items-center gap-1 transition-colors">
        <Trash2 size={13} /> Eliminar
      </button>
    {/if}
    <button on:click={onSave} disabled={saving}
      class="px-4 py-2 text-xs font-medium bg-btn-primary-bg text-btn-primary-text rounded-sm hover:bg-btn-primary-hover disabled:opacity-70 flex items-center gap-1.5">
      {#if saving}<Loader2 class="animate-spin" size={13} />{:else}<Check size={13} />{/if} Guardar
    </button>
  </div>
</div>
