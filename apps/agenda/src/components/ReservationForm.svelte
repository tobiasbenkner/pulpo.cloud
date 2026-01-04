<script lang="ts">
  import {
    getDirectusClient,
    type ReservationSettingTurn,
    type User,
  } from "../lib/directus";
  import { createItem, readMe } from "@directus/sdk";
  import { onMount } from "svelte";

  export let token: string;
  export let dateParam: string;
  export let turns: ReservationSettingTurn[] = [];
  export let users: User[] = [];

  let client = getDirectusClient(token);
  let loading = false;
  let currentUserTenant = "";

  // Form State
  let formData = {
    date: dateParam,
    time: "",
    name: "",
    person_count: 2,
    contact: "",
    notes: "",
    user: "", // ID des zugewiesenen Kellners
  };

  onMount(async () => {
    // Wir holen kurz den aktuellen User um den Tenant zu wissen (wichtig für Permission)
    const me = await client.request(readMe({ fields: ["tenant", "id"] }));
    currentUserTenant = me.tenant;

    // Default: Der aktuell eingeloggte User ist vorausgewählt
    formData.user = me.id;

    // Default Zeit: Nächste volle Stunde oder Start des ersten Turns
    if (turns.length > 0) formData.time = turns[0].start;
  });

  async function handleSubmit() {
    loading = true;
    try {
      await client.request(
        createItem("reservations", {
          ...formData,
          tenant: currentUserTenant, // Wichtig für deine Directus-Permissions
          was_there: false,
        })
      );

      // Erfolg: Zurück zur Agenda an diesem Tag
      window.location.href = `/?date=${formData.date}`;
    } catch (e) {
      console.error(e);
      alert("Fehler beim Speichern. Bitte Felder prüfen.");
      loading = false;
    }
  }

  function setTime(time: string) {
    formData.time = time;
  }
</script>

<div
  class="card bg-[#1e2330] shadow-xl border border-gray-700/50 max-w-lg mx-auto text-gray-200"
>
  <div class="card-body">
    <h2 class="card-title justify-center mb-6 text-2xl">Neue Reservierung</h2>

    <form on:submit|preventDefault={handleSubmit} class="space-y-4">
      <!-- Zeile 1: Datum & Zeit -->
      <div class="grid grid-cols-2 gap-4">
        <div class="form-control">
          <label class="label"
            ><span class="label-text text-gray-400">Datum</span></label
          >
          <input
            type="date"
            bind:value={formData.date}
            required
            class="input input-bordered bg-gray-800 border-gray-600 text-white"
          />
        </div>
        <div class="form-control">
          <label class="label"
            ><span class="label-text text-gray-400">Uhrzeit</span></label
          >
          <input
            type="time"
            bind:value={formData.time}
            required
            class="input input-bordered bg-gray-800 border-gray-600 text-white"
          />
        </div>
      </div>

      <!-- Schnellwahl Buttons für Zeiten (Turns) -->
      {#if turns.length > 0}
        <div class="flex flex-wrap gap-2 justify-center py-2">
          {#each turns as turn}
            <button
              type="button"
              class="btn btn-sm {formData.time === turn.start
                ? 'btn-primary'
                : 'btn-ghost bg-gray-700/30'}"
              on:click={() => setTime(turn.start)}
            >
              {turn.start.substring(0, 5)}
            </button>
          {/each}
        </div>
      {/if}

      <!-- Zeile 2: Name -->
      <div class="form-control">
        <label class="label"
          ><span class="label-text text-gray-400">Name des Gastes *</span
          ></label
        >
        <input
          type="text"
          bind:value={formData.name}
          placeholder="z.B. Mustermann"
          required
          class="input input-bordered bg-gray-800 border-gray-600 text-white"
        />
      </div>

      <!-- Zeile 3: Pax & Kontakt -->
      <div class="grid grid-cols-2 gap-4">
        <div class="form-control">
          <label class="label"
            ><span class="label-text text-gray-400">Personen</span></label
          >
          <input
            type="number"
            min="1"
            bind:value={formData.person_count}
            class="input input-bordered bg-gray-800 border-gray-600 text-white"
          />
        </div>
        <div class="form-control">
          <label class="label"
            ><span class="label-text text-gray-400">Kontakt (Tel)</span></label
          >
          <input
            type="text"
            bind:value={formData.contact}
            class="input input-bordered bg-gray-800 border-gray-600 text-white"
          />
        </div>
      </div>

      <!-- Zeile 4: Notizen -->
      <div class="form-control">
        <label class="label"
          ><span class="label-text text-gray-400">Notizen</span></label
        >
        <textarea
          bind:value={formData.notes}
          class="textarea textarea-bordered bg-gray-800 border-gray-600 text-white h-24"
          placeholder="Allergien, Tischwunsch..."
        ></textarea>
      </div>

      <!-- Zeile 5: Kellner Auswahl (User) -->
      <div class="form-control">
        <label class="label"
          ><span class="label-text text-gray-400">Zugewiesen an</span></label
        >

        <!-- Elegante Auswahl als Grid -->
        <div class="grid grid-cols-4 gap-2">
          {#each users as user}
            <div
              class="flex flex-col items-center gap-1 cursor-pointer p-2 rounded-lg transition-all
                           {formData.user === user.id
                ? 'bg-primary/20 ring-1 ring-primary'
                : 'hover:bg-gray-700/50'}"
              on:click={() => (formData.user = user.id)}
            >
              <div class="avatar">
                <div class="w-10 h-10 rounded-full">
                  <img
                    src={`${import.meta.env.PUBLIC_DIRECTUS_URL}/assets/${user.avatar}?key=system-small-cover`}
                    alt={user.first_name}
                  />
                </div>
              </div>
              <span class="text-xs text-center truncate w-full"
                >{user.first_name}</span
              >
            </div>
          {/each}
        </div>
      </div>

      <!-- Submit -->
      <div class="form-control mt-6">
        <button class="btn btn-primary w-full" disabled={loading}>
          {#if loading}
            <span class="loading loading-spinner"></span>
          {/if}
          Speichern
        </button>
      </div>
    </form>
  </div>
</div>
