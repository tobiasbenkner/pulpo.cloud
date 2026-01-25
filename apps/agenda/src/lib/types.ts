import type { DirectusFile } from "@directus/sdk";

export interface User {
  id: string;
  first_name: string;
  last_name: string;
  avatar?: DirectusFile;
}

export interface Reservation {
  id: string;
  date: string;
  time: string;
  name: string;
  contact: string;
  person_count?: number;
  notes?: string;
  arrived: boolean;
  user_created: string | User;
}

export interface AgendaSchema {
  reservations: Reservation[];
}
