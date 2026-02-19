<script lang="ts">
  import { onMount } from "svelte";
  import {
    isPaymentModalOpen,
    isCustomerModalOpen,
    customerModalMode,
    cartTotals,
    completeTransaction,
    selectedCustomer,
    setCustomer,
    shouldPrintReceipt,
  } from "../stores/cartStore";
  import { tenant } from "../stores/printerStore";
  import { Printer, X, TriangleAlert } from "lucide-svelte";
  import type { Customer } from "../types/shop";

  type View = "select" | "cash";

  let isOpen = $state(false);
  let isVisible = $state(false);
  let currentView = $state<View>("select");
  let inputCents = $state(0);
  let currentTotal = $state(0);
  let currentTotalFormatted = $state("0.00");
  let customer = $state<Customer | null>(null);
  let printReceipt = $state(true);
  let processingCard = $state(false);
  let processingCash = $state(false);
  let simplifiedInvoiceLimit = $state<number | null>(null);

  // Derived
  let inputEuro = $derived((inputCents / 100).toFixed(2));
  let change = $derived(inputCents / 100 - currentTotal);
  let isSufficient = $derived(change >= -0.005);
  let changeColor = $derived(
    isSufficient ? "text-emerald-400" : "text-red-400",
  );
  let confirmButtonText = $derived(
    isSufficient
      ? `Cambio: ${change.toFixed(2)}€ \u2022 Hecho`
      : "Importe insuficiente",
  );
  let showSimplifiedWarning = $derived(
    !customer &&
      simplifiedInvoiceLimit !== null &&
      currentTotal > simplifiedInvoiceLimit,
  );

  // Animation helpers
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
    isPaymentModalOpen.set(false);
  }

  function showView(view: View) {
    currentView = view;
    if (view === "cash") {
      inputCents = 0;
    }
  }

  // Actions
  async function handleCardPay() {
    processingCard = true;
    await completeTransaction(
      currentTotal.toFixed(2),
      currentTotal.toFixed(2),
      "card",
    );
    processingCard = false;
  }

  async function handleCashConfirm() {
    processingCash = true;
    const tenderedStr = (inputCents / 100).toFixed(2);
    const totalStr = currentTotal.toFixed(2);
    await completeTransaction(totalStr, tenderedStr, "cash");
    processingCash = false;
  }

  // Numpad
  function numpadDigit(val: string) {
    if (inputCents.toString().length > 6) return;
    if (val === "00") inputCents = inputCents * 100;
    else inputCents = inputCents * 10 + parseInt(val);
  }

  function numpadClear() {
    inputCents = 0;
  }

  function quickCash(amount: number) {
    inputCents = amount * 100;
  }

  function togglePrint() {
    shouldPrintReceipt.set(!printReceipt);
  }

  // Store subscriptions
  onMount(() => {
    const unsubModal = isPaymentModalOpen.subscribe((open) => {
      if (open) {
        currentView = "select";
        inputCents = 0;
        openModalAnim();
      } else {
        hideModalAnim();
      }
    });

    const unsubTotals = cartTotals.subscribe((t) => {
      currentTotal = parseFloat(t.gross);
      currentTotalFormatted = t.gross;
    });

    const unsubCustomer = selectedCustomer.subscribe((c) => {
      customer = c;
    });

    const unsubPrint = shouldPrintReceipt.subscribe((val) => {
      printReceipt = val;
    });

    const unsubTenant = tenant.subscribe((t) => {
      simplifiedInvoiceLimit = t?.simplified_invoice_limit ?? null;
    });

    return () => {
      unsubModal();
      unsubTotals();
      unsubCustomer();
      unsubPrint();
      unsubTenant();
    };
  });

  const quickAmounts = [5, 10, 20, 50, 100, 200];
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
          class="relative transform overflow-hidden rounded-3xl bg-white text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-lg {isVisible
            ? 'opacity-100 translate-y-0 sm:scale-100'
            : 'opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95'}"
        >
          <!-- ============================================ -->
          <!-- VIEW 1: SELECT (CASH / CARD)                 -->
          <!-- ============================================ -->
          {#if currentView === "select"}
            <!-- Close Button -->
            <div class="absolute right-4 top-4 z-20">
              <button
                class="rounded-full p-2 bg-zinc-100 text-zinc-400 hover:text-zinc-600 transition-colors"
                onclick={closeModal}
                aria-label="Cerrar"
              >
                <X class="h-5 w-5" />
              </button>
            </div>

            <div class="px-8 py-8 pb-6 transition-all duration-300">
              <h3 class="text-2xl font-bold text-center text-zinc-900 mb-6">
                Seleccionar pago
              </h3>

              <!-- Customer Selector -->
              <button
                class="flex items-center justify-between p-3 mb-6 rounded-xl border cursor-pointer hover:bg-zinc-100 transition-colors w-full text-left {customer
                  ? 'bg-blue-50 border-blue-200'
                  : 'bg-zinc-50 border-zinc-200'}"
                onclick={() => {
                  customerModalMode.set("select");
                  isCustomerModalOpen.set(true);
                }}
                type="button"
              >
                {#if customer}
                  <div class="flex items-center gap-3 text-zinc-900">
                    <div
                      class="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600"
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
                          d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                        />
                      </svg>
                    </div>
                    <div class="text-left">
                      <div
                        class="text-sm font-bold text-blue-800 truncate max-w-37.5"
                      >
                        {customer.name}
                      </div>
                      <div class="text-xs text-blue-600">
                        Factura (Completa)
                      </div>
                    </div>
                  </div>
                  <button
                    class="p-2.5 rounded-xl text-zinc-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                    title="Quitar cliente"
                    onclick={(e) => {
                      e.stopPropagation();
                      setCustomer(null);
                    }}
                    type="button"
                  >
                    <X class="w-5 h-5" />
                  </button>
                {:else}
                  <div class="flex items-center gap-3 text-zinc-500">
                    <div
                      class="w-10 h-10 rounded-full bg-zinc-200 flex items-center justify-center text-zinc-400"
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
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                        />
                      </svg>
                    </div>
                    <div class="text-left">
                      <div class="text-sm font-bold text-zinc-800">
                        Cliente anónimo
                      </div>
                      <div class="text-xs">Ticket (Simplificada)</div>
                    </div>
                  </div>
                {/if}
              </button>

              <!-- Simplified invoice limit warning -->
              {#if showSimplifiedWarning}
                <div
                  class="flex items-start gap-2.5 p-3 mb-6 rounded-xl bg-amber-50 border border-amber-200 text-amber-800"
                >
                  <TriangleAlert class="h-5 w-5 shrink-0 mt-0.5 text-amber-500" />
                  <div class="text-sm">
                    <span class="font-semibold"
                      >Importe superior a {simplifiedInvoiceLimit?.toLocaleString("es-ES")} &euro;.</span
                    >
                    Se recomienda asignar un cliente para emitir una factura completa.
                  </div>
                </div>
              {/if}

              <!-- Total -->
              <div
                class="mb-8 py-4 bg-zinc-900 rounded-2xl border border-zinc-900 text-center shadow-lg"
              >
                <span
                  class="text-zinc-400 text-xs font-bold uppercase tracking-wide"
                  >Total a pagar</span
                >
                <div
                  class="text-5xl font-extrabold text-white tracking-tight mt-1"
                >
                  {currentTotalFormatted} €
                </div>
              </div>

              <!-- Print Toggle -->
              <button
                class="flex items-center justify-between mb-4 p-3 rounded-xl border cursor-pointer select-none w-full {printReceipt
                  ? 'bg-blue-50 border-blue-300 text-blue-600'
                  : 'bg-zinc-50 border-zinc-200 text-zinc-500'}"
                onclick={togglePrint}
                type="button"
              >
                <div class="flex items-center gap-2">
                  <div
                    class="bg-white p-2 rounded-full border border-zinc-200 text-zinc-500"
                  >
                    <Printer class="w-4 h-4" />
                  </div>
                  <span class="text-sm font-bold text-zinc-700"
                    >Imprimir ticket</span
                  >
                </div>
                <div
                  class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none {printReceipt
                    ? 'bg-blue-600'
                    : 'bg-zinc-200'}"
                >
                  <span
                    class="inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out {printReceipt
                      ? 'translate-x-6'
                      : 'translate-x-1'}"
                  ></span>
                </div>
              </button>

              <!-- Payment Buttons -->
              <div class="grid grid-cols-2 gap-4">
                <button
                  class="group flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-zinc-100 hover:border-blue-500 hover:bg-blue-50 transition-all active:scale-95 shadow-sm"
                  onclick={() => showView("cash")}
                >
                  <div
                    class="h-12 w-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform"
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
                        d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                      />
                    </svg>
                  </div>
                  <span
                    class="font-bold text-zinc-700 group-hover:text-blue-700"
                    >Efectivo</span
                  >
                </button>
                <button
                  class="group flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-zinc-100 hover:border-purple-500 hover:bg-purple-50 transition-all active:scale-95 shadow-sm {processingCard
                    ? 'opacity-50 pointer-events-none'
                    : ''}"
                  onclick={handleCardPay}
                >
                  <div
                    class="h-12 w-12 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform"
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
                        d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                      />
                    </svg>
                  </div>
                  <span
                    class="font-bold text-zinc-700 group-hover:text-purple-700"
                    >Tarjeta</span
                  >
                </button>
              </div>
            </div>

            <!-- ============================================ -->
            <!-- VIEW 2: CASH NUMPAD                          -->
            <!-- ============================================ -->
          {:else if currentView === "cash"}
            <div class="px-6 py-6 h-full flex flex-col">
              <!-- Header -->
              <div class="mb-4">
                <button
                  class="text-sm font-bold text-zinc-500 hover:text-zinc-800 flex items-center gap-1 py-2 pr-4 pl-0"
                  onclick={() => showView("select")}
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
                  Volver a la selección
                </button>
              </div>

              <!-- Display -->
              <div
                class="bg-zinc-900 rounded-2xl p-4 mb-4 text-right shadow-inner"
              >
                <p class="text-zinc-400 text-xs uppercase font-bold mb-1">
                  Entregado
                </p>
                <div class="text-4xl font-mono text-white mb-2 tracking-tight">
                  {inputEuro} €
                </div>
                <div class="h-px bg-zinc-700 w-full my-2"></div>
                <div class="flex justify-between items-end">
                  <span class="text-zinc-400 text-sm">Cambio:</span>
                  <span class="text-2xl font-bold {changeColor}"
                    >{change.toFixed(2)} €</span
                  >
                </div>
              </div>

              <!-- Quick Cash + Numpad -->
              <div class="grid grid-cols-3 gap-3 mb-4 select-none">
                {#each quickAmounts as amount}
                  <button
                    class="col-span-1 bg-blue-50 text-blue-700 font-bold py-3 rounded-xl hover:bg-blue-100 border border-blue-100"
                    onclick={() => quickCash(amount)}
                  >
                    {amount}€
                  </button>
                {/each}

                {#each [1, 2, 3, 4, 5, 6, 7, 8, 9] as num}
                  <button
                    class="bg-white border border-zinc-200 text-2xl font-medium py-3 rounded-xl hover:bg-zinc-50 active:scale-95 shadow-sm text-zinc-700"
                    onclick={() => numpadDigit(String(num))}
                  >
                    {num}
                  </button>
                {/each}
                <button
                  class="bg-white border border-zinc-200 text-2xl font-medium py-3 rounded-xl hover:bg-zinc-50 active:scale-95 shadow-sm text-zinc-700"
                  onclick={() => numpadDigit("0")}>0</button
                >
                <button
                  class="bg-white border border-zinc-200 text-2xl font-medium py-3 rounded-xl hover:bg-zinc-50 active:scale-95 shadow-sm text-zinc-700"
                  onclick={() => numpadDigit("00")}>00</button
                >
                <button
                  class="bg-red-50 text-red-600 text-xl font-bold py-3 rounded-xl hover:bg-red-100 active:scale-95 border border-red-100"
                  onclick={numpadClear}>C</button
                >
              </div>

              <div class="flex gap-3">
                <button
                  class="cursor-pointer select-none flex items-center justify-center w-14 rounded-2xl border-2 transition-colors {printReceipt
                    ? 'bg-blue-50 border-blue-300 text-blue-600'
                    : 'bg-zinc-50 border-zinc-200 text-zinc-500'}"
                  type="button"
                  onclick={togglePrint}
                >
                  <Printer class="w-6 h-6" />
                </button>
                <button
                  class="flex-1 bg-emerald-600 text-white font-bold text-xl py-4 rounded-2xl shadow-lg shadow-emerald-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98] {isSufficient
                    ? 'animate-pulse-slow'
                    : ''}"
                  disabled={!isSufficient || processingCash}
                  onclick={handleCashConfirm}
                >
                  {confirmButtonText}
                </button>
              </div>
            </div>
          {/if}
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .animate-pulse-slow {
    animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }
  @keyframes pulse {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.9;
    }
  }
</style>
