import { User } from "./user";

export type Reservation = {
  id: string;
  status: string;
  date: string;
  time: string;
  name: string;
  person_count: number;
  contact: string;
  notes: string;
  was_there: boolean;
  tenant: string;
  user: string | User;
  arrived: boolean;
};

export type ReservationSettingTurn = {
  label: string;
  start: string;
  color: string;
};

export type ReservationSetting = {
  id: string;
  tenant: string;
  turns: ReservationSettingTurn[];
};