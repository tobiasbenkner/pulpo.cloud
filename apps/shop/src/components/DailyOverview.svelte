<script lang="ts">
  import { onMount } from "svelte";
  import { loadDailyClosures } from "../stores/registerStore";
  import { taxName } from "../stores/taxStore";
  import type { CashRegisterClosure } from "@pulpo/cms";
  import Big from "big.js";
  import { ChevronLeft, ChevronRight } from "lucide-svelte";

  let loading = $state(false);
  let selectedDate = $state(todayStr());
  let closures = $state<CashRegisterClosure[]>([]);
  let tax = $state("IGIC");

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

  let isToday = $derived(selectedDate === todayStr());

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

  async function loadData() {
    loading = true;
    try {
      closures = await loadDailyClosures(selectedDate);
    } catch (e) {
      console.error("Failed to load daily closures:", e);
      closures = [];
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

<div class="max-w-2xl mx-auto px-4 py-6">
  <!-- Date navigation -->
  <div class="flex items-center justify-center gap-4 mb-6">
    <button
      class="p-3 rounded-xl bg-zinc-100 text-zinc-600 hover:bg-zinc-200 active:scale-95 transition-all"
      onclick={prevDay}
    >
      <ChevronLeft class="w-6 h-6" />
    </button>
    <span
      class="text-sm font-bold text-zinc-900 min-w-[200px] text-center capitalize"
    >
      {formatDate(selectedDate)}
    </span>
    <button
      class="p-3 rounded-xl bg-zinc-100 text-zinc-600 hover:bg-zinc-200 active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
      onclick={nextDay}
      disabled={isToday}
    >
      <ChevronRight class="w-6 h-6" />
    </button>
  </div>

  {#if loading}
    <div class="flex flex-col items-center justify-center py-16">
      <div
        class="w-10 h-10 border-2 border-zinc-300 border-t-zinc-600 rounded-full animate-spin mb-4"
      ></div>
      <p class="text-sm text-zinc-400">Cargando datos...</p>
    </div>
  {:else if closures.length === 0}
    <div class="text-center py-16">
      <p class="text-zinc-400 text-sm">
        No hay turnos cerrados en este d&iacute;a.
      </p>
    </div>
  {:else}
    <!-- Day summary -->
    {#if summary}
      <div class="bg-zinc-900 rounded-2xl p-5 mb-6 text-white">
        <div
          class="text-xs uppercase font-bold text-zinc-400 tracking-wider mb-3"
        >
          Total del d&iacute;a
        </div>
        <div class="grid grid-cols-3 gap-4 mb-4">
          <div>
            <div class="text-xs text-zinc-400">Transacciones</div>
            <div class="text-lg font-bold">{summary.transactionCount}</div>
          </div>
          <div>
            <div class="text-xs text-zinc-400">Bruto</div>
            <div class="text-lg font-bold">{summary.totalGross} &euro;</div>
          </div>
          <div>
            <div class="text-xs text-zinc-400">Neto</div>
            <div class="text-lg font-bold">{summary.totalNet} &euro;</div>
          </div>
        </div>
        <div class="grid grid-cols-3 gap-4 mb-4">
          <div>
            <div class="text-xs text-zinc-400">Impuestos</div>
            <div class="text-sm font-medium">{summary.totalTax} &euro;</div>
          </div>
          <div>
            <div class="text-xs text-zinc-400">Efectivo</div>
            <div class="text-sm font-medium">{summary.totalCash} &euro;</div>
          </div>
          <div>
            <div class="text-xs text-zinc-400">Tarjeta</div>
            <div class="text-sm font-medium">{summary.totalCard} &euro;</div>
          </div>
        </div>

        <!-- Tax breakdown -->
        {#if summary.taxBreakdown.length > 0}
          <div class="border-t border-zinc-700 pt-3 space-y-1">
            {#each summary.taxBreakdown as entry}
              <div class="flex justify-between text-sm">
                <span class="text-zinc-400"
                  >{tax} {parseFloat(entry.rate).toFixed(0)}%</span
                >
                <span class="text-zinc-300 font-mono"
                  >Base {entry.net} &nbsp; Imp. {entry.tax}</span
                >
              </div>
            {/each}
          </div>
        {/if}
      </div>
    {/if}

    <!-- Individual closures -->
    <div class="text-xs uppercase font-bold text-zinc-400 tracking-wider mb-3">
      Turnos ({closures.length})
    </div>
    <div class="space-y-3">
      {#each closures as closure, i}
        <div class="bg-white rounded-xl p-4 border border-zinc-200">
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-bold text-zinc-400"
              >Turno {closures.length - i}</span
            >
            <span class="text-xs text-zinc-400">
              {formatTime(closure.period_start)}
              &ndash;
              {closure.period_end ? formatTime(closure.period_end) : ""}
            </span>
          </div>
          <div class="grid grid-cols-4 gap-3 text-sm">
            <div>
              <div class="text-xs text-zinc-400">Trans.</div>
              <div class="font-bold text-zinc-900">
                {closure.transaction_count ?? 0}
              </div>
            </div>
            <div>
              <div class="text-xs text-zinc-400">Bruto</div>
              <div class="font-bold text-zinc-900">
                {closure.total_gross ?? "0.00"} &euro;
              </div>
            </div>
            <div>
              <div class="text-xs text-zinc-400">Efectivo</div>
              <div class="font-medium text-zinc-700">
                {closure.total_cash ?? "0.00"} &euro;
              </div>
            </div>
            <div>
              <div class="text-xs text-zinc-400">Tarjeta</div>
              <div class="font-medium text-zinc-700">
                {closure.total_card ?? "0.00"} &euro;
              </div>
            </div>
          </div>
          {#if closure.difference !== null}
            {@const diff = parseFloat(closure.difference)}
            <div
              class="mt-2 pt-2 border-t border-zinc-200 flex justify-between text-sm"
            >
              <span class="text-zinc-400">Diferencia</span>
              <span
                class="font-bold {Math.abs(diff) < 0.005
                  ? 'text-zinc-400'
                  : diff > 0
                    ? 'text-emerald-600'
                    : 'text-red-600'}"
              >
                {diff >= 0 ? "+" : ""}{diff.toFixed(2)} &euro;
              </span>
            </div>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</div>
