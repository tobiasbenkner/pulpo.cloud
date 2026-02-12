<script lang="ts">
  import { onMount } from "svelte";
  import { openRegister, fetchLastClosure } from "../stores/registerStore";
  import type { CashRegisterClosure } from "@pulpo/cms";

  let inputCents = $state(0);
  let lastClosure = $state<CashRegisterClosure | null>(null);
  let loading = $state(true);
  let submitting = $state(false);
  let errorMsg = $state<string | null>(null);

  onMount(async () => {
    lastClosure = await fetchLastClosure();
    loading = false;
  });

  let displayValue = $derived((inputCents / 100).toFixed(2));

  function pressDigit(val: string) {
    if (inputCents.toString().length > 6) return;
    if (val === "00") inputCents = inputCents * 100;
    else inputCents = inputCents * 10 + parseInt(val);
  }

  function clear() {
    inputCents = 0;
  }

  function quickAmount(euros: number) {
    inputCents = euros * 100;
  }

  async function confirm() {
    submitting = true;
    errorMsg = null;
    try {
      const amount = (inputCents / 100).toFixed(2);
      await openRegister(amount);
    } catch (e: any) {
      errorMsg = e.message || "Fehler beim Öffnen der Kasse";
      submitting = false;
    }
  }

  function formatDate(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
</script>

<div class="flex items-center justify-center h-full bg-zinc-50">
  <div class="w-full max-w-md px-6">
    <!-- Icon -->
    <div class="flex justify-center mb-6">
      <div
        class="w-20 h-20 rounded-full bg-zinc-900 text-white flex items-center justify-center shadow-lg"
      >
        <svg
          class="w-10 h-10"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1.5"
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
          />
        </svg>
      </div>
    </div>

    <h1 class="text-2xl font-bold text-center text-zinc-900 mb-2">
      Kasse geschlossen
    </h1>

    {#if loading}
      <p class="text-sm text-center text-zinc-400 mb-8">Laden...</p>
    {:else if lastClosure?.period_end}
      <p class="text-sm text-center text-zinc-400 mb-8">
        Letzter Abschluss: {formatDate(lastClosure.period_end)}
      </p>
    {:else}
      <p class="text-sm text-center text-zinc-400 mb-8">
        Kein vorheriger Abschluss
      </p>
    {/if}

    {#if errorMsg}
      <p class="text-sm text-center text-red-500 mb-4">{errorMsg}</p>
    {/if}

    <!-- Display -->
    <div class="bg-zinc-900 rounded-2xl p-5 mb-5 text-center shadow-inner">
      <p class="text-zinc-400 text-xs uppercase font-bold mb-1 tracking-wide">
        Anfangsbestand
      </p>
      <div class="text-4xl font-mono text-white tracking-tight">
        {displayValue} &euro;
      </div>
    </div>

    <!-- Quick Buttons -->
    <div class="grid grid-cols-4 gap-2 mb-4">
      {#each [50, 100, 200, 500] as amount}
        <button
          class="bg-blue-50 text-blue-700 font-bold py-3 rounded-xl hover:bg-blue-100 border border-blue-100 text-sm"
          onclick={() => quickAmount(amount)}
        >
          {amount}&euro;
        </button>
      {/each}
    </div>

    <!-- Numpad -->
    <div class="grid grid-cols-3 gap-3 mb-4 select-none">
      {#each ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "00"] as val}
        <button
          class="bg-white border border-zinc-200 text-2xl font-medium py-3 rounded-xl hover:bg-zinc-50 active:scale-95 shadow-sm text-zinc-700"
          onclick={() => pressDigit(val)}
        >
          {val}
        </button>
      {/each}
      <button
        class="bg-red-50 text-red-600 text-xl font-bold py-3 rounded-xl hover:bg-red-100 active:scale-95 border border-red-100"
        onclick={clear}
      >
        C
      </button>
    </div>

    <!-- Confirm -->
    <button
      class="w-full bg-emerald-600 text-white font-bold text-xl py-4 rounded-2xl shadow-lg shadow-emerald-200 transition-all active:scale-[0.98] hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
      onclick={confirm}
      disabled={submitting}
    >
      {submitting ? "Wird geöffnet..." : "Kasse öffnen"}
    </button>
  </div>
</div>
