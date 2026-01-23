import { DirectusFile } from "@directus/sdk";

export type ReducedTranslations = Record<string, string>;

export interface BlogPostCategory {
  id: string;
  title: ReducedTranslations;
  description: ReducedTranslations;
  slug: ReducedTranslations;
  nav_label: ReducedTranslations;
  seo_title: ReducedTranslations;
  seo_description: ReducedTranslations;
  seo_image: ReducedTranslations;
  posts: BlogPost[];
}

export interface BlogPost {
  id: string;
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
