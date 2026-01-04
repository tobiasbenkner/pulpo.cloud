<script lang="ts">
  import { format, addDays, parseISO } from "date-fns";

  export let currentDateString: string;

  $: currentDate = parseISO(currentDateString);
  $: displayDate = format(currentDate, "dd.MM.yy");

  function changeDate(days: number) {
    const newDate = addDays(currentDate, days);
    const newDateString = format(newDate, "yyyy-MM-dd");
    window.location.search = `?date=${newDateString}`;
  }

  function goToday() {
    const todayString = format(new Date(), "yyyy-MM-dd");
    window.location.search = `?date=${todayString}`;
  }

  function goToAddPage() {
    window.location.href = `/add?date=${currentDateString}`;
  }
</script>

<div
  class="navbar bg-[#1e2330] p-4 sticky top-0 z-20 border-b border-gray-700/50"
>
  <div class="navbar-center mx-auto flex items-center gap-4">
    <button
      class="btn btn-square bg-gray-700/50 hover:bg-gray-600/50 border-0"
      on:click={() => changeDate(-1)}
      title="previous date"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        ><polyline points="15 18 9 12 15 6"></polyline></svg
      >
    </button>

    <!-- Datumsanzeige & Heute Button -->
    <div class="flex items-center gap-4 bg-gray-700/50 rounded-box p-1">
      <span
        class="font-mono text-xl w-32 text-center select-none cursor-pointer hover:text-white"
        title="Kalender öffnen (TODO)"
      >
        {displayDate}
      </span>
      <button
        class="btn btn-sm bg-gray-600/50 hover:bg-gray-500/50 border-0"
        on:click={goToday}
      >
        Hoy
      </button>
    </div>

    <!-- Hinzufügen Button -->
    <button
      class="btn btn-square bg-gray-700/50 hover:bg-gray-600/50 border-0"
      on:click={goToAddPage}
      title="add reservation"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        ><line x1="12" y1="5" x2="12" y2="19"></line><line
          x1="5"
          y1="12"
          x2="19"
          y2="12"
        ></line></svg
      >
    </button>

    <!-- Vorwärts Button -->
    <button
      class="btn btn-square bg-gray-700/50 hover:bg-gray-600/50 border-0"
      on:click={() => changeDate(1)}
      title="next date"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        ><polyline points="9 18 15 12 9 6"></polyline></svg
      >
    </button>
  </div>
</div>
