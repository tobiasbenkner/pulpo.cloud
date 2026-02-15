<script lang="ts">
  import { ChevronLeft, ChevronRight } from "lucide-svelte";
  import PeriodReport from "./PeriodReport.svelte";

  const now = new Date();
  let selectedYear = $state(now.getFullYear());

  function prevYear() {
    selectedYear--;
  }

  function nextYear() {
    if (selectedYear >= new Date().getFullYear()) return;
    selectedYear++;
  }

  let isCurrent = $derived(selectedYear === new Date().getFullYear());

  let params = $derived({ year: String(selectedYear) });
  let label = $derived(String(selectedYear));
</script>

<div class="max-w-4xl mx-auto px-4 pt-6">
  <div class="flex items-center justify-center gap-4">
    <button
      class="p-2.5 rounded-xl bg-white border border-zinc-200 text-zinc-500 hover:bg-zinc-50 hover:border-zinc-300 active:scale-95 transition-all shadow-sm"
      onclick={prevYear}
    >
      <ChevronLeft class="w-5 h-5" />
    </button>
    <span
      class="text-lg font-bold text-zinc-900 min-w-[120px] text-center"
    >
      {label}
    </span>
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
