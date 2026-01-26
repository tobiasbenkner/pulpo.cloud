<script>
  import { slide } from "svelte/transition";
  import { format, parse } from "date-fns";
  import { de } from "date-fns/locale";
  import Calendar from "./Calendar.svelte";

  export let id = "datepicker";
  export let label = "Datum auswählen";
  export let value = ""; // Format: yyyy-MM-dd
  export let placeholder = "Datum wählen";
  export let locale = de;
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
    <label for={id} class="block text-sm font-medium text-gray-700 mb-1">
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
    class="cursor-pointer w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 shadow-sm"
  />

  {#if isOpen}
    <div transition:slide={{ duration: 150 }} class="absolute z-50 mt-2">
      <Calendar
        value={selectedDate}
        {locale}
        {weekStartsOn}
        onSelect={handleSelect}
      />
    </div>
  {/if}
</div>
