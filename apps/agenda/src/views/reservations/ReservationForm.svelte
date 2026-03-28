<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { pb } from "../../lib/pb";
  import { loadTurns } from "../../lib/turnsCache";
  import { getOccupiedTableIds, computeTableAssignments } from "../../lib/tableAssignment";
  import { reservationDraft, clearDraft } from "../../stores/reservationDraftStore";
  import type { Reservation, ReservationTurn, Table, TableGroup, User as UserType } from "../../lib/types";
  import {
    ArrowLeft,
    Save,
    Loader2,
    User,
    Phone,
    AlignLeft,
    Trash2,
    AlertTriangle,
    Users,
    Plus,
    Clock,
    MapPin,
    X,
  } from "lucide-svelte";
  import DatePicker from "../../components/ui/DatePicker.svelte";
  import TimePicker from "../../components/ui/TimePicker.svelte";
  import { es } from "date-fns/locale";

  export let id: string | null = null;

  $: isEditMode = !!id;

  let isLoading = true;
  let isSaving = false;
  let isDeleting = false;
  let error: string | null = null;
  let tableConflict = false;
  let showDeleteConfirm = false;
  let showCapacityWarning = false;
  let turns: ReservationTurn[] = [];
  let users: UserType[] = [];
  let fixedTables: Table[] = [];
  let allTables: Table[] = [];
  let groups: TableGroup[] = [];
  let allReservations: Reservation[] = [];

  let formData = {
    date: new Date().toISOString().split("T")[0],
    time: "",
    name: "",
    contact: "",
    person_count: "2",
    notes: "",
    user: "",
    duration: 90,
    reservations_tables: [] as string[],
  };

  let originalDate = "";

  onMount(async () => {
    if (isEditMode && id) {
      try {
        const res = await pb.collection("reservations").getOne(id, { expand: "user,reservations_tables" });
        formData = {
          date: res.date,
          time: res.time ? res.time.substring(0, 5) : "",
          name: res.name,
          contact: res.contact || "",
          person_count: res.person_count || "2",
          notes: res.notes || "",
          user: res.user || "",
          duration: res.duration || 90,
          reservations_tables: res.reservations_tables || [],
        };
        fixedTables = res.expand?.reservations_tables || [];
        originalDate = res.date;
      } catch (e) {
        error = "No se pudo cargar la reserva.";
      }
    } else {
      // Restore draft if available (coming back from floorplan)
      const draft = $reservationDraft;
      if (draft) {
        formData = { ...draft };
        clearDraft();
      } else {
        const params = new URLSearchParams(window.location.search);
        const dateParam = params.get("date");
        if (dateParam) formData.date = dateParam;
      }
    }
    isLoading = false;

    // Load tables and reservations for conflict detection
    pb.collection("reservations_tables").getFullList<Table>({ sort: "label" }).then((t) => {
      allTables = t;
      fixedTables = t.filter((t) => formData.reservations_tables.includes(t.id));
    }).catch(() => {});
    pb.collection("reservations_table_groups").getFullList<TableGroup>({ sort: "sort,label" }).then((g) => (groups = g)).catch(() => {});
    pb.collection("reservations").getFullList<Reservation>().then((r) => (allReservations = r)).catch(() => {});

    const { cached, fresh } = loadTurns();
    if (cached) turns = cached;
    fresh.then((t) => (turns = t)).catch(() => {});
    pb.collection("users").getFullList<UserType>().then((u) => (users = u)).catch(() => {});
    if (!formData.user && pb.authStore.record) formData.user = pb.authStore.record.id;
  });

  // Check for table conflicts when time/date changes
  $: if (formData.time && formData.date && formData.reservations_tables.length > 0 && allReservations.length) {
    const occupied = getOccupiedTableIds(allReservations, formData.date, formData.time, formData.duration, 15, id || undefined);
    tableConflict = formData.reservations_tables.some((tid) => occupied.has(tid));
  } else {
    tableConflict = false;
  }

  function selectTurn(turn: ReservationTurn) {
    formData.time = turn.start.substring(0, 5);
    if (turn.duration) formData.duration = turn.duration;
  }

  function clearFixedTables() {
    formData.reservations_tables = [];
    fixedTables = [];
    tableConflict = false;
  }

  function navigateToFloorplan() {
    // Save draft so form data is preserved
    if (!isEditMode) {
      reservationDraft.set({ ...formData });
    }
    window.location.href = `/floorplan?date=${formData.date}&time=${formData.time}&pax=${formData.person_count}&reservation=${id || ''}`;
  }

  async function handleSubmit(force = false) {
    isSaving = true;
    error = null;
    showCapacityWarning = false;

    try {
      // Frische Daten laden
      const freshReservations = await pb.collection("reservations").getFullList<Reservation>({
        filter: `date = "${formData.date}"`,
      });

      // Fixierte Tische: Doppelbelegung prüfen
      if (formData.reservations_tables.length > 0) {
        const occupied = getOccupiedTableIds(freshReservations, formData.date, formData.time, formData.duration, 15, id || undefined);
        if (formData.reservations_tables.some((tid) => occupied.has(tid))) {
          error = "No se puede guardar: la mesa asignada está ocupada a esta hora.";
          allReservations = freshReservations;
          isSaving = false;
          return;
        }
      }

      // Kapazitätsprüfung nur wenn kein Tisch fixiert ist
      if (!force && formData.reservations_tables.length === 0) {
        if (!allTables.length) {
          try {
            allTables = await pb.collection("reservations_tables").getFullList<Table>({ sort: "label" });
            groups = await pb.collection("reservations_table_groups").getFullList<TableGroup>({ sort: "sort,label" });
          } catch {}
        }
        if (allTables.length > 0) {
          const allForDay = [
            ...freshReservations.filter((r) => r.id !== id),
            { ...formData, id: id || "__new__", reservations_tables: [] } as any,
          ];
          const { unassigned } = computeTableAssignments(allForDay, allTables, groups);
          if (unassigned.length > 0) {
            showCapacityWarning = true;
            isSaving = false;
            return;
          }
        }
      }
    } catch {
      // If check fails, proceed with save
    }

    await doSave();
  }

  async function doSave() {
    isSaving = true;
    error = null;
    showCapacityWarning = false;
    try {
      if (isEditMode && id) {
        await pb.collection("reservations").update(id, formData);
      } else {
        await pb.collection("reservations").create(formData);
      }
      clearDraft();
      window.location.href = `/?date=${formData.date}`;
    } catch (e) {
      console.error(e);
      error = isEditMode
        ? "Error al guardar los cambios."
        : "Error al crear la reserva.";
      isSaving = false;
    }
  }

  async function handleDelete() {
    if (!id) return;
    isDeleting = true;
    try {
      await pb.collection("reservations").delete(id);
      clearDraft();
      window.location.href = `/?date=${formData.date}`;
    } catch (e) {
      error = "Error al eliminar.";
      isDeleting = false;
      showDeleteConfirm = false;
    }
  }

  function goBack() {
    clearDraft();
    const targetDate = originalDate || formData.date || new Date().toISOString().split("T")[0];
    window.location.href = `/?date=${targetDate}`;
  }
</script>

<div
  class="max-w-2xl mx-auto animate-fade-in px-3 py-4 md:pb-12 md:pt-8 md:px-0"
>
  {#if isLoading}
    <div class="flex justify-center items-center py-12">
      <Loader2 class="animate-spin text-primary" size={32} />
    </div>
  {:else}
    <div>
      <!-- Header -->
      <div class="flex items-center gap-2.5 mb-4">
        <button
          on:click={goBack}
          class="p-1 hover:bg-surface-hover rounded-full transition-colors text-fg-muted"
          aria-label="Volver"
        >
          <ArrowLeft size={16} />
        </button>
        <h1 class="text-sm font-medium text-fg-muted">
          {isEditMode ? "Editar reserva" : "Nueva reserva"}
        </h1>
      </div>

      {#if error}
        <div
          class="mb-4 p-3 bg-error-bg border border-error-border text-error-text text-sm rounded-md flex items-start gap-2"
        >
          <AlertTriangle size={16} class="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      {/if}

      <form on:submit|preventDefault={() => handleSubmit(false)} class="space-y-4">
        <!-- Date & Time -->
        <div class="grid grid-cols-2 gap-3 md:gap-6">
          <DatePicker
            label="Fecha"
            bind:value={formData.date}
            locale={es}
            placeholder="Seleccionar fecha"
          />

          <TimePicker label="Hora" bind:value={formData.time} />
        </div>

        {#if turns.length > 0}
          <div
            class="grid grid-cols-[repeat(auto-fit,minmax(120px,1fr))] gap-1.5"
          >
            {#each turns as turn}
              <button
                type="button"
                on:click={() => selectTurn(turn)}
                class="px-2.5 py-1 text-xs rounded-md border transition-colors {formData.time ===
                turn.start.substring(0, 5)
                  ? 'border-btn-active-border bg-btn-active-bg text-btn-active-text'
                  : 'border-border-default bg-input-bg text-fg-secondary hover:border-fg-muted hover:bg-surface-hover'}"
              >
                {turn.label} · {turn.start.substring(0, 5)}
              </button>
            {/each}
          </div>
        {/if}

        <!-- Name & Person Count -->
        <div class="grid grid-cols-3 gap-3 md:gap-6">
          <div class="col-span-2 space-y-1">
            <label
              for="name"
              class="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-fg-muted"
            >
              <User size={14} /> Nombre
            </label>
            <input
              id="name"
              type="text"
              required
              bind:value={formData.name}
              placeholder="Nombre del cliente"
              class="w-full px-3 py-2.5 bg-input-bg border border-border-default rounded-sm text-sm text-fg placeholder-fg-muted focus:outline-none focus:ring-1 focus:ring-primary focus:bg-surface transition-all"
            />
          </div>

          <div class="space-y-1">
            <label
              for="person_count"
              class="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-fg-muted"
            >
              <Users size={14} /> Pax
            </label>
            <input
              id="person_count"
              type="number"
              min="1"
              max="99"
              bind:value={formData.person_count}
              class="w-full px-3 py-2.5 bg-input-bg border border-border-default rounded-sm text-sm text-fg focus:outline-none focus:ring-1 focus:ring-primary focus:bg-surface transition-all"
            />
          </div>
        </div>

        <!-- Contact -->
        <div class="space-y-1">
          <label
            for="contact"
            class="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-fg-muted"
          >
            <Phone size={14} /> Contacto
          </label>
          <input
            id="contact"
            type="text"
            bind:value={formData.contact}
            placeholder="Teléfono o correo electrónico"
            class="w-full px-3 py-2.5 bg-input-bg border border-border-default rounded-sm text-sm text-fg placeholder-fg-muted focus:outline-none focus:ring-1 focus:ring-primary focus:bg-surface transition-all"
          />
        </div>

        <!-- User -->
        {#if users.length > 0}
          <div class="space-y-1">
            <label
              class="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-fg-muted"
            >
              <User size={14} /> Creado por
            </label>
            <div class="flex flex-wrap gap-1.5">
              {#each users as u}
                <button
                  type="button"
                  on:click={() =>
                    (formData.user = formData.user === u.id ? "" : u.id)}
                  class="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md border transition-colors {formData.user ===
                  u.id
                    ? 'border-btn-active-border bg-btn-active-bg text-btn-active-text'
                    : 'border-border-default bg-input-bg text-fg-secondary hover:border-fg-muted hover:bg-surface-hover'}"
                >
                  {#if u.avatar}
                    <img
                      src={pb.files.getURL(u, u.avatar, { thumb: "36x36" })}
                      alt=""
                      class="size-4 rounded-full object-cover"
                    />
                  {/if}
                  {u.name || "?"}
                </button>
              {/each}
            </div>
          </div>
        {/if}

        <!-- Duration -->
        <div class="space-y-1">
          <label
            for="duration"
            class="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-fg-muted"
          >
            <Clock size={14} /> Duración (min)
          </label>
          <input
            id="duration"
            type="number"
            min="15"
            max="480"
            step="15"
            bind:value={formData.duration}
            class="w-full px-3 py-2.5 bg-input-bg border border-border-default rounded-sm text-sm text-fg focus:outline-none focus:ring-1 focus:ring-primary focus:bg-surface transition-all"
          />
        </div>

        <!-- Fixed Table -->
        <div class="space-y-1.5">
          <span class="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-fg-muted">
            <MapPin size={14} /> Mesa
          </span>
          {#if fixedTables.length > 0}
            <div class="flex flex-wrap items-center gap-1.5">
              {#each fixedTables as table}
                <span class="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-md border {tableConflict
                  ? 'border-error-border bg-error-bg text-error-text'
                  : 'border-btn-active-border bg-btn-active-bg text-btn-active-text'}">
                  {table.label} · {table.seats}p
                </span>
              {/each}
              <button type="button" on:click={clearFixedTables}
                class="p-1 text-fg-muted hover:text-error-text transition-colors">
                <X size={14} />
              </button>
            </div>
            {#if tableConflict}
              <p class="text-xs text-error-text flex items-center gap-1.5">
                <AlertTriangle size={13} />
                Mesa ocupada a esta hora. Cambia la hora o quita la mesa.
              </p>
            {/if}
          {:else}
            <p class="text-xs text-fg-muted italic">Asignación automática — se calculará según disponibilidad.</p>
          {/if}
          {#if formData.time}
            <button
              type="button"
              on:click={navigateToFloorplan}
              class="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md border border-border-default bg-input-bg text-fg-secondary hover:bg-surface-hover transition-colors"
            >
              <MapPin size={14} />
              {fixedTables.length > 0 ? "Cambiar mesa" : "Fijar mesa en el plano"}
            </button>
          {:else}
            <span class="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md border border-border-default bg-input-bg text-fg-muted/50 cursor-not-allowed">
              <MapPin size={14} />
              Fijar mesa en el plano
            </span>
          {/if}
        </div>

        <!-- Notes -->
        <div class="space-y-1">
          <label
            for="notes"
            class="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-fg-muted"
          >
            <AlignLeft size={14} /> Notas
          </label>
          <textarea
            id="notes"
            rows="4"
            bind:value={formData.notes}
            placeholder="Peticiones especiales, alergias, etc."
            class="w-full px-3 py-2.5 bg-input-bg border border-border-default rounded-sm text-sm text-fg placeholder-fg-muted focus:outline-none focus:ring-1 focus:ring-primary focus:bg-surface transition-all resize-none"
          ></textarea>
        </div>

        <!-- Action Bar -->
        <div
          class="pt-4 border-t border-border-light flex items-center justify-between"
        >
          <!-- Delete Button (Left) - Only in Edit Mode -->
          <div>
            {#if isEditMode}
              <button
                type="button"
                on:click={() => (showDeleteConfirm = true)}
                class="text-delete hover:text-delete-hover text-sm font-medium flex items-center gap-1.5 px-2 py-2 -ml-2 rounded hover:bg-error-bg transition-colors"
              >
                <Trash2 size={16} /> <span>Eliminar</span>
              </button>
            {/if}
          </div>

          <!-- Save Button (Right) -->
          <div>
            <button
              type="submit"
              disabled={isSaving}
              class="bg-btn-primary-bg text-btn-primary-text px-6 py-2.5 rounded-sm hover:bg-btn-primary-hover transition-all flex items-center gap-2 shadow-md shadow-[var(--shadow-color)] disabled:opacity-70 disabled:cursor-not-allowed font-medium tracking-wide"
            >
              {#if isSaving}
                <Loader2 class="animate-spin" size={18} />
                <span>Guardando...</span>
              {:else if isEditMode}
                <Save size={18} />
                <span>Actualizar</span>
              {:else}
                <Plus size={18} />
                <span>Crear</span>
              {/if}
            </button>
          </div>
        </div>
      </form>
    </div>
  {/if}
</div>

<!-- Delete Confirmation Dialog -->
<!-- Capacity Warning Dialog -->
{#if showCapacityWarning}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
    on:click|self={() => (showCapacityWarning = false)}
    on:keydown={(e) => e.key === "Escape" && (showCapacityWarning = false)}
  >
    <div class="bg-surface rounded-lg shadow-xl w-full max-w-sm p-6 animate-fade-in">
      <div class="flex items-center gap-3 mb-3">
        <div class="p-2 bg-warning-icon-bg rounded-full">
          <AlertTriangle size={20} class="text-warning-icon" />
        </div>
        <h2 class="text-base font-semibold text-fg">Sin mesa disponible</h2>
      </div>

      <p class="text-sm text-fg-muted mb-6">
        No hay suficientes mesas disponibles para todas las reservas a esta hora. ¿Deseas guardar de todas formas?
      </p>

      <div class="flex justify-end gap-2">
        <button
          type="button"
          on:click={() => (showCapacityWarning = false)}
          class="px-4 py-2 text-sm font-medium text-fg-secondary hover:text-fg rounded-md hover:bg-surface-hover transition-colors"
        >
          Cancelar
        </button>
        <button
          type="button"
          on:click={doSave}
          disabled={isSaving}
          class="px-4 py-2 text-sm font-medium text-white bg-warning-icon hover:opacity-90 rounded-md transition-colors disabled:opacity-70 flex items-center gap-2"
        >
          {#if isSaving}
            <Loader2 class="animate-spin" size={14} />
            Guardando...
          {:else}
            Guardar de todas formas
          {/if}
        </button>
      </div>
    </div>
  </div>
{/if}

{#if showDeleteConfirm}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
    on:click|self={() => (showDeleteConfirm = false)}
    on:keydown={(e) => e.key === "Escape" && (showDeleteConfirm = false)}
  >
    <div
      class="bg-surface rounded-lg shadow-xl w-full max-w-sm p-6 animate-fade-in"
    >
      <div class="flex items-center gap-3 mb-3">
        <div class="p-2 bg-error-bg rounded-full">
          <AlertTriangle size={20} class="text-error-icon" />
        </div>
        <h2 class="text-base font-semibold text-fg">Eliminar reserva</h2>
      </div>

      <p class="text-sm text-fg-muted mb-6">
        ¿Seguro que quieres eliminar esta reserva? Esta acción no se puede
        deshacer.
      </p>

      <div class="flex justify-end gap-2">
        <button
          type="button"
          on:click={() => (showDeleteConfirm = false)}
          class="px-4 py-2 text-sm font-medium text-fg-secondary hover:text-fg rounded-md hover:bg-surface-hover transition-colors"
        >
          Cancelar
        </button>
        <button
          type="button"
          on:click={handleDelete}
          disabled={isDeleting}
          class="px-4 py-2 text-sm font-medium text-white bg-delete hover:bg-delete-hover rounded-md transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {#if isDeleting}
            <Loader2 class="animate-spin" size={14} />
            Eliminando...
          {:else}
            Eliminar
          {/if}
        </button>
      </div>
    </div>
  </div>
{/if}
