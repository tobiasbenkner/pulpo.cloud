<script lang="ts">
  import { Check, X, Pencil, Trash2, Plus, ChevronUp, ChevronDown } from "lucide-svelte";
  import type { Table, TableGroup } from "../../lib/types";

  export let groups: TableGroup[] = [];
  export let tables: Table[] = [];
  export let activeGroupId: string | null = null;
  export let saving = false;
  export let groupColorMap: Map<string, string> = new Map();

  export let onClose: () => void = () => {};
  export let onSelectGroup: (id: string | null) => void = () => {};
  export let onCreateGroup: (label: string) => void = () => {};
  export let onRenameGroup: (id: string, label: string) => void = () => {};
  export let onDeleteGroup: (id: string) => void = () => {};
  export let onMoveGroup: (id: string, direction: "up" | "down") => void = () => {};
  export let onUpdateGroupColor: (id: string, color: string) => void = () => {};

  let newGroupLabel = "";
  let renamingGroupId: string | null = null;
  let renameGroupLabel = "";
  let renameGroupColor = "";
  let deletingGroupId: string | null = null;

  function startRename(group: TableGroup) { renamingGroupId = group.id; renameGroupLabel = group.label; renameGroupColor = group.color || "#6366f1"; }

  function submitRename() {
    if (!renamingGroupId || !renameGroupLabel.trim()) return;
    onRenameGroup(renamingGroupId, renameGroupLabel.trim());
    if (renameGroupColor) onUpdateGroupColor(renamingGroupId, renameGroupColor);
    renamingGroupId = null;
  }

  function submitCreate() {
    if (!newGroupLabel.trim()) return;
    onCreateGroup(newGroupLabel.trim());
    newGroupLabel = "";
  }
</script>

<div class="shrink-0 w-full md:w-80 border-t md:border-t-0 md:border-l border-border-default bg-surface p-4 space-y-4 overflow-y-auto">
  <div class="sticky top-0 bg-surface z-10 pb-3 space-y-3">
    <div class="flex items-center justify-between">
      <h2 class="text-sm font-medium text-fg">Grupos de mesas</h2>
      <button on:click={onClose} class="p-1 text-fg-muted hover:text-fg-secondary"><X size={16} /></button>
    </div>

    <form on:submit|preventDefault={submitCreate} class="flex gap-1.5">
      <input type="text" bind:value={newGroupLabel} placeholder="Nuevo grupo..."
        class="flex-1 px-3 py-2 bg-input-bg border border-border-default rounded-sm text-xs text-fg placeholder-fg-muted focus:outline-none focus:ring-1 focus:ring-primary" />
      <button type="submit" disabled={saving || !newGroupLabel.trim()}
        class="px-3 py-2 text-xs font-medium bg-btn-primary-bg text-btn-primary-text rounded-sm hover:bg-btn-primary-hover disabled:opacity-50">
        <Plus size={14} />
      </button>
    </form>

    {#if activeGroupId}
      {@const color = groupColorMap.get(activeGroupId) || "#6366f1"}
      <div class="p-3 rounded-lg border text-xs text-fg-muted" style="border-color: {color}; background: {color}10">
        Pulsa las mesas en el plano para añadirlas o quitarlas del grupo.
      </div>
    {/if}
  </div>

  <div class="space-y-1.5">
    {#each groups as group, idx (group.id)}
      {@const color = groupColorMap.get(group.id) || "#6366f1"}
      {@const isActive = activeGroupId === group.id}
      {@const isFirst = idx === 0}
      {@const isLast = idx === groups.length - 1}
      {#if renamingGroupId === group.id}
        <form on:submit|preventDefault={submitRename} class="flex items-center gap-1.5 p-2 border border-border-default rounded-lg">
          <input type="color" bind:value={renameGroupColor}
            class="size-6 rounded cursor-pointer border border-border-default shrink-0" />
          <input type="text" bind:value={renameGroupLabel}
            class="flex-1 px-2 py-1 text-xs bg-input-bg border border-border-default rounded-sm text-fg focus:outline-none focus:ring-1 focus:ring-primary" />
          <button type="submit" disabled={saving || !renameGroupLabel.trim()} class="p-1 text-arrived-check disabled:opacity-50"><Check size={13} /></button>
          <button type="button" on:click={() => (renamingGroupId = null)} class="p-1 text-fg-muted"><X size={13} /></button>
        </form>
      {:else}
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div
          on:click={() => onSelectGroup(isActive ? null : group.id)}
          on:keydown={() => {}}
          class="flex items-center gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-colors {isActive ? '' : 'border-border-default hover:bg-surface-alt'}"
          style={isActive ? `border-color: ${color}; background: ${color}10` : ""}
        >
          <div class="size-3 rounded-full shrink-0" style="background-color: {color}"></div>
          <div class="flex-1 min-w-0">
            <div class="text-sm font-medium text-fg truncate">{group.label}</div>
            <div class="text-[10px] text-fg-muted">
              {group.tables.length} mesas · {group.tables.reduce((s, id) => { const t = tables.find(t => t.id === id); return s + (t?.seats || 0); }, 0)}p
            </div>
          </div>
          <!-- Actions -->
          <div class="flex items-center gap-1 shrink-0" on:click|stopPropagation on:keydown|stopPropagation>
            <button on:click={() => onMoveGroup(group.id, "up")} disabled={isFirst || saving}
              class="p-1.5 text-fg-muted hover:text-fg-secondary hover:bg-surface-hover rounded transition-colors disabled:opacity-20"><ChevronUp size={16} /></button>
            <button on:click={() => onMoveGroup(group.id, "down")} disabled={isLast || saving}
              class="p-1.5 text-fg-muted hover:text-fg-secondary hover:bg-surface-hover rounded transition-colors disabled:opacity-20"><ChevronDown size={16} /></button>
            <button on:click={() => startRename(group)}
              class="p-1.5 text-fg-muted hover:text-fg-secondary hover:bg-surface-hover rounded transition-colors"><Pencil size={16} /></button>
            {#if deletingGroupId === group.id}
              <button on:click={() => { onDeleteGroup(group.id); deletingGroupId = null; }} disabled={saving}
                class="px-2.5 py-1.5 text-xs font-medium text-error-text hover:bg-error-bg rounded transition-colors disabled:opacity-70">Sí</button>
              <button on:click={() => (deletingGroupId = null)}
                class="px-2.5 py-1.5 text-xs text-fg-muted hover:bg-surface-hover rounded">No</button>
            {:else}
              <button on:click={() => (deletingGroupId = group.id)}
                class="p-1.5 text-fg-muted hover:text-error-text hover:bg-surface-hover rounded transition-colors"><Trash2 size={16} /></button>
            {/if}
          </div>
        </div>
      {/if}
    {/each}
  </div>

  {#if groups.length === 0}
    <p class="text-xs text-fg-muted text-center py-4">Sin grupos en esta zona.</p>
  {/if}
</div>
