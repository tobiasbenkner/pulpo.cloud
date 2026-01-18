<script lang="ts">
  import { deleteItem, updateItem } from "@directus/sdk";
  import { useDirectusRealtime } from "../../hooks/useDirectusRealtime";
  import { directus } from "../../lib/directus";
  import type { Reservation } from "../../lib/types";

  let reservations: Reservation[] = [];

  const realtime = useDirectusRealtime<Reservation>({
    collection: "reservations",
    event: undefined,
    query: {
      fields: ["*", "user.*"],
      sort: ["date"],
    },
    loadInitialData: true,
    uid: "reservations-realtime",
    onMessage: (message) => {
      console.log("Realtime Event empfangen:", message);

      if (message.uid?.includes("initial") && Array.isArray(message.data)) {
        console.log("Lade initiale Reservierungen:", message.data.length);
        const newReservations = Array.isArray(message.data)
          ? message.data
          : [message.data];

        reservations = [...reservations, ...newReservations].sort((a, b) => {
          const dateA = new Date(`${a.date} ${a.time}`);
          const dateB = new Date(`${b.date} ${b.time}`);
          return dateB.getTime() - dateA.getTime();
        });
      }

      // Handle CREATE Event
      if (message.event === "create" && message.data) {
        console.log("Neue Reservierung erstellt:", message.data);
        const newReservations = Array.isArray(message.data)
          ? message.data
          : [message.data];
        reservations = [...reservations, ...newReservations].sort((a, b) => {
          const dateA = new Date(`${a.date} ${a.time}`);
          const dateB = new Date(`${b.date} ${b.time}`);
          return dateB.getTime() - dateA.getTime();
        });
      }

      // Handle UPDATE Event
      if (message.event === "update" && message.data) {
        console.log("Reservierung aktualisiert:", message.data);
        const updatedReservations = Array.isArray(message.data)
          ? message.data
          : [message.data];

        reservations = reservations.map((reservation) => {
          const updated = updatedReservations.find(
            (u) => u.id === reservation.id
          );
          return updated || reservation;
        });
      }

      // Handle DELETE Event
      if (message.event === "delete" && message.data) {
        console.log("Reservierung gelöscht:", message.data);
        const deletedIds = Array.isArray(message.data)
          ? message.data
          : [message.data];
        reservations = reservations.filter((r) => !deletedIds.includes(r.id));
      }
    },
    onConnect: () => {
      console.log("✅ Verbunden mit Directus Realtime");
    },
    onDisconnect: () => {
      console.log("❌ Verbindung getrennt");
    },
    onError: (error) => {
      console.error("🔴 Realtime Fehler:", error);
    },
  });
  const { state, send } = realtime;

  // Hilfsfunktion zum Formatieren von Datum und Zeit
  function formatDateTime(date: string, time: string): string {
    const dateObj = new Date(`${date} ${time}`);
    return dateObj.toLocaleString("de-DE", {
      weekday: "short",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  // Hilfsfunktion zum Ermitteln des Namens
  function getUserName(
    user: string | { first_name?: string; last_name?: string }
  ): string {
    if (typeof user === "string") return "System";
    return (
      `${user.first_name || ""} ${user.last_name || ""}`.trim() || "Unbekannt"
    );
  }

  // Hilfsfunktion zum Markieren als angekommen
  async function toggleArrived(reservation: Reservation) {
    try {
      console.log("Sende Update via REST API für:", reservation.id);

      const updatedReservation = await directus.request(
        updateItem("reservations", reservation.id, {
          arrived: !reservation.arrived,
        })
      );

      console.log("✅ REST API Update erfolgreich:", updatedReservation);

      // Die Änderung wird automatisch über WebSocket gepusht
      // und durch onMessage empfangen
    } catch (error) {
      console.error("❌ Fehler beim REST API Update:", error);
    }
  }

  async function deleteReservation(id: string) {
    try {
      console.log("Lösche via REST API:", id);
      await directus.request(deleteItem("reservations", id));
      console.log("✅ REST API Delete erfolgreich");
    } catch (error) {
      console.error("❌ Fehler beim REST API Delete:", error);
    }
  }
</script>

<div class="max-w-7xl mx-auto p-5">
  <!-- Header mit Status -->
  <div class="flex justify-between items-center mb-6 flex-wrap gap-4">
    <h2 class="text-3xl font-bold text-gray-900">
      Reservierungen ({reservations.length})
    </h2>

    <div class="flex gap-3 items-center">
      {#if $state.reconnecting}
        <div
          class="px-4 py-2 rounded-full bg-orange-100 text-orange-700 text-sm font-medium animate-pulse"
        >
          🔄 Wiederverbindung... (Versuch {$state.reconnectAttempts})
        </div>
      {/if}

      {#if $state.error}
        <div
          class="px-4 py-2 rounded-full bg-red-100 text-red-700 text-sm font-medium"
        >
          ⚠️ {$state.error}
        </div>
      {/if}

      <div
        class="px-4 py-2 rounded-full text-sm font-medium {$state.connected &&
        $state.authenticated
          ? 'bg-green-100 text-green-700'
          : 'bg-red-100 text-red-700'}"
      >
        {#if $state.connected && $state.authenticated}
          🟢 Live-Updates aktiv
        {:else}
          🔴 Nicht verbunden
        {/if}
      </div>
    </div>
  </div>

  <!-- Reservierungen Grid -->
  {#if reservations.length === 0}
    <div class="text-center py-20">
      <p class="text-xl text-gray-400">Keine Reservierungen vorhanden</p>
    </div>
  {:else}
    <div class="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
      {#each reservations as reservation (reservation.id)}
        <div
          class="bg-white border-2 rounded-xl p-4 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 {reservation.arrived
            ? 'bg-green-50 border-green-500'
            : 'border-gray-200'}"
        >
          <!-- Card Header -->
          <div
            class="flex justify-between items-center mb-3 pb-3 border-b border-gray-200"
          >
            <div class="font-semibold text-gray-900">
              📅 {formatDateTime(reservation.date, reservation.time)}
            </div>
            <div
              class="text-xs px-3 py-1 rounded-full border {reservation.arrived
                ? 'bg-green-500 text-white border-green-500'
                : 'bg-white border-gray-200'}"
            >
              {reservation.arrived ? "✅ Angekommen" : "⏳ Erwartet"}
            </div>
          </div>

          <!-- Card Body -->
          <div class="mb-3 space-y-2">
            <div class="text-gray-700">
              <span class="font-semibold">Name:</span>
              {reservation.name}
            </div>
            <div class="text-gray-700">
              <span class="font-semibold">Kontakt:</span>
              {reservation.contact}
            </div>
            {#if reservation.observation}
              <div class="mt-3 p-2 bg-gray-100 rounded-lg italic text-gray-600">
                <span class="font-semibold not-italic">Bemerkung:</span>
                {reservation.observation}
              </div>
            {/if}
            <div class="mt-3 pt-2 border-t border-gray-200">
              <small class="text-gray-500"
                >Erstellt von: {getUserName(reservation.user_created)}</small
              >
            </div>
          </div>

          <!-- Card Actions -->
          <div class="flex gap-2 mt-3">
            <button
              class="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg transition-colors duration-200 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
              on:click={() => toggleArrived(reservation)}
              disabled={!$state.connected}
            >
              {reservation.arrived
                ? "Als nicht angekommen markieren"
                : "Als angekommen markieren"}
            </button>
            <button
              class="px-4 py-2 bg-red-500 text-white rounded-lg transition-colors duration-200 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
              on:click={() => deleteReservation(reservation.id)}
              disabled={!$state.connected}
              title="Löschen"
            >
              🗑️
            </button>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>
