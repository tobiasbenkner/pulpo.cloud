<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { getDirectusClient, type Reservation } from "../lib/directus";
  import { updateItem, deleteItem } from "@directus/sdk";

  export let token: string;
  export let tokenExpiry: number; // Unix timestamp in milliseconds
  export let initialData: Reservation[] = [];

  let reservations = initialData;
  let client = getDirectusClient(token);
  let unsubscribe: (() => void) | null = null;
  let reloadTimer: ReturnType<typeof setTimeout> | null = null; // Universal

  function sortReservations(items: Reservation[]) {
    return items.sort((a, b) => a.time.localeCompare(b.time));
  }

  async function connectWebSocket() {
    try {
      if (unsubscribe) {
        unsubscribe();
        unsubscribe = null;
      }

      const { subscription, unsubscribe: unsub } = await client.subscribe(
        "reservations",
        {
          query: {
            fields: ["*"],
          },
        }
      );

      unsubscribe = unsub;
      console.log("🔌 WebSocket verbunden");

      (async () => {
        try {
          for await (const message of subscription) {
            console.log("📨 WebSocket Event:", message);

            if (message.event === "init") {
              console.log("WebSocket initialisiert");
            } else if (message.event === "create") {
              const newRes = message.data[0] as Reservation;
              reservations = sortReservations([...reservations, newRes]);
            } else if (message.event === "update") {
              const updatedRes = message.data[0] as Reservation;
              reservations = reservations.map((r) =>
                r.id === updatedRes.id ? { ...r, ...updatedRes } : r
              );
              if (updatedRes.time) {
                reservations = sortReservations(reservations);
              }
            } else if (message.event === "delete") {
              const deletedIds = message.data as string[];
              reservations = reservations.filter(
                (r) => !deletedIds.includes(r.id)
              );
            }
          }
        } catch (error) {
          console.error("❌ WebSocket-Verbindung unterbrochen:", error);
          setTimeout(connectWebSocket, 5000);
        }
      })();
    } catch (error) {
      console.error("❌ Fehler beim WebSocket-Aufbau:", error);
      setTimeout(connectWebSocket, 5000);
    }
  }

  function scheduleReload() {
    const now = Date.now();
    const timeUntilExpiry = tokenExpiry - now;

    // Reload 1 Minute vor Ablauf
    const reloadIn = timeUntilExpiry - 60 * 1000;

    if (reloadIn > 0) {
      console.log(
        `⏰ Token läuft ab in ${Math.round(timeUntilExpiry / 1000 / 60)} Minuten`
      );
      console.log(
        `🔄 Reload geplant in ${Math.round(reloadIn / 1000 / 60)} Minuten`
      );

      reloadTimer = setTimeout(() => {
        console.log("🔄 Token läuft bald ab - Seite wird neu geladen...");
        window.location.reload();
      }, reloadIn);
    } else {
      // Token ist bereits abgelaufen oder läuft in <1 Minute ab - sofort reloaden
      console.log("⚠️ Token bereits abgelaufen - sofortiger Reload");
      window.location.reload();
    }
  }

  onMount(async () => {
    await connectWebSocket();
    scheduleReload();
  });

  onDestroy(() => {
    if (unsubscribe) {
      unsubscribe();
    }
    if (reloadTimer) {
      clearTimeout(reloadTimer);
    }
  });

  async function togglePresence(res: Reservation) {
    const previousState = res.was_there;
    reservations = reservations.map((r) =>
      r.id === res.id ? { ...r, was_there: !r.was_there } : r
    );

    try {
      await client.request(
        updateItem("reservations", res.id, {
          was_there: !previousState,
        })
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
      console.error("Fehler beim Löschen:", e);
      alert("Fehler beim Löschen.");
    }
  }
</script>

<div class="card bg-base-100 shadow-xl border border-base-200">
  <div class="card-body p-0">
    {#if reservations.length === 0}
      <div class="text-center p-10 text-base-content/50">
        <p>Keine Reservierungen für heute.</p>
      </div>
    {:else}
      <div class="overflow-x-auto">
        <table class="table w-full">
          <thead class="bg-base-200/50">
            <tr>
              <th class="w-20">Zeit</th>
              <th class="w-16 text-center">Pax</th>
              <th>Gast & Notizen</th>
              <th class="w-24 text-center">Status</th>
              <th class="w-16"></th>
            </tr>
          </thead>

          <tbody>
            {#each reservations as res (res.id)}
              <tr
                class="hover group transition-colors {res.was_there
                  ? 'opacity-50 bg-base-200/30'
                  : ''}"
              >
                <td class="font-mono font-bold text-lg align-top pt-4">
                  {res.time.substring(0, 5)}
                </td>

                <td class="align-top pt-4 text-center">
                  <div class="badge badge-ghost font-bold">
                    {res.person_count}
                  </div>
                </td>

                <td class="align-top pt-3">
                  <div class="font-bold text-base">{res.name}</div>

                  <div class="flex flex-col gap-1 mt-1">
                    {#if res.contact}
                      <div class="text-xs flex items-center gap-1 opacity-70">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          stroke-width="2"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          ><path
                            d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"
                          ></path></svg
                        >
                        {res.contact}
                      </div>
                    {/if}
                    {#if res.notes}
                      <div
                        class="text-xs italic opacity-70 text-warning-content bg-warning/10 p-1 rounded w-fit max-w-xs break-words"
                      >
                        {res.notes}
                      </div>
                    {/if}
                  </div>
                </td>

                <td class="text-center align-top pt-3">
                  <input
                    type="checkbox"
                    class="toggle toggle-success toggle-sm"
                    checked={res.was_there}
                    on:change={() => togglePresence(res)}
                  />
                </td>

                <td class="text-right align-top pt-2">
                  <button
                    class="btn btn-ghost btn-sm btn-square text-error opacity-0 group-hover:opacity-100 transition-opacity"
                    on:click={() => deleteReservation(res.id)}
                    title="Löschen"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      ><path d="M3 6h18"></path><path
                        d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"
                      ></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"
                      ></path></svg
                    >
                  </button>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </div>
</div>
