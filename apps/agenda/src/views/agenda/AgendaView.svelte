<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { format } from "date-fns";
  import { useAgenda } from "./useAgenda";
  import AgendaHeader from "./AgendaHeader.svelte";
  import AgendaTable from "./AgendaTable.svelte";
  import { slide } from "svelte/transition";
  import { CircleAlert, WifiOff, X } from "lucide-svelte";

  const urlParams = new URLSearchParams(window.location.search);
  const initialDate = urlParams.get("date") || format(new Date(), "yyyy-MM-dd");

  const {
    date,
    filteredReservations,
    loading,
    isRefetching,
    showArrived,
    init,
    error,
    toggleArrived,
    cleanup,
    isOnline,
    setDate,
  } = useAgenda(initialDate);

  let unsubDateListener: () => void;

  onMount(() => {
    unsubDateListener = init();
  });

  onDestroy(() => {
    if (unsubDateListener) unsubDateListener();
    cleanup();
  });
</script>

<div class="space-y-8 animate-fade-in pb-20">
  <AgendaHeader
    dateStr={$date}
    onDateChange={(newDate) => setDate(newDate)}
    showArrived={$showArrived}
    isRefetching={$isRefetching}
    onToggleFilter={() => ($showArrived = !$showArrived)}
  />

  {#if !$isOnline}
    <div
      transition:slide={{ axis: "y", duration: 300 }}
      class="rounded-md border border-amber-200 bg-amber-50 p-4 flex items-center gap-3 shadow-sm"
      role="alert"
    >
      <div class="bg-amber-100 p-2 rounded-full text-amber-600">
        <WifiOff size={18} />
      </div>
      <div class="flex-1">
        <h3 class="text-sm font-semibold text-amber-900">
          Sin conexión a Internet
        </h3>
        <p class="text-sm text-amber-800/80 leading-snug">
          La agenda está en modo sin conexión. Los cambios no se guardarán. La
          conexión se restablecerá automáticamente.
        </p>
      </div>
    </div>
  {/if}

  <!-- ERROR FEEDBACK -->
  {#if $error}
    <div
      transition:slide={{ axis: "y", duration: 300 }}
      class="rounded-md border border-red-100 bg-red-50/80 p-4 flex items-start gap-3 shadow-sm backdrop-blur-sm"
    >
      <CircleAlert size={20} class="text-red-800 shrink-0 mt-0.5" />
      <div class="flex-1">
        <h3 class="text-sm font-medium text-red-900">Hinweis</h3>
        <p class="text-sm text-red-800/90 mt-0.5 leading-relaxed">
          {$error}
        </p>
      </div>

      <button
        on:click={() => ($error = null)}
        class="text-red-700 hover:text-red-900 transition-colors p-1"
        aria-label="Schließen"
      >
        <X size={16} />
      </button>
    </div>
  {/if}

  <AgendaTable
    reservations={$filteredReservations}
    loading={$loading}
    isRefetching={$isRefetching}
    showArrived={$showArrived}
    dateStr={$date}
    onToggleFilter={() => ($showArrived = !$showArrived)}
    onToggleArrived={(res) => toggleArrived(res)}
  />
</div>
