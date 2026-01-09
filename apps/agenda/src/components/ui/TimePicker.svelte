<script>
  import { slide } from "svelte/transition";

  export let id = "timepicker";
  export let label = "Zeit auswählen";
  export let value = "";

  const hours = Array.from({ length: 24 }, (_, i) =>
    i.toString().padStart(2, "0")
  );
  const minutes = [
    "00",
    "05",
    "10",
    "15",
    "20",
    "25",
    "30",
    "35",
    "40",
    "45",
    "50",
    "55",
  ];

  let isOpen = false;
  let selectedHour = null;
  let selectedMinute = null;
  let wrapperRef;

  // Wenn Value von außen kommt (z.B. aus Datenbank), initialisieren
  $: if (value && value.includes(":")) {
    const [h, m] = value.split(":");
    selectedHour = h;
    selectedMinute = m;
  }

  function openPicker() {
    isOpen = true;
  }

  function updateValue() {
    if (selectedHour && selectedMinute) {
      value = `${selectedHour}:${selectedMinute}`;
    }
  }

  function selectHour(h) {
    selectedHour = h;
    // UX: Wenn noch keine Minute gewählt ist, nehmen wir '00' als Startwert,
    // damit das Input-Feld sofort sinnvoll aussieht.
    if (!selectedMinute) {
      selectedMinute = "00";
    }
    updateValue();
  }

  function selectMinute(m) {
    selectedMinute = m;
    // Fallback: Sollte jemand zuerst Minute klicken, setzen wir Stunde auf 12 (oder aktuelle Stunde)
    if (!selectedHour) {
      selectedHour = new Date().getHours().toString().padStart(2, "0");
    }
    updateValue();
    // KEIN Auto-Close hier
  }

  function close() {
    isOpen = false;
  }

  function handleClickOutside(event) {
    if (isOpen && wrapperRef && !wrapperRef.contains(event.target)) {
      isOpen = false;
    }
  }
</script>

<svelte:window on:click={handleClickOutside} />

<div class="relative w-full max-w-xs" bind:this={wrapperRef}>
  {#if label}
    <label for={id} class="block text-sm font-medium text-gray-700 mb-1"
      >{label}</label
    >
  {/if}

  <input
    {id}
    type="text"
    readonly
    placeholder="--:--"
    bind:value
    on:click={openPicker}
    class="cursor-pointer w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 shadow-sm"
  />

  {#if isOpen}
    <div
      transition:slide={{ duration: 150 }}
      class="absolute z-50 mt-2 w-[300px] bg-gray-950 border border-gray-800 rounded-xl shadow-2xl p-4 text-white"
    >
      <!-- Stunden -->
      <div class="mb-4">
        <span
          class="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-2"
          >Stunden</span
        >
        <div class="grid grid-cols-6 gap-2">
          {#each hours as h}
            <button
              type="button"
              on:click|stopPropagation={() => selectHour(h)}
              class="aspect-square flex items-center justify-center text-sm rounded border transition-colors duration-100
              {selectedHour === h
                ? 'bg-white text-black border-white font-bold shadow-[0_0_10px_rgba(255,255,255,0.3)]'
                : 'border-gray-800 text-gray-300 hover:bg-gray-800 hover:border-gray-600'}"
            >
              {h}
            </button>
          {/each}
        </div>
      </div>

      <!-- Minuten -->
      <div class="mb-6">
        <span
          class="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-2"
          >Minuten</span
        >
        <div class="grid grid-cols-6 gap-2">
          {#each minutes as m}
            <button
              type="button"
              on:click|stopPropagation={() => selectMinute(m)}
              class="aspect-square flex items-center justify-center text-sm rounded border transition-colors duration-100
              {selectedMinute === m
                ? 'bg-white text-black border-white font-bold shadow-[0_0_10px_rgba(255,255,255,0.3)]'
                : 'border-gray-800 text-gray-300 hover:bg-gray-800 hover:border-gray-600'}"
            >
              {m}
            </button>
          {/each}
        </div>
      </div>

      <!-- OK Button -->
      <button
        type="button"
        on:click|stopPropagation={close}
        class="w-full bg-white text-black font-bold py-2 rounded-lg hover:bg-gray-200 transition-colors text-sm"
      >
        Ok
      </button>
    </div>
  {/if}
</div>
