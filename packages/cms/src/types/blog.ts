import { DirectusFile } from "@directus/sdk";
import { Language } from "./language";

export interface BlogPostCategory {
  id: string;
  title: string;
  translations: BlogPostCategoryTranslation[];
  posts: BlogPost[]
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
