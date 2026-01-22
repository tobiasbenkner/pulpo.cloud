import {
  createClient,
  getAssetUrl,
  getBlogPosts as _getBlogPosts,
  getBlogPostBySlug as _getBlogPostBySlug,
} from "@pulpo/cms";

const DIRECTUS_URL = import.meta.env.PUBLIC_DIRECTUS_URL;
const DIRECTUS_TOKEN = import.meta.env.DIRECTUS_TOKEN;

if (!DIRECTUS_URL) {
  throw new Error("PUBLIC_DIRECTUS_URL ist not defined in .env");
}

if (!DIRECTUS_TOKEN) {
  throw new Error("DIRECTUS_TOKEN ist not defined in .env");
}

const client = createClient(DIRECTUS_URL, DIRECTUS_TOKEN);

export const imageUrl = (id: string, width = 800) =>
  getAssetUrl(id, DIRECTUS_URL, { width });

export const getPosts = async (lang: string, category?: string) => {
  return await _getBlogPosts(client, lang, category);
};

export const getPost = async (slug: string, lang: string) => {
  return await _getBlogPostBySlug(client, slug, lang);
};
