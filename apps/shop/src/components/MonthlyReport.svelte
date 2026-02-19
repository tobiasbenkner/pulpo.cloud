<script lang="ts">
  import { ChevronLeft, ChevronRight } from "lucide-svelte";
  import PeriodReport from "./PeriodReport.svelte";

  const now = new Date();
  let selectedYear = $state(now.getFullYear());
  let selectedMonth = $state(now.getMonth() + 1);
  let pickerOpen = $state(false);
  let pickerYear = $state(now.getFullYear());

  const monthNames = [
    "Ene", "Feb", "Mar", "Abr", "May", "Jun",
    "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
  ];

  function formatMonth(year: number, month: number): string {
    const d = new Date(year, month - 1, 1);
    const name = d.toLocaleDateString("es-ES", { month: "long" });
    return `${name.charAt(0).toUpperCase() + name.slice(1)} ${year}`;
  }

  function prevMonth() {
    if (selectedMonth === 1) {
      selectedMonth = 12;
      selectedYear--;
    } else {
      selectedMonth--;
    }
  }

  function nextMonth() {
    const nowDate = new Date();
    const currentYear = nowDate.getFullYear();
    const currentMonth = nowDate.getMonth() + 1;
    if (selectedYear === currentYear && selectedMonth >= currentMonth) return;
    if (selectedMonth === 12) {
      selectedMonth = 1;
      selectedYear++;
    } else {
      selectedMonth++;
    }
  }

  let isCurrent = $derived(() => {
    const nowDate = new Date();
    return (
      selectedYear === nowDate.getFullYear() &&
      selectedMonth === nowDate.getMonth() + 1
    );
  });

  function togglePicker() {
    pickerOpen = !pickerOpen;
    if (pickerOpen) pickerYear = selectedYear;
  }

  function isFutureMonth(year: number, month: number): boolean {
    const n = new Date();
    return year > n.getFullYear() || (year === n.getFullYear() && month > n.getMonth() + 1);
  }

  function pickMonth(month: number) {
    if (isFutureMonth(pickerYear, month)) return;
    selectedYear = pickerYear;
    selectedMonth = month;
    pickerOpen = false;
  }

  function handleClickOutside(e: MouseEvent) {
    const target = e.target as HTMLElement;
    if (!target.closest(".month-picker-container")) {
      pickerOpen = false;
    }
  }

  let params = $derived({
    year: String(selectedYear),
    month: String(selectedMonth),
  });
  let label = $derived(formatMonth(selectedYear, selectedMonth));
</script>

<svelte:window onclick={handleClickOutside} />

<div class="max-w-4xl mx-auto px-4 pt-6">
  <div class="flex items-center justify-center gap-4">
    <button
      class="p-2.5 rounded-xl bg-white border border-zinc-200 text-zinc-500 hover:bg-zinc-50 hover:border-zinc-300 active:scale-95 transition-all shadow-sm"
      onclick={prevMonth}
    >
      <ChevronLeft class="w-5 h-5" />
    </button>
    <div class="relative month-picker-container">
      <button
        class="text-lg font-bold text-zinc-900 min-w-[220px] text-center capitalize cursor-pointer hover:text-zinc-600 transition-colors"
        onclick={togglePicker}
      >
        {label}
      </button>
      {#if pickerOpen}
        <div class="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-white rounded-xl border border-zinc-200 shadow-lg p-3 z-50 w-[280px]">
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
          <div class="grid grid-cols-4 gap-1.5">
            {#each monthNames as name, i}
              {@const month = i + 1}
              {@const isSelected = pickerYear === selectedYear && month === selectedMonth}
              {@const isFuture = isFutureMonth(pickerYear, month)}
              <button
                class="py-2 px-1 rounded-lg text-sm font-medium transition-all {isSelected ? 'bg-zinc-900 text-white' : isFuture ? 'text-zinc-300 cursor-not-allowed' : 'text-zinc-600 hover:bg-zinc-100'}"
                onclick={(e) => { e.stopPropagation(); pickMonth(month); }}
                disabled={isFuture}
              >
                {name}
              </button>
            {/each}
          </div>
        </div>
      {/if}
    </div>
    <button
      class="p-2.5 rounded-xl bg-white border border-zinc-200 text-zinc-500 hover:bg-zinc-50 hover:border-zinc-300 active:scale-95 transition-all shadow-sm disabled:opacity-30 disabled:cursor-not-allowed disabled:shadow-none"
      onclick={nextMonth}
      disabled={isCurrent()}
    >
      <ChevronRight class="w-5 h-5" />
    </button>
  </div>
</div>

<PeriodReport period="monthly" {params} {label} />
