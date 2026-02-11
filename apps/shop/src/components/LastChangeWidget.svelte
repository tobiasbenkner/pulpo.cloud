<script lang="ts">
  import { onMount } from "svelte";
  import {
    lastTransaction,
    swapLastTransactionMethod,
  } from "../stores/cartStore";
  import { reprintLastReceipt } from "../stores/printerStore";
  import type { TransactionResult } from "../types/shop";

  let tx = $state<TransactionResult | null>(null);
  let swapFlash = $state(false);
  let reprintFlash = $state(false);

  onMount(() => {
    return lastTransaction.subscribe((v) => (tx = v));
  });

  function handleSwap() {
    swapLastTransactionMethod();
    swapFlash = true;
    setTimeout(() => (swapFlash = false), 400);
  }

  function handleReprint() {
    if (!tx) return;
    reprintLastReceipt();
    reprintFlash = true;
    setTimeout(() => (reprintFlash = false), 200);
  }
</script>

{#if tx}
  <div class="animate-in fade-in slide-in-from-top-2 duration-300 w-full select-none">
    <div
      class="flex items-center justify-between gap-2 px-2 py-2 rounded-lg shadow-sm w-full transition-colors duration-300 {swapFlash
        ? 'bg-blue-50 border border-blue-200'
        : 'bg-emerald-50 border border-emerald-200'}"
    >
      <!-- KORREKTUR BUTTON -->
      <button
        class="group relative flex-none p-2 bg-white text-zinc-400 rounded-md border border-zinc-200 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-all active:scale-95 shadow-sm"
        title="Zahlart korrigieren"
        onclick={handleSwap}
      >
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
          />
        </svg>
      </button>

      <!-- INFORMATION -->
      <div class="flex-1 flex items-center justify-center gap-2 overflow-hidden px-1">
        <div class="text-emerald-600 flex-none">
          {#if tx.method === "cash"}
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          {:else}
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
              />
            </svg>
          {/if}
        </div>

        <div class="flex flex-col leading-none">
          <span
            class="text-[10px] font-bold text-emerald-600 uppercase tracking-wide mb-0.5 text-center sm:text-left"
          >
            {tx.method === "cash" ? "Barzahlung" : "Kartenzahlung"}
          </span>
          <div class="flex items-baseline gap-1.5 justify-center sm:justify-start">
            <span class="text-sm font-extrabold text-emerald-800 tabular-nums">
              {#if tx.method === "cash"}
                {parseFloat(tx.change) > 0 ? `RG: ${tx.change} €` : `${tx.total} €`}
              {:else}
                Erfolgreich
              {/if}
            </span>
            <span
              class="text-[10px] text-emerald-500 font-medium truncate hidden sm:inline-block"
            >
              {#if tx.method === "cash"}
                {parseFloat(tx.change) > 0 ? `(Geg: ${tx.tendered})` : "(Passend)"}
              {:else}
                ({tx.total} €)
              {/if}
            </span>
          </div>
        </div>
      </div>

      <!-- DRUCK BUTTON -->
      <button
        class="flex-none p-2 rounded-md border transition-all shadow-sm {reprintFlash
          ? 'bg-emerald-300 scale-95 text-emerald-700 border-emerald-200'
          : 'bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200 hover:border-emerald-300'} active:scale-95"
        title="Bon nachdrucken"
        onclick={handleReprint}
      >
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
          />
        </svg>
      </button>
    </div>
  </div>
{/if}
