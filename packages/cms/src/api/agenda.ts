import {
  createItem,
  deleteItem,
  DirectusClient,
  RestClient,
  updateItem,
  readItems,
} from "@directus/sdk";
import {
  Schema,
  Reservation,
  ReservationTurn,
  ReservationCreate,
} from "../types";

const reservations = "reservations";
const reservations_turns = "reservations_turns";

export async function createReservation(
  client: DirectusClient<Schema> & RestClient<Schema>,
  reservation: ReservationCreate,
) {
  await client.request(createItem(reservations, reservation));
}

export async function toggleArrived(
  client: DirectusClient<Schema> & RestClient<Schema>,
  reservation: Reservation,
) {
  try {
    console.log("Sende Update via REST API für:", reservation.id);
    const updatedReservation = await client.request(
      updateItem(reservations, reservation.id, {
        arrived: !reservation.arrived,
      }),
    );

    console.log("✅ REST API Update erfolgreich:", updatedReservation);
  } catch (error) {
    console.error("❌ Fehler beim REST API Update:", error);
  }
}

export async function deleteReservation(
  client: DirectusClient<Schema> & RestClient<Schema>,
  id: string,
) {
  try {
    console.log("Lösche via REST API:", id);
    await client.request(deleteItem(reservations, id));
    console.log("✅ REST API Delete erfolgreich");
  } catch (error) {
    console.error("❌ Fehler beim REST API Delete:", error);
  }
}

export async function listReservations(
  client: DirectusClient<Schema> & RestClient<Schema>,
): Promise<Reservation[]> {
  return await client.request(readItems(reservations));
}

export async function listReservationTurns(
  client: DirectusClient<Schema> & RestClient<Schema>,
): Promise<ReservationTurn[]> {
  return await client.request(readItems(reservations_turns));
}
