<script lang="ts">
  import { onMount } from "svelte";
  import {
    isClosureModalOpen,
    closureReport,
    generateClosureReport,
    finalizeClosure,
  } from "../stores/registerStore";
  import { cartItems, parkedCarts } from "../stores/cartStore";
  import { printClosureReport } from "../stores/printerStore";
  import { taxName } from "../stores/taxStore";
  import Big from "big.js";
  import type { ClosureReport } from "../types/shop";

  type View = "loading" | "warning" | "summary" | "count" | "confirm" | "done";

  let currentView = $state<View>("loading");
  let isOpen = $state(false);
  let isVisible = $state(false);
  let report = $state<ClosureReport | null>(null);
  let warningText = $state("");
  let shouldPrint = $state(true);
  let finalizing = $state(false);
  let expectedCashValue = $state(0);
  let tax = $state("IGIC");
  let confirmMode = $state<"sin_recuento" | "recuento">("recuento");

  // Numpad state
  let numpadOpen = $state(false);
  let numpadMode = $state<"qty" | "total">("qty");
  let editingCents = $state(0);
  let qtyInputValue = $state(0);
  let numpadLabel = $state("");

  // Manual total input (in cents)
  let manualTotalCents = $state<number | null>(null);
  let totalInputCents = $state(0);

  // Denomination quantities keyed by cents
  let denomQtys = $state<Record<number, number>>({});

  const col1 = [500, 200, 100, 50, 20]; // big bills (cents)
  const col2 = [10, 5]; // small bills (euros) + euro coins + 50ct
  const col2coins = [200, 100, 50]; // 2€, 1€, 50ct
  const col3 = [20, 10, 5, 2, 1]; // small coins (cents)
  const col1Cents = col1.map((v) => v * 100);
  const col2Cents = [...col2.map((v) => v * 100), ...col2coins];
  const col3Cents = col3;

  function denomLabel(cents: number, isBill: boolean): string {
    if (isBill) return `${cents / 100} \u20AC`;
    return cents >= 100 ? `${cents / 100} \u20AC` : `${cents} cts`;
  }

  // --- Derived ---

  let denomCountedCents = $derived(
    Object.entries(denomQtys).reduce(
      (sum, [c, qty]) => sum + parseInt(c) * qty,
      0,
    ),
  );

  let totalCountedCents = $derived(
    manualTotalCents !== null ? manualTotalCents : denomCountedCents,
  );

  let countedEur = $derived((totalCountedCents / 100).toFixed(2));

  let diffValue = $derived(totalCountedCents / 100 - expectedCashValue);

  let differenceFormatted = $derived(
    `${diffValue >= 0 ? "+" : ""}${diffValue.toFixed(2)} \u20AC`,
  );

  let differenceColor = $derived(
    Math.abs(diffValue) < 0.005
      ? "text-zinc-400"
      : diffValue > 0
        ? "text-emerald-400"
        : "text-red-400",
  );

  let showCloseButton = $derived(
    currentView === "loading" ||
      currentView === "warning" ||
      currentView === "summary",
  );

  // --- Helpers ---

  function formatDateStr(iso: string): string {
    const d = new Date(iso);
    return (
      d.toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }) +
      " " +
      d.toLocaleTimeString("es-ES", {
        hour: "2-digit",
        minute: "2-digit",
      })
    );
  }

  function resetDenominations() {
    denomQtys = {};
    manualTotalCents = null;
  }

  function checkWarnings(): string | null {
    const warnings: string[] = [];
    const items = cartItems.get();
    const parked = parkedCarts.get();

    if (Object.keys(items).length > 0) {
      warnings.push("El carrito actual no está vacío.");
    }
    if (Object.keys(parked).length > 0) {
      const count = Object.keys(parked).length;
      warnings.push(
        `Hay ${count} carrito${count === 1 ? "" : "s"} aparcado${count === 1 ? "" : "s"}.`,
      );
    }

    return warnings.length > 0 ? warnings.join("\n") : null;
  }

  async function loadAndShowSummary() {
    currentView = "loading";
    try {
      report = await generateClosureReport();
      expectedCashValue = parseFloat(report.expectedCash);
      currentView = "summary";
    } catch {
      closeModal();
    }
  }

  function closeModal() {
    isClosureModalOpen.set(false);
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

  function denomSubtotal(cents: number): string {
    const qty = denomQtys[cents] ?? 0;
    return ((qty * cents) / 100).toFixed(2);
  }

  // --- Numpad ---

  function showQtyNumpad(cents: number, label: string) {
    numpadMode = "qty";
    editingCents = cents;
    qtyInputValue = denomQtys[cents] ?? 0;
    numpadLabel = label;
    numpadOpen = true;
  }

  function showTotalNumpad() {
    numpadMode = "total";
    totalInputCents = manualTotalCents ?? 0;
    numpadLabel = "Importe total";
    numpadOpen = true;
  }

  function hideNumpad() {
    numpadOpen = false;
  }

  function numpadDigit(val: number) {
    if (numpadMode === "qty") {
      if (qtyInputValue.toString().length >= 4) return;
      qtyInputValue = qtyInputValue * 10 + val;
    } else {
      if (totalInputCents.toString().length >= 8) return;
      totalInputCents = totalInputCents * 10 + val;
    }
  }

  function numpadClear() {
    if (numpadMode === "qty") {
      qtyInputValue = 0;
    } else {
      totalInputCents = 0;
    }
  }

  function numpadBackspace() {
    if (numpadMode === "qty") {
      qtyInputValue = Math.floor(qtyInputValue / 10);
    } else {
      totalInputCents = Math.floor(totalInputCents / 10);
    }
  }

  function numpadConfirm() {
    if (numpadMode === "qty") {
      denomQtys[editingCents] = qtyInputValue;
    } else {
      // Clear denominations first, then set manual total
      denomQtys = {};
      manualTotalCents = totalInputCents;
    }
    hideNumpad();
  }

  let numpadDisplay = $derived(
    numpadMode === "qty"
      ? String(qtyInputValue)
      : (totalInputCents / 100).toFixed(2),
  );

  let numpadDisplayLabel = $derived(
    numpadMode === "qty" ? "Cantidad" : "Importe",
  );

  function handleKeydown(e: KeyboardEvent) {
    if (!numpadOpen) return;
    if (e.key >= "0" && e.key <= "9") {
      e.preventDefault();
      numpadDigit(parseInt(e.key));
    } else if (e.key === "Backspace") {
      e.preventDefault();
      numpadBackspace();
    } else if (e.key === "Enter") {
      e.preventDefault();
      numpadConfirm();
    } else if (e.key === "Escape") {
      e.preventDefault();
      hideNumpad();
    }
  }

  // --- Denomination +/- ---

  function denomPlus(cents: number) {
    manualTotalCents = null;
    denomQtys[cents] = (denomQtys[cents] ?? 0) + 1;
  }

  function denomMinus(cents: number) {
    const current = denomQtys[cents] ?? 0;
    if (current > 0) {
      manualTotalCents = null;
      denomQtys[cents] = current - 1;
    }
  }

  // --- Build denomination data ---

  function buildDenominationCount(): {
    cents: number;
    label: string;
    qty: number;
  }[] {
    const result: { cents: number; label: string; qty: number }[] = [];
    for (const cents of col1Cents) {
      const qty = denomQtys[cents] ?? 0;
      if (qty > 0) result.push({ cents, label: denomLabel(cents, true), qty });
    }
    for (const cents of col2Cents) {
      const qty = denomQtys[cents] ?? 0;
      const isBill = cents >= 500;
      if (qty > 0)
        result.push({ cents, label: denomLabel(cents, isBill), qty });
    }
    for (const cents of col3Cents) {
      const qty = denomQtys[cents] ?? 0;
      if (qty > 0) result.push({ cents, label: denomLabel(cents, false), qty });
    }
    return result;
  }

  // --- Confirm OK (skip counting, use expected amount) ---

  async function handleConfirmOk() {
    finalizing = true;
    const expectedStr = report?.expectedCash ?? "0.00";

    try {
      if (shouldPrint && report) {
        printClosureReport(report, expectedStr, "0.00");
      }

      await finalizeClosure(expectedStr, []);

      doneDiffText = "Diferencia: +0.00 \u20AC";
      doneDiffColor = "text-zinc-500";
      currentView = "done";
    } catch (e) {
      console.error("Closure failed:", e);
      finalizing = false;
    }
  }

  // --- Finalize ---

  async function handleFinalize() {
    finalizing = true;
    const countedStr = countedEur;
    const rpt = closureReport.get();
    const diff = new Big(countedStr).minus(new Big(rpt?.expectedCash ?? "0"));
    const denomData = buildDenominationCount();

    try {
      if (shouldPrint && rpt) {
        printClosureReport(rpt, countedStr, diff.toFixed(2));
      }

      await finalizeClosure(countedStr, denomData);

      // Show done view
      doneDiffText = `Diferencia: ${diff.gte(0) ? "+" : ""}${diff.toFixed(2)} \u20AC`;
      doneDiffColor = diff.abs().lt(new Big("0.01"))
        ? "text-zinc-500"
        : diff.gt(0)
          ? "text-emerald-600"
          : "text-red-600";
      currentView = "done";
    } catch (e) {
      console.error("Closure failed:", e);
      finalizing = false;
    }
  }

  let doneDiffText = $state("");
  let doneDiffColor = $state("text-zinc-500");

  // --- Store subscription ---

  onMount(() => {
    const unsubTax = taxName.subscribe((v) => (tax = v));
    const unsub = isClosureModalOpen.subscribe((open) => {
      if (open) {
        resetDenominations();
        shouldPrint = true;
        finalizing = false;
        numpadOpen = false;
        openModalAnim();

        const warning = checkWarnings();
        if (warning) {
          warningText = warning;
          currentView = "warning";
        } else {
          loadAndShowSummary();
        }
      } else {
        hideModalAnim();
      }
    });
    return () => {
      unsub();
      unsubTax();
    };
  });
</script>

<svelte:window onkeydown={handleKeydown} />

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
          {#if showCloseButton}
            <div class="absolute right-4 top-4 z-20">
              <button
                class="rounded-full p-2 bg-zinc-100 text-zinc-400 hover:text-zinc-600 transition-colors"
                onclick={closeModal}
                aria-label="Cerrar"
              >
                <svg
                  class="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke-width="2"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          {/if}

          <!-- VIEW: LOADING -->
          {#if currentView === "loading"}
            <div class="px-8 py-12 flex flex-col items-center justify-center">
              <div
                class="w-10 h-10 border-2 border-zinc-300 border-t-zinc-600 rounded-full animate-spin mb-4"
              ></div>
              <p class="text-sm text-zinc-400">Cargando datos...</p>
            </div>

            <!-- VIEW: WARNING -->
          {:else if currentView === "warning"}
            <div class="px-8 py-8">
              <div class="flex justify-center mb-4">
                <div
                  class="w-14 h-14 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center"
                >
                  <svg
                    class="w-7 h-7"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
                    />
                  </svg>
                </div>
              </div>
              <h3 class="text-xl font-bold text-center text-zinc-900 mb-3">
                Atención
              </h3>
              <p
                class="text-sm text-center text-zinc-500 mb-6 whitespace-pre-line"
              >
                {warningText}
              </p>
              <div class="flex gap-3">
                <button
                  class="flex-1 py-3 rounded-xl border-2 border-zinc-200 text-zinc-600 font-bold text-sm hover:bg-zinc-50 transition-colors"
                  onclick={closeModal}
                >
                  Cancelar
                </button>
                <button
                  class="flex-1 py-3 rounded-xl bg-amber-500 text-white font-bold text-sm hover:bg-amber-600 transition-colors"
                  onclick={() => loadAndShowSummary()}
                >
                  Continuar de todos modos
                </button>
              </div>
            </div>

            <!-- VIEW: SUMMARY -->
          {:else if currentView === "summary"}
            <div class="px-8 py-8">
              <h3 class="text-2xl font-bold text-center text-zinc-900 mb-6">
                Cierre de caja
              </h3>

              <!-- Period -->
              <div
                class="bg-zinc-50 rounded-xl p-4 mb-4 border border-zinc-100"
              >
                <div class="flex justify-between text-sm mb-1">
                  <span class="text-zinc-400">Desde</span>
                  <span class="text-zinc-700 font-medium"
                    >{report ? formatDateStr(report.periodStart) : ""}</span
                  >
                </div>
                <div class="flex justify-between text-sm">
                  <span class="text-zinc-400">Hasta</span>
                  <span class="text-zinc-700 font-medium"
                    >{report ? formatDateStr(report.periodEnd) : ""}</span
                  >
                </div>
              </div>

              <!-- Totals -->
              <div class="space-y-2 mb-4">
                <div class="flex justify-between text-sm">
                  <span class="text-zinc-500">Transacciones</span>
                  <span class="font-bold text-zinc-900"
                    >{report?.transactionCount ?? 0}</span
                  >
                </div>
                <div class="h-px bg-zinc-100"></div>
                <div class="flex justify-between text-sm">
                  <span class="text-zinc-500">Bruto</span>
                  <span class="font-bold text-zinc-900"
                    >{report?.totalGross ?? "0.00"} EUR</span
                  >
                </div>
                <div class="flex justify-between text-sm">
                  <span class="text-zinc-500">Neto</span>
                  <span class="font-medium text-zinc-700"
                    >{report?.totalNet ?? "0.00"} EUR</span
                  >
                </div>
                <div class="flex justify-between text-sm">
                  <span class="text-zinc-500">Impuestos</span>
                  <span class="font-medium text-zinc-700"
                    >{report?.totalTax ?? "0.00"} EUR</span
                  >
                </div>
                <div class="h-px bg-zinc-100"></div>
                <div class="flex justify-between text-sm">
                  <span class="text-zinc-500">Efectivo</span>
                  <span class="font-medium text-zinc-700"
                    >{report?.totalCash ?? "0.00"} EUR</span
                  >
                </div>
                <div class="flex justify-between text-sm">
                  <span class="text-zinc-500">Tarjeta</span>
                  <span class="font-medium text-zinc-700"
                    >{report?.totalCard ?? "0.00"} EUR</span
                  >
                </div>
              </div>

              <!-- Tax Breakdown -->
              {#if report && report.taxBreakdown.length > 0}
                <div
                  class="bg-zinc-50 rounded-xl p-4 mb-6 border border-zinc-100 space-y-1"
                >
                  {#each report.taxBreakdown as entry}
                    <div class="flex justify-between text-sm">
                      <span class="text-zinc-500"
                        >{tax} {parseFloat(entry.rate).toFixed(0)}%</span
                      >
                      <span class="text-zinc-700 font-mono"
                        >Base {entry.net} &nbsp; Imp. {entry.tax}</span
                      >
                    </div>
                  {/each}
                </div>
              {/if}

              <button
                class="w-full bg-zinc-900 text-white font-bold text-lg py-4 rounded-2xl shadow-lg hover:bg-black active:scale-[0.98] transition-all"
                onclick={() => {
                  resetDenominations();
                  currentView = "count";
                }}
              >
                Continuar al recuento
              </button>
            </div>

            <!-- VIEW: COUNT -->
          {:else if currentView === "count"}
            <div class="px-6 py-6 flex flex-col relative">
              <!-- Back -->
              <div class="mb-4">
                <button
                  class="text-sm font-bold text-zinc-500 hover:text-zinc-800 flex items-center gap-1 py-2 pr-4 pl-0"
                  onclick={() => (currentView = "summary")}
                >
                  <svg
                    class="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                  Volver
                </button>
              </div>

              <!-- Expected / Counted / Difference -->
              <div
                class="bg-zinc-900 rounded-xl px-4 py-2.5 mb-4 shadow-inner flex items-center gap-4"
              >
                <div class="flex-1">
                  <span class="text-zinc-500 text-[10px] uppercase font-bold"
                    >Esperado</span
                  >
                  <div class="text-sm font-mono text-white">
                    {report?.expectedCash ?? "0.00"} &euro;
                  </div>
                </div>
                <div class="w-px h-8 bg-zinc-700"></div>
                <button
                  class="flex-1 cursor-pointer rounded-lg px-2 py-1 -mx-2 hover:bg-white/10 active:bg-white/15 transition-colors"
                  onclick={showTotalNumpad}
                >
                  <div class="flex items-center gap-1">
                    <span class="text-zinc-500 text-[10px] uppercase font-bold"
                      >Contado</span
                    >
                    <svg
                      class="w-3 h-3 text-zinc-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                      />
                    </svg>
                  </div>
                  <div class="text-lg font-mono font-bold text-white">
                    {countedEur} &euro;
                  </div>
                </button>
                <div class="w-px h-8 bg-zinc-700"></div>
                <div class="flex-1 text-right">
                  <span class="text-zinc-500 text-[10px] uppercase font-bold"
                    >Diferencia</span
                  >
                  <div class="text-sm font-bold {differenceColor}">
                    {differenceFormatted}
                  </div>
                </div>
              </div>

              <!-- Denomination Counting: 3 columns -->
              <div class="max-h-[300px] overflow-y-auto mb-4 -mx-1 px-1">
                <div class="grid grid-cols-3 gap-3">
                  {#each [{ cents: col1Cents, header: "Billetes" }, { cents: col2Cents, header: "Monedas" }, { cents: col3Cents, header: "Céntimos" }] as col}
                    <div>
                      <div
                        class="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2"
                      >
                        {col.header}
                      </div>
                      <div class="space-y-1">
                        {#each col.cents as cents}
                          {@const isBill = cents >= 500}
                          {@const label = denomLabel(cents, isBill)}
                          {@const qty = denomQtys[cents] ?? 0}
                          <div class="flex items-center gap-1">
                            <span
                              class="w-12 text-xs font-bold text-zinc-700 text-right shrink-0"
                              >{label}</span
                            >
                            <button
                              class="w-8 h-8 flex items-center justify-center rounded-lg bg-zinc-100 text-zinc-500 hover:bg-zinc-200 active:scale-95 transition-colors text-base font-bold leading-none"
                              onclick={() => denomMinus(cents)}>&minus;</button
                            >
                            <span
                              class="w-8 text-center text-sm font-bold text-zinc-900 tabular-nums cursor-pointer hover:bg-blue-50 hover:text-blue-700 rounded py-0.5 transition-colors select-none"
                              role="button"
                              tabindex="0"
                              onclick={() => showQtyNumpad(cents, label)}
                              onkeydown={(e) => {
                                if (e.key === "Enter" || e.key === " ")
                                  showQtyNumpad(cents, label);
                              }}>{qty}</span
                            >
                            <button
                              class="w-8 h-8 flex items-center justify-center rounded-lg bg-zinc-100 text-zinc-500 hover:bg-zinc-200 active:scale-95 transition-colors text-base font-bold leading-none"
                              onclick={() => denomPlus(cents)}>+</button
                            >
                          </div>
                        {/each}
                      </div>
                    </div>
                  {/each}
                </div>
              </div>

              <!-- Reset -->
              <button
                class="w-full mb-3 py-2 rounded-xl border-2 border-dashed border-zinc-300 text-zinc-500 font-bold text-sm hover:border-zinc-400 hover:bg-zinc-50 transition-colors"
                onclick={resetDenominations}
              >
                Restablecer
              </button>

              <!-- Print Toggle -->
              <button
                class="flex items-center justify-between mb-4 bg-zinc-50 p-3 rounded-xl border border-zinc-100 cursor-pointer select-none w-full"
                onclick={() => (shouldPrint = !shouldPrint)}
              >
                <div class="flex items-center gap-2">
                  <div
                    class="bg-white p-2 rounded-full border border-zinc-200 text-zinc-500"
                  >
                    <svg
                      class="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                      />
                    </svg>
                  </div>
                  <span class="text-sm font-bold text-zinc-700"
                    >Imprimir ticket</span
                  >
                </div>
                <div
                  class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none {shouldPrint
                    ? 'bg-blue-600'
                    : 'bg-zinc-200'}"
                >
                  <span
                    class="inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out {shouldPrint
                      ? 'translate-x-6'
                      : 'translate-x-1'}"
                  ></span>
                </div>
              </button>

              <div class="flex gap-3">
                <button
                  class="flex-1 bg-zinc-200 text-zinc-700 font-bold text-base py-4 rounded-2xl hover:bg-zinc-300 active:scale-[0.98] transition-all"
                  onclick={() => {
                    confirmMode = "sin_recuento";
                    currentView = "confirm";
                  }}
                >
                  Sin recuento
                </button>
                <button
                  class="flex-1 bg-emerald-600 text-white font-bold text-base py-4 rounded-2xl shadow-lg shadow-emerald-200 transition-all active:scale-[0.98]"
                  onclick={() => {
                    confirmMode = "recuento";
                    currentView = "confirm";
                  }}
                >
                  Confirmar recuento
                </button>
              </div>

              <!-- QTY NUMPAD OVERLAY -->
              {#if numpadOpen}
                <div
                  class="absolute inset-0 z-40 bg-white/95 backdrop-blur-sm flex flex-col px-6 py-6"
                >
                  <!-- Header -->
                  <div class="flex items-center justify-between mb-4">
                    <button
                      class="text-sm font-bold text-zinc-500 hover:text-zinc-800 flex items-center gap-1 py-2 pr-4 pl-0"
                      onclick={hideNumpad}
                    >
                      <svg
                        class="w-5 h-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                      Cancelar
                    </button>
                    <span class="text-sm font-bold text-zinc-900"
                      >{numpadLabel}</span
                    >
                  </div>

                  <!-- Display -->
                  <div
                    class="bg-zinc-900 rounded-2xl p-5 mb-5 text-center shadow-inner"
                  >
                    <p
                      class="text-zinc-400 text-xs uppercase font-bold mb-1 tracking-wide"
                    >
                      {numpadDisplayLabel}
                    </p>
                    <div class="text-5xl font-mono text-white tracking-tight">
                      {numpadDisplay}{numpadMode === "total" ? " \u20AC" : ""}
                    </div>
                  </div>

                  <!-- Numpad -->
                  <div class="grid grid-cols-3 gap-3 mb-4 select-none flex-1">
                    {#each [1, 2, 3, 4, 5, 6, 7, 8, 9] as num}
                      <button
                        class="bg-white border border-zinc-200 text-2xl font-medium rounded-xl hover:bg-zinc-50 active:scale-95 shadow-sm text-zinc-700"
                        onclick={() => numpadDigit(num)}
                      >
                        {num}
                      </button>
                    {/each}
                    <button
                      class="bg-red-50 text-red-600 text-xl font-bold rounded-xl hover:bg-red-100 active:scale-95 border border-red-100"
                      onclick={numpadClear}>C</button
                    >
                    <button
                      class="bg-white border border-zinc-200 text-2xl font-medium rounded-xl hover:bg-zinc-50 active:scale-95 shadow-sm text-zinc-700"
                      onclick={() => numpadDigit(0)}>0</button
                    >
                    <button
                      class="bg-zinc-50 text-zinc-600 text-xl font-bold rounded-xl hover:bg-zinc-100 active:scale-95 border border-zinc-200 flex items-center justify-center"
                      onclick={numpadBackspace}
                      aria-label="Borrar"
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
                          stroke-width="2"
                          d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414-6.414A2 2 0 0110.828 5H19a2 2 0 012 2v10a2 2 0 01-2 2h-8.172a2 2 0 01-1.414-.586L3 12z"
                        />
                      </svg>
                    </button>
                  </div>

                  <button
                    class="w-full bg-blue-600 text-white font-bold text-xl py-4 rounded-2xl shadow-lg shadow-blue-200 transition-all active:scale-[0.98] hover:bg-blue-700"
                    onclick={numpadConfirm}
                  >
                    Aplicar
                  </button>
                </div>
              {/if}
            </div>

            <!-- VIEW: CONFIRM -->
          {:else if currentView === "confirm"}
            <div class="px-8 py-8">
              <div class="flex justify-center mb-4">
                <div
                  class="w-14 h-14 rounded-full bg-red-100 text-red-600 flex items-center justify-center"
                >
                  <svg
                    class="w-7 h-7"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
                    />
                  </svg>
                </div>
              </div>
              <h3 class="text-xl font-bold text-center text-zinc-900 mb-2">
                ¿Cerrar la caja?
              </h3>
              <p class="text-sm text-center text-zinc-500 mb-6">
                Esta acción no se puede deshacer. Se cerrará el turno actual y
                no se podrán registrar más ventas hasta abrir una nueva caja.
              </p>
              <div class="flex gap-3">
                <button
                  class="flex-1 py-3 rounded-xl border-2 border-zinc-200 text-zinc-600 font-bold text-sm hover:bg-zinc-50 transition-colors"
                  onclick={() => (currentView = "count")}
                >
                  Volver
                </button>
                <button
                  class="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold text-sm hover:bg-red-700 transition-colors disabled:opacity-50"
                  onclick={() =>
                    confirmMode === "sin_recuento"
                      ? handleConfirmOk()
                      : handleFinalize()}
                  disabled={finalizing}
                >
                  {finalizing ? "Cerrando..." : "Sí, cerrar caja"}
                </button>
              </div>
            </div>

            <!-- VIEW: DONE -->
          {:else if currentView === "done"}
            <div class="px-8 py-8">
              <div class="flex justify-center mb-4">
                <div
                  class="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center"
                >
                  <svg
                    class="w-8 h-8"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
              </div>
              <h3 class="text-2xl font-bold text-center text-zinc-900 mb-2">
                Caja cerrada
              </h3>
              <p class="text-center text-lg font-bold mb-6 {doneDiffColor}">
                {doneDiffText}
              </p>
              <button
                class="w-full bg-zinc-900 text-white font-bold text-lg py-4 rounded-2xl shadow-lg hover:bg-black active:scale-[0.98] transition-all"
                onclick={closeModal}
              >
                OK
              </button>
            </div>
          {/if}
        </div>
      </div>
    </div>
  </div>
{/if}
