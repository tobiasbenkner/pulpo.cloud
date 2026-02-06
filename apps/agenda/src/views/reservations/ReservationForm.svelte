<script lang="ts">
  import { onMount } from "svelte";
  import { directus } from "../../lib/directus";
  import {
    readReservation,
    createReservation,
    updatedReservation,
    deleteReservation,
    listReservationTurns,
  } from "@pulpo/cms";
  import type { ReservationTurn } from "@pulpo/cms";
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
  } from "lucide-svelte";
  import DatePicker from "../../components/ui/DatePicker.svelte";
  import TimePicker from "../../components/ui/TimePicker.svelte";
  import { es } from "date-fns/locale";

  // Props
  export let id: string | null = null;

  // Derived state
  $: isEditMode = !!id;

  // State
  let isLoading = true;
  let isSaving = false;
  let isDeleting = false;
  let error: string | null = null;
  let showDeleteConfirm = false;
  let turns: ReservationTurn[] = [];

  let formData = {
    date: new Date().toISOString().split("T")[0],
    time: "",
    name: "",
    contact: "",
    person_count: 2,
    notes: "",
  };

  let originalDate = "";

  onMount(async () => {
    try {
      turns = await listReservationTurns(directus);
    } catch (e) {
      // Turns sind optional, kein Fehler anzeigen
    }

    if (isEditMode && id) {
      try {
        const res = await readReservation(directus, id);
        formData = {
          date: res.date,
          time: res.time ? res.time.substring(0, 5) : "",
          name: res.name,
          contact: res.contact || "",
          person_count: res.person_count || 2,
          notes: res.notes || "",
        };
        originalDate = res.date;
      } catch (e) {
        error = "Die Reservierung konnte nicht geladen werden.";
      }
    } else {
      const params = new URLSearchParams(window.location.search);
      const dateParam = params.get("date");
      if (dateParam) {
        formData.date = dateParam;
      }
    }
    isLoading = false;
  });

  async function handleSubmit() {
    isSaving = true;
    error = null;

    try {
      if (isEditMode && id) {
        await updatedReservation(directus, { id, ...formData } as any);
      } else {
        await createReservation(directus, formData as any);
      }
      window.location.href = `/?date=${formData.date}`;
    } catch (e) {
      console.error(e);
      error = isEditMode
        ? "Fehler beim Speichern der Änderungen."
        : "Fehler beim Erstellen der Reservierung.";
      isSaving = false;
    }
  }

  async function handleDelete() {
    if (!id) return;

    isDeleting = true;
    try {
      await deleteReservation(directus, id);
      window.location.href = `/?date=${formData.date}`;
    } catch (e) {
      error = "Fehler beim Löschen.";
      isDeleting = false;
      showDeleteConfirm = false;
    }
  }

  function goBack() {
    const targetDate =
      originalDate || formData.date || new Date().toISOString().split("T")[0];
    window.location.href = `/?date=${targetDate}`;
  }
</script>

<div
  class="max-w-2xl mx-auto animate-fade-in px-3 py-4 md:pb-12 md:pt-8 md:px-0"
>
  {#if isLoading}
    <div
      class="bg-white p-12 rounded-lg border border-gray-200 shadow-sm flex justify-center items-center"
    >
      <Loader2 class="animate-spin text-primary" size={32} />
    </div>
  {:else}
    <!-- Form Card -->
    <div
      class="bg-white p-4 md:p-8 rounded-lg border border-gray-200 shadow-sm relative"
    >
      <!-- Header -->
      <div class="flex items-center gap-2.5 mb-4">
        <button
          on:click={goBack}
          class="p-1 hover:bg-gray-100 rounded-full transition-colors text-gray-400"
          aria-label="Zurück"
        >
          <ArrowLeft size={16} />
        </button>
        <h1 class="text-sm font-medium text-gray-500">
          {isEditMode ? "Reservierung bearbeiten" : "Neue Reservierung"}
        </h1>
      </div>

      {#if error}
        <div
          class="mb-4 p-3 bg-red-50 border border-red-100 text-red-800 text-sm rounded-md flex items-start gap-2"
        >
          <AlertTriangle size={16} class="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      {/if}

      <form on:submit|preventDefault={handleSubmit} class="space-y-4">
        <!-- Date & Time -->
        <div class="grid grid-cols-2 gap-3 md:gap-6">
          <DatePicker
            label="Datum"
            bind:value={formData.date}
            locale={es}
            placeholder="Datum wählen"
          />

          <TimePicker label="Uhrzeit" bind:value={formData.time} />
        </div>

        {#if turns.length > 0}
          <div class="flex flex-wrap justify-center gap-1.5">
            {#each turns as turn}
              <button
                type="button"
                on:click={() => (formData.time = turn.start.substring(0, 5))}
                class="px-2.5 py-1 text-xs rounded-md border transition-colors {formData.time ===
                turn.start.substring(0, 5)
                  ? 'border-primary bg-primary text-white'
                  : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300 hover:bg-gray-100'}"
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
              class="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-500"
            >
              <User size={14} /> Name
            </label>
            <input
              id="name"
              type="text"
              required
              bind:value={formData.name}
              placeholder="Name des Gastes"
              class="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-sm text-sm text-primary placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-primary focus:bg-white transition-all"
            />
          </div>

          <div class="space-y-1">
            <label
              for="person_count"
              class="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-500"
            >
              <Users size={14} /> Pax
            </label>
            <input
              id="person_count"
              type="number"
              min="1"
              max="99"
              bind:value={formData.person_count}
              class="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-sm text-sm text-primary focus:outline-none focus:ring-1 focus:ring-primary focus:bg-white transition-all"
            />
          </div>
        </div>

        <!-- Contact -->
        <div class="space-y-1">
          <label
            for="contact"
            class="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-500"
          >
            <Phone size={14} /> Kontakt
          </label>
          <input
            id="contact"
            type="text"
            bind:value={formData.contact}
            placeholder="Telefon oder E-Mail"
            class="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-sm text-sm text-primary placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-primary focus:bg-white transition-all"
          />
        </div>

        <!-- Notes -->
        <div class="space-y-1">
          <label
            for="notes"
            class="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-500"
          >
            <AlignLeft size={14} /> Anmerkungen
          </label>
          <textarea
            id="notes"
            rows="2"
            bind:value={formData.notes}
            placeholder="Besondere Wünsche, Allergien, etc."
            class="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-sm text-sm text-primary placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-primary focus:bg-white transition-all resize-none"
          ></textarea>
        </div>

        <!-- Action Bar -->
        <div
          class="pt-4 border-t border-gray-100 flex items-center justify-between"
        >
          <!-- Delete Button (Left) - Only in Edit Mode -->
          <div>
            {#if isEditMode}
              {#if !showDeleteConfirm}
                <button
                  type="button"
                  on:click={() => (showDeleteConfirm = true)}
                  class="text-red-600 hover:text-red-800 text-sm font-medium flex items-center gap-1.5 px-2 py-2 -ml-2 rounded hover:bg-red-50 transition-colors"
                >
                  <Trash2 size={16} /> <span>Löschen</span>
                </button>
              {:else}
                <div
                  class="flex items-center gap-3 bg-red-50 px-3 py-1.5 rounded-md animate-fade-in border border-red-100"
                >
                  <span class="text-xs text-red-800 font-medium">Sicher?</span>
                  <button
                    type="button"
                    on:click={handleDelete}
                    disabled={isDeleting}
                    class="text-xs font-bold text-red-700 hover:text-red-900 underline"
                  >
                    {isDeleting ? "..." : "Ja, löschen"}
                  </button>
                  <button
                    type="button"
                    on:click={() => (showDeleteConfirm = false)}
                    class="text-xs text-gray-500 hover:text-gray-700"
                  >
                    Abbruch
                  </button>
                </div>
              {/if}
            {/if}
          </div>

          <!-- Save Button (Right) -->
          <div>
            <button
              type="submit"
              disabled={isSaving}
              class="bg-primary text-white px-6 py-2.5 rounded-sm hover:bg-gray-800 transition-all flex items-center gap-2 shadow-md shadow-gray-200 disabled:opacity-70 disabled:cursor-not-allowed font-medium tracking-wide"
            >
              {#if isSaving}
                <Loader2 class="animate-spin" size={18} />
                <span>Speichern...</span>
              {:else if isEditMode}
                <Save size={18} />
                <span>Aktualisieren</span>
              {:else}
                <Plus size={18} />
                <span>Erstellen</span>
              {/if}
            </button>
          </div>
        </div>
      </form>
    </div>
  {/if}
</div>
