import { User } from "./user";

export type Reservation = {
  id: string;
  date: string;
  time: string;
  name: string;
  person_count: number;
  contact: string;
  notes: string;
  arrived: boolean;
  user: User;
};

export type ReservationCreate = Omit<Reservation, "id">;

export type ReservationTurn = {
  id: string;
  start: string;
  label: string;
  color: string;
};
