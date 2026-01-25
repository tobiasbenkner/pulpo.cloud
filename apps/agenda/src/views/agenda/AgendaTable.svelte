<script lang="ts">
  import { CircleCheck, User as UserIcon, RefreshCw } from "lucide-svelte";
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
  class="bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col h-full max-w-7xl mx-auto"
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
          href={`/reservations/new?date=${dateStr}`}
          class="text-secondary hover:underline text-sm font-medium tracking-wide"
        >
          Crear la primera reserva
        </a>
      {/if}
    </div>
  {:else}
    <!-- Sticky Header -->
    <div class="shrink-0 bg-gray-50 border-b border-gray-200">
      <table class="w-full text-left text-sm">
        <thead>
          <tr class="text-gray-500 uppercase tracking-wider text-xs font-medium">
            <th class="px-6 py-4 font-normal w-24">Hora</th>
            <th class="px-6 py-4 font-normal">Nombre</th>
            <th class="px-6 py-4 font-normal">Contacto</th>
            <th class="px-6 py-4 font-normal w-1/3">Observación</th>
            <th class="px-6 py-4 font-normal text-right">Agente</th>
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
                  : "hover:bg-gray-50"
              )}
            >
              <td
                class="px-6 py-4 whitespace-nowrap font-medium font-serif text-gray-900 w-24"
              >
                {res.time.substring(0, 5)}
              </td>
              <td class="px-6 py-4">
                <div class="flex items-center gap-3">
                  {#if res.arrived}
                    <CircleCheck size={18} class="text-green-700" />
                  {/if}
                  <a
                    href={`/reservations/${res.id}/edit`}
                    class={clsx(
                      "font-medium transition-colors hover:underline decoration-primary/30 underline-offset-4",
                      res.arrived
                        ? "text-green-900 line-through decoration-green-900/30"
                        : "text-gray-900"
                    )}
                  >
                    {res.name}
                  </a>
                </div>
              </td>
              <td class="px-6 py-4 text-gray-500">{res.contact}</td>
              <td
                class="px-6 py-4 text-gray-500 italic truncate max-w-[300px] w-1/3"
                title={res.observation}
              >
                {res.observation || "-"}
              </td>
              <td class="px-6 py-4 text-right">
                <div class="flex justify-end">
                  {#if typeof res.user_created === "object" && res.user_created?.avatar}
                    {@const avatarId = typeof res.user_created.avatar === "object" ? res.user_created.avatar.id : res.user_created.avatar}
                    <img
                      src={`https://admin.pulpo.cloud/assets/${avatarId}?width=64&height=64&fit=cover`}
                      alt="Agent"
                      class="w-8 h-8 rounded-full border border-gray-200 object-cover"
                    />
                  {:else if typeof res.user_created === "object"}
                    <div
                      class="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs text-gray-500 border border-gray-200 font-medium"
                    >
                      {res.user_created?.first_name?.[0]?.toUpperCase() || "A"}
                    </div>
                  {:else}
                    <div
                      class="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-300 border border-gray-100"
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
  {/if}

  <!-- Sticky Footer -->
  <div
    class="shrink-0 px-6 py-3 bg-gray-50 border-t border-gray-200 text-xs text-gray-400 flex justify-between items-center"
  >
    <span>
      {#if isRefetching}
        <span class="flex items-center gap-1.5 text-secondary">
          <RefreshCw size={10} class="animate-spin" /> Actualizando...
        </span>
      {:else}
        Aktuell
      {/if}
    </span>
    <span>Doble clic para marcar llegada • {reservations.length} Reservas</span>
  </div>
</div>
