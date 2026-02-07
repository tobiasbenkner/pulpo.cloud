<script lang="ts">
  import { onMount } from "svelte";
  import ReservationForm from "./ReservationForm.svelte";

  let id: string | null = null;
  let error: string | null = null;

  onMount(() => {
    const params = new URLSearchParams(window.location.search);
    id = params.get("id");

    if (!id) {
      error = "No se ha indicado un ID de reserva.";
    }
  });
</script>

{#if error}
  <div class="max-w-2xl mx-auto py-12">
    <div class="bg-error-bg border border-error-border text-error-text p-6 rounded-lg">
      <p>{error}</p>
      <a href="/" class="text-error-text underline mt-2 inline-block">
        Volver a la agenda
      </a>
    </div>
  </div>
{:else if id}
  <ReservationForm {id} />
{/if}
