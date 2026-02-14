<script lang="ts">
  import { onMount } from "svelte";
  import {
    isXReportModalOpen,
    generateClosureReport,
  } from "../stores/registerStore";
  import { taxName } from "../stores/taxStore";
  import type { ClosureReport } from "../types/shop";

  let isOpen = $state(false);
  let isVisible = $state(false);
  let loading = $state(true);
  let report = $state<ClosureReport | null>(null);
  let tax = $state("IGIC");

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

  async function loadReport() {
    loading = true;
    try {
      report = await generateClosureReport();
    } catch {
      closeModal();
    } finally {
      loading = false;
    }
  }

  function closeModal() {
    isXReportModalOpen.set(false);
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

  onMount(() => {
    const unsubTax = taxName.subscribe((v) => (tax = v));
    const unsub = isXReportModalOpen.subscribe((open) => {
      if (open) {
        openModalAnim();
        loadReport();
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

          {#if loading}
            <div class="px-8 py-12 flex flex-col items-center justify-center">
              <div
                class="w-10 h-10 border-2 border-zinc-300 border-t-zinc-600 rounded-full animate-spin mb-4"
              ></div>
              <p class="text-sm text-zinc-400">Cargando datos...</p>
            </div>
          {:else if report}
            <div class="px-8 py-8">
              <h3 class="text-2xl font-bold text-center text-zinc-900 mb-6">
                Informe X
              </h3>

              <!-- Period -->
              <div
                class="bg-zinc-50 rounded-xl p-4 mb-4 border border-zinc-100"
              >
                <div class="flex justify-between text-sm mb-1">
                  <span class="text-zinc-400">Desde</span>
                  <span class="text-zinc-700 font-medium"
                    >{formatDateStr(report.periodStart)}</span
                  >
                </div>
                <div class="flex justify-between text-sm">
                  <span class="text-zinc-400">Hasta</span>
                  <span class="text-zinc-700 font-medium"
                    >{formatDateStr(report.periodEnd)}</span
                  >
                </div>
              </div>

              <!-- Totals -->
              <div class="space-y-2 mb-4">
                <div class="flex justify-between text-sm">
                  <span class="text-zinc-500">Apertura</span>
                  <span class="font-medium text-zinc-700"
                    >{report.startingCash} EUR</span
                  >
                </div>
                <div class="flex justify-between text-sm">
                  <span class="text-zinc-500">Transacciones</span>
                  <span class="font-bold text-zinc-900"
                    >{report.transactionCount}</span
                  >
                </div>
                <div class="h-px bg-zinc-100"></div>
                <div class="flex justify-between text-sm">
                  <span class="text-zinc-500">Bruto</span>
                  <span class="font-bold text-zinc-900"
                    >{report.totalGross} EUR</span
                  >
                </div>
                <div class="flex justify-between text-sm">
                  <span class="text-zinc-500">Neto</span>
                  <span class="font-medium text-zinc-700"
                    >{report.totalNet} EUR</span
                  >
                </div>
                <div class="flex justify-between text-sm">
                  <span class="text-zinc-500">Impuestos</span>
                  <span class="font-medium text-zinc-700"
                    >{report.totalTax} EUR</span
                  >
                </div>
                <div class="h-px bg-zinc-100"></div>
                <div class="flex justify-between text-sm">
                  <span class="text-zinc-500">Efectivo</span>
                  <span class="font-medium text-zinc-700"
                    >{report.totalCash} EUR</span
                  >
                </div>
                <div class="flex justify-between text-sm">
                  <span class="text-zinc-500">Tarjeta</span>
                  <span class="font-medium text-zinc-700"
                    >{report.totalCard} EUR</span
                  >
                </div>
                <div class="flex justify-between text-sm">
                  <span class="text-zinc-500">Efectivo esperado</span>
                  <span class="font-bold text-zinc-900"
                    >{report.expectedCash} EUR</span
                  >
                </div>
              </div>

              <!-- Tax Breakdown -->
              {#if report.taxBreakdown.length > 0}
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

            </div>
          {/if}
        </div>
      </div>
    </div>
  </div>
{/if}
