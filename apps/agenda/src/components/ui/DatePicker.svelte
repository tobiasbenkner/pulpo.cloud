<script>
  import { slide } from "svelte/transition";
  import { format, parse } from "date-fns";
  import { es } from "date-fns/locale";
  import Calendar from "./Calendar.svelte";

  export let id = "datepicker";
  export let label = "Seleccionar fecha";
  export let value = ""; // Format: yyyy-MM-dd
  export let placeholder = "Seleccionar fecha";
  export let locale = es;
  export let weekStartsOn = 1; // 0 = Sonntag, 1 = Montag

  let isOpen = false;
  let wrapperRef;

  // Ausgewähltes Datum als Date-Objekt
  $: selectedDate = value ? parse(value, "yyyy-MM-dd", new Date()) : null;

  // Formatierter Anzeigewert
  $: displayValue = selectedDate
    ? format(selectedDate, "dd.MM.yyyy", { locale })
    : "";

  function openPicker() {
    isOpen = true;
  }

  function handleSelect(date) {
    value = format(date, "yyyy-MM-dd");
    isOpen = false;
  }

  function handleClickOutside(event) {
    if (isOpen && wrapperRef && !wrapperRef.contains(event.target)) {
      isOpen = false;
    }
  }

  function handleKeydown(event) {
    if (event.key === "Escape" && isOpen) {
      isOpen = false;
    }
  }
</script>

<svelte:window on:click={handleClickOutside} on:keydown={handleKeydown} />

<div class="relative w-full max-w-xs" bind:this={wrapperRef}>
  {#if label}
    <label for={id} class="block text-sm font-medium text-fg-secondary mb-1">
      {label}
    </label>
  {/if}

  <input
    {id}
    type="text"
    readonly
    {placeholder}
    value={displayValue}
    on:click={openPicker}
    class="cursor-pointer w-full px-3 py-2.5 bg-input-bg border border-border-default rounded-sm text-sm text-fg placeholder-fg-muted focus:outline-none focus:ring-1 focus:ring-primary focus:bg-surface transition-all"
  />

  {#if isOpen}
    <!-- Backdrop (mobile) -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="fixed inset-0 bg-black/40 z-40 md:hidden"
      on:click|stopPropagation={() => (isOpen = false)}
    ></div>

    <div
      transition:slide={{ duration: 150 }}
      class="fixed bottom-0 left-0 right-0 z-50 md:absolute md:bottom-auto md:left-0 md:right-auto md:top-auto md:mt-2"
    >
      <div
        class="mx-auto max-w-sm md:max-w-none [&>div]:w-full [&>div]:rounded-t-xl [&>div]:rounded-b-none [&>div]:border-0 md:[&>div]:w-75 md:[&>div]:rounded-xl md:[&>div]:border md:[&>div]:border-picker-border"
      >
        <Calendar
          value={selectedDate}
          {locale}
          {weekStartsOn}
          onSelect={handleSelect}
        />
      </div>
    </div>
  {/if}
</div>
