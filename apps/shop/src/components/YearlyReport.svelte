<script lang="ts">
  import { ChevronLeft, ChevronRight } from "lucide-svelte";
  import PeriodReport from "./PeriodReport.svelte";

  const now = new Date();
  let selectedYear = $state(now.getFullYear());
  let pickerOpen = $state(false);
  let pickerDecadeStart = $state(now.getFullYear() - (now.getFullYear() % 10));

  function prevYear() {
    selectedYear--;
  }

  function nextYear() {
    if (selectedYear >= new Date().getFullYear()) return;
    selectedYear++;
  }

  let isCurrent = $derived(selectedYear === new Date().getFullYear());

  function togglePicker() {
    pickerOpen = !pickerOpen;
    if (pickerOpen) pickerDecadeStart = selectedYear - (selectedYear % 10);
  }

  function pickYear(year: number) {
    if (year > new Date().getFullYear()) return;
    selectedYear = year;
    pickerOpen = false;
  }

  function handleClickOutside(e: MouseEvent) {
    const target = e.target as HTMLElement;
    if (!target.closest(".year-picker-container")) {
      pickerOpen = false;
    }
  }

  let decadeYears = $derived(
    Array.from({ length: 12 }, (_, i) => pickerDecadeStart - 1 + i)
  );

  let params = $derived({ year: String(selectedYear) });
  let label = $derived(String(selectedYear));
</script>

<svelte:window onclick={handleClickOutside} />

<div class="max-w-4xl mx-auto px-4 pt-6">
  <div class="flex items-center justify-center gap-4">
    <button
      class="p-2.5 rounded-xl bg-white border border-zinc-200 text-zinc-500 hover:bg-zinc-50 hover:border-zinc-300 active:scale-95 transition-all shadow-sm"
      onclick={prevYear}
    >
      <ChevronLeft class="w-5 h-5" />
    </button>
    <div class="relative year-picker-container">
      <button
        class="text-lg font-bold text-zinc-900 min-w-[120px] text-center cursor-pointer hover:text-zinc-600 transition-colors"
        onclick={togglePicker}
      >
        {label}
      </button>
      {#if pickerOpen}
        <div class="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-white rounded-xl border border-zinc-200 shadow-lg p-3 z-50 w-[260px]">
          <div class="flex items-center justify-between mb-3">
            <button
              class="p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 transition-colors"
              onclick={(e) => { e.stopPropagation(); pickerDecadeStart -= 10; }}
            >
              <ChevronLeft class="w-4 h-4" />
            </button>
            <span class="text-sm font-bold text-zinc-700">{pickerDecadeStart}–{pickerDecadeStart + 9}</span>
            <button
              class="p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              onclick={(e) => { e.stopPropagation(); if (pickerDecadeStart + 10 <= new Date().getFullYear()) pickerDecadeStart += 10; }}
              disabled={pickerDecadeStart + 10 > new Date().getFullYear()}
            >
              <ChevronRight class="w-4 h-4" />
            </button>
          </div>
          <div class="grid grid-cols-4 gap-1.5">
            {#each decadeYears as year}
              {@const isSelected = year === selectedYear}
              {@const isFuture = year > new Date().getFullYear()}
              {@const isOutside = year < pickerDecadeStart || year > pickerDecadeStart + 9}
              <button
                class="py-2 px-1 rounded-lg text-sm font-medium transition-all {isSelected ? 'bg-zinc-900 text-white' : isFuture ? 'text-zinc-300 cursor-not-allowed' : isOutside ? 'text-zinc-300 hover:bg-zinc-100' : 'text-zinc-600 hover:bg-zinc-100'}"
                onclick={(e) => { e.stopPropagation(); pickYear(year); }}
                disabled={isFuture}
              >
                {year}
              </button>
            {/each}
          </div>
        </div>
      {/if}
    </div>
    <button
      class="p-2.5 rounded-xl bg-white border border-zinc-200 text-zinc-500 hover:bg-zinc-50 hover:border-zinc-300 active:scale-95 transition-all shadow-sm disabled:opacity-30 disabled:cursor-not-allowed disabled:shadow-none"
      onclick={nextYear}
      disabled={isCurrent}
    >
      <ChevronRight class="w-5 h-5" />
    </button>
  </div>
</div>

<PeriodReport period="yearly" {params} {label} />
