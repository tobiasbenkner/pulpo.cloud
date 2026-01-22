import {
  createClient,
  getAssetUrl,
  getBlogPosts as _getBlogPosts,
  getBlogCategories as _getBlogCategories,
  getLanguages as _getLanguages,
} from "@pulpo/cms";

const DIRECTUS_URL = import.meta.env.PUBLIC_DIRECTUS_URL;
const DIRECTUS_TOKEN = import.meta.env.DIRECTUS_TOKEN;
const TENANT = import.meta.env.TENANT;

if (!DIRECTUS_URL) {
  throw new Error("PUBLIC_DIRECTUS_URL ist not defined in .env");
}

if (!DIRECTUS_TOKEN) {
  throw new Error("DIRECTUS_TOKEN ist not defined in .env");
}

const client = createClient(DIRECTUS_URL, DIRECTUS_TOKEN);

export const imageUrl = (id: string, width = 800) =>
  getAssetUrl(id, DIRECTUS_URL, { width });

export const getBlogCategories = async () => {
  return await _getBlogCategories(client);
};

export const getPosts = async (categoryId?: string) => {
  return await _getBlogPosts(client, categoryId);
};

export const getLanguages = async () => {
  return await _getLanguages(client, TENANT);
};
