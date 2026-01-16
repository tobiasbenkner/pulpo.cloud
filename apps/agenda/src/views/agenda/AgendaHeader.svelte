<script lang="ts">
  import { format, parseISO, subDays, addDays } from "date-fns";
  import { es } from "date-fns/locale";
  import {
    ChevronLeft,
    ChevronRight,
    Calendar as CalIcon,
    Plus,
    Eye,
    EyeOff,
    RefreshCw,
  } from "lucide-svelte";
  import { clsx } from "clsx";

  export let dateStr: string;
  export let showArrived: boolean;
  export let isRefetching = false;

  // Callback Prop statt dispatch
  export let onToggleFilter: () => void = () => {};
  export let onDateChange: (newDate: string) => void = () => {};

  $: displayDate = format(parseISO(dateStr), "EEEE, d. MMMM yyyy", {
    locale: es,
  });

  function changeDate(newDate: string) {
    onDateChange(newDate);
  }

  function goPrev() {
    changeDate(format(subDays(parseISO(dateStr), 1), "yyyy-MM-dd"));
  }

  function goNext() {
    changeDate(format(addDays(parseISO(dateStr), 1), "yyyy-MM-dd"));
  }
</script>

<header
  class="flex flex-col md:flex-row justify-between items-center gap-6 border-b border-border pb-6"
>
  <!-- Date Navigation -->
  <div
    class="flex items-center gap-4 bg-white px-4 py-2 rounded-lg shadow-sm border border-gray-100 relative"
  >
    <button
      on:click={goPrev}
      class="p-2 hover:bg-gray-100 rounded-md text-gray-600"
    >
      <ChevronLeft size={20} />
    </button>

    <div class="relative group">
      <input
        type="date"
        class="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
        value={dateStr}
        on:change={(e) => changeDate(e.currentTarget.value)}
      />
      <div class="text-center cursor-pointer min-w-[220px]">
        <span
          class="block text-xs uppercase tracking-widest text-gray-400 font-semibold mb-0.5"
          >Agenda</span
        >
        <div class="flex items-center justify-center gap-2">
          <h2 class="text-xl font-serif text-primary capitalize">
            {displayDate}
          </h2>
          {#if isRefetching}
            <RefreshCw size={14} class="animate-spin text-gray-400" />
          {:else}
            <CalIcon
              size={16}
              class="text-secondary opacity-0 group-hover:opacity-100 transition-opacity"
            />
          {/if}
        </div>
      </div>
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
          : "border-secondary/30 bg-secondary/5 text-secondary-dark font-medium"
      )}
    >
      {#if showArrived}
        <Eye size={16} /> <span>Ocultar llegadas</span>
      {:else}
        <EyeOff size={16} /> <span>Mostrar todas</span>
      {/if}
    </button>

    <a
      href="/reservations/new?date={dateStr}"
      class="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-sm hover:bg-gray-800 transition-all shadow-md shadow-gray-200 text-sm font-medium tracking-wide"
    >
      <Plus size={18} />
      <span>Nueva Reserva</span>
    </a>
  </div>
</header>
