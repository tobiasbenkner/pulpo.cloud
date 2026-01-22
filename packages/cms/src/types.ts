import { DirectusFile } from "@directus/sdk";

export interface BlogPost {
  id: number;
  status: "published" | "draft" | "archived";
  date: string;
  // slug: string;
  image: DirectusFile | null;
  category: string;
  // translations: BlogPostTranslation[];
}

export interface BlogPostTranslation {
  id: number;
  languages_code: string;
  title: string;
  content: string;
  excerpt: string;
}

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
  first_name: string | null;
  avatar: string | DirectusFile;
  tenant: string;
};

export interface Schema {
  posts: BlogPost[];
  posts_translations: BlogPostTranslation[];
  reservations: Reservation[];
  reservations_settings: ReservationSetting[];
  directus_users: User[];
}
