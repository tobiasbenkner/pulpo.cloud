<script lang="ts">
  import { createItem } from "@directus/sdk";
  import { directus } from "../../../lib/directus";
  import {
    ArrowLeft,
    Save,
    Loader2,
    Calendar,
    Clock,
    User,
    Phone,
    TextAlignStart,
  } from "lucide-svelte";
  import { format } from "date-fns";

  // Props: Datum kann über URL kommen (?date=2024-01-01)
  export let initialDate = "";

  let loading = false;
  let error: string | null = null;

  // Form State
  let formData = {
    date: initialDate || format(new Date(), "yyyy-MM-dd"),
    time: "12:00", // Default Mittag
    name: "",
    contact: "",
    observation: "",
  };

  async function handleSubmit() {
    loading = true;
    error = null;

    try {
      // 1. Speichern in Directus
      await directus.request(
        createItem("reservations", {
          date: formData.date,
          time: formData.time,
          name: formData.name,
          contact: formData.contact,
          observation: formData.observation,
        })
      );

      // 2. Zurück zur Agenda (an das korrekte Datum)
      // Wir nutzen hier window.location für einen sauberen Refresh der Agenda-View
      window.location.href = `/?date=${formData.date}`;
    } catch (e) {
      console.error(e);
      error =
        "Die Reservierung konnte nicht erstellt werden. Bitte versuchen Sie es erneut.";
      loading = false;
    }
  }

  function goBack() {
    // Zurück zum ausgewählten Datum
    window.location.href = `/?date=${formData.date}`;
  }
</script>

<div class="max-w-2xl mx-auto animate-fade-in">
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
      <h1 class="text-2xl font-serif text-primary">Neue Reservierung</h1>
      <p class="text-sm text-gray-500">
        Erstellen Sie einen Termin für die Agenda.
      </p>
    </div>
  </div>

  <!-- Form Card -->
  <div class="bg-white p-8 rounded-lg border border-gray-200 shadow-sm">
    {#if error}
      <div
        class="mb-6 p-4 bg-red-50 border border-red-100 text-red-800 text-sm rounded-md"
      >
        {error}
      </div>
    {/if}

    <form on:submit|preventDefault={handleSubmit} class="space-y-6">
      <!-- Row 1: Date & Time -->
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

      <!-- Row 2: Name -->
      <div class="space-y-1.5">
        <label
          for="name"
          class="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-500"
        >
          <User size={14} /> Name des Gastes
        </label>
        <input
          id="name"
          type="text"
          required
          placeholder="z.B. Maria Musterfrau"
          bind:value={formData.name}
          class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-sm text-primary placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-primary focus:bg-white transition-all"
        />
      </div>

      <!-- Row 3: Contact -->
      <div class="space-y-1.5">
        <label
          for="contact"
          class="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-500"
        >
          <Phone size={14} /> Kontakt / Info
        </label>
        <input
          id="contact"
          type="text"
          placeholder="z.B. +49 170 1234567 oder E-Mail"
          bind:value={formData.contact}
          class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-sm text-primary placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-primary focus:bg-white transition-all"
        />
      </div>

      <!-- Row 4: Observation -->
      <div class="space-y-1.5">
        <label
          for="observation"
          class="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-500"
        >
          <TextAlignStart size={14} /> Anmerkungen (Optional)
        </label>
        <textarea
          id="observation"
          rows="3"
          placeholder="Besondere Wünsche, Allergien, etc."
          bind:value={formData.observation}
          class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-sm text-primary placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-primary focus:bg-white transition-all resize-none"
        ></textarea>
      </div>

      <!-- Actions -->
      <div class="pt-4 flex items-center justify-end gap-3">
        <button
          type="button"
          on:click={goBack}
          class="px-6 py-3 text-sm font-medium text-gray-600 hover:text-primary transition-colors"
        >
          Abbrechen
        </button>
        <button
          type="submit"
          disabled={loading}
          class="bg-primary text-white px-8 py-3 rounded-sm hover:bg-gray-800 transition-all flex items-center gap-2 shadow-md shadow-gray-200 disabled:opacity-70 disabled:cursor-not-allowed font-medium tracking-wide"
        >
          {#if loading}
            <Loader2 class="animate-spin" size={18} />
            <span>Speichern...</span>
          {:else}
            <Save size={18} />
            <span>Reservierung anlegen</span>
          {/if}
        </button>
      </div>
    </form>
  </div>
</div>
