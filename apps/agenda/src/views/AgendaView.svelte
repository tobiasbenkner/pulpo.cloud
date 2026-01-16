<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { directus } from "../lib/directus";
  import { readItems, updateItem } from "@directus/sdk";
  import { format, addDays, subDays, parseISO } from "date-fns";
  import { es } from "date-fns/locale";
  import {
    ChevronLeft,
    ChevronRight,
    Calendar as CalIcon,
    Plus,
    User as UserIcon,
    CheckCircle2,
    EyeOff,
    Eye,
  } from "lucide-svelte";
  import type { Reservation } from "../lib/types";
  import { clsx } from "clsx";
  import { twMerge } from "tailwind-merge";

  const urlParams = new URLSearchParams(window.location.search);
  const initialDate = urlParams.get("date") || format(new Date(), "yyyy-MM-dd");

  let currentDateStr = initialDate;
  let reservations: Reservation[] = [];
  let isLoading = true;
  let showArrived = true; // Toggle Status
  let unsubscribeRealtime: () => void;

  // --- Helpers ---
  function cn(...inputs: (string | undefined | null | false)[]) {
    return twMerge(clsx(inputs));
  }

  // --- Data Fetching ---
  async function fetchReservations() {
    isLoading = true;
    try {
      const result = await directus.request(
        readItems("reservations", {
          filter: {
            date: { _eq: currentDateStr },
          },
          sort: ["time", "name"],
          fields: ["*", "user_created.*"],
        })
      );
      reservations = result as Reservation[];
    } catch (error) {
      console.error("Fehler beim Laden:", error);
    } finally {
      isLoading = false;
    }
  }

  async function setupRealtime() {
    if (unsubscribeRealtime) {
      unsubscribeRealtime();
    }

    const { subscription, unsubscribe } = await directus.subscribe(
      "reservations",
      {
        query: {
          filter: {
            date: { _eq: currentDateStr },
          },
          fields: ["*", "user_created.*", "user_created.avatar.*"],
        },
      }
    );
    unsubscribeRealtime = unsubscribe;

    for await (const message of subscription) {
      fetchReservations();
    }
  }

  // --- Actions ---

  // Navigation
  function changeDate(newDate: string) {
    // Full Page Reload um URL State sauber zu halten (gemäß Anforderung "keine View Transitions / URL state")
    window.location.assign(`/?date=${newDate}`);
  }

  function goToday() {
    changeDate(format(new Date(), "yyyy-MM-dd"));
  }

  function goPrev() {
    const prev = subDays(parseISO(currentDateStr), 1);
    changeDate(format(prev, "yyyy-MM-dd"));
  }

  function goNext() {
    const next = addDays(parseISO(currentDateStr), 1);
    changeDate(format(next, "yyyy-MM-dd"));
  }

  // Mark Arrived (Doppelklick)
  async function toggleArrived(reservation: Reservation) {
    const newState = !reservation.arrived;

    // Optimistisches Update im UI
    reservations = reservations.map((r) =>
      r.id === reservation.id ? { ...r, arrived: newState } : r
    );

    try {
      await directus.request(
        updateItem("reservations", reservation.id, {
          arrived: newState,
        })
      );
    } catch (e) {
      // Rollback bei Fehler
      reservations = reservations.map((r) =>
        r.id === reservation.id ? { ...r, arrived: !newState } : r
      );
      alert("Fehler beim Aktualisieren");
    }
  }

  // Derived State für Filterung & Sortierung
  $: filteredReservations = reservations
    .filter((r) => (showArrived ? true : !r.arrived))
    .sort((a, b) => {
      // Sortieren nach Zeit, dann Name
      const timeCompare = a.time.localeCompare(b.time);
      if (timeCompare !== 0) return timeCompare;
      return a.name.localeCompare(b.name);
    });

  // Lifecycle
  onMount(() => {
    fetchReservations();
    setupRealtime();
  });

  onDestroy(() => {
    if (unsubscribeRealtime) unsubscribeRealtime();
  });

  // Datums-Formatierung für Header
  $: displayDate = format(parseISO(currentDateStr), "EEEE, d. MMMM yyyy", {
    locale: es,
  });
</script>

<div class="space-y-8 animate-fade-in pb-20">
  <!-- HEADER & NAVIGATION -->
  <header
    class="flex flex-col md:flex-row justify-between items-center gap-6 border-b border-border pb-6"
  >
    <div
      class="flex items-center gap-4 bg-white px-4 py-2 rounded-lg shadow-sm border border-gray-100"
    >
      <button
        on:click={goPrev}
        class="p-2 hover:bg-gray-100 rounded-md transition-colors text-gray-600"
        aria-label="Anterior"
      >
        <ChevronLeft size={20} />
      </button>

      <div class="relative group">
        <!-- Versteckter Date Picker über dem Text -->
        <input
          type="date"
          class="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
          value={currentDateStr}
          on:change={(e) => changeDate(e.currentTarget.value)}
        />
        <div class="text-center cursor-pointer">
          <span
            class="block text-xs uppercase tracking-widest text-gray-400 font-semibold"
            >Agenda</span
          >
          <div class="flex items-center gap-2">
            <h2
              class="text-xl font-serif text-primary capitalize min-w-[200px]"
            >
              {displayDate}
            </h2>
            <CalIcon
              size={16}
              class="text-secondary opacity-0 group-hover:opacity-100 transition-opacity"
            />
          </div>
        </div>
      </div>

      <button
        on:click={goNext}
        class="p-2 hover:bg-gray-100 rounded-md transition-colors text-gray-600"
        aria-label="Siguiente"
      >
        <ChevronRight size={20} />
      </button>
    </div>

    <div class="flex items-center gap-3">
      <button
        on:click={goToday}
        class="text-sm font-medium text-gray-500 hover:text-primary transition-colors px-3 py-2"
      >
        Hoy
      </button>

      <!-- Toggle Filter Button -->
      <button
        on:click={() => (showArrived = !showArrived)}
        class={cn(
          "flex items-center gap-2 px-4 py-2 rounded-md border text-sm transition-all",
          showArrived
            ? "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
            : "border-secondary/30 bg-secondary/10 text-secondary-dark"
        )}
      >
        {#if showArrived}
          <Eye size={16} /> <span>Ocultar llegadas</span>
        {:else}
          <EyeOff size={16} /> <span>Mostrar todas</span>
        {/if}
      </button>

      <!-- New Reservation Button (Stub) -->
      <a
        href="/reservations/new?date={currentDateStr}"
        class="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-sm hover:bg-gray-800 transition-all shadow-md shadow-gray-200 text-sm font-medium tracking-wide"
      >
        <Plus size={18} />
        <span>Nueva Reserva</span>
      </a>
    </div>
  </header>

  <!-- TABLE -->
  <div
    class="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden"
  >
    {#if isLoading && reservations.length === 0}
      <div class="p-12 text-center text-gray-400">Cargando datos...</div>
    {:else if filteredReservations.length === 0}
      <div class="p-12 text-center">
        <p class="text-gray-500 mb-2">No hay reservas para este día.</p>
        <button
          on:click={() =>
            (window.location.href = `/reservations/new?date=${currentDateStr}`)}
          class="text-secondary hover:underline text-sm font-serif"
          >Crear la primera reserva</button
        >
      </div>
    {:else}
      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead>
            <tr
              class="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase tracking-wider text-xs font-medium"
            >
              <th class="px-6 py-4 font-normal w-24">Hora</th>
              <th class="px-6 py-4 font-normal">Nombre</th>
              <th class="px-6 py-4 font-normal">Contacto</th>
              <th class="px-6 py-4 font-normal w-1/3">Observación</th>
              <th class="px-6 py-4 font-normal text-right">Agente</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            {#each filteredReservations as res (res.id)}
              <tr
                on:dblclick={() => toggleArrived(res)}
                class={cn(
                  "group transition-colors cursor-pointer select-none",
                  res.arrived
                    ? "bg-green-50/50 hover:bg-green-50"
                    : "hover:bg-gray-50"
                )}
              >
                <!-- Time -->
                <td
                  class="px-6 py-4 whitespace-nowrap font-medium font-serif text-gray-900"
                >
                  {res.time.substring(0, 5)}
                </td>

                <!-- Name + Arrived Status Indicator -->
                <td class="px-6 py-4">
                  <div class="flex items-center gap-2">
                    {#if res.arrived}
                      <CheckCircle2 size={16} class="text-green-600" />
                    {/if}
                    <span
                      class={cn(
                        "font-medium",
                        res.arrived ? "text-green-800" : "text-gray-900"
                      )}
                    >
                      {res.name}
                    </span>
                  </div>
                </td>

                <!-- Contact -->
                <td class="px-6 py-4 text-gray-500">
                  {res.contact}
                </td>

                <!-- Observation -->
                <td class="px-6 py-4 text-gray-500 italic">
                  {res.observation || "-"}
                </td>

                <!-- Avatar (Agent) -->
                <td class="px-6 py-4 text-right">
                  <div class="flex justify-end">
                    {#if typeof res.user_created === "object" && res.user_created?.avatar}
                      <!-- Directus Assets URL hier einsetzen -->
                      <img
                        src={`https://admin.pulpo.cloud/assets/${res.user_created.avatar}?width=32&height=32&fit=cover`}
                        alt="Agent"
                        class="w-8 h-8 rounded-full border border-gray-200"
                      />
                    {:else if typeof res.user_created === "object"}
                      <div
                        class="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs text-gray-500 border border-gray-200"
                        title={res.user_created?.first_name}
                      >
                        {res.user_created?.first_name?.[0] || "A"}
                      </div>
                    {:else}
                      <div
                        class="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-300"
                      >
                        <UserIcon size={14} />
                      </div>
                    {/if}
                  </div>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
      <div
        class="px-6 py-3 bg-gray-50 border-t border-gray-200 text-xs text-gray-400 text-right"
      >
        Doble clic para marcar llegada • {filteredReservations.length} Reservas
      </div>
    {/if}
  </div>
</div>
