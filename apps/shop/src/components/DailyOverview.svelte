<script lang="ts">
  import { onMount } from "svelte";
  import { loadDailyClosures } from "../stores/registerStore";
  import { taxName } from "../stores/taxStore";
  import { getAuthClient } from "@pulpo/auth";
  import { getInvoices } from "@pulpo/cms";
  import type { CashRegisterClosure, Invoice } from "@pulpo/cms";
  import Big from "big.js";
  import { ChevronLeft, ChevronRight, ChevronDown } from "lucide-svelte";

  interface ProductRow {
    name: string;
    quantity: number;
    totalGross: string;
    cashGross: string;
    cardGross: string;
    costCenter: string | null;
  }

  interface CostCenterGroup {
    name: string;
    rows: ProductRow[];
    totalQty: number;
    totalGross: string;
    totalCash: string;
    totalCard: string;
  }

  interface InvoiceCounts {
    tickets: number;
    facturas: number;
    rectificativas: number;
  }

  let loading = $state(false);
  let selectedDate = $state(todayStr());
  let closures = $state<CashRegisterClosure[]>([]);
  let invoicesByClosure = $state<Map<string, Invoice[]>>(new Map());
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

  function buildProductRows(invs: Invoice[]): ProductRow[] {
    const map = new Map<
      string,
      {
        qty: number;
        gross: Big;
        cash: Big;
        card: Big;
        costCenter: string | null;
      }
    >();
    const ZERO = new Big(0);

    for (const inv of invs) {
      if (inv.invoice_type === "rectificativa") continue;
      const method = inv.payments?.[0]?.method ?? "cash";

      for (const item of inv.items ?? []) {
        const key = item.product_name;
        const existing = map.get(key) ?? {
          qty: 0,
          gross: ZERO,
          cash: ZERO,
          card: ZERO,
          costCenter: (item as any).cost_center ?? null,
        };
        const qty = Math.abs(Number(item.quantity));
        const gross = new Big(item.row_total_gross);

        existing.qty += qty;
        existing.gross = existing.gross.plus(gross);
        if (method === "cash") existing.cash = existing.cash.plus(gross);
        else existing.card = existing.card.plus(gross);
        map.set(key, existing);
      }
    }

    return Array.from(map.entries())
      .map(([name, v]) => ({
        name,
        quantity: v.qty,
        totalGross: v.gross.toFixed(2),
        cashGross: v.cash.toFixed(2),
        cardGross: v.card.toFixed(2),
        costCenter: v.costCenter,
      }))
      .sort((a, b) => b.quantity - a.quantity);
  }

  function groupByCostCenter(rows: ProductRow[]): CostCenterGroup[] {
    const ZERO = new Big(0);
    const groups = new Map<string, ProductRow[]>();
    for (const row of rows) {
      const key = row.costCenter ?? "";
      const existing = groups.get(key) ?? [];
      existing.push(row);
      groups.set(key, existing);
    }
    // Sort: named groups first (alphabetical), then unnamed ("Sin asignar") last
    return Array.from(groups.entries())
      .sort(([a], [b]) => {
        if (a === "" && b !== "") return 1;
        if (a !== "" && b === "") return -1;
        return a.localeCompare(b);
      })
      .map(([name, rows]) => {
        let qty = 0;
        let gross = ZERO;
        let cash = ZERO;
        let card = ZERO;
        for (const r of rows) {
          qty += r.quantity;
          gross = gross.plus(new Big(r.totalGross));
          cash = cash.plus(new Big(r.cashGross));
          card = card.plus(new Big(r.cardGross));
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

  function countInvoiceTypes(invs: Invoice[]): InvoiceCounts {
    let tickets = 0,
      facturas = 0,
      rectificativas = 0;
    for (const inv of invs) {
      if (inv.invoice_type === "ticket") tickets++;
      else if (inv.invoice_type === "factura") facturas++;
      else if (inv.invoice_type === "rectificativa") rectificativas++;
    }
    return { tickets, facturas, rectificativas };
  }

  let isToday = $derived(selectedDate === todayStr());

  let allInvoices = $derived(Array.from(invoicesByClosure.values()).flat());

  let summary = $derived.by(() => {
    if (closures.length === 0) return null;

    const ZERO = new Big(0);
    let totalGross = ZERO;
    let totalNet = ZERO;
    let totalTax = ZERO;
    let totalCash = ZERO;
    let totalCard = ZERO;
    let transactionCount = 0;

    const taxMap = new Map<string, { net: Big; tax: Big }>();

    for (const c of closures) {
      totalGross = totalGross.plus(new Big(c.total_gross ?? "0"));
      totalNet = totalNet.plus(new Big(c.total_net ?? "0"));
      totalTax = totalTax.plus(new Big(c.total_tax ?? "0"));
      totalCash = totalCash.plus(new Big(c.total_cash ?? "0"));
      totalCard = totalCard.plus(new Big(c.total_card ?? "0"));
      transactionCount += c.transaction_count ?? 0;

      for (const entry of c.tax_breakdown ?? []) {
        const existing = taxMap.get(entry.rate) ?? { net: ZERO, tax: ZERO };
        taxMap.set(entry.rate, {
          net: existing.net.plus(new Big(entry.net)),
          tax: existing.tax.plus(new Big(entry.tax)),
        });
      }
    }

    const taxBreakdown = Array.from(taxMap.entries())
      .filter(([, v]) => !v.tax.eq(0))
      .sort(([a], [b]) => new Big(a).cmp(new Big(b)))
      .map(([rate, v]) => ({
        rate,
        net: v.net.toFixed(2),
        tax: v.tax.toFixed(2),
      }));

    return {
      transactionCount,
      totalGross: totalGross.toFixed(2),
      totalNet: totalNet.toFixed(2),
      totalTax: totalTax.toFixed(2),
      totalCash: totalCash.toFixed(2),
      totalCard: totalCard.toFixed(2),
      taxBreakdown,
    };
  });

  let totalInvoiceCounts = $derived(countInvoiceTypes(allInvoices));
  let totalProductRows = $derived(buildProductRows(allInvoices));
  let totalGrouped = $derived(groupByCostCenter(totalProductRows));
  let hasCostCenters = $derived(
    totalGrouped.length > 1 ||
      (totalGrouped.length === 1 && totalGrouped[0].name !== ""),
  );

  async function loadData() {
    loading = true;
    expandedClosures = new Set();
    totalProductsExpanded = false;
    try {
      closures = await loadDailyClosures(selectedDate);

      const client = getAuthClient();
      const map = new Map<string, Invoice[]>();
      for (const c of closures) {
        const invs = await getInvoices(client as any, {
          status: "paid",
          closureId: c.id,
        });
        map.set(c.id, invs as Invoice[]);
      }
      invoicesByClosure = map;
    } catch (e) {
      console.error("Failed to load daily closures:", e);
      closures = [];
      invoicesByClosure = new Map();
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
    <span
      class="text-lg font-bold text-zinc-900 min-w-[220px] text-center capitalize"
    >
      {formatDate(selectedDate)}
    </span>
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
  {:else if closures.length === 0}
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
            {summary.totalGross}
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
              {summary.totalNet}
            </div>
          </div>
          <div class="px-4 py-3">
            <div
              class="text-[11px] font-medium text-zinc-400 uppercase tracking-wider"
            >
              Impuestos
            </div>
            <div class="text-lg font-bold text-zinc-700 tabular-nums">
              {summary.totalTax}
            </div>
          </div>
          <div class="px-4 py-3">
            <div
              class="text-[11px] font-medium text-zinc-400 uppercase tracking-wider"
            >
              Efectivo
            </div>
            <div class="text-lg font-bold text-zinc-700 tabular-nums">
              {summary.totalCash}
            </div>
          </div>
          <div class="px-4 py-3">
            <div
              class="text-[11px] font-medium text-zinc-400 uppercase tracking-wider"
            >
              Tarjeta
            </div>
            <div class="text-lg font-bold text-zinc-700 tabular-nums">
              {summary.totalCard}
            </div>
          </div>
          <div class="px-4 py-3">
            <div
              class="text-[11px] font-medium text-zinc-400 uppercase tracking-wider"
            >
              Transacciones
            </div>
            <div class="text-lg font-bold text-zinc-700 tabular-nums">
              {summary.transactionCount}
            </div>
            <div class="flex gap-1.5 text-xs text-zinc-400 mt-0.5">
              <span>{totalInvoiceCounts.tickets} tick.</span>
              <span>{totalInvoiceCounts.facturas} fact.</span>
              {#if totalInvoiceCounts.rectificativas > 0}
                <span class="text-red-500"
                  >{totalInvoiceCounts.rectificativas} rect.</span
                >
              {/if}
            </div>
          </div>
        </div>

        <!-- Tax breakdown -->
        {#if summary.taxBreakdown.length > 0}
          <div
            class="flex flex-wrap gap-x-5 gap-y-1 px-5 py-3 border-t border-zinc-100 bg-zinc-50/60"
          >
            {#each summary.taxBreakdown as entry}
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
    {#if totalProductRows.length > 0}
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
              >{totalProductRows.length}</span
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
                    <span class="truncate" title={row.name}>{row.name}</span>
                    <span class="text-right tabular-nums">{row.quantity}</span>
                    <span class="text-right tabular-nums">{row.totalGross}</span
                    >
                    <span class="text-right tabular-nums">{row.cashGross}</span>
                    <span class="text-right tabular-nums">{row.cardGross}</span>
                  </div>
                {/each}
              {/each}
            {:else}
              {#each totalProductRows as row, j}
                <div
                  class="producto-grid px-4 py-1.5 text-sm text-zinc-600 {j %
                    2 ===
                  0
                    ? 'bg-white'
                    : 'bg-zinc-50/50'}"
                >
                  <span class="truncate" title={row.name}>{row.name}</span>
                  <span class="text-right tabular-nums">{row.quantity}</span>
                  <span class="text-right tabular-nums">{row.totalGross}</span>
                  <span class="text-right tabular-nums">{row.cashGross}</span>
                  <span class="text-right tabular-nums">{row.cardGross}</span>
                </div>
              {/each}
            {/if}
          </div>
        {/if}
      </div>
    {/if}

    <!-- Turnos section -->
    <div class="mb-6">
      <div
        class="text-xs uppercase font-bold text-zinc-400 tracking-wider mb-2 px-1"
      >
        Turnos
        <span class="text-zinc-300 font-normal ml-1">{closures.length}</span>
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
        {#each closures as closure, i}
          {@const closureInvs = invoicesByClosure.get(closure.id) ?? []}
          {@const counts = countInvoiceTypes(closureInvs)}
          {@const totalTx =
            counts.tickets + counts.facturas + counts.rectificativas}
          {@const isExpanded = expandedClosures.has(closure.id)}
          <button
            class="turno-grid w-full px-4 py-3 text-left text-sm hover:bg-zinc-50/80 transition-colors {i <
              closures.length - 1 || isExpanded
              ? 'border-b border-zinc-100'
              : ''}"
            onclick={() => toggleClosure(closure.id)}
          >
            <span class="font-bold text-zinc-500">T{closures.length - i}</span>
            <span class="text-zinc-400 tabular-nums">
              {formatTime(closure.period_start)}&ndash;{closure.period_end
                ? formatTime(closure.period_end)
                : "..."}
            </span>
            <span class="text-right">
              <span class="font-bold text-zinc-700 tabular-nums">{totalTx}</span
              >
              <span
                class="flex justify-end gap-1.5 text-xs text-zinc-400 tabular-nums"
              >
                <span>{counts.tickets} tick.</span>
                <span>{counts.facturas} fact.</span>
                {#if counts.rectificativas > 0}
                  <span class="text-red-500">{counts.rectificativas} rect.</span
                  >
                {/if}
              </span>
            </span>
            <span class="text-right font-bold text-zinc-900 tabular-nums"
              >{closure.total_gross ?? "0.00"}</span
            >
            <span class="text-right text-zinc-500 tabular-nums"
              >{closure.total_cash ?? "0.00"}</span
            >
            <span class="text-right text-zinc-500 tabular-nums"
              >{closure.total_card ?? "0.00"}</span
            >
            <span class="text-right tabular-nums">
              {#if closure.difference !== null}
                {@const diff = parseFloat(closure.difference)}
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
            {@const closureProducts = buildProductRows(closureInvs)}
            {@const closureGrouped = groupByCostCenter(closureProducts)}
            {@const closureHasGroups =
              closureGrouped.length > 1 ||
              (closureGrouped.length === 1 && closureGrouped[0].name !== "")}
            <div class="border-b border-zinc-100 bg-zinc-50/30">
              {#if closureProducts.length > 0}
                <div
                  class="producto-grid text-[11px] uppercase tracking-wider text-zinc-400 font-semibold px-4 py-2 border-b border-zinc-100"
                >
                  <span>Producto</span>
                  <span class="text-right">Uds.</span>
                  <span class="text-right">Total</span>
                  <span class="text-right">Ef.</span>
                  <span class="text-right">Tj.</span>
                </div>
                {#if closureHasGroups}
                  {#each closureGrouped as group}
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
                        <span class="truncate" title={row.name}>{row.name}</span
                        >
                        <span class="text-right tabular-nums"
                          >{row.quantity}</span
                        >
                        <span class="text-right tabular-nums"
                          >{row.totalGross}</span
                        >
                        <span class="text-right tabular-nums"
                          >{row.cashGross}</span
                        >
                        <span class="text-right tabular-nums"
                          >{row.cardGross}</span
                        >
                      </div>
                    {/each}
                  {/each}
                {:else}
                  {#each closureProducts as row, j}
                    <div
                      class="producto-grid px-4 py-1 text-sm text-zinc-600 {j %
                        2 ===
                      0
                        ? ''
                        : 'bg-zinc-50/50'}"
                    >
                      <span class="truncate" title={row.name}>{row.name}</span>
                      <span class="text-right tabular-nums">{row.quantity}</span
                      >
                      <span class="text-right tabular-nums"
                        >{row.totalGross}</span
                      >
                      <span class="text-right tabular-nums"
                        >{row.cashGross}</span
                      >
                      <span class="text-right tabular-nums"
                        >{row.cardGross}</span
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
