import { createDirectus, realtime, rest } from "@directus/sdk";
import {
  listReservations as _listReservations,
  listReservationTurns as _listReservationTurns,
  createReservation as _createReservation,
  updatedReservation as _updateReservation,
  toggleArrived as _toggleArrived,
  readReservation as _readReservation,
  deleteReservation as _deleteReservation,
} from "@pulpo/cms";
import { directus } from "./directus";

export async function listReservations() {
  return await _listReservations(directus);
}

export async function readReservation(id: string) {
  return await _readReservation(directus, id);
}

export async function listReservationTurns() {
  return await _listReservationTurns(directus);
}
