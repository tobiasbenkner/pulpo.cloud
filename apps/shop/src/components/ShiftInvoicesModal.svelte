<script lang="ts">
  import { onMount } from "svelte";
  import {
    isShiftInvoicesModalOpen,
    shiftInvoices,
    loadShiftInvoices,
    swapPaymentMethod,
  } from "../stores/registerStore";
  import { printReceipt } from "../stores/printerStore";
  import type { Invoice } from "@pulpo/cms";
  import { X, FileText, Printer, CreditCard, Banknote } from "lucide-svelte";
  import RefundIcon from "./icons/RefundIcon.svelte";

  let isOpen = $state(false);
  let isVisible = $state(false);
  let loading = $state(false);
  let invoices = $state<Invoice[]>([]);
  let swapping = $state<string | null>(null);

  function formatTime(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
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
    const items = (inv.items ?? []).map((item) => ({
      productName: item.product_name,
      quantity: item.quantity,
      priceGrossUnit: item.price_gross_unit,
      taxRateSnapshot: item.tax_rate_snapshot,
      priceNetUnitPrecise: item.price_net_unit_precise,
      rowTotalGross: item.row_total_gross,
      rowTotalNetPrecise: item.row_total_net_precise,
    }));

    const payment = inv.payments?.[0];
    const method = payment?.method ?? "cash";

    printReceipt({
      totals: {
        gross: inv.total_gross,
        net: inv.total_net,
        tax: inv.total_tax,
        subtotal: inv.total_gross,
        discountTotal: "0.00",
        count: items.reduce((sum, i) => sum + i.quantity, 0),
        items,
        taxBreakdown: [],
      },
      invoiceNumber: inv.invoice_number,
      method,
      total: inv.total_gross,
      tendered: payment?.tendered ?? inv.total_gross,
      change: payment?.change ?? "0.00",
    });
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
                <p class="text-sm text-zinc-500 font-medium">Sin facturas en este turno</p>
              </div>
            {:else}
              <div class="max-h-[60vh] overflow-y-auto -mx-2 px-2">
                <table class="w-full text-sm">
                  <thead>
                    <tr class="border-b border-zinc-200">
                      <th class="text-left py-2 px-2 text-zinc-400 font-medium text-xs uppercase tracking-wide">Hora</th>
                      <th class="text-left py-2 px-2 text-zinc-400 font-medium text-xs uppercase tracking-wide">Nº</th>
                      <th class="text-right py-2 px-2 text-zinc-400 font-medium text-xs uppercase tracking-wide">Importe</th>
                      <th class="text-center py-2 px-2 text-zinc-400 font-medium text-xs uppercase tracking-wide">Pago</th>
                      <th class="text-right py-2 px-2 text-zinc-400 font-medium text-xs uppercase tracking-wide">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {#each invoices as inv (inv.id)}
                      {@const payment = inv.payments?.[0]}
                      {@const method = payment?.method ?? "cash"}
                      <tr class="border-b border-zinc-100 hover:bg-zinc-50 transition-colors">
                        <td class="py-3 px-2 text-zinc-700 font-mono">{formatTime(inv.date_created)}</td>
                        <td class="py-3 px-2 text-zinc-700 font-medium">{inv.invoice_number}</td>
                        <td class="py-3 px-2 text-zinc-900 font-bold text-right tabular-nums">{formatCurrency(inv.total_gross)} &euro;</td>
                        <td class="py-3 px-2 text-center">
                          <span
                            class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold {method === 'cash'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-blue-100 text-blue-700'}"
                          >
                            {method === "cash" ? "Ef." : "Tarj."}
                          </span>
                          {#if method === "cash" && payment?.change && parseFloat(payment.change) > 0}
                            <div class="text-[10px] text-zinc-400 mt-0.5">Cambio: {formatCurrency(payment.change)} &euro;</div>
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
                            <!-- Swap payment method -->
                            <button
                              class="p-3 rounded-xl text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 active:scale-95 transition-all disabled:opacity-40"
                              title={method === "cash" ? "Cambiar a tarjeta" : "Cambiar a efectivo"}
                              onclick={() => handleSwapPayment(inv)}
                              disabled={swapping === inv.id}
                            >
                              {#if method === "cash"}
                                <CreditCard class="w-5 h-5" />
                              {:else}
                                <Banknote class="w-5 h-5" />
                              {/if}
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
