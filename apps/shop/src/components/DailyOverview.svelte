<script lang="ts">
  import { onMount } from "svelte";
  import { taxName } from "../stores/taxStore";
  import { getAuthClient } from "@pulpo/auth";
  import { getReport } from "@pulpo/cms";
  import type { AggregatedReport, ClosureProductBreakdown } from "@pulpo/cms";
  import { ChevronLeft, ChevronRight, ChevronDown } from "lucide-svelte";

  interface CostCenterGroup {
    name: string;
    rows: ClosureProductBreakdown[];
    totalQty: number;
    totalGross: string;
    totalCash: string;
    totalCard: string;
  }

  let loading = $state(false);
  let selectedDate = $state(todayStr());
  let report = $state<AggregatedReport | null>(null);
  let tax = $state("IGIC");
  let expandedClosures = $state<Set<string>>(new Set());
  let totalProductsExpanded = $state(false);

  function todayStr(): string {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  }

  function formatDate(dateStr: string): string {
    const d = new Date(dateStr + "T12:00:00");
    return d.toLocaleDateString("es-ES", {
      weekday: "long",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  function formatTime(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function prevDay() {
    const d = new Date(selectedDate + "T12:00:00");
    d.setDate(d.getDate() - 1);
    selectedDate = d.toISOString().slice(0, 10);
    loadData();
  }

  function nextDay() {
    const d = new Date(selectedDate + "T12:00:00");
    d.setDate(d.getDate() + 1);
    if (d.toISOString().slice(0, 10) > todayStr()) return;
    selectedDate = d.toISOString().slice(0, 10);
    loadData();
  }

  function toggleClosure(id: string) {
    const next = new Set(expandedClosures);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    expandedClosures = next;
  }

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

  let isToday = $derived(selectedDate === todayStr());
  let dateInput: HTMLInputElement;

  function openPicker() {
    dateInput.value = selectedDate;
    dateInput.showPicker();
  }

  function onPickerChange() {
    if (dateInput.value && dateInput.value !== selectedDate) {
      selectedDate = dateInput.value;
      loadData();
    }
  }

  let summary = $derived(report?.summary ?? null);
  let invoiceCounts = $derived(report?.invoice_counts ?? null);
  let taxBreakdown = $derived(report?.tax_breakdown ?? []);
  let productBreakdown = $derived(report?.product_breakdown ?? []);
  let shifts = $derived(report?.shifts ?? []);

  let totalGrouped = $derived(groupByCostCenter(productBreakdown));
  let hasCostCenters = $derived(
    totalGrouped.length > 1 ||
      (totalGrouped.length === 1 && totalGrouped[0].name !== ""),
  );

  async function loadData() {
    loading = true;
    expandedClosures = new Set();
    totalProductsExpanded = false;
    try {
      const client = getAuthClient();
      report = await getReport(client as any, "daily", {
        date: selectedDate,
      });
      if (report?.shifts?.length === 1) {
        expandedClosures = new Set([report.shifts[0].id]);
      }
    } catch (e) {
      console.error("Failed to load daily report:", e);
      report = null;
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    const unsubTax = taxName.subscribe((v) => (tax = v));
    loadData();
    return () => {
      unsubTax();
    };
  });
</script>

<div class="max-w-4xl mx-auto px-4 py-6">
  <!-- Date navigation -->
  <div class="flex items-center justify-center gap-4 mb-6">
    <button
      class="p-2.5 rounded-xl bg-white border border-zinc-200 text-zinc-500 hover:bg-zinc-50 hover:border-zinc-300 active:scale-95 transition-all shadow-sm"
      onclick={prevDay}
    >
      <ChevronLeft class="w-5 h-5" />
    </button>
    <button
      class="text-lg font-bold text-zinc-900 min-w-[220px] text-center capitalize cursor-pointer hover:text-zinc-600 transition-colors"
      onclick={openPicker}
    >
      {formatDate(selectedDate)}
    </button>
    <input
      type="date"
      bind:this={dateInput}
      max={todayStr()}
      onchange={onPickerChange}
      class="absolute w-0 h-0 opacity-0 pointer-events-none"
    />
    <button
      class="p-2.5 rounded-xl bg-white border border-zinc-200 text-zinc-500 hover:bg-zinc-50 hover:border-zinc-300 active:scale-95 transition-all shadow-sm disabled:opacity-30 disabled:cursor-not-allowed disabled:shadow-none"
      onclick={nextDay}
      disabled={isToday}
    >
      <ChevronRight class="w-5 h-5" />
    </button>
  </div>

  {#if loading}
    <div class="flex items-center justify-center py-16">
      <div
        class="w-8 h-8 border-2 border-zinc-200 border-t-zinc-500 rounded-full animate-spin"
      ></div>
    </div>
  {:else if !summary || summary.transaction_count === 0}
    <div class="text-center py-16">
      <p class="text-zinc-400">No hay turnos cerrados en este d&iacute;a.</p>
    </div>
  {:else}
    {#if summary}
      <!-- Summary card -->
      <div
        class="bg-white rounded-2xl border border-zinc-200 shadow-sm mb-6 overflow-hidden"
      >
        <!-- Hero: Total Bruto -->
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

        <!-- Secondary metrics -->
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

        <!-- Tax breakdown -->
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
            Productos del d&iacute;a
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

    <!-- Turnos section -->
    {#if shifts.length > 0}
      <div class="mb-6">
        <div
          class="text-xs uppercase font-bold text-zinc-400 tracking-wider mb-2 px-1"
        >
          Turnos
          <span class="text-zinc-300 font-normal ml-1">{shifts.length}</span>
        </div>
        <div
          class="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden"
        >
          <div
            class="turno-grid text-[11px] uppercase tracking-wider text-zinc-400 font-semibold border-b border-zinc-200 bg-zinc-50 px-4 py-2.5"
          >
            <span>Turno</span>
            <span>Horario</span>
            <span class="text-right">Trans.</span>
            <span class="text-right">Bruto</span>
            <span class="text-right">Ef.</span>
            <span class="text-right">Tj.</span>
            <span class="text-right">Dif.</span>
            <span></span>
          </div>
          {#each shifts as shift, i}
            {@const counts = shift.invoice_counts}
            {@const totalTx =
              counts.tickets + counts.facturas + counts.rectificativas}
            {@const isExpanded = expandedClosures.has(shift.id)}
            <button
              class="turno-grid w-full px-4 py-3 text-left text-sm hover:bg-zinc-50/80 transition-colors {i <
                shifts.length - 1 || isExpanded
                ? 'border-b border-zinc-100'
                : ''}"
              onclick={() => toggleClosure(shift.id)}
            >
              <span class="font-bold text-zinc-500"
                >T{shifts.length - i}</span
              >
              <span class="text-zinc-400 tabular-nums">
                {formatTime(shift.period_start)}&ndash;{shift.period_end
                  ? formatTime(shift.period_end)
                  : "..."}
              </span>
              <span class="text-right">
                <span class="font-bold text-zinc-700 tabular-nums"
                  >{totalTx}</span
                >
                <span
                  class="flex justify-end gap-1.5 text-xs text-zinc-400 tabular-nums"
                >
                  <span>{counts.tickets} tick.</span>
                  <span>{counts.facturas} fact.</span>
                  {#if counts.rectificativas > 0}
                    <span class="text-red-500"
                      >{counts.rectificativas} rect.</span
                    >
                  {/if}
                </span>
              </span>
              <span class="text-right font-bold text-zinc-900 tabular-nums"
                >{shift.total_gross}</span
              >
              <span class="text-right text-zinc-500 tabular-nums"
                >{shift.total_cash}</span
              >
              <span class="text-right text-zinc-500 tabular-nums"
                >{shift.total_card}</span
              >
              <span class="text-right tabular-nums">
                {#if shift.difference !== null}
                  {@const diff = parseFloat(shift.difference)}
                  <span
                    class="font-bold {Math.abs(diff) < 0.005
                      ? 'text-zinc-300'
                      : diff > 0
                        ? 'text-emerald-600'
                        : 'text-red-600'}"
                  >
                    {diff >= 0 ? "+" : ""}{diff.toFixed(2)}
                  </span>
                {:else}
                  <span class="text-zinc-300">&mdash;</span>
                {/if}
              </span>
              <span class="flex justify-end">
                <ChevronDown
                  class="w-4 h-4 text-zinc-300 transition-transform {isExpanded
                    ? 'rotate-180'
                    : ''}"
                />
              </span>
            </button>
            {#if isExpanded}
              {@const shiftProducts = shift.product_breakdown}
              {@const shiftGrouped = groupByCostCenter(shiftProducts)}
              {@const shiftHasGroups =
                shiftGrouped.length > 1 ||
                (shiftGrouped.length === 1 && shiftGrouped[0].name !== "")}
              <div class="border-b border-zinc-100 bg-zinc-50/30">
                {#if shiftProducts.length > 0}
                  <div
                    class="producto-grid text-[11px] uppercase tracking-wider text-zinc-400 font-semibold px-4 py-2 border-b border-zinc-100"
                  >
                    <span>Producto</span>
                    <span class="text-right">Uds.</span>
                    <span class="text-right">Total</span>
                    <span class="text-right">Ef.</span>
                    <span class="text-right">Tj.</span>
                  </div>
                  {#if shiftHasGroups}
                    {#each shiftGrouped as group}
                      <div
                        class="producto-grid px-4 py-1.5 bg-zinc-100/60 border-b border-zinc-100 text-base font-bold text-zinc-600"
                      >
                        <span class="uppercase tracking-wider text-xs"
                          >{group.name || "Sin asignar"}</span
                        >
                        <span class="text-right tabular-nums"
                          >{group.totalQty}</span
                        >
                        <span class="text-right tabular-nums"
                          >{group.totalGross}</span
                        >
                        <span class="text-right tabular-nums"
                          >{group.totalCash}</span
                        >
                        <span class="text-right tabular-nums"
                          >{group.totalCard}</span
                        >
                      </div>
                      {#each group.rows as row, j}
                        <div
                          class="producto-grid px-4 py-1 text-sm text-zinc-600 {j %
                            2 ===
                          0
                            ? ''
                            : 'bg-zinc-50/50'}"
                        >
                          <span class="truncate" title={row.product_name}
                            >{row.product_name}</span
                          >
                          <span class="text-right tabular-nums"
                            >{row.quantity}</span
                          >
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
                    {#each shiftProducts as row, j}
                      <div
                        class="producto-grid px-4 py-1 text-sm text-zinc-600 {j %
                          2 ===
                        0
                          ? ''
                          : 'bg-zinc-50/50'}"
                      >
                        <span class="truncate" title={row.product_name}
                          >{row.product_name}</span
                        >
                        <span class="text-right tabular-nums"
                          >{row.quantity}</span
                        >
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
                  {/if}
                {:else}
                  <p class="text-sm text-zinc-400 text-center py-4">
                    Sin productos
                  </p>
                {/if}
              </div>
            {/if}
          {/each}
        </div>
      </div>
    {/if}
  {/if}
</div>

<style>
  .turno-grid {
    display: grid;
    grid-template-columns: 2.5rem 7.5rem 7rem 1fr 1fr 1fr 4.5rem 1.5rem;
    align-items: center;
    gap: 0.5rem;
  }
  .producto-grid {
    display: grid;
    grid-template-columns: 1fr 3.5rem 5.5rem 5.5rem 5.5rem;
    align-items: center;
    gap: 0.5rem;
  }
</style>
