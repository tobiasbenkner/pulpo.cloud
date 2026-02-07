<script lang="ts">
  import {
    Check,
    X,
    Pencil,
    RefreshCw,
    Sun,
    Moon,
    LayoutList,
    Columns3,
    Settings,
  } from "lucide-svelte";
  import type { Reservation, ReservationTurn } from "../../lib/types";
  import { clsx } from "clsx";
  import { onDestroy } from "svelte";
  import { theme, toggleTheme } from "../../stores/themeStore";

  export let reservations: Reservation[];
  export let loading: boolean;
  export let isRefetching: boolean;
  export let showArrived: boolean;
  export let dateStr: string;
  export let turns: ReservationTurn[] = [];

  export let viewMode: "all" | "tabs" = "all";
  export let selectedTurn: string | null = null;
  export let onSelectTurn: (turnId: string | null) => void = () => {};
  export let onToggleViewMode: () => void = () => {};

  export let onToggleFilter: () => void = () => {};
  export let onToggleArrived: (res: Reservation) => void = () => {};
  export let onRefreshTurns: () => void = () => {};

  // Turns sortiert nach Startzeit für Tab-Reihenfolge
  $: sortedTurns = [...turns].sort((a, b) => a.start.localeCompare(b.start));

  // --- Aktuelle Uhrzeit (für No-Show Erkennung) ---
  let now = new Date();
  const nowInterval = setInterval(() => (now = new Date()), 60_000);

  function isOverdue(res: Reservation): boolean {
    if (res.arrived) return false;
    const today = now.toISOString().substring(0, 10);
    if (dateStr > today) return false;
    if (dateStr < today) return true;
    return res.time.substring(0, 5) < now.toTimeString().substring(0, 5);
  }

  // --- Turn-Farbe ermitteln ---
  function getTurnColor(time: string): string | null {
    if (!turns.length || !time) return null;
    const t = time.substring(0, 5);
    const exact = turns.find((turn) => turn.start.substring(0, 5) === t);
    if (exact) return exact.color;
    const sorted = [...turns].sort((a, b) => a.start.localeCompare(b.start));
    for (let i = sorted.length - 1; i >= 0; i--) {
      if (sorted[i].start.substring(0, 5) <= t) return sorted[i].color;
    }
    return null;
  }

  // --- Double-Tap / Double-Click → arrived toggle ---
  let tapTimer: ReturnType<typeof setTimeout> | null = null;
  let lastTappedId: string | null = null;

  function handleRowClick(res: Reservation) {
    if (lastTappedId === res.id && tapTimer) {
      clearTimeout(tapTimer);
      tapTimer = null;
      lastTappedId = null;
      onToggleArrived(res);
    } else {
      if (tapTimer) clearTimeout(tapTimer);
      lastTappedId = res.id;
      tapTimer = setTimeout(() => {
        tapTimer = null;
        lastTappedId = null;
      }, 300);
    }
  }

  // --- Edit Button → Bearbeiten ---
  function handleEdit(e: Event, res: Reservation) {
    e.stopPropagation();
    window.location.href = `/edit?id=${res.id}`;
  }

  onDestroy(() => {
    if (tapTimer) clearTimeout(tapTimer);
    clearInterval(nowInterval);
  });

  // --- Settings Dropdown ---
  let settingsOpen = false;
  let settingsRef: HTMLDivElement;

  function handleClickOutside(e: MouseEvent) {
    if (
      settingsOpen &&
      settingsRef &&
      !settingsRef.contains(e.target as Node)
    ) {
      settingsOpen = false;
    }
  }
</script>

<svelte:window on:click={handleClickOutside} />

<div
  class="bg-surface md:rounded-lg md:border border-border-default md:shadow-sm flex flex-col h-full max-w-7xl mx-auto"
>
  <!-- Tab Bar (nur im Tabs-Modus) -->
  {#if viewMode === "tabs" && turns.length > 0}
    <div
      class="shrink-0 flex items-center gap-1.5 px-3 md:px-4 py-2 bg-surface border-b border-border-default overflow-x-auto no-scrollbar"
    >
      <button
        on:click={() => onSelectTurn(null)}
        class={clsx(
          "shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
          selectedTurn === null
            ? "bg-primary text-white"
            : "bg-surface-alt text-fg-muted hover:text-fg-secondary hover:bg-surface-hover",
        )}
      >
        Todos
      </button>
      {#each sortedTurns as turn (turn.id)}
        <button
          on:click={() => onSelectTurn(turn.id)}
          class={clsx(
            "shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
            selectedTurn === turn.id
              ? "text-white"
              : "bg-surface-alt text-fg-muted hover:text-fg-secondary hover:bg-surface-hover",
          )}
          style={selectedTurn === turn.id
            ? `background-color: ${turn.color}`
            : ""}
        >
          <span
            class="size-2 rounded-full shrink-0"
            style={`background-color: ${turn.color}`}
          ></span>
          {turn.label}
        </button>
      {/each}
    </div>
  {/if}

  {#if loading && !isRefetching}
    <div
      class="flex flex-col items-center justify-center flex-1 gap-3 text-fg-muted"
    >
      <RefreshCw size={24} class="animate-spin" />
      <span class="text-sm tracking-wide uppercase">Cargando Agenda...</span>
    </div>
  {:else if reservations.length === 0}
    <div class="flex flex-col items-center justify-center flex-1">
      <p class="text-fg-muted mb-2 font-serif text-lg">
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
        {@const turnColor = getTurnColor(res.time)}
        {@const overdue = isOverdue(res)}
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div
          on:click={() => handleRowClick(res)}
          on:keydown={() => {}}
          class="flex items-center gap-2.5 px-3 py-2 border-b border-border-light active:bg-surface-alt cursor-pointer select-none"
        >
          <!-- Turn Color Dot -->
          <div
            class={clsx(
              "shrink-0 size-2.5 rounded-full",
              !turnColor && "bg-fg-muted",
            )}
            style={turnColor ? `background-color: ${turnColor}` : ""}
          ></div>

          <!-- Time Badge -->
          <div
            class="shrink-0 w-12 text-center py-1 rounded text-xs font-bold bg-surface-alt text-fg-secondary"
          >
            {res.time.substring(0, 5)}
          </div>

          <!-- Status Icon -->
          <div class="shrink-0 w-4 flex items-center justify-center">
            {#if res.arrived}
              <Check size={14} class="text-arrived-check" strokeWidth={3} />
            {:else if overdue}
              <X size={14} class="text-error-icon" strokeWidth={3} />
            {/if}
          </div>

          <!-- Main Content -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-1.5">
              <span
                class={clsx(
                  "font-medium text-sm truncate",
                  res.arrived
                    ? "text-arrived-text"
                    : overdue
                      ? "text-error-icon"
                      : "text-fg",
                )}
              >
                {res.name}
              </span>
              <span class="text-xs text-fg-muted"
                >({res.person_count || "-"})</span
              >
            </div>
            {#if res.contact}
              <p class="text-xs text-fg-muted truncate">{res.contact}</p>
            {/if}
            {#if res.notes}
              <p class="text-xs text-fg-muted italic leading-snug">
                {res.notes}
              </p>
            {/if}
          </div>

          <!-- Avatar -->
          {#if typeof res.user === "object" && res.user?.avatar}
            {@const avatarId =
              typeof res.user.avatar === "object"
                ? res.user.avatar.id
                : res.user.avatar}
            <img
              src={`https://admin.pulpo.cloud/assets/${avatarId}?width=56&height=56&fit=cover`}
              alt=""
              class="size-7 aspect-square rounded-full border border-border-default object-cover shrink-0"
            />
          {:else if typeof res.user === "object"}
            <div
              class="size-7 aspect-square rounded-full bg-surface-alt flex items-center justify-center text-[10px] text-fg-muted border border-border-default font-medium shrink-0"
            >
              {res.user?.first_name?.[0]?.toUpperCase() || "?"}
            </div>
          {/if}

          <!-- Edit Button -->
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <div
            on:click={(e) => handleEdit(e, res)}
            on:keydown={() => {}}
            class="shrink-0 p-1.5 rounded-md text-fg-muted hover:text-fg-secondary hover:bg-surface-hover active:bg-surface-alt transition-colors"
            aria-label="Editar reserva"
          >
            <Pencil size={14} />
          </div>
        </div>
      {/each}
    </div>

    <!-- Desktop: Table Layout -->
    <div class="hidden md:flex md:flex-col md:flex-1 md:min-h-0">
      <!-- Sticky Header -->
      <div class="shrink-0 bg-surface-alt border-b border-border-default">
        <table class="w-full text-left text-sm">
          <thead>
            <tr
              class="text-fg-muted uppercase tracking-wider text-[11px] font-medium"
            >
              <th class="pl-4 pr-1 py-2.5 font-normal w-8"></th>
              <th class="px-3 py-2.5 font-normal w-16">Hora</th>
              <th class="px-3 py-2.5 font-normal w-12 text-center">Pax</th>
              <th class="px-1 py-2.5 font-normal w-8"></th>
              <th class="px-4 py-2.5 font-normal">Nombre</th>
              <th class="px-4 py-2.5 font-normal">Contacto</th>
              <th class="px-4 py-2.5 font-normal">Notas</th>
              <th class="px-2 py-2.5 font-normal w-10"></th>
              <th class="px-2 py-2.5 font-normal w-10"></th>
            </tr>
          </thead>
        </table>
      </div>

      <!-- Scrollable Body -->
      <div class="flex-1 min-h-0 overflow-y-auto">
        <table class="w-full text-left text-sm">
          <tbody class="divide-y divide-border-light">
            {#each reservations as res (res.id)}
              {@const turnColor = getTurnColor(res.time)}
              {@const overdue = isOverdue(res)}
              <!-- svelte-ignore a11y_no_static_element_interactions -->
              <tr
                on:click={() => handleRowClick(res)}
                on:keydown={() => {}}
                class="group transition-colors cursor-pointer select-none hover:bg-surface-hover"
              >
                <td class="pl-4 pr-1 py-2 w-8">
                  <div
                    class={clsx(
                      "size-2.5 rounded-full",
                      !turnColor && "bg-fg-muted",
                    )}
                    style={turnColor ? `background-color: ${turnColor}` : ""}
                  ></div>
                </td>
                <td
                  class="px-3 py-2 whitespace-nowrap font-medium font-serif text-fg w-16"
                >
                  {res.time.substring(0, 5)}
                </td>
                <td
                  class="px-3 py-2 w-12 text-center text-fg-secondary text-xs"
                >
                  {res.person_count || "-"}
                </td>
                <td class="px-1 py-2 w-8 text-center">
                  {#if res.arrived}
                    <Check
                      size={14}
                      class="text-arrived-check inline-block"
                      strokeWidth={3}
                    />
                  {:else if overdue}
                    <X
                      size={14}
                      class="text-error-icon inline-block"
                      strokeWidth={3}
                    />
                  {/if}
                </td>
                <td class="px-4 py-2">
                  <span
                    class={clsx(
                      "font-medium text-sm",
                      res.arrived
                        ? "text-arrived-text"
                        : overdue
                          ? "text-error-icon"
                          : "text-fg",
                    )}
                  >
                    {res.name}
                  </span>
                </td>
                <td class="px-4 py-2 text-fg-muted text-sm"
                  >{res.contact || "-"}</td
                >
                <td class="px-4 py-2 text-fg-muted text-xs italic leading-snug">
                  {res.notes || "-"}
                </td>
                <td class="px-2 py-2 w-10">
                  <div class="flex justify-center">
                    {#if typeof res.user === "object" && res.user?.avatar}
                      {@const avatarId =
                        typeof res.user.avatar === "object"
                          ? res.user.avatar.id
                          : res.user.avatar}
                      <img
                        src={`https://admin.pulpo.cloud/assets/${avatarId}?width=48&height=48&fit=cover`}
                        alt=""
                        class="w-6 h-6 rounded-full border border-border-default object-cover"
                      />
                    {:else if typeof res.user === "object"}
                      <div
                        class="w-6 h-6 rounded-full bg-surface-alt flex items-center justify-center text-[10px] text-fg-muted border border-border-default font-medium"
                      >
                        {res.user?.first_name?.[0]?.toUpperCase() || "?"}
                      </div>
                    {/if}
                  </div>
                </td>
                <td class="px-2 py-2 w-10">
                  <!-- svelte-ignore a11y_no_static_element_interactions -->
                  <div
                    on:click={(e) => handleEdit(e, res)}
                    on:keydown={() => {}}
                    class="flex justify-center"
                  >
                    <div
                      class="p-1.5 rounded-md text-fg-muted hover:text-fg-secondary hover:bg-surface-hover transition-colors cursor-pointer"
                      aria-label="Editar reserva"
                    >
                      <Pencil size={14} />
                    </div>
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
    class="shrink-0 px-3 md:px-6 py-2 md:py-3 bg-surface-alt border-t border-border-default text-xs text-fg-muted flex justify-between items-center"
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
    <span class="flex items-center gap-3">
      <span class="hidden md:inline">Doble clic para marcar llegada</span>
      <!-- Settings Dropdown -->
      <div class="relative" bind:this={settingsRef}>
        <button
          on:click={() => (settingsOpen = !settingsOpen)}
          class={clsx(
            "p-1.5 rounded-md transition-colors",
            settingsOpen
              ? "text-fg-secondary bg-surface-hover"
              : "text-fg-muted hover:text-fg-secondary",
          )}
          aria-label="Ajustes"
          aria-expanded={settingsOpen}
        >
          <Settings size={14} />
        </button>
        {#if settingsOpen}
          <div
            class="absolute bottom-full right-0 mb-1.5 w-48 bg-surface border border-border-default rounded-lg shadow-lg py-1 z-50"
          >
            <button
              on:click={() => {
                onToggleViewMode();
                settingsOpen = false;
              }}
              class="w-full flex items-center gap-2.5 px-3 py-2 text-left text-xs text-fg-secondary hover:bg-surface-hover transition-colors"
            >
              {#if viewMode === "tabs"}
                <LayoutList size={13} class="shrink-0 text-fg-muted" />
                <span>Vista general</span>
              {:else}
                <Columns3 size={13} class="shrink-0 text-fg-muted" />
                <span>Vista por turnos</span>
              {/if}
            </button>
            <button
              on:click={() => {
                toggleTheme();
                settingsOpen = false;
              }}
              class="w-full flex items-center gap-2.5 px-3 py-2 text-left text-xs text-fg-secondary hover:bg-surface-hover transition-colors"
            >
              {#if $theme === "dark"}
                <Sun size={13} class="shrink-0 text-fg-muted" />
                <span>Modo claro</span>
              {:else}
                <Moon size={13} class="shrink-0 text-fg-muted" />
                <span>Modo oscuro</span>
              {/if}
            </button>
            <div class="border-t border-border-light my-1"></div>
            <button
              on:click={() => {
                onRefreshTurns();
                settingsOpen = false;
              }}
              class="w-full flex items-center gap-2.5 px-3 py-2 text-left text-xs text-fg-secondary hover:bg-surface-hover transition-colors"
            >
              <RefreshCw size={13} class="shrink-0 text-fg-muted" />
              <span>Actualizar turnos</span>
            </button>
          </div>
        {/if}
      </div>
    </span>
  </div>
</div>
