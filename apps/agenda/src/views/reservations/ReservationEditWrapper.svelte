<script lang="ts">
  import { onMount } from "svelte";
  import ReservationForm from "./ReservationForm.svelte";

  let id: string | null = null;
  let error: string | null = null;

  onMount(() => {
    const params = new URLSearchParams(window.location.search);
    id = params.get("id");

    if (!id) {
      error = "Keine Reservierungs-ID angegeben.";
    }
  });
</script>

{#if error}
  <div class="max-w-2xl mx-auto py-12">
    <div class="bg-red-50 border border-red-100 text-red-800 p-6 rounded-lg">
      <p>{error}</p>
      <a href="/" class="text-red-700 underline mt-2 inline-block">
        Zurück zur Agenda
      </a>
    </div>
  </div>
{:else if id}
  <ReservationForm {id} />
{/if}
