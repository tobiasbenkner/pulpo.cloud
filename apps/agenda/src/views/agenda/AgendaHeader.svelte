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

  $: displayDate = format(parseISO(dateStr), "EEEE, d. MMMM yyyy", {
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
  class="flex flex-col md:flex-row justify-between items-center gap-6 border-b border-border pb-6 max-w-7xl mx-auto w-full"
>
  <!-- Date Navigation -->
  <div
    class={clsx(
      "flex items-center gap-4 bg-white px-4 py-2 rounded-lg shadow-sm relative transition-all duration-300 border",
      isRefetching ? "border-primary/30 shadow-primary/10" : "border-gray-100",
    )}
  >
    <button
      on:click={goPrev}
      class="p-2 hover:bg-gray-100 rounded-md text-gray-600"
    >
      <ChevronLeft size={20} />
    </button>

    <div class="relative group" bind:this={calendarWrapperRef}>
      <button
        type="button"
        on:click|stopPropagation={toggleCalendar}
        class="text-center cursor-pointer min-w-55 focus:outline-none"
      >
        <span
          class="block text-xs uppercase tracking-widest text-gray-400 font-semibold mb-0.5"
        >
          Agenda
        </span>
        <h2 class="text-xl font-serif text-primary capitalize">
          {displayDate}
        </h2>
      </button>

      {#if isCalendarOpen}
        <div
          transition:slide={{ duration: 150 }}
          class="absolute top-full left-1/2 -translate-x-1/2 mt-3 z-50"
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
      class="p-2 hover:bg-gray-100 rounded-md text-gray-600"
    >
      <ChevronRight size={20} />
    </button>
  </div>

  <!-- Actions -->
  <div class="flex items-center gap-3">
    <button
      on:click={() => changeDate(format(new Date(), "yyyy-MM-dd"))}
      class="text-sm font-medium text-gray-500 hover:text-primary px-3 py-2"
    >
      Hoy
    </button>

    <button
      on:click={onToggleFilter}
      class={clsx(
        "flex items-center gap-2 px-4 py-2 rounded-md border text-sm transition-all shadow-sm",
        showArrived
          ? "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
          : "border-secondary/30 bg-secondary/5 text-secondary-dark font-medium",
      )}
    >
      {#if showArrived}
        <Eye size={16} /> <span>Ocultar llegadas</span>
      {:else}
        <EyeOff size={16} /> <span>Mostrar todas</span>
      {/if}
    </button>

    <a
      href="/new?date={dateStr}"
      class="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-sm hover:bg-gray-800 transition-all shadow-md shadow-gray-200 text-sm font-medium tracking-wide"
    >
      <Plus size={18} />
      <span>Nueva Reserva</span>
    </a>
  </div>
</header>
