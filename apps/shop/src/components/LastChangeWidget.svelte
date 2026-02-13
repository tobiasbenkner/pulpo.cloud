<script lang="ts">
  import { onMount } from "svelte";
  import {
    lastTransaction,
    swapLastTransactionMethod,
  } from "../stores/cartStore";
  import { printInvoice } from "../stores/printerStore";
  import { getAuthClient } from "@pulpo/auth";
  import { getInvoice } from "@pulpo/cms";
  import type { TransactionResult } from "../types/shop";
  import { HandCoins, CreditCard, Printer } from "lucide-svelte";

  let tx = $state<TransactionResult | null>(null);
  let swapping = $state(false);

  onMount(() => {
    return lastTransaction.subscribe((v) => (tx = v));
  });

  async function handleSwap(targetMethod: "cash" | "card") {
    if (swapping || !tx || tx.method === targetMethod) return;
    swapping = true;
    try {
      await swapLastTransactionMethod();
    } catch (e) {
      console.error("Failed to swap payment method:", e);
    } finally {
      swapping = false;
    }
  }

  async function handleReprint() {
    if (!tx) return;
    try {
      const client = getAuthClient();
      const invoice = await getInvoice(client as any, tx.invoiceId);
      await printInvoice(invoice as any);
    } catch (e) {
      console.error("Failed to reprint:", e);
    }
  }
</script>

{#if tx}
  <div
    class="animate-in fade-in slide-in-from-top-2 duration-300 w-full select-none"
  >
    <div
      class="flex items-center gap-2 px-2 py-2 rounded-lg shadow-sm w-full bg-emerald-50 border border-emerald-200"
    >
      <!-- PAYMENT TOGGLE -->
      <div
        class="flex-none inline-flex rounded-md border border-zinc-200 overflow-hidden text-xs font-bold shadow-sm"
      >
        <button
          class="flex items-center gap-1 px-2 py-1.5 transition-colors {tx.method ===
          'cash'
            ? 'bg-emerald-100 text-emerald-700'
            : 'bg-white text-zinc-300 hover:bg-zinc-50 hover:text-zinc-500'}"
          disabled={tx.method === "cash" || swapping}
          onclick={() => handleSwap("cash")}
        >
          <HandCoins class="w-3.5 h-3.5" />
          Ef.
        </button>
        <button
          class="flex items-center gap-1 px-2 py-1.5 border-l border-zinc-200 transition-colors {tx.method ===
          'card'
            ? 'bg-blue-100 text-blue-700'
            : 'bg-white text-zinc-300 hover:bg-zinc-50 hover:text-zinc-500'}"
          disabled={tx.method === "card" || swapping}
          onclick={() => handleSwap("card")}
        >
          <CreditCard class="w-3.5 h-3.5" />
          Tarj.
        </button>
      </div>

      <!-- INFORMATION -->
      <div class="flex-1 min-w-0 px-1">
        <div class="grid grid-cols-[auto_1fr] gap-x-3 items-baseline">
          <span
            class="text-[10px] font-bold text-emerald-900 uppercase opacity-60"
            >Total</span
          >
          <span
            class="text-[11px] font-black text-emerald-900 tabular-nums text-right"
            >{tx.total}€</span
          >

          {#if tx.method === "cash" && parseFloat(tx.change) > 0}
            <span
              class="text-[10px] font-bold text-emerald-900 uppercase opacity-60"
              >Entregado</span
            >
            <span
              class="text-[11px] font-black text-emerald-900 tabular-nums text-right"
              >{tx.tendered}€</span
            >
            <span
              class="text-[10px] font-bold text-emerald-900 uppercase opacity-60"
              >Cambio</span
            >
            <span
              class="text-[11px] font-black text-emerald-900 tabular-nums text-right"
              >{tx.change}€</span
            >
          {/if}
        </div>
      </div>

      <!-- DRUCK BUTTON -->
      <button
        class="flex-none p-2 rounded-md border transition-all shadow-sm bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200 hover:border-emerald-300 active:scale-95"
        title="Reimprimir ticket"
        onclick={handleReprint}
      >
        <Printer class="w-4 h-4" />
      </button>
    </div>
  </div>
{/if}
