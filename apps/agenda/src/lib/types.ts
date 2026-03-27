import type { RecordModel } from "pocketbase";

export interface User extends RecordModel {
  email: string;
  name: string;
  role: "admin" | "staff";
  avatar: string;
}

export interface Reservation extends RecordModel {
  date: string;
  time: string;
  name: string;
  person_count: string;
  contact: string;
  notes: string;
  arrived: boolean;
  user: string;
  expand?: {
    user?: User;
  };
}

export interface ReservationCreate {
  date: string;
  time: string;
  name?: string;
  person_count?: string;
  contact?: string;
  notes?: string;
  arrived?: boolean;
}

export interface ReservationTurn extends RecordModel {
  label: string;
  start: string;
  color: string;
}

export interface Zone extends RecordModel {
  label: string;
  sort: number;
}

export interface Table extends RecordModel {
  label: string;
  seats: number;
  x: number;
  y: number;
  shape: "round" | "rect";
  zone: string;
  expand?: {
    zone?: Zone;
  };
}
