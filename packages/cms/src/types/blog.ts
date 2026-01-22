import { DirectusFile } from "@directus/sdk";
import { Language } from "./language";

export type ReducedTranslations = Record<string, string>;

export interface BlogPostCategory {
  id: string;
  title: string;
  slug: ReducedTranslations;
  nav_label: ReducedTranslations;
  posts: BlogPost[];
}

export interface BlogPost {
  id: number;
  status: "published" | "draft" | "archived";
  date: string;
  image: DirectusFile | null;
  category: string;
  slug: ReducedTranslations;
  title: ReducedTranslations;
  content: ReducedTranslations;
  excerpt: ReducedTranslations;
  seo_title: ReducedTranslations;
  seo_description: ReducedTranslations;
}
