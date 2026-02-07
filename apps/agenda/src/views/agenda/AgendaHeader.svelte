<script lang="ts">
  import { format, parseISO, subDays, addDays } from "date-fns";
  import { es } from "date-fns/locale";
  import { ChevronLeft, ChevronRight, Plus, Eye, EyeOff } from "lucide-svelte";
  import { clsx } from "clsx";
  import { slide } from "svelte/transition";
  import Calendar from "../../components/ui/Calendar.svelte";

  export let dateStr: string;
  export let showArrived: boolean;
  export let isRefetching = false;

  // Callback Prop statt dispatch
  export let onToggleFilter: () => void = () => {};
  export let onDateChange: (newDate: string) => void = () => {};

  let isCalendarOpen = false;
  let calendarWrapperRef: HTMLElement;

  $: displayDateFull = format(parseISO(dateStr), "EEEE, d. MMMM yyyy", {
    locale: es,
  });

  $: displayDateShort = format(parseISO(dateStr), "EEE, d MMM", {
    locale: es,
  });

  $: selectedDate = parseISO(dateStr);

  function changeDate(newDate: string) {
    onDateChange(newDate);
  }

  function goPrev() {
    changeDate(format(subDays(parseISO(dateStr), 1), "yyyy-MM-dd"));
  }

  function goNext() {
    changeDate(format(addDays(parseISO(dateStr), 1), "yyyy-MM-dd"));
  }

  function handleCalendarSelect(date: Date) {
    changeDate(format(date, "yyyy-MM-dd"));
    isCalendarOpen = false;
  }

  function toggleCalendar() {
    isCalendarOpen = !isCalendarOpen;
  }

  function handleClickOutside(event: MouseEvent) {
    if (
      isCalendarOpen &&
      calendarWrapperRef &&
      !calendarWrapperRef.contains(event.target as Node)
    ) {
      isCalendarOpen = false;
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === "Escape" && isCalendarOpen) {
      isCalendarOpen = false;
    }
  }
</script>

<svelte:window on:click={handleClickOutside} on:keydown={handleKeydown} />

<header
  class="flex items-center justify-between gap-2 md:gap-6 pb-3 md:pb-6 border-b border-border-default max-w-7xl mx-auto w-full"
>
  <!-- Date Navigation -->
  <div
    class={clsx(
      "flex items-center gap-1 md:gap-2 bg-surface px-2 md:px-3 py-1.5 md:py-2 rounded-lg shadow-sm relative transition-all duration-300 border",
      isRefetching
        ? "border-primary/30 shadow-primary/10"
        : "border-border-light",
    )}
  >
    <button
      on:click={goPrev}
      class="p-1.5 md:p-2 hover:bg-surface-hover rounded-md text-fg-secondary active:bg-surface-alt"
    >
      <ChevronLeft size={18} class="md:w-5 md:h-5" />
    </button>

    <div class="relative" bind:this={calendarWrapperRef}>
      <button
        type="button"
        on:click|stopPropagation={toggleCalendar}
        class="text-center cursor-pointer focus:outline-none px-1 md:px-2"
      >
        <h2
          class="text-sm md:text-xl font-serif text-fg capitalize whitespace-nowrap min-w-28 md:min-w-64"
        >
          <span class="md:hidden">{displayDateShort}</span>
          <span class="hidden md:inline">{displayDateFull}</span>
        </h2>
      </button>

      {#if isCalendarOpen}
        <!-- Backdrop (mobile) -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div
          class="fixed inset-0 bg-black/40 z-40 md:hidden"
          on:click|stopPropagation={() => (isCalendarOpen = false)}
        ></div>

        <!-- Mobile: bottom-sheet, Desktop: absolute dropdown -->
        <div
          transition:slide={{ duration: 150 }}
          class="fixed bottom-0 left-0 right-0 z-50 md:absolute md:bottom-auto md:left-1/2 md:right-auto md:-translate-x-1/2 md:top-full md:mt-2"
        >
          <div
            class="mx-auto max-w-sm md:max-w-none [&>div]:w-full [&>div]:rounded-t-xl [&>div]:rounded-b-none [&>div]:border-0 md:[&>div]:w-75 md:[&>div]:rounded-xl md:[&>div]:border md:[&>div]:border-picker-border"
          >
            <Calendar
              value={selectedDate}
              locale={es}
              showTodayButton={false}
              onSelect={handleCalendarSelect}
            />
          </div>
        </div>
      {/if}
    </div>

    <button
      on:click={goNext}
      class="p-1.5 md:p-2 hover:bg-surface-hover rounded-md text-fg-secondary active:bg-surface-alt"
    >
      <ChevronRight size={18} class="md:w-5 md:h-5" />
    </button>

    <div class="w-px h-5 bg-border-default mx-0.5 md:mx-1"></div>

    <button
      on:click={() => changeDate(format(new Date(), "yyyy-MM-dd"))}
      class="px-2 md:px-3 py-1 md:py-1.5 rounded-md text-xs md:text-sm font-medium text-fg-muted hover:bg-surface-hover hover:text-fg transition-colors whitespace-nowrap"
    >
      Hoy
    </button>
  </div>

  <!-- Actions -->
  <div class="flex items-center gap-1.5 md:gap-2 shrink-0">
    <button
      on:click={onToggleFilter}
      class={clsx(
        "inline-flex items-center justify-center h-9 md:h-10 px-2.5 rounded-md border text-sm transition-colors",
        showArrived
          ? "border-border-default bg-surface text-fg-secondary hover:border-fg-muted"
          : "border-secondary/30 bg-secondary/5 text-secondary font-medium",
      )}
      aria-label={showArrived ? "Ocultar llegadas" : "Mostrar todas"}
    >
      {#if showArrived}
        <Eye size={16} />
      {:else}
        <EyeOff size={16} />
      {/if}
    </button>

    <a
      href="/new?date={dateStr}"
      class="inline-flex items-center justify-center gap-2 h-9 md:h-10 px-2.5 md:px-5 bg-btn-primary-bg text-btn-primary-text rounded-md hover:bg-btn-primary-hover transition-colors shadow-sm text-sm font-medium whitespace-nowrap"
    >
      <Plus size={18} />
      <span class="hidden md:inline">Reserva</span>
    </a>
  </div>
</header>
