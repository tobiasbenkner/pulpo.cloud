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
  import { ArrowLeftRight, Banknote, CreditCard, Printer } from "lucide-svelte";

  let tx = $state<TransactionResult | null>(null);
  let swapFlash = $state(false);
  let swapping = $state(false);

  onMount(() => {
    return lastTransaction.subscribe((v) => (tx = v));
  });

  async function handleSwap() {
    if (swapping) return;
    swapping = true;
    try {
      await swapLastTransactionMethod();
      swapFlash = true;
      setTimeout(() => (swapFlash = false), 400);
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
      await printInvoice(invoice);
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
      class="flex items-center justify-between gap-2 px-2 py-2 rounded-lg shadow-sm w-full transition-colors duration-300 {swapFlash
        ? 'bg-blue-50 border border-blue-200'
        : 'bg-emerald-50 border border-emerald-200'}"
    >
      <!-- KORREKTUR BUTTON -->
      <button
        class="group relative flex-none p-2 bg-white text-zinc-400 rounded-md border border-zinc-200 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-all active:scale-95 shadow-sm disabled:opacity-50"
        title="Corregir forma de pago"
        onclick={handleSwap}
        disabled={swapping}
      >
        <ArrowLeftRight class="w-4 h-4" />
      </button>

      <!-- INFORMATION -->
      <div class="flex-1 flex items-center gap-4 overflow-hidden px-1">
        <div class="text-emerald-600 flex-none self-center">
          {#if tx.method === "cash"}
            <Banknote class="w-5 h-5" />
          {:else}
            <CreditCard class="w-5 h-5" />
          {/if}
        </div>

        <div class="flex-1 min-w-0 py-1">
          {#if tx.method === "cash"}
            <div class="grid grid-cols-[auto_1fr] gap-x-4 items-baseline">
              <span
                class="col-span-2 text-[9px] font-bold text-emerald-600 uppercase tracking-widest mb-1"
                >Venta en efectivo</span
              >

              <span
                class="text-[10px] font-bold text-emerald-900 uppercase opacity-60"
                >Precio</span
              >
              <span
                class="text-[11px] font-black text-emerald-900 tabular-nums text-right"
                >{tx.total}€</span
              >

              {#if parseFloat(tx.change) > 0}
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
              {:else}
                <div class="col-span-2 pt-1">
                  <span
                    class="text-[10px] font-bold text-emerald-500 uppercase tracking-tight opacity-80"
                    >Importe exacto</span
                  >
                </div>
              {/if}
            </div>
          {:else}
            <div class="grid grid-cols-[auto_1fr] gap-x-4 items-baseline">
              <span
                class="col-span-2 text-[9px] font-bold text-emerald-600 uppercase tracking-widest mb-1"
                >Cobro con tarjeta</span
              >

              <span
                class="text-[10px] font-bold text-emerald-900 uppercase opacity-60"
                >Precio</span
              >
              <span
                class="text-[11px] font-black text-emerald-900 tabular-nums text-right"
                >{tx.total}€</span
              >

              <div class="col-span-2 pt-1">
                <span
                  class="text-[10px] font-bold text-emerald-500 uppercase tracking-tight opacity-80"
                  >Operación con éxito</span
                >
              </div>
            </div>
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
