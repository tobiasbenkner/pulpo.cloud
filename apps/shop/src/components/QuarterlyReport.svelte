<script lang="ts">
  import { ChevronLeft, ChevronRight } from "lucide-svelte";
  import PeriodReport from "./PeriodReport.svelte";

  const now = new Date();
  let selectedYear = $state(now.getFullYear());
  let selectedQuarter = $state(Math.ceil((now.getMonth() + 1) / 3));
  let pickerOpen = $state(false);
  let pickerYear = $state(now.getFullYear());

  const quarterLabels = ["Q1", "Q2", "Q3", "Q4"];
  const quarterMonths = ["Ene–Mar", "Abr–Jun", "Jul–Sep", "Oct–Dic"];

  function formatQuarter(year: number, quarter: number): string {
    return `Q${quarter} ${year}`;
  }

  function prevQuarter() {
    if (selectedQuarter === 1) {
      selectedQuarter = 4;
      selectedYear--;
    } else {
      selectedQuarter--;
    }
  }

  function nextQuarter() {
    const nowDate = new Date();
    const currentYear = nowDate.getFullYear();
    const currentQuarter = Math.ceil((nowDate.getMonth() + 1) / 3);
    if (selectedYear === currentYear && selectedQuarter >= currentQuarter) return;
    if (selectedQuarter === 4) {
      selectedQuarter = 1;
      selectedYear++;
    } else {
      selectedQuarter++;
    }
  }

  let isCurrent = $derived(() => {
    const nowDate = new Date();
    return (
      selectedYear === nowDate.getFullYear() &&
      selectedQuarter === Math.ceil((nowDate.getMonth() + 1) / 3)
    );
  });

  function togglePicker() {
    pickerOpen = !pickerOpen;
    if (pickerOpen) pickerYear = selectedYear;
  }

  function isFutureQuarter(year: number, quarter: number): boolean {
    const n = new Date();
    const currentYear = n.getFullYear();
    const currentQuarter = Math.ceil((n.getMonth() + 1) / 3);
    return year > currentYear || (year === currentYear && quarter > currentQuarter);
  }

  function pickQuarter(quarter: number) {
    if (isFutureQuarter(pickerYear, quarter)) return;
    selectedYear = pickerYear;
    selectedQuarter = quarter;
    pickerOpen = false;
  }

  function handleClickOutside(e: MouseEvent) {
    const target = e.target as HTMLElement;
    if (!target.closest(".quarter-picker-container")) {
      pickerOpen = false;
    }
  }

  let params = $derived({
    year: String(selectedYear),
    quarter: String(selectedQuarter),
  });
  let label = $derived(formatQuarter(selectedYear, selectedQuarter));
</script>

<svelte:window onclick={handleClickOutside} />

<div class="max-w-4xl mx-auto px-4 pt-6">
  <div class="flex items-center justify-center gap-4">
    <button
      class="p-2.5 rounded-xl bg-white border border-zinc-200 text-zinc-500 hover:bg-zinc-50 hover:border-zinc-300 active:scale-95 transition-all shadow-sm"
      onclick={prevQuarter}
    >
      <ChevronLeft class="w-5 h-5" />
    </button>
    <div class="relative quarter-picker-container">
      <button
        class="text-lg font-bold text-zinc-900 min-w-[180px] text-center cursor-pointer hover:text-zinc-600 transition-colors"
        onclick={togglePicker}
      >
        {label}
      </button>
      {#if pickerOpen}
        <div class="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-white rounded-xl border border-zinc-200 shadow-lg p-3 z-50 w-[260px]">
          <div class="flex items-center justify-between mb-3">
            <button
              class="p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 transition-colors"
              onclick={(e) => { e.stopPropagation(); pickerYear--; }}
            >
              <ChevronLeft class="w-4 h-4" />
            </button>
            <span class="text-sm font-bold text-zinc-700">{pickerYear}</span>
            <button
              class="p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              onclick={(e) => { e.stopPropagation(); if (pickerYear < new Date().getFullYear()) pickerYear++; }}
              disabled={pickerYear >= new Date().getFullYear()}
            >
              <ChevronRight class="w-4 h-4" />
            </button>
          </div>
          <div class="grid grid-cols-2 gap-2">
            {#each quarterLabels as qLabel, i}
              {@const quarter = i + 1}
              {@const isSelected = pickerYear === selectedYear && quarter === selectedQuarter}
              {@const isFuture = isFutureQuarter(pickerYear, quarter)}
              <button
                class="py-3 px-2 rounded-lg text-center transition-all {isSelected ? 'bg-zinc-900 text-white' : isFuture ? 'text-zinc-300 cursor-not-allowed' : 'text-zinc-600 hover:bg-zinc-100'}"
                onclick={(e) => { e.stopPropagation(); pickQuarter(quarter); }}
                disabled={isFuture}
              >
                <div class="text-sm font-bold">{qLabel}</div>
                <div class="text-[11px] {isSelected ? 'text-zinc-400' : isFuture ? 'text-zinc-200' : 'text-zinc-400'}">{quarterMonths[i]}</div>
              </button>
            {/each}
          </div>
        </div>
      {/if}
    </div>
    <button
      class="p-2.5 rounded-xl bg-white border border-zinc-200 text-zinc-500 hover:bg-zinc-50 hover:border-zinc-300 active:scale-95 transition-all shadow-sm disabled:opacity-30 disabled:cursor-not-allowed disabled:shadow-none"
      onclick={nextQuarter}
      disabled={isCurrent()}
    >
      <ChevronRight class="w-5 h-5" />
    </button>
  </div>
</div>

<PeriodReport period="quarterly" {params} {label} />
