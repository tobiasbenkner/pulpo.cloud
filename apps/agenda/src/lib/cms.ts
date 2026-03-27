import { pb } from "./pb";
import type { Reservation, ReservationCreate, ReservationTurn } from "./types";

export async function listReservations() {
  return await pb.collection("reservations").getFullList<Reservation>({
    sort: "time,name",
    expand: "user",
  });
}

export async function readReservation(id: string) {
  return await pb.collection("reservations").getOne<Reservation>(id, {
    expand: "user",
  });
}

export async function createReservation(data: ReservationCreate) {
  return await pb.collection("reservations").create<Reservation>(data);
}

export async function updateReservation(id: string, data: Partial<ReservationCreate>) {
  return await pb.collection("reservations").update<Reservation>(id, data);
}

export async function deleteReservation(id: string) {
  return await pb.collection("reservations").delete(id);
}

export async function toggleArrived(id: string, arrived: boolean) {
  return await pb.collection("reservations").update<Reservation>(id, { arrived });
}

export async function listReservationTurns() {
  return await pb.collection("reservations_turns").getFullList<ReservationTurn>({
    sort: "start",
  });
}
