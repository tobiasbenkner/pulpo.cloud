<script lang="ts">
  import { onMount } from "svelte";
  import {
    isRectificativaModalOpen,
    rectificativaInvoice,
    shiftInvoices,
    createRectificativa,
  } from "../stores/registerStore";
  import { shouldPrintReceipt } from "../stores/cartStore";
  import { printRectificativa } from "../stores/printerStore";
  import { incrementStock } from "../stores/productStore";
  import { RECTIFICATION_REASONS } from "../types/shop";
  import type { RectificationReason } from "../types/shop";
  import type { Invoice, InvoiceItem } from "@pulpo/cms";
  import {
    X,
    Check,
    ChevronLeft,
    AlertTriangle,
    HandCoins,
    CreditCard,
  } from "lucide-svelte";
  import Big from "big.js";

  type View = "select" | "confirm" | "done";

  let isOpen = $state(false);
  let isVisible = $state(false);
  let view = $state<View>("select");
  let invoice = $state<Invoice | null>(null);
  let submitting = $state(false);
  let resultNumber = $state("");

  // Form state
  let reason = $state<RectificationReason | "">("");
  let reasonDetail = $state("");
  let refundMethod = $state<"cash" | "card">("cash");
  let selectedItems = $state<
    {
      item: InvoiceItem;
      selected: boolean;
      quantity: number;
      maxQuantity: number;
    }[]
  >([]);

  // Derived
  let allRectified = $derived(selectedItems.length === 0);

  let hasValidSelection = $derived(
    reason !== "" && selectedItems.some((s) => s.selected),
  );

  let refundTotal = $derived.by(() => {
    let total = new Big(0);
    for (const s of selectedItems) {
      if (!s.selected) continue;
      const origQty = s.maxQuantity;
      const origRowGross = new Big(s.item.row_total_gross);
      const proportional = origRowGross.times(s.quantity).div(origQty);
      total = total.plus(proportional);
    }
    return total.toFixed(2);
  });

  function resetState() {
    view = "select";
    reason = "";
    reasonDetail = "";
    refundMethod = "cash";
    selectedItems = [];
    submitting = false;
    resultNumber = "";
  }

  function initItems(inv: Invoice) {
    // Check already-rectified quantities from existing rectificativas
    const allInvoices = shiftInvoices.get();
    const alreadyRectified = new Map<string, number>();
    for (const other of allInvoices) {
      if (
        (other as any).invoice_type !== "rectificativa" ||
        (other as any).original_invoice_id !== inv.id
      )
        continue;
      for (const ri of other.items ?? []) {
        const key = `${ri.product_id ?? ""}|${ri.product_name}`;
        const prev = alreadyRectified.get(key) ?? 0;
        alreadyRectified.set(
          key,
          prev + Math.abs(parseInt(String(ri.quantity))),
        );
      }
    }

    selectedItems = (inv.items ?? [])
      .map((item) => {
        const key = `${item.product_id ?? ""}|${item.product_name}`;
        const origQty = Math.abs(parseInt(String(item.quantity)));
        const rectified = alreadyRectified.get(key) ?? 0;
        const remaining = Math.max(0, origQty - rectified);
        return {
          item,
          selected: remaining > 0,
          quantity: remaining,
          maxQuantity: remaining,
        };
      })
      .filter((s) => s.maxQuantity > 0);
  }

  function toggleItem(index: number) {
    selectedItems[index].selected = !selectedItems[index].selected;
  }

  function adjustQuantity(index: number, delta: number) {
    const s = selectedItems[index];
    const newQty = s.quantity + delta;
    if (newQty < 1 || newQty > s.maxQuantity) return;
    selectedItems[index].quantity = newQty;
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
    isRectificativaModalOpen.set(false);
    rectificativaInvoice.set(null);
  }

  function goToConfirm() {
    view = "confirm";
  }

  function goBack() {
    view = "select";
  }

  function buildItemsPayload() {
    return selectedItems
      .filter((s) => s.selected)
      .map((s) => {
        const origQty = s.maxQuantity;
        const ratio = new Big(s.quantity).div(origQty);
        const rowTotalGross = new Big(s.item.row_total_gross)
          .times(ratio)
          .toFixed(2);
        const rowTotalNetPrecise = new Big(s.item.row_total_net_precise)
          .times(ratio)
          .toFixed(8);

        return {
          product_id: s.item.product_id,
          product_name: s.item.product_name,
          quantity: s.quantity,
          tax_rate_snapshot: s.item.tax_rate_snapshot,
          price_gross_unit: s.item.price_gross_unit,
          price_net_unit_precise: s.item.price_net_unit_precise,
          row_total_net_precise: rowTotalNetPrecise,
          row_total_gross: rowTotalGross,
          discount_type: s.item.discount_type,
          discount_value: s.item.discount_value,
        };
      });
  }

  async function handleConfirm() {
    if (!invoice || submitting) return;
    submitting = true;

    try {
      const items = buildItemsPayload();
      const result = await createRectificativa({
        original_invoice_id: invoice.id,
        reason: reason as string,
        reason_detail: reason === "otros" ? reasonDetail : undefined,
        payment_method: refundMethod,
        items,
      });

      resultNumber = (result.rectificativa as Invoice).invoice_number;

      // Increment stock optimistically
      const returnedItems = items
        .filter((i) => i.product_id)
        .map((i) => ({
          productId: i.product_id!,
          quantity: i.quantity,
        }));
      if (returnedItems.length > 0) {
        incrementStock(returnedItems);
      }

      // Print if enabled
      if (shouldPrintReceipt.get()) {
        await printRectificativa(
          result.rectificativa as Invoice,
          invoice.invoice_number,
          { openDrawer: refundMethod === "cash" },
        );
      }

      view = "done";
    } catch (e) {
      console.error("Failed to create rectificativa:", e);
      alert("Error al crear la rectificativa");
    } finally {
      submitting = false;
    }
  }

  function formatCurrency(value: string): string {
    return parseFloat(value).toFixed(2);
  }

  onMount(() => {
    const unsubModal = isRectificativaModalOpen.subscribe((open) => {
      if (open) {
        const inv = rectificativaInvoice.get();
        if (inv) {
          invoice = inv;
          resetState();
          refundMethod = inv.payments?.[0]?.method ?? "cash";
          initItems(inv);
          openModalAnim();
        }
      } else {
        hideModalAnim();
      }
    });

    return () => {
      unsubModal();
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
          class="relative transform overflow-hidden rounded-3xl bg-white text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-xl {isVisible
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
            {#if view === "select"}
              <h3
                class="text-2xl font-bold text-center text-zinc-900 mb-1"
              >
                Rectificativa
              </h3>
              {#if invoice}
                <p class="text-center text-sm text-zinc-400 mb-6">
                  Factura original: {invoice.invoice_number}
                </p>
              {/if}

              {#if allRectified}
                <div class="flex flex-col items-center py-6">
                  <div
                    class="w-14 h-14 rounded-full bg-zinc-100 text-zinc-400 flex items-center justify-center mb-4"
                  >
                    <Check class="w-7 h-7" />
                  </div>
                  <p class="text-sm text-zinc-500 font-medium mb-1">
                    Todas las posiciones ya han sido rectificadas.
                  </p>
                  <p class="text-xs text-zinc-400 mb-6">
                    No quedan artículos por devolver.
                  </p>
                  <button
                    class="px-8 py-3 rounded-xl bg-zinc-800 text-white font-medium hover:bg-zinc-700 transition-colors"
                    onclick={closeModal}
                  >
                    Cerrar
                  </button>
                </div>
              {:else}

              <!-- Reason dropdown -->
              <div class="mb-4">
                <label
                  for="rect-reason"
                  class="block text-sm font-medium text-zinc-700 mb-1"
                  >Motivo <span class="text-red-400">*</span></label
                >
                <select
                  id="rect-reason"
                  class="w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-300"
                  bind:value={reason}
                >
                  <option value="" disabled>Seleccionar motivo...</option>
                  {#each RECTIFICATION_REASONS as r}
                    <option value={r.value}>{r.label}</option>
                  {/each}
                </select>
              </div>

              {#if reason === "otros"}
                <div class="mb-4">
                  <textarea
                    class="w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-300 resize-none"
                    rows="2"
                    placeholder="Descripción del motivo..."
                    bind:value={reasonDetail}
                  ></textarea>
                </div>
              {/if}

              <!-- Items list -->
              <div class="mb-4">
                <p
                  class="text-xs font-medium text-zinc-400 uppercase tracking-wide mb-2"
                >
                  Posiciones
                </p>
                <div
                  class="border border-zinc-200 rounded-xl overflow-hidden divide-y divide-zinc-100"
                >
                  {#each selectedItems as s, i}
                    <div
                      class="flex items-center gap-3 px-4 py-3 transition-colors {s.selected
                        ? 'bg-white'
                        : 'bg-zinc-50 opacity-50'}"
                    >
                      <!-- Checkbox -->
                      <button
                        class="w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors {s.selected
                          ? 'border-zinc-700 bg-zinc-700 text-white'
                          : 'border-zinc-300 bg-white'}"
                        onclick={() => toggleItem(i)}
                      >
                        {#if s.selected}
                          <Check class="w-3 h-3" />
                        {/if}
                      </button>

                      <!-- Product info -->
                      <div class="flex-1 min-w-0">
                        <div
                          class="text-sm text-zinc-800 font-medium truncate"
                        >
                          {s.item.product_name}
                        </div>
                        <div class="text-xs text-zinc-400">
                          @ {formatCurrency(s.item.price_gross_unit)} &euro;
                        </div>
                      </div>

                      <!-- Quantity controls -->
                      {#if s.selected}
                        <div
                          class="flex items-center gap-1 shrink-0"
                        >
                          <button
                            class="w-8 h-8 rounded-lg bg-zinc-100 text-zinc-600 flex items-center justify-center text-lg font-bold hover:bg-zinc-200 transition-colors disabled:opacity-30"
                            disabled={s.quantity <= 1}
                            onclick={() => adjustQuantity(i, -1)}
                          >
                            -
                          </button>
                          <span
                            class="w-8 text-center text-sm font-bold tabular-nums"
                            >{s.quantity}</span
                          >
                          <button
                            class="w-8 h-8 rounded-lg bg-zinc-100 text-zinc-600 flex items-center justify-center text-lg font-bold hover:bg-zinc-200 transition-colors disabled:opacity-30"
                            disabled={s.quantity >= s.maxQuantity}
                            onclick={() => adjustQuantity(i, 1)}
                          >
                            +
                          </button>
                        </div>
                      {/if}

                      <!-- Row total -->
                      <div
                        class="text-sm font-bold tabular-nums text-right w-16 shrink-0"
                      >
                        {#if s.selected}
                          {(() => {
                            const ratio = new Big(s.quantity).div(
                              s.maxQuantity,
                            );
                            return new Big(s.item.row_total_gross)
                              .times(ratio)
                              .toFixed(2);
                          })()}
                        {:else}
                          <span class="text-zinc-300"
                            >{formatCurrency(s.item.row_total_gross)}</span
                          >
                        {/if}
                      </div>
                    </div>
                  {/each}
                </div>
              </div>

              <!-- Payment method -->
              <div class="mb-4">
                <p
                  class="text-xs font-medium text-zinc-400 uppercase tracking-wide mb-2"
                >
                  Devolución por
                </p>
                <div
                  class="inline-flex rounded-xl border border-zinc-200 overflow-hidden text-sm font-bold"
                >
                  <button
                    class="flex items-center gap-2 px-4 py-2.5 transition-colors {refundMethod ===
                    'cash'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'text-zinc-400 hover:bg-zinc-50 hover:text-zinc-600'}"
                    onclick={() => (refundMethod = "cash")}
                  >
                    <HandCoins class="w-4 h-4" />
                    Efectivo
                  </button>
                  <button
                    class="flex items-center gap-2 px-4 py-2.5 border-l border-zinc-200 transition-colors {refundMethod ===
                    'card'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-zinc-400 hover:bg-zinc-50 hover:text-zinc-600'}"
                    onclick={() => (refundMethod = "card")}
                  >
                    <CreditCard class="w-4 h-4" />
                    Tarjeta
                  </button>
                </div>
              </div>

              <!-- Refund total -->
              <div
                class="flex items-center justify-between bg-red-50 rounded-xl px-4 py-3 mb-6"
              >
                <span class="text-sm font-medium text-red-700"
                  >Importe a devolver</span
                >
                <span class="text-lg font-bold text-red-700 tabular-nums"
                  >-{refundTotal} &euro;</span
                >
              </div>

              <!-- Actions -->
              <div class="flex gap-3">
                <button
                  class="flex-1 py-3 rounded-xl border border-zinc-200 text-zinc-600 font-medium hover:bg-zinc-50 transition-colors"
                  onclick={closeModal}
                >
                  Cancelar
                </button>
                <button
                  class="flex-1 py-3 rounded-xl bg-zinc-800 text-white font-medium hover:bg-zinc-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  disabled={!hasValidSelection}
                  onclick={goToConfirm}
                >
                  Continuar
                </button>
              </div>
              {/if}
            {:else if view === "confirm"}
              <h3
                class="text-2xl font-bold text-center text-zinc-900 mb-6"
              >
                Confirmar rectificativa
              </h3>

              <!-- Summary -->
              <div
                class="border border-zinc-200 rounded-xl overflow-hidden mb-4"
              >
                <div class="px-4 py-3 bg-zinc-50 border-b border-zinc-200">
                  <p class="text-xs text-zinc-400">Factura original</p>
                  <p class="text-sm font-medium text-zinc-800">
                    {invoice?.invoice_number}
                  </p>
                </div>
                <div class="px-4 py-3 border-b border-zinc-100">
                  <p class="text-xs text-zinc-400">Motivo</p>
                  <p class="text-sm text-zinc-800">
                    {RECTIFICATION_REASONS.find((r) => r.value === reason)
                      ?.label ?? reason}
                    {#if reason === "otros" && reasonDetail}
                      — {reasonDetail}
                    {/if}
                  </p>
                </div>
                <div class="px-4 py-3 border-b border-zinc-100">
                  <p class="text-xs text-zinc-400">Devolución por</p>
                  <p class="text-sm text-zinc-800">
                    {refundMethod === "cash" ? "Efectivo" : "Tarjeta"}
                  </p>
                </div>
                <div class="divide-y divide-zinc-50">
                  {#each selectedItems.filter((s) => s.selected) as s}
                    <div
                      class="flex items-center justify-between px-4 py-2"
                    >
                      <span class="text-sm text-zinc-700"
                        >{s.quantity}x {s.item.product_name}</span
                      >
                      <span class="text-sm font-medium tabular-nums">
                        -{(() => {
                          const ratio = new Big(s.quantity).div(
                            s.maxQuantity,
                          );
                          return new Big(s.item.row_total_gross)
                            .times(ratio)
                            .toFixed(2);
                        })()} &euro;
                      </span>
                    </div>
                  {/each}
                </div>
                <div
                  class="flex items-center justify-between px-4 py-3 bg-red-50 border-t border-red-100"
                >
                  <span class="font-bold text-red-700">Total</span>
                  <span class="text-lg font-bold text-red-700 tabular-nums"
                    >-{refundTotal} &euro;</span
                  >
                </div>
              </div>

              <!-- Warning -->
              <div
                class="flex items-start gap-3 bg-amber-50 rounded-xl px-4 py-3 mb-6"
              >
                <AlertTriangle
                  class="w-5 h-5 text-amber-500 shrink-0 mt-0.5"
                />
                <p class="text-sm text-amber-700">
                  Esta acción es irreversible. Se creará una rectificativa
                  y se ajustará el stock.
                </p>
              </div>

              <!-- Actions -->
              <div class="flex gap-3">
                <button
                  class="flex-1 py-3 rounded-xl border border-zinc-200 text-zinc-600 font-medium hover:bg-zinc-50 transition-colors"
                  disabled={submitting}
                  onclick={goBack}
                >
                  <span class="flex items-center justify-center gap-1">
                    <ChevronLeft class="w-4 h-4" />
                    Volver
                  </span>
                </button>
                <button
                  class="flex-1 py-3 rounded-xl bg-red-600 text-white font-medium hover:bg-red-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  disabled={submitting}
                  onclick={handleConfirm}
                >
                  {#if submitting}
                    <span class="flex items-center justify-center gap-2">
                      <span
                        class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"
                      ></span>
                      Procesando...
                    </span>
                  {:else}
                    Confirmar
                  {/if}
                </button>
              </div>
            {:else if view === "done"}
              <div class="flex flex-col items-center py-6">
                <div
                  class="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4"
                >
                  <Check class="w-8 h-8" />
                </div>
                <h3 class="text-xl font-bold text-zinc-900 mb-1">
                  Rectificativa creada
                </h3>
                <p class="text-sm text-zinc-500 mb-6">
                  {resultNumber}
                </p>
                <button
                  class="px-8 py-3 rounded-xl bg-zinc-800 text-white font-medium hover:bg-zinc-700 transition-colors"
                  onclick={closeModal}
                >
                  Cerrar
                </button>
              </div>
            {/if}
          </div>
        </div>
      </div>
    </div>
  </div>
{/if}
