<script lang="ts">
  import { onMount } from "svelte";
  import { readItem, updateItem, deleteItem } from "@directus/sdk";
  import { directus } from "../../../lib/directus";
  import {
    ArrowLeft,
    Save,
    Loader2,
    Calendar,
    Clock,
    User,
    Phone,
    AlignLeft,
    Trash2,
    AlertTriangle,
  } from "lucide-svelte";

  export let id: string;

  let isLoadingData = true;
  let isSaving = false;
  let isDeleting = false;
  let error: string | null = null;
  let showDeleteConfirm = false;

  let formData = {
    date: "",
    time: "",
    name: "",
    contact: "",
    observation: "",
  };

  // Originaldatum speichern für den "Zurück"-Button
  let originalDate = "";

  onMount(async () => {
    try {
      const res = await directus.request(readItem("reservations", id));

      // Daten mappen
      formData = {
        date: res.date,
        // Directus liefert oft Sekunden (12:00:00), Input type="time" mag nur HH:MM
        time: res.time ? res.time.substring(0, 5) : "",
        name: res.name,
        contact: res.contact,
        observation: res.observation || "",
      };
      originalDate = res.date;
    } catch (e) {
      error = "Die Reservierung konnte nicht geladen werden.";
    } finally {
      isLoadingData = false;
    }
  });

  async function handleUpdate() {
    isSaving = true;
    error = null;

    try {
      await directus.request(updateItem("reservations", id, formData));
      // Zurück zur Agenda an das (ggf. neue) Datum
      window.location.href = `/?date=${formData.date}`;
    } catch (e) {
      console.error(e);
      error = "Fehler beim Speichern der Änderungen.";
      isSaving = false;
    }
  }

  async function handleDelete() {
    isDeleting = true;
    try {
      await directus.request(deleteItem("reservations", id));
      window.location.href = `/?date=${formData.date}`;
    } catch (e) {
      error = "Fehler beim Löschen.";
      isDeleting = false;
      showDeleteConfirm = false;
    }
  }

  function goBack() {
    // Falls Daten noch nicht geladen, fallback auf heute
    const targetDate =
      originalDate || formData.date || new Date().toISOString().split("T")[0];
    window.location.href = `/?date=${targetDate}`;
  }
</script>

<div class="max-w-2xl mx-auto animate-fade-in pb-12">
  <!-- Header -->
  <div class="flex items-center gap-4 mb-8">
    <button
      on:click={goBack}
      class="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500"
      aria-label="Zurück"
    >
      <ArrowLeft size={20} />
    </button>
    <div>
      <h1 class="text-2xl font-serif text-primary">Reservierung bearbeiten</h1>
      <p class="text-sm text-gray-500">
        Details aktualisieren oder stornieren.
      </p>
    </div>
  </div>

  {#if isLoadingData}
    <div
      class="bg-white p-12 rounded-lg border border-gray-200 shadow-sm flex justify-center items-center"
    >
      <Loader2 class="animate-spin text-primary" size={32} />
    </div>
  {:else}
    <!-- Form Card -->
    <div
      class="bg-white p-8 rounded-lg border border-gray-200 shadow-sm relative overflow-hidden"
    >
      {#if error}
        <div
          class="mb-6 p-4 bg-red-50 border border-red-100 text-red-800 text-sm rounded-md flex items-start gap-2"
        >
          <AlertTriangle size={16} class="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      {/if}

      <form on:submit|preventDefault={handleUpdate} class="space-y-6">
        <!-- Grid Layout -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="space-y-1.5">
            <label
              for="date"
              class="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-500"
            >
              <Calendar size={14} /> Datum
            </label>
            <input
              id="date"
              type="date"
              required
              bind:value={formData.date}
              class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-sm text-primary focus:outline-none focus:ring-1 focus:ring-primary focus:bg-white transition-all"
            />
          </div>

          <div class="space-y-1.5">
            <label
              for="time"
              class="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-500"
            >
              <Clock size={14} /> Uhrzeit
            </label>
            <input
              id="time"
              type="time"
              required
              bind:value={formData.time}
              class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-sm text-primary focus:outline-none focus:ring-1 focus:ring-primary focus:bg-white transition-all"
            />
          </div>
        </div>

        <div class="space-y-1.5">
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
            class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-sm text-primary placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-primary focus:bg-white transition-all"
          />
        </div>

        <div class="space-y-1.5">
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
            class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-sm text-primary placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-primary focus:bg-white transition-all"
          />
        </div>

        <div class="space-y-1.5">
          <label
            for="observation"
            class="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-500"
          >
            <AlignLeft size={14} /> Anmerkungen
          </label>
          <textarea
            id="observation"
            rows="3"
            bind:value={formData.observation}
            class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-sm text-primary placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-primary focus:bg-white transition-all resize-none"
          ></textarea>
        </div>

        <!-- Action Bar -->
        <div
          class="pt-6 border-t border-gray-100 flex items-center justify-between"
        >
          <!-- Delete Button (Left) -->
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

          <!-- Save Button (Right) -->
          <div class="flex items-center gap-3">
            <button
              type="button"
              on:click={goBack}
              class="px-4 py-2 text-sm font-medium text-gray-600 hover:text-primary transition-colors"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={isSaving}
              class="bg-primary text-white px-6 py-2.5 rounded-sm hover:bg-gray-800 transition-all flex items-center gap-2 shadow-md shadow-gray-200 disabled:opacity-70 disabled:cursor-not-allowed font-medium tracking-wide"
            >
              {#if isSaving}
                <Loader2 class="animate-spin" size={18} />
                <span>Speichern...</span>
              {:else}
                <Save size={18} />
                <span>Aktualisieren</span>
              {/if}
            </button>
          </div>
        </div>
      </form>
    </div>
  {/if}
</div>
