<script lang="ts">
  import { CircleCheck, User as UserIcon, RefreshCw, ChevronRight } from "lucide-svelte";
  import type { Reservation } from "../../lib/types";
  import { clsx } from "clsx";

  export let reservations: Reservation[];
  export let loading: boolean;
  export let isRefetching: boolean;
  export let showArrived: boolean;
  export let dateStr: string;

  export let onToggleFilter: () => void = () => {};
  export let onToggleArrived: (res: Reservation) => void = () => {};
</script>

<div
  class="bg-white md:rounded-lg md:border border-gray-200 md:shadow-sm flex flex-col h-full max-w-7xl mx-auto"
>
  {#if loading && !isRefetching}
    <div
      class="flex flex-col items-center justify-center flex-1 gap-3 text-gray-400"
    >
      <RefreshCw size={24} class="animate-spin" />
      <span class="text-sm tracking-wide uppercase">Cargando Agenda...</span>
    </div>
  {:else if reservations.length === 0}
    <div class="flex flex-col items-center justify-center flex-1">
      <p class="text-gray-500 mb-2 font-serif text-lg">
        No hay reservas visibles.
      </p>
      {#if !showArrived}
        <button
          on:click={onToggleFilter}
          class="text-secondary hover:underline text-sm font-medium"
        >
          Mostrar llegadas
        </button>
      {:else}
        <a
          href={`/new?date=${dateStr}`}
          class="text-secondary hover:underline text-sm font-medium tracking-wide"
        >
          Crear la primera reserva
        </a>
      {/if}
    </div>
  {:else}
    <!-- Mobile: Compact List -->
    <div class="flex-1 min-h-0 overflow-y-auto md:hidden">
      {#each reservations as res (res.id)}
        <a
          href={`/edit?id=${res.id}`}
          on:dblclick|preventDefault={() => onToggleArrived(res)}
          class={clsx(
            "flex items-center gap-2.5 px-3 py-2 border-b border-gray-100 active:bg-gray-50",
            res.arrived && "bg-green-50/30",
          )}
        >
          <!-- Time Badge -->
          <div
            class={clsx(
              "shrink-0 w-12 text-center py-1 rounded text-xs font-bold",
              res.arrived
                ? "bg-green-100 text-green-700"
                : "bg-gray-100 text-gray-700",
            )}
          >
            {res.time.substring(0, 5)}
          </div>

          <!-- Main Content -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-1.5">
              <span
                class={clsx(
                  "font-medium text-sm truncate",
                  res.arrived ? "text-green-800 line-through" : "text-gray-900",
                )}
              >
                {res.name}
              </span>
              <span class="text-xs text-gray-400">({res.person_count || "-"})</span>
              {#if res.arrived}
                <CircleCheck size={12} class="text-green-600 shrink-0" />
              {/if}
            </div>
            {#if res.contact}
              <p class="text-xs text-gray-500 truncate">{res.contact}</p>
            {/if}
            {#if res.notes}
              <p class="text-xs text-gray-400 italic leading-snug">{res.notes}</p>
            {/if}
          </div>

          <!-- Avatar -->
          {#if typeof res.user === "object" && res.user?.avatar}
            {@const avatarId = typeof res.user.avatar === "object" ? res.user.avatar.id : res.user.avatar}
            <img
              src={`https://admin.pulpo.cloud/assets/${avatarId}?width=56&height=56&fit=cover`}
              alt=""
              class="size-7 aspect-square rounded-full border border-gray-200 object-cover shrink-0"
            />
          {:else if typeof res.user === "object"}
            <div
              class="size-7 aspect-square rounded-full bg-gray-100 flex items-center justify-center text-[10px] text-gray-500 border border-gray-200 font-medium shrink-0"
            >
              {res.user?.first_name?.[0]?.toUpperCase() || "?"}
            </div>
          {/if}

          <!-- Chevron -->
          <ChevronRight size={14} class="text-gray-300 shrink-0" />
        </a>
      {/each}
    </div>

    <!-- Desktop: Table Layout -->
    <div class="hidden md:flex md:flex-col md:flex-1 md:min-h-0">
      <!-- Sticky Header -->
      <div class="shrink-0 bg-gray-50 border-b border-gray-200">
        <table class="w-full text-left text-sm">
          <thead>
            <tr class="text-gray-500 uppercase tracking-wider text-[11px] font-medium">
              <th class="px-4 py-2.5 font-normal w-16">Hora</th>
              <th class="px-3 py-2.5 font-normal w-12 text-center">Pax</th>
              <th class="px-4 py-2.5 font-normal">Nombre</th>
              <th class="px-4 py-2.5 font-normal">Contacto</th>
              <th class="px-4 py-2.5 font-normal">Notas</th>
              <th class="px-4 py-2.5 font-normal w-12"></th>
            </tr>
          </thead>
        </table>
      </div>

      <!-- Scrollable Body -->
      <div class="flex-1 min-h-0 overflow-y-auto">
        <table class="w-full text-left text-sm">
          <tbody class="divide-y divide-gray-100">
            {#each reservations as res (res.id)}
              <tr
                on:dblclick={() => onToggleArrived(res)}
                class={clsx(
                  "group transition-colors cursor-pointer select-none",
                  res.arrived
                    ? "bg-green-50/40 hover:bg-green-50/70"
                    : "hover:bg-gray-50",
                )}
              >
                <td
                  class="px-4 py-2 whitespace-nowrap font-medium font-serif text-gray-900 w-16"
                >
                  {res.time.substring(0, 5)}
                </td>
                <td class="px-3 py-2 w-12 text-center text-gray-600 text-xs">
                  {res.person_count || "-"}
                </td>
                <td class="px-4 py-2">
                  <div class="flex items-center gap-2">
                    {#if res.arrived}
                      <CircleCheck size={14} class="text-green-700 shrink-0" />
                    {/if}
                    <a
                      href={`/edit?id=${res.id}`}
                      class={clsx(
                        "font-medium text-sm transition-colors hover:underline decoration-primary/30 underline-offset-4",
                        res.arrived
                          ? "text-green-900 line-through decoration-green-900/30"
                          : "text-gray-900",
                      )}
                    >
                      {res.name}
                    </a>
                  </div>
                </td>
                <td class="px-4 py-2 text-gray-500 text-sm">{res.contact || "-"}</td>
                <td class="px-4 py-2 text-gray-400 text-xs italic leading-snug">
                  {res.notes || "-"}
                </td>
                <td class="px-4 py-2 w-12">
                  <div class="flex justify-end">
                    {#if typeof res.user === "object" && res.user?.avatar}
                      {@const avatarId = typeof res.user.avatar === "object" ? res.user.avatar.id : res.user.avatar}
                      <div class="w-6 h-6 shrink-0">
                        <img
                          src={`https://admin.pulpo.cloud/assets/${avatarId}?width=48&height=48&fit=cover`}
                          alt=""
                          class="w-full h-full rounded-full border border-gray-200 object-cover"
                        />
                      </div>
                    {:else if typeof res.user === "object"}
                      <div
                        class="w-6 h-6 shrink-0 rounded-full bg-gray-100 flex items-center justify-center text-[10px] text-gray-500 border border-gray-200 font-medium"
                      >
                        {res.user?.first_name?.[0]?.toUpperCase() || "?"}
                      </div>
                    {/if}
                  </div>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>
  {/if}

  <!-- Sticky Footer -->
  <div
    class="shrink-0 px-3 md:px-6 py-2 md:py-3 bg-gray-50 border-t border-gray-200 text-xs text-gray-400 flex justify-between items-center"
  >
    <span>
      {#if isRefetching}
        <span class="flex items-center gap-1.5 text-secondary">
          <RefreshCw size={10} class="animate-spin" /> Actualizando...
        </span>
      {:else}
        {reservations.length} reservas
      {/if}
    </span>
    <span class="hidden md:inline">Doble clic para marcar llegada</span>
  </div>
</div>
