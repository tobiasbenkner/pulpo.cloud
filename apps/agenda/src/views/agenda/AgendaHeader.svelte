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
  class="flex items-center justify-between gap-2 md:gap-6 pb-3 md:pb-6 border-b border-border max-w-7xl mx-auto w-full"
>
  <!-- Date Navigation -->
  <div
    class={clsx(
      "flex items-center gap-1 md:gap-4 bg-white px-2 md:px-4 py-1.5 md:py-2 rounded-lg shadow-sm relative transition-all duration-300 border",
      isRefetching ? "border-primary/30 shadow-primary/10" : "border-gray-100",
    )}
  >
    <button
      on:click={goPrev}
      class="p-1.5 md:p-2 hover:bg-gray-100 rounded-md text-gray-600 active:bg-gray-200"
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
          class="text-sm md:text-xl font-serif text-primary capitalize whitespace-nowrap"
        >
          <span class="md:hidden">{displayDateShort}</span>
          <span class="hidden md:inline">{displayDateFull}</span>
        </h2>
      </button>

      {#if isCalendarOpen}
        <div
          transition:slide={{ duration: 150 }}
          class="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50"
        >
          <Calendar
            value={selectedDate}
            locale={es}
            showTodayButton={false}
            onSelect={handleCalendarSelect}
          />
        </div>
      {/if}
    </div>

    <button
      on:click={goNext}
      class="p-1.5 md:p-2 hover:bg-gray-100 rounded-md text-gray-600 active:bg-gray-200"
    >
      <ChevronRight size={18} class="md:w-5 md:h-5" />
    </button>
  </div>

  <!-- Actions -->
  <div class="flex items-center gap-1 md:gap-3">
    <button
      on:click={() => changeDate(format(new Date(), "yyyy-MM-dd"))}
      class="text-xs md:text-sm font-medium text-gray-500 hover:text-primary px-2 py-1.5 md:py-2"
    >
      Hoy
    </button>

    <button
      on:click={onToggleFilter}
      class={clsx(
        "p-2 md:px-4 md:py-2 rounded-md border text-sm transition-all",
        showArrived
          ? "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
          : "border-secondary/30 bg-secondary/5 text-secondary-dark font-medium",
      )}
    >
      {#if showArrived}
        <Eye size={16} />
        <span class="hidden md:inline ml-2">Ocultar llegadas</span>
      {:else}
        <EyeOff size={16} />
        <span class="hidden md:inline ml-2">Mostrar todas</span>
      {/if}
    </button>

    <a
      href="/new?date={dateStr}"
      class="p-2 md:px-5 md:py-2.5 bg-primary text-white rounded-sm hover:bg-gray-800 transition-all shadow-md shadow-gray-200 text-sm font-medium"
    >
      <Plus size={18} />
      <span class="hidden md:inline ml-2">Nueva Reserva</span>
    </a>
  </div>
</header>
