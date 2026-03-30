<script lang="ts">
  import { onMount } from "svelte";
  import {
    isInvoiceSearchModalOpen,
    isRectificativaModalOpen,
    rectificativaInvoice,
    shiftInvoices,
    searchInvoiceByNumber,
  } from "../stores/registerStore";
  import { printInvoice } from "../stores/printerStore";
  import { resolveRectificationReason } from "../types/shop";
  import { taxName } from "../stores/taxStore";
  import type { Invoice } from "../lib/types";
  import { X, Search, FileText, Printer } from "lucide-svelte";
  import RefundIcon from "./icons/RefundIcon.svelte";
  import Big from "big.js";

  let isOpen = $state(false);
  let isVisible = $state(false);
  let query = $state("");
  let loading = $state(false);
  let searched = $state(false);
  let invoice = $state<Invoice | null>(null);
  let rectificativas = $state<Invoice[]>([]);
  let error = $state("");
  let tax = $state("IGIC");

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
    isInvoiceSearchModalOpen.set(false);
  }

  function reset() {
    query = "";
    searched = false;
    invoice = null;
    rectificativas = [];
    error = "";
  }

  async function handleSearch() {
    const q = query.trim();
    if (!q) return;
    loading = true;
    error = "";
    searched = false;
    invoice = null;
    rectificativas = [];
    try {
      const result = await searchInvoiceByNumber(q);
      searched = true;
      if (result) {
        invoice = result.invoice;
        rectificativas = result.rectificativas;
      }
    } catch (e) {
      console.error("Failed to search invoice:", e);
      error = "Error al buscar la factura";
    } finally {
      loading = false;
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Enter") handleSearch();
  }

  function canRectify(inv: Invoice): boolean {
    return inv.status === "paid" && inv.invoice_type !== "rectificativa";
  }

  function rectificationProgress(): {
    rectified: number;
    total: number;
  } | null {
    if (!invoice || !canRectify(invoice)) return null;
    const totalQty = (invoice.items ?? []).reduce(
      (sum, i) => sum + Math.abs(Number(i.quantity)),
      0,
    );
    if (totalQty === 0) return null;

    let rectifiedQty = 0;
    for (const r of rectificativas) {
      for (const ri of r.items ?? []) {
        rectifiedQty += Math.abs(Number(ri.quantity));
      }
    }
    if (rectifiedQty === 0) return null;
    return { rectified: rectifiedQty, total: totalQty };
  }

  function handleRectificativa() {
    if (!invoice || !canRectify(invoice)) return;
    // Put the invoice and its rectificativas into shiftInvoices
    // so RectificativaModal can compute already-rectified quantities
    shiftInvoices.set([invoice, ...rectificativas]);
    rectificativaInvoice.set(invoice);
    isRectificativaModalOpen.set(true);
  }

  function handlePrint(inv: Invoice) {
    if (inv.invoice_type === "rectificativa" && invoice) {
      printInvoice(inv, {
        originalInvoiceNumber: invoice.invoice_number ?? "—",
      });
    } else {
      printInvoice(inv);
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

  function formatCurrency(value: string): string {
    return parseFloat(value).toFixed(2);
  }

  function taxBreakdown(
    inv: Invoice,
  ): { ratePct: string; base: string; tax: string }[] {
    if (Array.isArray(inv.tax_breakdown) && inv.tax_breakdown.length > 0) {
      return inv.tax_breakdown
        .slice()
        .sort((a, b) => new Big(a.rate).cmp(new Big(b.rate)))
        .map((entry) => ({
          ratePct: parseFloat(entry.rate).toFixed(0),
          base: entry.net,
          tax: entry.tax,
        }));
    }
    const HUNDRED = new Big(100);
    const grossMap = new Map<string, Big>();
    for (const item of inv.items ?? []) {
      const rate = item.tax_rate_snapshot;
      const prev = grossMap.get(rate) ?? new Big(0);
      grossMap.set(rate, prev.plus(new Big(item.row_total_gross)));
    }
    return Array.from(grossMap.entries())
      .sort(([a], [b]) => new Big(a).cmp(new Big(b)))
      .map(([rate, gross]) => {
        const gGross = new Big(gross.toFixed(2));
        const rateDecimal = new Big(rate).div(HUNDRED);
        const net = new Big(
          gGross.div(new Big(1).plus(rateDecimal)).toFixed(2),
        );
        const taxAmt = gGross.minus(net);
        return {
          ratePct: parseFloat(rate).toFixed(0),
          base: net.toFixed(2),
          tax: taxAmt.toFixed(2),
        };
      });
  }

  async function refreshInvoice() {
    if (!invoice) return;
    try {
      const result = await searchInvoiceByNumber(invoice.invoice_number);
      if (result) {
        invoice = result.invoice;
        rectificativas = result.rectificativas;
      }
    } catch (e) {
      console.error("Failed to refresh invoice:", e);
    }
  }

  onMount(() => {
    const unsubModal = isInvoiceSearchModalOpen.subscribe((open) => {
      if (open) {
        reset();
        openModalAnim();
      } else {
        hideModalAnim();
      }
    });

    let rectModalWasOpen = false;
    const unsubRect = isRectificativaModalOpen.subscribe((open) => {
      if (rectModalWasOpen && !open && invoice) {
        refreshInvoice();
      }
      rectModalWasOpen = open;
    });

    const unsubTax = taxName.subscribe((v) => (tax = v));

    return () => {
      unsubModal();
      unsubRect();
      unsubTax();
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
              Anular factura
            </h3>

            <!-- Search bar -->
            <div class="flex gap-2 mb-6">
              <div class="flex-1 relative">
                <input
                  type="text"
                  bind:value={query}
                  onkeydown={handleKeydown}
                  placeholder="Número de factura (ej. 42, F-12, R-5)"
                  class="w-full px-4 py-3 pr-10 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
                />
                <Search
                  class="w-4 h-4 text-zinc-400 absolute right-3 top-1/2 -translate-y-1/2"
                />
              </div>
              <button
                class="px-5 py-3 bg-zinc-900 text-white text-sm font-medium rounded-xl hover:bg-zinc-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                onclick={handleSearch}
                disabled={loading || !query.trim()}
              >
                {#if loading}
                  <div
                    class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"
                  ></div>
                {:else}
                  Buscar
                {/if}
              </button>
            </div>

            {#if error}
              <div
                class="flex flex-col items-center justify-center py-8 text-red-500"
              >
                <p class="text-sm font-medium">{error}</p>
              </div>
            {:else if searched && !invoice}
              <div class="flex flex-col items-center justify-center py-12">
                <div
                  class="w-14 h-14 rounded-full bg-zinc-100 text-zinc-400 flex items-center justify-center mb-4"
                >
                  <FileText class="w-7 h-7" />
                </div>
                <p class="text-sm text-zinc-500 font-medium">
                  No se encontró ninguna factura con ese número
                </p>
              </div>
            {:else if invoice}
              <!-- Invoice detail -->
              <div
                class="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden"
              >
                <!-- Header -->
                <div
                  class="flex items-center justify-between px-4 py-3 bg-zinc-50 border-b border-zinc-100"
                >
                  <div>
                    <span class="text-sm font-bold text-zinc-900">
                      {invoice.invoice_number}
                    </span>
                    {#if invoice.invoice_type === "rectificativa"}
                      <span
                        class="ml-2 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide bg-red-100 text-red-700 rounded"
                        >RECT</span
                      >
                    {:else if invoice.status === "rectificada"}
                      <span
                        class="ml-2 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide bg-zinc-200 text-zinc-500 rounded"
                        >ANULADA</span
                      >
                    {:else}
                      {@const progress = rectificationProgress()}
                      {#if progress}
                        <span
                          class="ml-2 inline-flex items-center gap-1.5 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide bg-zinc-200 text-zinc-500 rounded"
                        >
                          ANULADA
                          <span
                            class="inline-block w-8 h-1.5 bg-zinc-300 rounded-full overflow-hidden"
                          >
                            <span
                              class="block h-full bg-zinc-500 rounded-full"
                              style="width: {(progress.rectified /
                                progress.total) *
                                100}%"
                            ></span>
                          </span>
                          <span class="tabular-nums text-zinc-400"
                            >{progress.rectified}/{progress.total}</span
                          >
                        </span>
                      {/if}
                    {/if}
                    <div class="text-xs text-zinc-400 mt-0.5">
                      {formatDate(invoice.date_created)}
                    </div>
                    {#if invoice.customer_name}
                      <div
                        class="text-xs text-blue-600 font-medium mt-0.5"
                      >
                        {invoice.customer_name}
                        {#if invoice.customer_nif}
                          <span class="text-zinc-400 ml-1"
                            >NIF: {invoice.customer_nif}</span
                          >
                        {/if}
                      </div>
                    {/if}
                  </div>
                  <div class="flex items-center gap-2">
                    <!-- Rectify button -->
                    <button
                      class="p-3 rounded-xl active:scale-95 transition-all {canRectify(
                        invoice,
                      )
                        ? 'text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100'
                        : 'text-zinc-200 cursor-not-allowed'}"
                      title={canRectify(invoice)
                        ? "Anular / Rectificativa"
                        : invoice.status === "rectificada"
                          ? "Factura anulada"
                          : "No se puede rectificar"}
                      disabled={!canRectify(invoice)}
                      onclick={handleRectificativa}
                    >
                      <RefundIcon class="w-5 h-5" />
                    </button>
                    <!-- Print button -->
                    <button
                      class="p-3 rounded-xl text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 active:scale-95 transition-all"
                      title="Imprimir"
                      onclick={() => handlePrint(invoice!)}
                    >
                      <Printer class="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <!-- Items -->
                <table class="w-full text-xs">
                  <thead>
                    <tr class="bg-zinc-50 border-b border-zinc-100">
                      <th
                        class="text-left py-2 px-3 text-zinc-400 font-medium"
                        >Artículo</th
                      >
                      <th
                        class="text-right py-2 px-3 text-zinc-400 font-medium"
                        >Ud.</th
                      >
                      <th
                        class="text-right py-2 px-3 text-zinc-400 font-medium"
                        >Precio</th
                      >
                      <th
                        class="text-right py-2 px-3 text-zinc-400 font-medium"
                        >Total</th
                      >
                    </tr>
                  </thead>
                  <tbody>
                    {#each invoice.items ?? [] as item}
                      <tr class="border-b border-zinc-50">
                        <td class="py-1.5 px-3 text-zinc-700"
                          >{item.product_name}</td
                        >
                        <td class="py-1.5 px-3 text-zinc-500 text-right"
                          >{parseInt(String(item.quantity))}</td
                        >
                        <td
                          class="py-1.5 px-3 text-zinc-500 text-right tabular-nums"
                          >{formatCurrency(item.price_gross_unit)}</td
                        >
                        <td
                          class="py-1.5 px-3 text-zinc-700 text-right tabular-nums font-medium"
                        >
                          {formatCurrency(
                            new Big(item.price_gross_unit)
                              .times(parseInt(String(item.quantity)))
                              .toFixed(2),
                          )}
                        </td>
                      </tr>
                    {/each}
                  </tbody>
                </table>

                <!-- Totals -->
                <div class="border-t border-zinc-200 px-3 py-2 space-y-1">
                  <div
                    class="flex justify-between text-sm font-bold {parseFloat(
                      invoice.total_gross,
                    ) < 0
                      ? 'text-red-600'
                      : 'text-zinc-900'}"
                  >
                    <span>TOTAL</span>
                    <span class="tabular-nums"
                      >{formatCurrency(invoice.total_gross)} &euro;</span
                    >
                  </div>
                  {#each taxBreakdown(invoice) as tb}
                    <div
                      class="flex justify-between text-[11px] text-zinc-400"
                    >
                      <span>{tax} {tb.ratePct}%</span>
                      <span class="tabular-nums"
                        >Base {tb.base} &euro; &middot; Imp. {tb.tax}
                        &euro;</span
                      >
                    </div>
                  {/each}
                  {#if invoice.payments?.[0]}
                    <div
                      class="flex justify-between text-xs text-zinc-500 pt-1 border-t border-zinc-100"
                    >
                      <span
                        >{invoice.payments[0].method === "cash"
                          ? "Efectivo"
                          : "Tarjeta"}</span
                      >
                      <span class="tabular-nums"
                        >{formatCurrency(invoice.total_gross)} &euro;</span
                      >
                    </div>
                  {/if}
                  {#if invoice.rectification_reason}
                    <div
                      class="flex justify-between text-xs text-zinc-500 pt-1 border-t border-zinc-100"
                    >
                      <span>Motivo</span>
                      <span
                        >{resolveRectificationReason(
                          invoice.rectification_reason,
                        )}</span
                      >
                    </div>
                  {/if}
                </div>
              </div>

              <!-- Existing rectificativas -->
              {#if rectificativas.length > 0}
                <div class="mt-4">
                  <h4
                    class="text-xs font-bold text-zinc-400 uppercase tracking-wide mb-2"
                  >
                    Rectificativas existentes
                  </h4>
                  {#each rectificativas as rect}
                    <div
                      class="flex items-center justify-between px-3 py-2 bg-red-50 rounded-lg border border-red-100 mb-1"
                    >
                      <div>
                        <span class="text-sm font-medium text-red-700"
                          >{rect.invoice_number}</span
                        >
                        <span class="text-xs text-red-400 ml-2"
                          >{formatDate(rect.date_created)}</span
                        >
                      </div>
                      <div class="flex items-center gap-2">
                        <span
                          class="text-sm font-bold text-red-600 tabular-nums"
                          >{formatCurrency(rect.total_gross)} &euro;</span
                        >
                        <button
                          class="p-2 rounded-lg text-red-400 hover:text-red-700 hover:bg-red-100 active:scale-95 transition-all"
                          title="Imprimir"
                          onclick={() => handlePrint(rect)}
                        >
                          <Printer class="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  {/each}
                </div>
              {/if}
            {:else}
              <div class="flex flex-col items-center justify-center py-12">
                <div
                  class="w-14 h-14 rounded-full bg-zinc-100 text-zinc-400 flex items-center justify-center mb-4"
                >
                  <Search class="w-7 h-7" />
                </div>
                <p class="text-sm text-zinc-500 font-medium">
                  Introduce el número de factura para buscar
                </p>
              </div>
            {/if}
          </div>
        </div>
      </div>
    </div>
  </div>
{/if}
