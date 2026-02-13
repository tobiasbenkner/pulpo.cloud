<script lang="ts">
  import { onMount } from "svelte";
  import {
    isShiftInvoicesModalOpen,
    shiftInvoices,
    loadShiftInvoices,
    swapPaymentMethod,
  } from "../stores/registerStore";
  import { printInvoice } from "../stores/printerStore";
  import type { Invoice } from "@pulpo/cms";
  import { X, FileText, Printer, CreditCard, HandCoins } from "lucide-svelte";
  import RefundIcon from "./icons/RefundIcon.svelte";

  let isOpen = $state(false);
  let isVisible = $state(false);
  let loading = $state(false);
  let invoices = $state<readonly Invoice[]>([]);
  let swapping = $state<string | null>(null);

  function formatTime(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function formatCurrency(value: string): string {
    return parseFloat(value).toFixed(2);
  }

  function openModalAnim() {
    isOpen = true;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        isVisible = true;
      });
    });
  }

  function hideModalAnim() {
    isVisible = false;
    setTimeout(() => {
      isOpen = false;
    }, 300);
  }

  function closeModal() {
    isShiftInvoicesModalOpen.set(false);
  }

  async function handleLoad() {
    loading = true;
    try {
      await loadShiftInvoices();
    } catch (e) {
      console.error("Failed to load shift invoices:", e);
    } finally {
      loading = false;
    }
  }

  async function handleSwapPayment(inv: Invoice) {
    const payment = inv.payments?.[0];
    if (!payment) return;
    swapping = inv.id;
    const newMethod = payment.method === "cash" ? "card" : "cash";
    try {
      await swapPaymentMethod(inv.id, payment.id, newMethod, payment.amount);
    } catch (e) {
      console.error("Failed to swap payment method:", e);
    } finally {
      swapping = null;
    }
  }

  function handlePrint(inv: Invoice) {
    printInvoice(inv);
  }

  onMount(() => {
    const unsubModal = isShiftInvoicesModalOpen.subscribe((open) => {
      if (open) {
        openModalAnim();
        handleLoad();
      } else {
        hideModalAnim();
      }
    });

    const unsubInvoices = shiftInvoices.subscribe((v) => {
      invoices = v;
    });

    return () => {
      unsubModal();
      unsubInvoices();
    };
  });
</script>

{#if isOpen}
  <div class="fixed inset-0 z-50" role="dialog" aria-modal="true">
    <!-- Backdrop -->
    <div
      class="fixed inset-0 bg-zinc-900/40 backdrop-blur-md transition-opacity {isVisible
        ? 'opacity-100'
        : 'opacity-0'}"
    ></div>

    <div class="fixed inset-0 z-10 w-screen overflow-y-auto">
      <div
        class="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0"
      >
        <!-- Modal Panel -->
        <div
          class="relative transform overflow-hidden rounded-3xl bg-white text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-2xl {isVisible
            ? 'opacity-100 translate-y-0 sm:scale-100'
            : 'opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95'}"
        >
          <!-- Close Button -->
          <div class="absolute right-4 top-4 z-20">
            <button
              class="rounded-full p-2 bg-zinc-100 text-zinc-400 hover:text-zinc-600 transition-colors"
              onclick={closeModal}
            >
              <X class="h-5 w-5" />
            </button>
          </div>

          <div class="px-8 py-8">
            <h3 class="text-2xl font-bold text-center text-zinc-900 mb-6">
              Facturas
            </h3>

            {#if loading}
              <div class="flex flex-col items-center justify-center py-12">
                <div
                  class="w-10 h-10 border-2 border-zinc-300 border-t-zinc-600 rounded-full animate-spin mb-4"
                ></div>
                <p class="text-sm text-zinc-400">Cargando facturas...</p>
              </div>
            {:else if invoices.length === 0}
              <div class="flex flex-col items-center justify-center py-12">
                <div
                  class="w-14 h-14 rounded-full bg-zinc-100 text-zinc-400 flex items-center justify-center mb-4"
                >
                  <FileText class="w-7 h-7" />
                </div>
                <p class="text-sm text-zinc-500 font-medium">
                  Sin facturas en este turno
                </p>
              </div>
            {:else}
              <div class="max-h-[60vh] overflow-y-auto -mx-2 px-2">
                <table class="w-full text-sm">
                  <thead>
                    <tr class="border-b border-zinc-200">
                      <th
                        class="text-left py-2 px-2 text-zinc-400 font-medium text-xs uppercase tracking-wide"
                        >Hora</th
                      >
                      <th
                        class="text-left py-2 px-2 text-zinc-400 font-medium text-xs uppercase tracking-wide"
                        >Nº</th
                      >
                      <th
                        class="text-right py-2 px-2 text-zinc-400 font-medium text-xs uppercase tracking-wide"
                        >Importe</th
                      >
                      <th
                        class="text-center py-2 px-2 text-zinc-400 font-medium text-xs uppercase tracking-wide"
                        >Pago</th
                      >
                      <th
                        class="text-right py-2 px-2 text-zinc-400 font-medium text-xs uppercase tracking-wide"
                        >Acciones</th
                      >
                    </tr>
                  </thead>
                  <tbody>
                    {#each invoices as inv (inv.id)}
                      <tr
                        class="border-b border-zinc-100 hover:bg-zinc-50 transition-colors"
                      >
                        <td class="py-3 px-2 text-zinc-700 font-mono"
                          >{formatTime(inv.date_created)}</td
                        >
                        <td class="py-3 px-2 text-zinc-700 font-medium"
                          >{inv.invoice_number}</td
                        >
                        <td
                          class="py-3 px-2 text-zinc-900 font-bold text-right tabular-nums"
                          >{formatCurrency(inv.total_gross)} &euro;</td
                        >
                        <td class="py-3 px-2 text-center">
                          <div
                            class="inline-flex rounded-lg border border-zinc-200 overflow-hidden text-xs font-bold"
                          >
                            <button
                              class="flex items-center gap-1 px-2.5 py-1.5 transition-colors {inv
                                .payments?.[0]?.method === 'cash'
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'text-zinc-300 hover:bg-zinc-50 hover:text-zinc-500'}"
                              disabled={inv.payments?.[0]?.method === "cash" ||
                                swapping === inv.id}
                              onclick={() => handleSwapPayment(inv)}
                            >
                              <HandCoins class="w-3.5 h-3.5" />
                              Ef.
                            </button>
                            <button
                              class="flex items-center gap-1 px-2.5 py-1.5 border-l border-zinc-200 transition-colors {inv
                                .payments?.[0]?.method === 'card'
                                ? 'bg-blue-100 text-blue-700'
                                : 'text-zinc-300 hover:bg-zinc-50 hover:text-zinc-500'}"
                              disabled={inv.payments?.[0]?.method === "card" ||
                                swapping === inv.id}
                              onclick={() => handleSwapPayment(inv)}
                            >
                              <CreditCard class="w-3.5 h-3.5" />
                              Tarj.
                            </button>
                          </div>
                          {#if inv.payments?.[0]?.method === "cash" && inv.payments[0].change && parseFloat(inv.payments[0].change) > 0}
                            <div class="text-[10px] text-zinc-400 mt-0.5">
                              Entregado: {formatCurrency(
                                inv.payments[0].tendered ?? "0",
                              )} &euro;
                            </div>
                            <div class="text-[10px] text-zinc-400">
                              Cambio: {formatCurrency(inv.payments[0].change)} &euro;
                            </div>
                          {/if}
                        </td>
                        <td class="py-3 px-2">
                          <div class="flex items-center justify-end gap-2">
                            <!-- Cancel (not implemented) -->
                            <button
                              class="p-3 rounded-xl text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 active:scale-95 transition-all"
                              title="Anular (no implementado)"
                              onclick={() => alert("Anulación no implementada")}
                            >
                              <RefundIcon class="w-5 h-5" />
                            </button>
                            <!-- Print -->
                            <button
                              class="p-3 rounded-xl text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 active:scale-95 transition-all"
                              title="Imprimir"
                              onclick={() => handlePrint(inv)}
                            >
                              <Printer class="w-5 h-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    {/each}
                  </tbody>
                </table>
              </div>
            {/if}
          </div>
        </div>
      </div>
    </div>
  </div>
{/if}
