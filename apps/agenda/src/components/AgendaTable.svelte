<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import {
    getDirectusClient,
    type Reservation,
    type ReservationSettingTurn,
  } from "../lib/directus";
  import { updateItem, deleteItem } from "@directus/sdk";
  import { jwtDecode } from "jwt-decode";

  export let token: string;
  export let initialData: Reservation[] = [];
  export let turns: ReservationSettingTurn[] = [];

  let reservations = initialData;
  const directusUrl = import.meta.env.PUBLIC_DIRECTUS_URL;
  let client = getDirectusClient(token);

  const decodedToken: { exp: number } = jwtDecode(token);
  const tokenExpiry = decodedToken.exp * 1000;

  let unsubscribe: (() => void) | null = null;
  let reloadTimer: ReturnType<typeof setTimeout> | null = null;

  function sortReservations(items: Reservation[]) {
    return items.sort((a, b) => a.time.localeCompare(b.time));
  }

  function getTurnColor(time: string): string {
    if (!turns || turns.length === 0) return "#10b981";
    const turn = [...turns].reverse().find((t) => t.start <= time);
    return turn ? turn.color : turns[0]?.color || "#ffffff";
  }

  function getAvatarUrl(user: any) {
    if (!user || !user.avatar) return null;
    return `${directusUrl}/assets/${user.avatar}?key=system-small-cover&access_token=${token}`;
  }

  async function connectWebSocket() {
    if (unsubscribe) {
      unsubscribe();
      unsubscribe = null;
    }

    const { subscription, unsubscribe: unsub } = await client.subscribe(
      "reservations",
      {
        query: { fields: ["*", { user: ["*"] }] }, // WICHTIG: user expanden für Avatar
      }
    );
    unsubscribe = unsub;

    for await (const message of subscription) {
      if (message.event === "create" || message.event === "update") {
        const item = message.data[0] as Reservation;

        if (message.event === "create") {
          reservations = sortReservations([...reservations, item]);
        } else {
          reservations = reservations.map((r) =>
            r.id === item.id ? { ...r, ...item } : r
          );
          if (item.time) reservations = sortReservations(reservations);
        }
      } else if (message.event === "delete") {
        const deletedIds = message.data as string[];
        reservations = reservations.filter((r) => !deletedIds.includes(r.id));
      }
    }
  }

  onMount(async () => {
    await connectWebSocket();
  });

  onDestroy(() => {
    if (unsubscribe) unsubscribe();
  });

  async function togglePresence(res: Reservation) {
    const previousState = res.was_there;
    reservations = reservations.map((r) =>
      r.id === res.id ? { ...r, was_there: !r.was_there } : r
    );

    try {
      await client.request(
        updateItem("reservations", res.id, { was_there: !previousState })
      );
    } catch (e) {
      console.error("Fehler beim Speichern:", e);
      reservations = reservations.map((r) =>
        r.id === res.id ? { ...r, was_there: previousState } : r
      );
    }
  }

  async function deleteReservation(id: string) {
    if (!confirm("Möchtest du diese Reservierung wirklich löschen?")) return;
    try {
      await client.request(deleteItem("reservations", id));
    } catch (e) {
      alert("Fehler");
    }
  }

  function navigateToEdit(id: string) {
    window.location.href = `/edit/${id}`;
  }
</script>

<div
  class="card bg-[#1e2330] shadow-xl border border-gray-700/50 text-gray-200"
>
  <div class="card-body p-0">
    {#if reservations.length === 0}
      <div class="text-center p-10 text-gray-500">
        <p>Keine Reservierungen vorhanden.</p>
      </div>
    {:else}
      <div class="overflow-x-auto">
        <table class="table w-full">
          <!-- Kopfzeile -->
          <thead
            class="bg-[#1e2330] border-b border-gray-700 text-gray-400 uppercase text-xs"
          >
            <tr>
              <th class="w-4"></th>
              <!-- Punkt -->
              <th class="font-normal pl-0">Hora</th>
              <th class="font-normal">Nombre</th>
              <th class="font-normal text-center w-10"
                ><svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  ><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"
                  ></path><circle cx="9" cy="7" r="4"></circle><path
                    d="M23 21v-2a4 4 0 0 0-3-3.87"
                  ></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg
                ></th
              >
              <th class="font-normal">Contacto</th>
              <th class="font-normal">Observación</th>
              <th class="text-right"></th>
              <!-- Actions -->
            </tr>
          </thead>

          <tbody>
            {#each reservations as res (res.id)}
              <!-- Doppelklick auf die Reihe toggelt Status -->
              <tr
                class="border-b border-gray-700/50 cursor-pointer select-none transition-colors
                       {res.was_there
                  ? 'bg-green-900/10 hover:bg-green-900/20 text-gray-500'
                  : 'hover:bg-white/5'}"
                on:dblclick={() => togglePresence(res)}
              >
                <!-- 1. Bunter Punkt (Status/Turn Indikator) -->
                <td class="pr-0">
                  <div
                    class="w-3 h-3 rounded-full shadow-sm"
                    style="background-color: {getTurnColor(res.time)}"
                  ></div>
                </td>

                <!-- 2. Uhrzeit -->
                <td
                  class="pl-2 font-mono text-base {res.was_there
                    ? 'line-through decoration-gray-600'
                    : ''}"
                >
                  {res.time.substring(0, 5)}
                </td>

                <!-- 3. Name -->
                <td
                  class="font-medium text-base {res.was_there
                    ? 'line-through decoration-gray-600'
                    : 'text-gray-100'}"
                >
                  {res.name}
                </td>

                <!-- 4. Pax (Personen) -->
                <td class="text-center font-medium">
                  {res.person_count}
                </td>

                <!-- 5. Kontakt -->
                <td class="text-sm opacity-80 font-mono">
                  {res.contact || ""}
                </td>

                <!-- 6. Notizen (Observación) -->
                <td class="text-sm max-w-xs truncate">
                  {res.notes || ""}
                </td>

                <!-- 7. Aktionen (Avatar, Edit, Delete) -->
                <td class="text-right">
                  <div class="flex items-center justify-end gap-3">
                    <!-- User Avatar -->
                    {#if res.user && res.user.avatar}
                      <div class="avatar">
                        <div class="w-8 h-8 rounded-full ring-1 ring-gray-600">
                          <img src={getAvatarUrl(res.user)} alt="User" />
                        </div>
                      </div>
                    {/if}

                    <!-- Edit Button -->
                    <button
                      class="btn btn-ghost btn-xs btn-square text-gray-400 hover:text-white"
                      on:click|stopPropagation={() => navigateToEdit(res.id)}
                      title="Bearbeiten"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        ><path
                          d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"
                        ></path></svg
                      >
                    </button>

                    <!-- Delete Button -->
                    <button
                      class="btn btn-ghost btn-xs btn-square text-gray-500 hover:text-red-400"
                      on:click|stopPropagation={() => deleteReservation(res.id)}
                      title="Löschen"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        ><polyline points="3 6 5 6 21 6"></polyline><path
                          d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
                        ></path><line x1="10" y1="11" x2="10" y2="17"
                        ></line><line x1="14" y1="11" x2="14" y2="17"
                        ></line></svg
                      >
                    </button>
                  </div>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </div>
</div>
