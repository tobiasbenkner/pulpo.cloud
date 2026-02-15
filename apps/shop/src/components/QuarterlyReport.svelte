<script lang="ts">
  import { ChevronLeft, ChevronRight } from "lucide-svelte";
  import PeriodReport from "./PeriodReport.svelte";

  const now = new Date();
  let selectedYear = $state(now.getFullYear());
  let selectedQuarter = $state(Math.ceil((now.getMonth() + 1) / 3));

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
    if (
      selectedYear === currentYear &&
      selectedQuarter >= currentQuarter
    )
      return;
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

  let params = $derived({
    year: String(selectedYear),
    quarter: String(selectedQuarter),
  });
  let label = $derived(formatQuarter(selectedYear, selectedQuarter));
</script>

<div class="max-w-4xl mx-auto px-4 pt-6">
  <div class="flex items-center justify-center gap-4">
    <button
      class="p-2.5 rounded-xl bg-white border border-zinc-200 text-zinc-500 hover:bg-zinc-50 hover:border-zinc-300 active:scale-95 transition-all shadow-sm"
      onclick={prevQuarter}
    >
      <ChevronLeft class="w-5 h-5" />
    </button>
    <span
      class="text-lg font-bold text-zinc-900 min-w-[180px] text-center"
    >
      {label}
    </span>
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
