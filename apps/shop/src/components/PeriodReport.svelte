<script lang="ts">
  import { onMount } from "svelte";
  import { taxName } from "../stores/taxStore";
  import { getAuthClient } from "@pulpo/auth";
  import { getReport } from "@pulpo/cms";
  import type { AggregatedReport, ClosureProductBreakdown } from "@pulpo/cms";
  import { ChevronDown } from "lucide-svelte";

  type ReportPeriod = "daily" | "weekly" | "monthly" | "quarterly" | "yearly";

  interface CostCenterGroup {
    name: string;
    rows: ClosureProductBreakdown[];
    totalQty: number;
    totalGross: string;
    totalCash: string;
    totalCard: string;
  }

  let {
    period,
    params,
    label,
  }: {
    period: ReportPeriod;
    params: Record<string, string>;
    label: string;
  } = $props();

  let loading = $state(false);
  let report = $state<AggregatedReport | null>(null);
  let tax = $state("IGIC");
  let totalProductsExpanded = $state(false);

  function groupByCostCenter(
    products: ClosureProductBreakdown[],
  ): CostCenterGroup[] {
    const groups = new Map<string, ClosureProductBreakdown[]>();
    for (const row of products) {
      const key = row.cost_center ?? "";
      const existing = groups.get(key) ?? [];
      existing.push(row);
      groups.set(key, existing);
    }
    return Array.from(groups.entries())
      .sort(([a], [b]) => {
        if (a === "" && b !== "") return 1;
        if (a !== "" && b === "") return -1;
        return a.localeCompare(b);
      })
      .map(([name, rows]) => {
        let qty = 0;
        let gross = 0;
        let cash = 0;
        let card = 0;
        for (const r of rows) {
          qty += r.quantity;
          gross += parseFloat(r.total_gross);
          cash += parseFloat(r.cash_gross);
          card += parseFloat(r.card_gross);
        }
        return {
          name,
          rows,
          totalQty: qty,
          totalGross: gross.toFixed(2),
          totalCash: cash.toFixed(2),
          totalCard: card.toFixed(2),
        };
      });
  }

  let summary = $derived(report?.summary ?? null);
  let invoiceCounts = $derived(report?.invoice_counts ?? null);
  let taxBreakdown = $derived(report?.tax_breakdown ?? []);
  let productBreakdown = $derived(report?.product_breakdown ?? []);

  let totalGrouped = $derived(groupByCostCenter(productBreakdown));
  let hasCostCenters = $derived(
    totalGrouped.length > 1 ||
      (totalGrouped.length === 1 && totalGrouped[0].name !== ""),
  );

  export async function loadData() {
    loading = true;
    totalProductsExpanded = false;
    try {
      const client = getAuthClient();
      report = await getReport(client as any, period, params);
    } catch (e) {
      console.error(`Failed to load ${period} report:`, e);
      report = null;
    } finally {
      loading = false;
    }
  }

  let mounted = false;

  onMount(() => {
    const unsubTax = taxName.subscribe((v) => (tax = v));
    mounted = true;
    loadData();
    return () => {
      unsubTax();
    };
  });

  // Reload when params change (skip initial mount, handled by onMount)
  let prevParams = $state("");
  $effect(() => {
    const current = JSON.stringify(params);
    if (mounted && prevParams && prevParams !== current) {
      loadData();
    }
    prevParams = current;
  });
</script>

<div class="max-w-4xl mx-auto px-4 py-6">
  <!-- Period label -->
  <div class="flex items-center justify-center mb-6">
    <span
      class="text-lg font-bold text-zinc-900 text-center capitalize"
    >
      {label}
    </span>
  </div>

  {#if loading}
    <div class="flex items-center justify-center py-16">
      <div
        class="w-8 h-8 border-2 border-zinc-200 border-t-zinc-500 rounded-full animate-spin"
      ></div>
    </div>
  {:else if !summary || summary.transaction_count === 0}
    <div class="text-center py-16">
      <p class="text-zinc-400">No hay datos para este per&iacute;odo.</p>
    </div>
  {:else}
    {#if summary}
      <!-- Summary card -->
      <div
        class="bg-white rounded-2xl border border-zinc-200 shadow-sm mb-6 overflow-hidden"
      >
        <div class="px-5 pt-5 pb-4">
          <div
            class="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1"
          >
            Total bruto
          </div>
          <div
            class="text-4xl font-extrabold text-zinc-900 tabular-nums tracking-tight"
          >
            {summary.total_gross}
            <span class="text-lg font-medium text-zinc-300">&euro;</span>
          </div>
        </div>

        <div class="grid grid-cols-5 border-t border-zinc-100">
          <div class="px-4 py-3">
            <div
              class="text-[11px] font-medium text-zinc-400 uppercase tracking-wider"
            >
              Neto
            </div>
            <div class="text-lg font-bold text-zinc-700 tabular-nums">
              {summary.total_net}
            </div>
          </div>
          <div class="px-4 py-3">
            <div
              class="text-[11px] font-medium text-zinc-400 uppercase tracking-wider"
            >
              Impuestos
            </div>
            <div class="text-lg font-bold text-zinc-700 tabular-nums">
              {summary.total_tax}
            </div>
          </div>
          <div class="px-4 py-3">
            <div
              class="text-[11px] font-medium text-zinc-400 uppercase tracking-wider"
            >
              Efectivo
            </div>
            <div class="text-lg font-bold text-zinc-700 tabular-nums">
              {summary.total_cash}
            </div>
          </div>
          <div class="px-4 py-3">
            <div
              class="text-[11px] font-medium text-zinc-400 uppercase tracking-wider"
            >
              Tarjeta
            </div>
            <div class="text-lg font-bold text-zinc-700 tabular-nums">
              {summary.total_card}
            </div>
          </div>
          <div class="px-4 py-3">
            <div
              class="text-[11px] font-medium text-zinc-400 uppercase tracking-wider"
            >
              Transacciones
            </div>
            <div class="text-lg font-bold text-zinc-700 tabular-nums">
              {summary.transaction_count}
            </div>
            {#if invoiceCounts}
              <div class="flex gap-1.5 text-xs text-zinc-400 mt-0.5">
                <span>{invoiceCounts.tickets} tick.</span>
                <span>{invoiceCounts.facturas} fact.</span>
                {#if invoiceCounts.rectificativas > 0}
                  <span class="text-red-500"
                    >{invoiceCounts.rectificativas} rect.</span
                  >
                {/if}
              </div>
            {/if}
          </div>
        </div>

        {#if taxBreakdown.length > 0}
          <div
            class="flex flex-wrap gap-x-5 gap-y-1 px-5 py-3 border-t border-zinc-100 bg-zinc-50/60"
          >
            {#each taxBreakdown as entry}
              <span class="text-sm text-zinc-400">
                {tax}
                {parseFloat(entry.rate).toFixed(0)}%:
                <span class="font-semibold text-zinc-600">{entry.net}</span>
                <span class="text-zinc-300 mx-0.5">+</span>
                <span class="font-semibold text-zinc-600">{entry.tax}</span>
              </span>
            {/each}
          </div>
        {/if}
      </div>
    {/if}

    <!-- Products section -->
    {#if productBreakdown.length > 0}
      <div class="mb-6">
        <button
          class="w-full flex items-center justify-between px-1 py-2 mb-2 group"
          onclick={() => (totalProductsExpanded = !totalProductsExpanded)}
        >
          <span
            class="text-xs uppercase font-bold text-zinc-400 tracking-wider group-hover:text-zinc-600 transition-colors"
          >
            Productos
            <span class="text-zinc-300 font-normal ml-1"
              >{productBreakdown.length}</span
            >
          </span>
          <ChevronDown
            class="w-4 h-4 text-zinc-300 group-hover:text-zinc-500 transition-all {totalProductsExpanded
              ? 'rotate-180'
              : ''}"
          />
        </button>
        {#if totalProductsExpanded}
          <div
            class="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden"
          >
            <div
              class="producto-grid text-[11px] uppercase tracking-wider text-zinc-400 font-semibold border-b border-zinc-200 bg-zinc-50 px-4 py-2.5"
            >
              <span>Producto</span>
              <span class="text-right">Uds.</span>
              <span class="text-right">Total</span>
              <span class="text-right">Ef.</span>
              <span class="text-right">Tj.</span>
            </div>
            {#if hasCostCenters}
              {#each totalGrouped as group}
                <div
                  class="producto-grid px-4 py-2 bg-zinc-50 border-b border-zinc-200 text-base font-bold text-zinc-600"
                >
                  <span class="uppercase tracking-wider text-xs"
                    >{group.name || "Sin asignar"}</span
                  >
                  <span class="text-right tabular-nums">{group.totalQty}</span>
                  <span class="text-right tabular-nums">{group.totalGross}</span
                  >
                  <span class="text-right tabular-nums">{group.totalCash}</span>
                  <span class="text-right tabular-nums">{group.totalCard}</span>
                </div>
                {#each group.rows as row, j}
                  <div
                    class="producto-grid px-4 py-1.5 text-sm text-zinc-600 {j %
                      2 ===
                    0
                      ? 'bg-white'
                      : 'bg-zinc-50/50'}"
                  >
                    <span class="truncate" title={row.product_name}
                      >{row.product_name}</span
                    >
                    <span class="text-right tabular-nums">{row.quantity}</span>
                    <span class="text-right tabular-nums"
                      >{row.total_gross}</span
                    >
                    <span class="text-right tabular-nums"
                      >{row.cash_gross}</span
                    >
                    <span class="text-right tabular-nums"
                      >{row.card_gross}</span
                    >
                  </div>
                {/each}
              {/each}
            {:else}
              {#each productBreakdown as row, j}
                <div
                  class="producto-grid px-4 py-1.5 text-sm text-zinc-600 {j %
                    2 ===
                  0
                    ? 'bg-white'
                    : 'bg-zinc-50/50'}"
                >
                  <span class="truncate" title={row.product_name}
                    >{row.product_name}</span
                  >
                  <span class="text-right tabular-nums">{row.quantity}</span>
                  <span class="text-right tabular-nums">{row.total_gross}</span>
                  <span class="text-right tabular-nums">{row.cash_gross}</span>
                  <span class="text-right tabular-nums">{row.card_gross}</span>
                </div>
              {/each}
            {/if}
          </div>
        {/if}
      </div>
    {/if}
  {/if}
</div>

<style>
  .producto-grid {
    display: grid;
    grid-template-columns: 1fr 3.5rem 5.5rem 5.5rem 5.5rem;
    align-items: center;
    gap: 0.5rem;
  }
</style>
