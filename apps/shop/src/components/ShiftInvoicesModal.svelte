<script lang="ts">
  import { onMount } from "svelte";
  import {
    isShiftInvoicesModalOpen,
    shiftInvoices,
    loadShiftInvoices,
    swapPaymentMethod,
    isRectificativaModalOpen,
    rectificativaInvoice,
  } from "../stores/registerStore";
  import { printInvoice } from "../stores/printerStore";
  import type { Invoice } from "@pulpo/cms";
  import {
    X,
    FileText,
    Printer,
    CreditCard,
    HandCoins,
    Eye,
    EyeOff,
  } from "lucide-svelte";
  import RefundIcon from "./icons/RefundIcon.svelte";
  import { resolveRectificationReason } from "../types/shop";
  import Big from "big.js";

  let isOpen = $state(false);
  let isVisible = $state(false);
  let loading = $state(false);
  let invoices = $state<readonly Invoice[]>([]);
  let swapping = $state<string | null>(null);
  let expandedId = $state<string | null>(null);

  function itemPreview(inv: Invoice): string {
    const items = inv.items ?? [];
    const parts = items
      .slice(0, 3)
      .map((i) => `${parseInt(String(i.quantity))}x ${i.product_name}`);
    if (items.length > 3) parts.push(`+${items.length - 3} más`);
    return parts.join(", ");
  }

  function toggleDetail(id: string) {
    expandedId = expandedId === id ? null : id;
  }

  function taxBreakdown(
    inv: Invoice,
  ): { ratePct: string; base: string; tax: string }[] {
    const map = new Map<string, { base: Big; tax: Big }>();
    for (const item of inv.items ?? []) {
      const rate = item.tax_rate_snapshot;
      const entry = map.get(rate) ?? { base: new Big(0), tax: new Big(0) };
      entry.base = entry.base.plus(new Big(item.row_total_net_precise));
      entry.tax = entry.tax.plus(
        new Big(item.row_total_gross).minus(
          new Big(item.row_total_net_precise),
        ),
      );
      map.set(rate, entry);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => new Big(a).cmp(new Big(b)))
      .map(([rate, { base, tax }]) => ({
        ratePct: parseFloat(rate).toFixed(0),
        base: base.toFixed(2),
        tax: tax.toFixed(2),
      }));
  }

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

  function handleRectificativa(inv: Invoice) {
    rectificativaInvoice.set(inv);
    isRectificativaModalOpen.set(true);
  }

  function canRectify(inv: Invoice): boolean {
    return (
      inv.status === "paid" && inv.invoice_type !== "rectificativa"
    );
  }

  function handlePrint(inv: Invoice) {
    if (inv.invoice_type === "rectificativa") {
      const originalId = inv.original_invoice_id;
      const original = invoices.find((i) => i.id === originalId);
      printInvoice(inv, {
        originalInvoiceNumber: original?.invoice_number ?? "—",
      });
    } else {
      printInvoice(inv);
    }
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
              <div class="-mx-2 px-2">
                <table class="w-full text-sm">
                  <thead class="sticky top-0 z-10 bg-white">
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
                </table>
                <div class="max-h-[55vh] overflow-y-auto">
                  <table class="w-full text-sm">
                    <tbody>
                      {#each invoices as inv (inv.id)}
                        <!-- Main row -->
                        <tr
                          class="border-b transition-colors {expandedId ===
                          inv.id
                            ? 'bg-zinc-50 border-zinc-200'
                            : 'border-zinc-100 hover:bg-zinc-50'}"
                        >
                          <td class="py-3 px-2 text-zinc-700 font-mono"
                            >{formatTime(inv.date_created)}</td
                          >
                          <td class="py-3 px-2">
                            <div class="flex items-center gap-1.5">
                              <span class="text-zinc-700 font-medium">
                                {inv.invoice_number}
                              </span>
                              {#if inv.invoice_type === "rectificativa"}
                                <span
                                  class="px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide bg-red-100 text-red-700 rounded"
                                  >RECT</span
                                >
                              {:else if inv.status === "rectificada"}
                                <span
                                  class="px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide bg-zinc-200 text-zinc-500 rounded"
                                  >ANULADA</span
                                >
                              {/if}
                            </div>
                            <div
                              class="text-[10px] text-zinc-400 mt-0.5 truncate max-w-[180px]"
                            >
                              {itemPreview(inv)}
                            </div>
                          </td>
                          <td
                            class="py-3 px-2 font-bold text-right tabular-nums {parseFloat(
                              inv.total_gross,
                            ) < 0
                              ? 'text-red-600'
                              : 'text-zinc-900'}"
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
                                disabled={inv.payments?.[0]?.method ===
                                  "cash" || swapping === inv.id}
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
                                disabled={inv.payments?.[0]?.method ===
                                  "card" || swapping === inv.id}
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
                              <!-- Detail toggle -->
                              <button
                                class="p-3 rounded-xl transition-all active:scale-95 {expandedId ===
                                inv.id
                                  ? 'text-zinc-700 bg-zinc-200'
                                  : 'text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100'}"
                                title={expandedId === inv.id
                                  ? "Ocultar detalles"
                                  : "Ver detalles"}
                                onclick={() => toggleDetail(inv.id)}
                              >
                                {#if expandedId === inv.id}
                                  <EyeOff class="w-5 h-5" />
                                {:else}
                                  <Eye class="w-5 h-5" />
                                {/if}
                              </button>
                              <!-- Rectificativa -->
                              <button
                                class="p-3 rounded-xl active:scale-95 transition-all {canRectify(
                                  inv,
                                )
                                  ? 'text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100'
                                  : 'text-zinc-200 cursor-not-allowed'}"
                                title={canRectify(inv)
                                  ? "Anular / Rectificativa"
                                  : inv.status === "rectificada"
                                    ? "Factura anulada"
                                    : "No se puede rectificar"}
                                disabled={!canRectify(inv)}
                                onclick={() => handleRectificativa(inv)}
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
                        <!-- Expandable detail row -->
                        {#if expandedId === inv.id}
                          <tr class="bg-zinc-50 border-b border-zinc-200">
                            <td colspan="5" class="px-4 py-4">
                              <div
                                class="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden"
                              >
                                <!-- Items -->
                                <table class="w-full text-xs">
                                  <thead>
                                    <tr
                                      class="bg-zinc-50 border-b border-zinc-100"
                                    >
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
                                    {#each inv.items ?? [] as item}
                                      <tr class="border-b border-zinc-50">
                                        <td class="py-1.5 px-3 text-zinc-700"
                                          >{item.product_name}</td
                                        >
                                        <td
                                          class="py-1.5 px-3 text-zinc-500 text-right"
                                          >{parseInt(String(item.quantity))}</td
                                        >
                                        <td
                                          class="py-1.5 px-3 text-zinc-500 text-right tabular-nums"
                                          >{formatCurrency(
                                            item.price_gross_unit,
                                          )}</td
                                        >
                                        <td
                                          class="py-1.5 px-3 text-zinc-700 text-right tabular-nums font-medium"
                                        >
                                          {formatCurrency(
                                            new Big(item.price_gross_unit)
                                              .times(
                                                parseInt(String(item.quantity)),
                                              )
                                              .toFixed(2),
                                          )}
                                        </td>
                                      </tr>
                                      {#if item.discount_type && item.discount_value}
                                        <tr class="border-b border-zinc-50">
                                          <td
                                            colspan="3"
                                            class="py-0.5 px-3 text-zinc-400 text-xs pl-6"
                                          >
                                            Dto. {item.discount_type ===
                                            "percent"
                                              ? `-${parseFloat(item.discount_value)}%`
                                              : `-${formatCurrency(item.discount_value)}`}
                                          </td>
                                          <td
                                            class="py-0.5 px-3 text-red-500 text-right tabular-nums text-xs"
                                          >
                                            -{formatCurrency(
                                              item.discount_type === "percent"
                                                ? new Big(item.price_gross_unit)
                                                    .times(
                                                      parseInt(
                                                        String(item.quantity),
                                                      ),
                                                    )
                                                    .times(
                                                      new Big(
                                                        item.discount_value,
                                                      ),
                                                    )
                                                    .div(100)
                                                    .toFixed(2)
                                                : item.discount_value,
                                            )}
                                          </td>
                                        </tr>
                                      {/if}
                                    {/each}
                                  </tbody>
                                </table>
                                <!-- Totals -->
                                <div
                                  class="border-t border-zinc-200 px-3 py-2 space-y-1"
                                >
                                  {#if inv.discount_type && inv.discount_value}
                                    <div
                                      class="flex justify-between text-xs text-zinc-500"
                                    >
                                      <span>Subtotal</span>
                                      <span class="tabular-nums">
                                        {formatCurrency(
                                          new Big(inv.total_gross)
                                            .plus(
                                              inv.discount_type === "fixed"
                                                ? new Big(inv.discount_value)
                                                : new Big(inv.total_gross)
                                                    .div(
                                                      new Big(1).minus(
                                                        new Big(
                                                          inv.discount_value,
                                                        ).div(100),
                                                      ),
                                                    )
                                                    .minus(
                                                      new Big(inv.total_gross),
                                                    ),
                                            )
                                            .toFixed(2),
                                        )} &euro;
                                      </span>
                                    </div>
                                    <div
                                      class="flex justify-between text-xs text-red-500"
                                    >
                                      <span>
                                        Descuento {inv.discount_type ===
                                        "percent"
                                          ? `-${parseFloat(inv.discount_value)}%`
                                          : ""}
                                      </span>
                                      <span class="tabular-nums">
                                        -{formatCurrency(
                                          inv.discount_type === "fixed"
                                            ? inv.discount_value
                                            : new Big(inv.total_gross)
                                                .div(
                                                  new Big(1).minus(
                                                    new Big(
                                                      inv.discount_value,
                                                    ).div(100),
                                                  ),
                                                )
                                                .minus(new Big(inv.total_gross))
                                                .toFixed(2),
                                        )} &euro;
                                      </span>
                                    </div>
                                  {/if}
                                  <div
                                    class="flex justify-between text-sm font-bold text-zinc-900"
                                  >
                                    <span>TOTAL</span>
                                    <span class="tabular-nums"
                                      >{formatCurrency(inv.total_gross)} &euro;</span
                                    >
                                  </div>
                                  <!-- Tax breakdown -->
                                  {#each taxBreakdown(inv) as tb}
                                    <div
                                      class="flex justify-between text-[11px] text-zinc-400"
                                    >
                                      <span>IGIC {tb.ratePct}%</span>
                                      <span class="tabular-nums"
                                        >Base {tb.base} &euro; &middot; Imp. {tb.tax}
                                        &euro;</span
                                      >
                                    </div>
                                  {/each}
                                  <!-- Payment -->
                                  {#if inv.payments?.[0]}
                                    <div
                                      class="flex justify-between text-xs text-zinc-500 pt-1 border-t border-zinc-100"
                                    >
                                      <span
                                        >{inv.payments[0].method === "cash"
                                          ? "Efectivo"
                                          : "Tarjeta"}</span
                                      >
                                      <span class="tabular-nums">
                                        {#if inv.payments[0].method === "cash" && inv.payments[0].change && parseFloat(inv.payments[0].change) > 0}
                                          Entregado: {formatCurrency(
                                            inv.payments[0].tendered ?? "0",
                                          )} &euro; &middot; Cambio: {formatCurrency(
                                            inv.payments[0].change,
                                          )} &euro;
                                        {:else}
                                          {formatCurrency(inv.total_gross)} &euro;
                                        {/if}
                                      </span>
                                    </div>
                                  {/if}
                                  {#if inv.rectification_reason}
                                    <div
                                      class="flex justify-between text-xs text-zinc-500 pt-1 border-t border-zinc-100"
                                    >
                                      <span>Motivo</span>
                                      <span
                                        >{resolveRectificationReason(
                                          inv.rectification_reason,
                                        )}</span
                                      >
                                    </div>
                                  {/if}
                                </div>
                              </div>
                            </td>
                          </tr>
                        {/if}
                      {/each}
                    </tbody>
                  </table>
                </div>
              </div>
            {/if}
          </div>
        </div>
      </div>
    </div>
  </div>
{/if}
