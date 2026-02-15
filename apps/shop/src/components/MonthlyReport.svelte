<script lang="ts">
  import { ChevronLeft, ChevronRight } from "lucide-svelte";
  import PeriodReport from "./PeriodReport.svelte";

  const now = new Date();
  let selectedYear = $state(now.getFullYear());
  let selectedMonth = $state(now.getMonth() + 1);

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

  let params = $derived({
    year: String(selectedYear),
    month: String(selectedMonth),
  });
  let label = $derived(formatMonth(selectedYear, selectedMonth));
</script>

<div class="max-w-4xl mx-auto px-4 pt-6">
  <div class="flex items-center justify-center gap-4">
    <button
      class="p-2.5 rounded-xl bg-white border border-zinc-200 text-zinc-500 hover:bg-zinc-50 hover:border-zinc-300 active:scale-95 transition-all shadow-sm"
      onclick={prevMonth}
    >
      <ChevronLeft class="w-5 h-5" />
    </button>
    <span
      class="text-lg font-bold text-zinc-900 min-w-[220px] text-center capitalize"
    >
      {label}
    </span>
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
