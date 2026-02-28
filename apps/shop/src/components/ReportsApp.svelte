<script lang="ts">
  import { onMount } from "svelte";
  import { initAuthClient, checkAuthentication } from "@pulpo/auth";
  import { DIRECTUS_URL } from "@pulpo/cms";
  import type { AggregatedReport } from "@pulpo/cms";
  import { loadProducts } from "../stores/productStore";
  import { taxName } from "../stores/taxStore";
  import { ArrowLeft, Download } from "lucide-svelte";
  import DailyOverview from "./DailyOverview.svelte";
  import MonthlyReport from "./MonthlyReport.svelte";
  import QuarterlyReport from "./QuarterlyReport.svelte";
  import YearlyReport from "./YearlyReport.svelte";
  import { exportReportToExcel } from "../lib/exportReport";

  initAuthClient(DIRECTUS_URL);

  let state: "loading" | "ready" = $state("loading");
  let activeTab = $state("day");
  let currentReport = $state<AggregatedReport | null>(null);
  let tax = $state("IGIC");

  function handleReport(report: AggregatedReport | null) {
    currentReport = report;
  }

  function handleExport() {
    if (currentReport) {
      exportReportToExcel(currentReport, tax);
    }
  }

  const tabs = [
    { id: "day", label: "D\u00EDa" },
    { id: "month", label: "Mes" },
    { id: "quarter", label: "Trimestre" },
    { id: "year", label: "A\u00F1o" },
  ];

  onMount(async () => {
    try {
      await checkAuthentication();
      state = "ready";
      loadProducts();
    } catch {
      window.location.href = "/login";
    }
    return taxName.subscribe((v) => (tax = v));
  });
</script>

{#if state === "loading"}
  <div class="flex items-center justify-center h-full bg-zinc-50">
    <div class="flex flex-col items-center gap-4">
      <div
        class="w-10 h-10 border-2 border-zinc-300 border-t-zinc-600 rounded-full animate-spin"
      ></div>
      <span class="text-xs font-medium text-zinc-400 tracking-widest uppercase">
        Cargando...
      </span>
    </div>
  </div>
{:else}
  <div class="h-full flex flex-col bg-zinc-50">
    <!-- Header -->
    <div
      class="flex-none flex items-center gap-4 px-4 py-3 bg-zinc-50 z-10 shadow-sm border-b border-zinc-200 min-h-[64px]"
    >
      <a
        href="/"
        class="flex items-center gap-1 text-sm font-medium text-zinc-500 hover:text-zinc-900 transition-colors"
      >
        <ArrowLeft class="w-5 h-5" />
        <span>Volver</span>
      </a>

      <nav class="flex-1 flex gap-2">
        {#each tabs as tab}
          <button
            class="px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200 active:scale-95 whitespace-nowrap border {activeTab ===
            tab.id
              ? 'bg-zinc-900 text-white border-zinc-900 shadow-md'
              : 'bg-white text-zinc-500 border-zinc-200 hover:border-zinc-400 hover:text-zinc-900 hover:bg-zinc-50'}"
            onclick={() => (activeTab = tab.id)}
          >
            {tab.label}
          </button>
        {/each}
      </nav>

      <button
        class="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all duration-200 active:scale-95 border bg-white text-zinc-500 border-zinc-200 hover:border-zinc-400 hover:text-zinc-900 hover:bg-zinc-50 disabled:opacity-30 disabled:cursor-not-allowed"
        onclick={handleExport}
        disabled={!currentReport || currentReport.summary.transaction_count === 0}
        title="Exportar a Excel"
      >
        <Download class="w-4 h-4" />
        <span>Excel</span>
      </button>
    </div>

    <!-- Tab content -->
    <div class="flex-1 overflow-y-auto">
      {#if activeTab === "day"}
        <DailyOverview onreport={handleReport} />
      {:else if activeTab === "month"}
        <MonthlyReport onreport={handleReport} />
      {:else if activeTab === "quarter"}
        <QuarterlyReport onreport={handleReport} />
      {:else if activeTab === "year"}
        <YearlyReport onreport={handleReport} />
      {/if}
    </div>
  </div>
{/if}
