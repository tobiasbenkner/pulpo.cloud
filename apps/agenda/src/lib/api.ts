import { deleteItem, readMe, updateItem } from "@directus/sdk";
import { directus } from "./directus";
import type { Reservation, User } from "./types";

export async function getProfile() {
  const user = (await directus.request(
    readMe({
      fields: ["*", "avatar.*"],
    })
  )) as User;
  return user;
}

export async function toggleArrived(reservation: Reservation) {
  try {
    console.log("Sende Update via REST API für:", reservation.id);

    const updatedReservation = await directus.request(
      updateItem("reservations", reservation.id, {
        arrived: !reservation.arrived,
      })
    );

    console.log("✅ REST API Update erfolgreich:", updatedReservation);
  } catch (error) {
    console.error("❌ Fehler beim REST API Update:", error);
  }
}

export async function deleteReservation(id: string) {
  try {
    console.log("Lösche via REST API:", id);
    await directus.request(deleteItem("reservations", id));
    console.log("✅ REST API Delete erfolgreich");
  } catch (error) {
    console.error("❌ Fehler beim REST API Delete:", error);
  }
}
