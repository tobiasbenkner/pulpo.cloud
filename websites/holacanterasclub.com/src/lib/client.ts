import { DIRECTUS_TOKEN, DIRECTUS_URL } from "@/config";
import {
  createClient,
  getBlogPosts as _getBlogPosts,
  getBlogCategories as _getBlogCategories,
  getLanguages as _getLanguages,
} from "@pulpo/cms";

export const client = createClient(DIRECTUS_URL, DIRECTUS_TOKEN);
