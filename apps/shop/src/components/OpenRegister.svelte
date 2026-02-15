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
      errorMsg = e.message || "Error al abrir la caja";
      submitting = false;
    }
  }

  function formatDate(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
</script>

<div class="flex items-center justify-center h-full bg-zinc-50">
  <div class="w-full max-w-sm px-6">
    <!-- Header: Icon + Title inline -->
    <div class="flex items-center justify-center gap-3 mb-1">
      <div
        class="w-12 h-12 rounded-full bg-zinc-900 text-white flex items-center justify-center shadow-lg shrink-0"
      >
        <svg
          class="w-6 h-6"
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
      <h1 class="text-xl font-bold text-zinc-900">Caja cerrada</h1>
    </div>

    {#if loading}
      <p class="text-sm text-center text-zinc-400 mb-4">Cargando...</p>
    {:else if lastClosure?.period_end}
      <p class="text-sm text-center text-zinc-400 mb-4">
        Último cierre: {formatDate(lastClosure.period_end)}
      </p>
    {:else}
      <p class="text-sm text-center text-zinc-400 mb-4">Sin cierre previo</p>
    {/if}

    {#if errorMsg}
      <p class="text-sm text-center text-red-500 mb-3">{errorMsg}</p>
    {/if}

    <!-- Display -->
    <div class="bg-zinc-900 rounded-2xl p-4 mb-3 text-center shadow-inner">
      <p class="text-zinc-400 text-xs uppercase font-bold mb-0.5 tracking-wide">
        Fondo de caja
      </p>
      <div class="text-3xl font-mono text-white tracking-tight">
        {displayValue} &euro;
      </div>
    </div>

    <!-- Quick Buttons -->
    <div class="grid grid-cols-4 gap-2 mb-3">
      {#each [50, 100, 200, 500] as amount}
        <button
          class="bg-blue-50 text-blue-700 font-bold py-2 rounded-xl hover:bg-blue-100 border border-blue-100 text-sm"
          onclick={() => quickAmount(amount)}
        >
          {amount}&euro;
        </button>
      {/each}
    </div>

    <!-- Numpad -->
    <div class="grid grid-cols-3 gap-2 mb-3 select-none">
      {#each ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "00"] as val}
        <button
          class="bg-white border border-zinc-200 text-xl font-medium py-2.5 rounded-xl hover:bg-zinc-50 active:scale-95 shadow-sm text-zinc-700"
          onclick={() => pressDigit(val)}
        >
          {val}
        </button>
      {/each}
      <button
        class="bg-red-50 text-red-600 text-lg font-bold py-2.5 rounded-xl hover:bg-red-100 active:scale-95 border border-red-100"
        onclick={clear}
      >
        C
      </button>
    </div>

    <!-- Confirm -->
    <button
      class="w-full bg-emerald-600 text-white font-bold text-lg py-3 rounded-2xl shadow-lg shadow-emerald-200 transition-all active:scale-[0.98] hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
      onclick={confirm}
      disabled={submitting}
    >
      {submitting ? "Abriendo..." : "Abrir caja"}
    </button>

    <!-- Reports link -->
    <a
      href="/reports"
      class="flex items-center justify-center gap-2 w-full text-center font-bold text-sm text-zinc-600 hover:text-zinc-900 bg-zinc-100 hover:bg-zinc-200 transition-all mt-3 py-3 rounded-2xl border border-zinc-200"
    >
      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      Ver informes
    </a>
  </div>
</div>
