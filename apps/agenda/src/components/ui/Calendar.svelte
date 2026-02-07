<script lang="ts">
  import {
    format,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    addMonths,
    subMonths,
    isSameMonth,
    isSameDay,
    isToday,
  } from "date-fns";
  import { es } from "date-fns/locale";
  import type { Locale } from "date-fns";
  import { ChevronLeft, ChevronRight } from "lucide-svelte";

  export let value: Date | null = null;
  export let locale: Locale = es;
  export let weekStartsOn: 0 | 1 | 2 | 3 | 4 | 5 | 6 = 1;
  export let showTodayButton = true;

  export let onSelect: (date: Date) => void = () => {};

  let viewDate = value || new Date();

  // Wenn value sich ändert, viewDate aktualisieren
  $: if (value) {
    viewDate = value;
  }

  // Wochentage (kurz)
  $: weekdays = getWeekdays();

  function getWeekdays(): string[] {
    const days: string[] = [];
    const start = startOfWeek(new Date(), { weekStartsOn });
    for (let i = 0; i < 7; i++) {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      days.push(format(day, "EEEEEE", { locale }));
    }
    return days;
  }

  // Kalender-Tage für den aktuellen Monat
  $: calendarDays = getCalendarDays(viewDate);

  function getCalendarDays(date: Date): Date[] {
    const monthStart = startOfMonth(date);
    const monthEnd = endOfMonth(date);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn });

    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }

  function selectDate(date: Date): void {
    onSelect(date);
  }

  function prevMonth(): void {
    viewDate = subMonths(viewDate, 1);
  }

  function nextMonth(): void {
    viewDate = addMonths(viewDate, 1);
  }

  function goToToday(): void {
    const today = new Date();
    viewDate = today;
    onSelect(today);
  }
</script>

<div
  class="w-75 bg-picker-bg border border-picker-border rounded-xl shadow-2xl p-4 text-picker-text"
>
  <!-- Header mit Monat/Jahr und Navigation -->
  <div class="flex items-center justify-between mb-4">
    <button
      type="button"
      on:click|stopPropagation={prevMonth}
      class="p-2 rounded-lg border border-picker-btn-border text-picker-btn-text hover:bg-picker-btn-hover hover:border-picker-muted transition-colors"
      aria-label="Mes anterior"
    >
      <ChevronLeft size={18} />
    </button>

    <span class="text-base font-semibold text-picker-text capitalize">
      {format(viewDate, "MMMM yyyy", { locale })}
    </span>

    <button
      type="button"
      on:click|stopPropagation={nextMonth}
      class="p-2 rounded-lg border border-picker-btn-border text-picker-btn-text hover:bg-picker-btn-hover hover:border-picker-muted transition-colors"
      aria-label="Mes siguiente"
    >
      <ChevronRight size={18} />
    </button>
  </div>

  <!-- Wochentage -->
  <div class="grid grid-cols-7 gap-1 mb-2">
    {#each weekdays as day}
      <div
        class="text-center text-xs font-semibold text-picker-muted uppercase py-1"
      >
        {day}
      </div>
    {/each}
  </div>

  <!-- Kalendertage -->
  <div class="grid grid-cols-7 gap-1">
    {#each calendarDays as day}
      {@const isCurrentMonth = isSameMonth(day, viewDate)}
      {@const isSelected = value && isSameDay(day, value)}
      {@const isTodayDate = isToday(day)}

      <button
        type="button"
        on:click|stopPropagation={() => selectDate(day)}
        class="aspect-square flex items-center justify-center text-sm rounded-lg border transition-colors duration-100
          {isSelected
          ? 'bg-picker-selected-bg text-picker-selected-text border-picker-selected-bg font-bold shadow-[0_0_10px_var(--picker-selected-shadow)]'
          : isTodayDate && isCurrentMonth
            ? 'border-picker-today-border text-picker-today-text hover:bg-picker-btn-hover'
            : isCurrentMonth
              ? 'border-picker-btn-border text-picker-btn-text hover:bg-picker-btn-hover hover:border-picker-muted'
              : 'border-transparent text-picker-outside hover:bg-picker-btn-hover/50 hover:text-picker-muted'}"
      >
        {format(day, "d")}
      </button>
    {/each}
  </div>

  <!-- Footer mit Heute-Button -->
  {#if showTodayButton}
    <div class="mt-4 pt-3 border-t border-picker-border">
      <button
        type="button"
        on:click|stopPropagation={goToToday}
        class="w-full bg-picker-selected-bg text-picker-selected-text font-bold py-2 rounded-lg hover:opacity-85 transition-colors text-sm"
      >
        Hoy
      </button>
    </div>
  {/if}
</div>
