import { DirectusFile } from "@directus/sdk";
import { Language } from "./types/language";

export interface BlogPostCategory {
  id: string;
  title: string;
  translations: BlogPostCategoryTranslation[];
}

export interface BlogPostCategoryTranslation {
  id: number;
  posts_categories_id: string;
  languages_id: string | Language;
  slug: string;
}

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
  posts_categories: BlogPostCategory[];
  reservations: Reservation[];
  reservations_settings: ReservationSetting[];
  directus_users: User[];
  languages: Language[];
}
