import { createDirectus, rest, realtime, authentication } from "@directus/sdk";

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

export type User = {
  id: string;
  first_name: string;
  avatar: string;
  tenant: string;
};

export type Schema = {
  reservations: Reservation[];
  reservations_settings: ReservationSetting[];
  directus_users: User[];
};

export function getDirectusClient(token?: string) {
  const client = createDirectus<Schema>(import.meta.env.PUBLIC_DIRECTUS_URL)
    .with(rest())
    .with(realtime())
    .with(authentication());

  if (token) {
    client.setToken(token);
  }

  return client;
}
