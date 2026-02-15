<script lang="ts">
  import { ChevronLeft, ChevronRight } from "lucide-svelte";
  import PeriodReport from "./PeriodReport.svelte";

  let selectedDate = $state(todayStr());

  function todayStr(): string {
    return new Date().toISOString().slice(0, 10);
  }

  function getMondayOfWeek(dateStr: string): Date {
    const d = new Date(dateStr + "T12:00:00");
    const day = d.getDay();
    const diff = day === 0 ? 6 : day - 1;
    d.setDate(d.getDate() - diff);
    return d;
  }

  function formatWeek(dateStr: string): string {
    const monday = getMondayOfWeek(dateStr);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const fmtOpts: Intl.DateTimeFormatOptions = {
      day: "2-digit",
      month: "2-digit",
    };
    return `${monday.toLocaleDateString("es-ES", fmtOpts)} \u2013 ${sunday.toLocaleDateString("es-ES", fmtOpts)}, ${monday.getFullYear()}`;
  }

  function prevWeek() {
    const d = new Date(selectedDate + "T12:00:00");
    d.setDate(d.getDate() - 7);
    selectedDate = d.toISOString().slice(0, 10);
  }

  function nextWeek() {
    const d = new Date(selectedDate + "T12:00:00");
    d.setDate(d.getDate() + 7);
    const monday = getMondayOfWeek(d.toISOString().slice(0, 10));
    const todayMonday = getMondayOfWeek(todayStr());
    if (monday > todayMonday) return;
    selectedDate = d.toISOString().slice(0, 10);
  }

  let isCurrentWeek = $derived(
    getMondayOfWeek(selectedDate).toISOString().slice(0, 10) ===
      getMondayOfWeek(todayStr()).toISOString().slice(0, 10),
  );

  let params = $derived({ date: selectedDate });
  let label = $derived(formatWeek(selectedDate));
</script>

<div class="max-w-4xl mx-auto px-4 pt-6">
  <div class="flex items-center justify-center gap-4">
    <button
      class="p-2.5 rounded-xl bg-white border border-zinc-200 text-zinc-500 hover:bg-zinc-50 hover:border-zinc-300 active:scale-95 transition-all shadow-sm"
      onclick={prevWeek}
    >
      <ChevronLeft class="w-5 h-5" />
    </button>
    <span
      class="text-lg font-bold text-zinc-900 min-w-[280px] text-center"
    >
      {label}
    </span>
    <button
      class="p-2.5 rounded-xl bg-white border border-zinc-200 text-zinc-500 hover:bg-zinc-50 hover:border-zinc-300 active:scale-95 transition-all shadow-sm disabled:opacity-30 disabled:cursor-not-allowed disabled:shadow-none"
      onclick={nextWeek}
      disabled={isCurrentWeek}
    >
      <ChevronRight class="w-5 h-5" />
    </button>
  </div>
</div>

<PeriodReport period="weekly" {params} {label} />
