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
      { qty: number; gross: Big; cash: Big; card: Big }
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
      }))
      .sort((a, b) => b.quantity - a.quantity);
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

<div class="max-w-4xl mx-auto px-4 py-4">
  <!-- Date navigation -->
  <div class="flex items-center justify-center gap-3 mb-4">
    <button
      class="p-2 rounded-lg bg-zinc-100 text-zinc-600 hover:bg-zinc-200 active:scale-95 transition-all"
      onclick={prevDay}
    >
      <ChevronLeft class="w-5 h-5" />
    </button>
    <span
      class="text-sm font-bold text-zinc-900 min-w-[180px] text-center capitalize"
    >
      {formatDate(selectedDate)}
    </span>
    <button
      class="p-2 rounded-lg bg-zinc-100 text-zinc-600 hover:bg-zinc-200 active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
      onclick={nextDay}
      disabled={isToday}
    >
      <ChevronRight class="w-5 h-5" />
    </button>
  </div>

  {#if loading}
    <div class="flex items-center justify-center py-12">
      <div
        class="w-8 h-8 border-2 border-zinc-300 border-t-zinc-600 rounded-full animate-spin"
      ></div>
    </div>
  {:else if closures.length === 0}
    <div class="text-center py-12">
      <p class="text-zinc-400 text-sm">
        No hay turnos cerrados en este d&iacute;a.
      </p>
    </div>
  {:else}
    {#if summary}
      <!-- KPI row -->
      <div class="grid grid-cols-6 gap-2 mb-3">
        <div class="bg-white rounded-lg border border-zinc-200 px-3 py-2">
          <div class="text-[10px] text-zinc-400 uppercase tracking-wide">
            Bruto
          </div>
          <div class="text-lg font-extrabold text-zinc-900 tabular-nums">
            {summary.totalGross}
            <span class="text-xs font-normal text-zinc-400">&euro;</span>
          </div>
        </div>
        <div class="bg-white rounded-lg border border-zinc-200 px-3 py-2">
          <div class="text-[10px] text-zinc-400 uppercase tracking-wide">
            Neto
          </div>
          <div class="text-lg font-bold text-zinc-700 tabular-nums">
            {summary.totalNet}
            <span class="text-xs font-normal text-zinc-400">&euro;</span>
          </div>
        </div>
        <div class="bg-white rounded-lg border border-zinc-200 px-3 py-2">
          <div class="text-[10px] text-zinc-400 uppercase tracking-wide">
            Impuestos
          </div>
          <div class="text-lg font-bold text-zinc-700 tabular-nums">
            {summary.totalTax}
            <span class="text-xs font-normal text-zinc-400">&euro;</span>
          </div>
        </div>
        <div class="bg-white rounded-lg border border-zinc-200 px-3 py-2">
          <div class="text-[10px] text-zinc-400 uppercase tracking-wide">
            Efectivo
          </div>
          <div class="text-lg font-bold text-zinc-700 tabular-nums">
            {summary.totalCash}
            <span class="text-xs font-normal text-zinc-400">&euro;</span>
          </div>
        </div>
        <div class="bg-white rounded-lg border border-zinc-200 px-3 py-2">
          <div class="text-[10px] text-zinc-400 uppercase tracking-wide">
            Tarjeta
          </div>
          <div class="text-lg font-bold text-zinc-700 tabular-nums">
            {summary.totalCard}
            <span class="text-xs font-normal text-zinc-400">&euro;</span>
          </div>
        </div>
        <div class="bg-white rounded-lg border border-zinc-200 px-3 py-2">
          <div class="text-[10px] text-zinc-400 uppercase tracking-wide">
            Trans.
          </div>
          <div class="text-lg font-bold text-zinc-700 tabular-nums">
            {summary.transactionCount}
          </div>
          <div class="flex gap-1.5 text-[10px] text-zinc-400 mt-0.5">
            <span>{totalInvoiceCounts.tickets} tick.</span>
            <span>{totalInvoiceCounts.facturas} fact.</span>
            {#if totalInvoiceCounts.rectificativas > 0}
              <span class="text-red-400"
                >{totalInvoiceCounts.rectificativas} rect.</span
              >
            {/if}
          </div>
        </div>
      </div>

      <!-- Tax breakdown + total products toggle -->
      <div class="flex items-center justify-between mb-4 px-1">
        <div class="flex flex-wrap gap-x-4 gap-y-1">
          {#if summary.taxBreakdown.length > 0}
            {#each summary.taxBreakdown as entry}
              <span class="text-xs text-zinc-400">
                {tax}
                {parseFloat(entry.rate).toFixed(0)}%:
                <span class="font-medium text-zinc-600">Base {entry.net}</span>
                <span class="text-zinc-300 mx-0.5">&middot;</span>
                <span class="font-medium text-zinc-600">Imp. {entry.tax}</span>
              </span>
            {/each}
          {/if}
        </div>
      </div>
    {/if}

    <!-- Total products (collapsible) -->
    {#if totalProductRows.length > 0}
      <button
        class="w-full flex items-center justify-between px-2 py-1.5 mb-1 rounded-lg hover:bg-zinc-100 transition-colors"
        onclick={() => (totalProductsExpanded = !totalProductsExpanded)}
      >
        <span
          class="text-[10px] uppercase font-bold text-zinc-400 tracking-wider"
        >
          Productos del d&iacute;a ({totalProductRows.length})
        </span>
        <ChevronDown
          class="w-4 h-4 text-zinc-400 transition-transform {totalProductsExpanded
            ? 'rotate-180'
            : ''}"
        />
      </button>
      {#if totalProductsExpanded}
        <div
          class="mb-4 bg-white rounded-lg border border-zinc-200 overflow-hidden"
        >
          <div
            class="producto-grid text-[10px] uppercase tracking-wider text-zinc-400 font-bold border-b border-zinc-200 bg-zinc-50 px-3 py-1.5"
          >
            <span>Producto</span>
            <span class="text-right">Uds.</span>
            <span class="text-right">Total</span>
            <span class="text-right">Ef.</span>
            <span class="text-right">Tj.</span>
          </div>
          {#each totalProductRows as row}
            <div
              class="producto-grid px-3 py-1.5 text-sm border-b border-zinc-50 last:border-0"
            >
              <span class="text-zinc-800 truncate" title={row.name}
                >{row.name}</span
              >
              <span class="text-right tabular-nums font-bold text-zinc-900"
                >{row.quantity}</span
              >
              <span class="text-right tabular-nums font-bold text-zinc-900"
                >{row.totalGross}</span
              >
              <span class="text-right tabular-nums text-zinc-600"
                >{row.cashGross}</span
              >
              <span class="text-right tabular-nums text-zinc-600"
                >{row.cardGross}</span
              >
            </div>
          {/each}
        </div>
      {/if}
    {/if}

    <!-- Turnos -->
    <div
      class="text-[10px] uppercase font-bold text-zinc-400 tracking-wider mb-2 px-2"
    >
      Turnos ({closures.length})
    </div>
    <div class="bg-white rounded-lg border border-zinc-200 overflow-hidden">
      <!-- Header -->
      <div
        class="turno-grid text-[10px] uppercase tracking-wider text-zinc-400 font-bold border-b border-zinc-200 bg-zinc-50 px-3 py-1.5"
      >
        <span>Turno</span>
        <span>Horario</span>
        <span class="text-center">Tipo</span>
        <span class="text-right">Bruto</span>
        <span class="text-right">Ef.</span>
        <span class="text-right">Tj.</span>
        <span class="text-right">Dif.</span>
        <span></span>
      </div>
      {#each closures as closure, i}
        {@const closureInvs = invoicesByClosure.get(closure.id) ?? []}
        {@const counts = countInvoiceTypes(closureInvs)}
        {@const isExpanded = expandedClosures.has(closure.id)}
        <!-- Row -->
        <button
          class="turno-grid w-full px-3 py-2 text-left text-sm hover:bg-zinc-50 transition-colors border-b border-zinc-100 last:border-0"
          onclick={() => toggleClosure(closure.id)}
        >
          <span class="text-xs font-bold text-zinc-500"
            >T{closures.length - i}</span
          >
          <span class="text-xs text-zinc-400 tabular-nums">
            {formatTime(closure.period_start)}&ndash;{closure.period_end
              ? formatTime(closure.period_end)
              : "..."}
          </span>
          <span
            class="flex justify-center gap-1 text-[10px] text-zinc-400 tabular-nums"
          >
            <span>{counts.tickets}t</span>
            <span>{counts.facturas}f</span>
            {#if counts.rectificativas > 0}
              <span class="text-red-400">{counts.rectificativas}r</span>
            {/if}
          </span>
          <span class="text-right font-bold text-zinc-900 tabular-nums"
            >{closure.total_gross ?? "0.00"}</span
          >
          <span class="text-right text-xs text-zinc-600 tabular-nums"
            >{closure.total_cash ?? "0.00"}</span
          >
          <span class="text-right text-xs text-zinc-600 tabular-nums"
            >{closure.total_card ?? "0.00"}</span
          >
          <span class="text-right text-xs tabular-nums">
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
              class="w-4 h-4 text-zinc-400 transition-transform {isExpanded
                ? 'rotate-180'
                : ''}"
            />
          </span>
        </button>
        <!-- Expanded detail -->
        {#if isExpanded}
          {@const closureProducts = buildProductRows(closureInvs)}
          <div class="border-b border-zinc-100 px-3 py-2 bg-zinc-50/50">
            {#if closureProducts.length > 0}
              <div
                class="producto-grid text-[10px] uppercase tracking-wider text-zinc-400 font-bold py-1"
              >
                <span>Producto</span>
                <span class="text-right">Uds.</span>
                <span class="text-right">Total</span>
                <span class="text-right">Ef.</span>
                <span class="text-right">Tj.</span>
              </div>
              {#each closureProducts as row}
                <div
                  class="producto-grid py-1 text-xs border-t border-zinc-100"
                >
                  <span class="text-zinc-700 truncate" title={row.name}
                    >{row.name}</span
                  >
                  <span class="text-right tabular-nums font-bold text-zinc-800"
                    >{row.quantity}</span
                  >
                  <span class="text-right tabular-nums font-bold text-zinc-800"
                    >{row.totalGross}</span
                  >
                  <span class="text-right tabular-nums text-zinc-500"
                    >{row.cashGross}</span
                  >
                  <span class="text-right tabular-nums text-zinc-500"
                    >{row.cardGross}</span
                  >
                </div>
              {/each}
            {:else}
              <p class="text-xs text-zinc-400 text-center py-2">
                Sin productos
              </p>
            {/if}
          </div>
        {/if}
      {/each}
    </div>
  {/if}
</div>

<style>
  .turno-grid {
    display: grid;
    grid-template-columns: 2rem 7rem 5rem 1fr 1fr 1fr 4rem 1.5rem;
    align-items: center;
    gap: 0.5rem;
  }
  .producto-grid {
    display: grid;
    grid-template-columns: 1fr 3.5rem 5rem 5rem 5rem;
    align-items: center;
    gap: 0.5rem;
  }
</style>
