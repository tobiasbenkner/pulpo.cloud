<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { format } from "date-fns";
  import { useAgenda } from "./useAgenda";
  import AgendaHeader from "./AgendaHeader.svelte";
  import AgendaTable from "./AgendaTable.svelte";

  const urlParams = new URLSearchParams(window.location.search);
  const initialDate = urlParams.get("date") || format(new Date(), "yyyy-MM-dd");

  const {
    date,
    filteredReservations,
    loading,
    isRefetching,
    showArrived,
    fetchData,
    initRealtime,
    toggleArrived,
    cleanup,
  } = useAgenda(initialDate);

  onMount(() => {
    fetchData();
    initRealtime();
  });

  onDestroy(() => {
    cleanup();
  });
</script>

<div class="space-y-8 animate-fade-in pb-20">
  <AgendaHeader
    dateStr={$date}
    showArrived={$showArrived}
    isRefetching={$isRefetching}
    onToggleFilter={() => ($showArrived = !$showArrived)}
  />

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
