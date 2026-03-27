<script lang="ts">
  import { onMount } from "svelte";
  import { pb } from "../../lib/pb";
  import { invalidateTurns } from "../../lib/turnsCache";
  import type { ReservationTurn } from "../../lib/types";
  import {
    ArrowLeft,
    Plus,
    Trash2,
    Loader2,
    AlertTriangle,
    GripVertical,
  } from "lucide-svelte";
  import TimePicker from "../../components/ui/TimePicker.svelte";

  let turns: ReservationTurn[] = [];
  let loading = true;
  let saving = false;
  let error: string | null = null;

  // Inline-Editing
  let editingId: string | null = null;
  let editForm = { label: "", start: "", color: "#6b7280" };

  // Neuer Turn
  let showNew = false;
  let newForm = { label: "", start: "", color: "#6b7280" };

  // Delete
  let deletingId: string | null = null;

  onMount(async () => {
    await loadTurns();
  });

  async function loadTurns() {
    loading = true;
    try {
      turns = await pb.collection("reservations_turns").getFullList<ReservationTurn>({
        sort: "start",
      });
    } catch {
      error = "No se pudieron cargar los turnos.";
    } finally {
      loading = false;
    }
  }

  function startEdit(turn: ReservationTurn) {
    editingId = turn.id;
    editForm = {
      label: turn.label,
      start: turn.start.substring(0, 5),
      color: turn.color || "#6b7280",
    };
  }

  function cancelEdit() {
    editingId = null;
  }

  async function saveEdit() {
    if (!editingId || !editForm.label.trim() || !editForm.start) return;
    saving = true;
    error = null;
    try {
      await pb.collection("reservations_turns").update(editingId, editForm);
      invalidateTurns();
      await loadTurns();
      editingId = null;
    } catch {
      error = "No se pudo guardar el turno.";
    } finally {
      saving = false;
    }
  }

  async function createTurn() {
    if (!newForm.label.trim() || !newForm.start) return;
    saving = true;
    error = null;
    try {
      await pb.collection("reservations_turns").create(newForm);
      invalidateTurns();
      await loadTurns();
      showNew = false;
      newForm = { label: "", start: "", color: "#6b7280" };
    } catch {
      error = "No se pudo crear el turno.";
    } finally {
      saving = false;
    }
  }

  async function deleteTurn(id: string) {
    saving = true;
    error = null;
    try {
      await pb.collection("reservations_turns").delete(id);
      invalidateTurns();
      await loadTurns();
      deletingId = null;
    } catch {
      error = "No se pudo eliminar el turno.";
    } finally {
      saving = false;
    }
  }

  function goBack() {
    window.location.href = "/";
  }
</script>

<div class="max-w-2xl mx-auto animate-fade-in px-3 py-4 md:pb-12 md:pt-8 md:px-0">
  <!-- Header -->
  <div class="flex items-center gap-2.5 mb-6">
    <button
      on:click={goBack}
      class="p-2.5 -ml-2.5 hover:bg-surface-hover rounded-full transition-colors text-fg-muted"
      aria-label="Volver"
    >
      <ArrowLeft size={20} />
    </button>
    <h1 class="text-sm font-medium text-fg-muted">Configuración de turnos</h1>
  </div>

  {#if error}
    <div class="mb-4 p-3 bg-error-bg border border-error-border text-error-text text-sm rounded-md flex items-start gap-2">
      <AlertTriangle size={16} class="mt-0.5 shrink-0" />
      <span>{error}</span>
    </div>
  {/if}

  {#if loading}
    <div class="flex justify-center items-center py-12">
      <Loader2 class="animate-spin text-primary" size={32} />
    </div>
  {:else}
    <!-- Turns List -->
    <div class="space-y-2 mb-4">
      {#each turns as turn (turn.id)}
        {#if editingId === turn.id}
          <!-- Edit Mode -->
          <form
            on:submit|preventDefault={saveEdit}
            class="flex items-center gap-2 p-3 bg-surface border border-primary/30 rounded-lg"
          >
            <input
              type="color"
              bind:value={editForm.color}
              class="size-8 rounded cursor-pointer border border-border-default shrink-0"
            />
            <input
              type="text"
              bind:value={editForm.label}
              placeholder="Nombre"
              required
              class="flex-1 min-w-0 px-2.5 py-1.5 bg-input-bg border border-border-default rounded-sm text-sm text-fg focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <div class="w-24 shrink-0">
              <TimePicker label="" bind:value={editForm.start} />
            </div>
            <button
              type="submit"
              disabled={saving}
              class="px-3 py-1.5 text-xs font-medium bg-btn-primary-bg text-btn-primary-text rounded-sm hover:bg-btn-primary-hover disabled:opacity-70"
            >
              {saving ? "..." : "Guardar"}
            </button>
            <button
              type="button"
              on:click={cancelEdit}
              class="px-3 py-1.5 text-xs font-medium text-fg-muted hover:text-fg-secondary"
            >
              Cancelar
            </button>
          </form>
        {:else}
          <!-- Display Mode -->
          <div class="flex items-center gap-3 p-3 bg-surface border border-border-default rounded-lg group">
            <div class="shrink-0 text-fg-muted/40">
              <GripVertical size={14} />
            </div>
            <div
              class="shrink-0 size-4 rounded-full border border-border-default"
              style="background-color: {turn.color}"
            ></div>
            <span class="flex-1 text-sm font-medium text-fg">{turn.label}</span>
            <span class="text-sm text-fg-muted font-mono">{turn.start.substring(0, 5)}</span>
            <button
              on:click={() => startEdit(turn)}
              class="px-2 py-1 text-xs text-fg-muted hover:text-fg-secondary opacity-0 group-hover:opacity-100 transition-opacity"
            >
              Editar
            </button>
            {#if deletingId === turn.id}
              <div class="flex items-center gap-1">
                <button
                  on:click={() => deleteTurn(turn.id)}
                  disabled={saving}
                  class="px-2 py-1 text-xs font-medium text-error-text hover:bg-error-bg rounded transition-colors disabled:opacity-70"
                >
                  {saving ? "..." : "Sí"}
                </button>
                <button
                  on:click={() => (deletingId = null)}
                  class="px-2 py-1 text-xs text-fg-muted hover:text-fg-secondary"
                >
                  No
                </button>
              </div>
            {:else}
              <button
                on:click={() => (deletingId = turn.id)}
                class="p-1 text-fg-muted hover:text-error-text opacity-0 group-hover:opacity-100 transition-all"
                aria-label="Eliminar turno"
              >
                <Trash2 size={14} />
              </button>
            {/if}
          </div>
        {/if}
      {/each}

      {#if turns.length === 0 && !showNew}
        <p class="text-center text-fg-muted text-sm py-8">
          No hay turnos definidos.
        </p>
      {/if}
    </div>

    <!-- New Turn Form -->
    {#if showNew}
      <form
        on:submit|preventDefault={createTurn}
        class="flex items-center gap-2 p-3 bg-surface border border-primary/30 rounded-lg mb-4"
      >
        <input
          type="color"
          bind:value={newForm.color}
          class="size-8 rounded cursor-pointer border border-border-default shrink-0"
        />
        <input
          type="text"
          bind:value={newForm.label}
          placeholder="Nombre del turno"
          required
          class="flex-1 min-w-0 px-2.5 py-1.5 bg-input-bg border border-border-default rounded-sm text-sm text-fg placeholder-fg-muted focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <div class="w-24 shrink-0">
          <TimePicker label="" bind:value={newForm.start} />
        </div>
        <button
          type="submit"
          disabled={saving}
          class="px-3 py-1.5 text-xs font-medium bg-btn-primary-bg text-btn-primary-text rounded-sm hover:bg-btn-primary-hover disabled:opacity-70"
        >
          {saving ? "..." : "Crear"}
        </button>
        <button
          type="button"
          on:click={() => (showNew = false)}
          class="px-3 py-1.5 text-xs font-medium text-fg-muted hover:text-fg-secondary"
        >
          Cancelar
        </button>
      </form>
    {/if}

    <!-- Add Button -->
    {#if !showNew}
      <button
        on:click={() => (showNew = true)}
        class="w-full py-2.5 border border-dashed border-border-default rounded-lg text-sm text-fg-muted hover:text-fg-secondary hover:border-fg-muted transition-colors flex items-center justify-center gap-2"
      >
        <Plus size={16} />
        Añadir turno
      </button>
    {/if}
  {/if}
</div>
