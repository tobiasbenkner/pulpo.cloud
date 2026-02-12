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
  import Big from "big.js";
  import type { ClosureReport } from "../types/shop";

  type View = "loading" | "warning" | "summary" | "count" | "done";

  let currentView = $state<View>("loading");
  let isOpen = $state(false);
  let isVisible = $state(false);
  let report = $state<ClosureReport | null>(null);
  let warningText = $state("");
  let shouldPrint = $state(true);
  let finalizing = $state(false);
  let expectedCashValue = $state(0);

  // Numpad state
  let numpadOpen = $state(false);
  let editingCents = $state(0);
  let qtyInputValue = $state(0);
  let numpadLabel = $state("");

  // Denomination quantities keyed by cents
  let denomQtys = $state<Record<number, number>>({});

  const bills = [500, 200, 100, 50, 20, 10, 5];
  const coins = [200, 100, 50, 20, 10, 5, 2, 1];
  const billCents = bills.map((v) => v * 100);
  const coinCents = coins;

  function denomLabel(cents: number, isBill: boolean): string {
    if (isBill) return `${cents / 100} \u20AC`;
    return cents >= 100 ? `${cents / 100} \u20AC` : `${cents} cts`;
  }

  // --- Derived ---

  let totalCountedCents = $derived(
    Object.entries(denomQtys).reduce(
      (sum, [c, qty]) => sum + parseInt(c) * qty,
      0,
    ),
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
    editingCents = cents;
    qtyInputValue = denomQtys[cents] ?? 0;
    numpadLabel = label;
    numpadOpen = true;
  }

  function hideQtyNumpad() {
    numpadOpen = false;
  }

  function numpadDigit(val: number) {
    if (qtyInputValue.toString().length >= 4) return;
    qtyInputValue = qtyInputValue * 10 + val;
  }

  function numpadClear() {
    qtyInputValue = 0;
  }

  function numpadBackspace() {
    qtyInputValue = Math.floor(qtyInputValue / 10);
  }

  function numpadConfirm() {
    denomQtys[editingCents] = qtyInputValue;
    hideQtyNumpad();
  }

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
      hideQtyNumpad();
    }
  }

  // --- Denomination +/- ---

  function denomPlus(cents: number) {
    denomQtys[cents] = (denomQtys[cents] ?? 0) + 1;
  }

  function denomMinus(cents: number) {
    const current = denomQtys[cents] ?? 0;
    if (current > 0) {
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
    for (const cents of billCents) {
      const qty = denomQtys[cents] ?? 0;
      if (qty > 0) result.push({ cents, label: denomLabel(cents, true), qty });
    }
    for (const cents of coinCents) {
      const qty = denomQtys[cents] ?? 0;
      if (qty > 0) result.push({ cents, label: denomLabel(cents, false), qty });
    }
    return result;
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
    return unsub;
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
          class="relative transform overflow-hidden rounded-3xl bg-white text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-lg {isVisible
            ? 'opacity-100 translate-y-0 sm:scale-100'
            : 'opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95'}"
        >
          <!-- Close Button -->
          {#if showCloseButton}
            <div class="absolute right-4 top-4 z-20">
              <button
                class="rounded-full p-2 bg-zinc-100 text-zinc-400 hover:text-zinc-600 transition-colors"
                onclick={closeModal}
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
                        >IGIC {parseFloat(entry.rate).toFixed(0)}%</span
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
              <div class="bg-zinc-900 rounded-2xl p-4 mb-4 shadow-inner">
                <div class="flex justify-between items-end mb-3">
                  <span class="text-zinc-400 text-xs uppercase font-bold"
                    >Esperado</span
                  >
                  <span class="text-xl font-mono text-white"
                    >{report?.expectedCash ?? "0.00"} &euro;</span
                  >
                </div>
                <div class="h-px bg-zinc-700 my-2"></div>
                <div class="flex justify-between items-end mb-3">
                  <span class="text-zinc-400 text-xs uppercase font-bold"
                    >Contado</span
                  >
                  <span class="text-3xl font-mono text-white"
                    >{countedEur} &euro;</span
                  >
                </div>
                <div class="h-px bg-zinc-700 my-2"></div>
                <div class="flex justify-between items-end">
                  <span class="text-zinc-400 text-xs uppercase font-bold"
                    >Diferencia</span
                  >
                  <span class="text-xl font-bold {differenceColor}"
                    >{differenceFormatted}</span
                  >
                </div>
              </div>

              <!-- Denomination Counting -->
              <div class="max-h-[340px] overflow-y-auto mb-4 -mx-1 px-1">
                <!-- Bills -->
                <div class="mb-3">
                  <div
                    class="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2"
                  >
                    Billetes
                  </div>
                  <div class="space-y-1.5">
                    {#each billCents as cents}
                      {@const label = denomLabel(cents, true)}
                      {@const qty = denomQtys[cents] ?? 0}
                      {@const sub = (qty * cents) / 100}
                      <div class="flex items-center gap-2">
                        <span
                          class="w-14 text-sm font-bold text-zinc-700 text-right"
                          >{label}</span
                        >
                        <button
                          class="w-8 h-8 flex items-center justify-center rounded-lg bg-zinc-100 text-zinc-500 hover:bg-zinc-200 active:scale-95 transition-colors text-lg font-bold leading-none"
                          onclick={() => denomMinus(cents)}>&minus;</button
                        >
                        <span
                          class="w-10 text-center text-sm font-bold text-zinc-900 tabular-nums cursor-pointer hover:bg-blue-50 hover:text-blue-700 rounded-lg py-1 transition-colors select-none"
                          role="button"
                          tabindex="0"
                          onclick={() => showQtyNumpad(cents, label)}
                          onkeydown={(e) => {
                            if (e.key === "Enter" || e.key === " ")
                              showQtyNumpad(cents, label);
                          }}>{qty}</span
                        >
                        <button
                          class="w-8 h-8 flex items-center justify-center rounded-lg bg-zinc-100 text-zinc-500 hover:bg-zinc-200 active:scale-95 transition-colors text-lg font-bold leading-none"
                          onclick={() => denomPlus(cents)}>+</button
                        >
                        <span
                          class="flex-1 text-right text-sm font-mono {sub > 0
                            ? 'text-zinc-900'
                            : 'text-zinc-400'}">{sub.toFixed(2)}</span
                        >
                      </div>
                    {/each}
                  </div>
                </div>
                <!-- Coins -->
                <div>
                  <div
                    class="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2"
                  >
                    Monedas
                  </div>
                  <div class="space-y-1.5">
                    {#each coinCents as cents}
                      {@const label = denomLabel(cents, false)}
                      {@const qty = denomQtys[cents] ?? 0}
                      {@const sub = (qty * cents) / 100}
                      <div class="flex items-center gap-2">
                        <span
                          class="w-14 text-sm font-bold text-zinc-700 text-right"
                          >{label}</span
                        >
                        <button
                          class="w-8 h-8 flex items-center justify-center rounded-lg bg-zinc-100 text-zinc-500 hover:bg-zinc-200 active:scale-95 transition-colors text-lg font-bold leading-none"
                          onclick={() => denomMinus(cents)}>&minus;</button
                        >
                        <span
                          class="w-10 text-center text-sm font-bold text-zinc-900 tabular-nums cursor-pointer hover:bg-blue-50 hover:text-blue-700 rounded-lg py-1 transition-colors select-none"
                          role="button"
                          tabindex="0"
                          onclick={() => showQtyNumpad(cents, label)}
                          onkeydown={(e) => {
                            if (e.key === "Enter" || e.key === " ")
                              showQtyNumpad(cents, label);
                          }}>{qty}</span
                        >
                        <button
                          class="w-8 h-8 flex items-center justify-center rounded-lg bg-zinc-100 text-zinc-500 hover:bg-zinc-200 active:scale-95 transition-colors text-lg font-bold leading-none"
                          onclick={() => denomPlus(cents)}>+</button
                        >
                        <span
                          class="flex-1 text-right text-sm font-mono {sub > 0
                            ? 'text-zinc-900'
                            : 'text-zinc-400'}">{sub.toFixed(2)}</span
                        >
                      </div>
                    {/each}
                  </div>
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

              <button
                class="w-full bg-emerald-600 text-white font-bold text-xl py-4 rounded-2xl shadow-lg shadow-emerald-200 transition-all active:scale-[0.98] disabled:opacity-50"
                onclick={handleFinalize}
                disabled={finalizing}
              >
                {finalizing ? "Guardando..." : "Cerrar caja"}
              </button>

              <!-- QTY NUMPAD OVERLAY -->
              {#if numpadOpen}
                <div
                  class="absolute inset-0 z-40 bg-white/95 backdrop-blur-sm flex flex-col px-6 py-6"
                >
                  <!-- Header -->
                  <div class="flex items-center justify-between mb-4">
                    <button
                      class="text-sm font-bold text-zinc-500 hover:text-zinc-800 flex items-center gap-1 py-2 pr-4 pl-0"
                      onclick={hideQtyNumpad}
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
                      Cantidad
                    </p>
                    <div class="text-5xl font-mono text-white tracking-tight">
                      {qtyInputValue}
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
