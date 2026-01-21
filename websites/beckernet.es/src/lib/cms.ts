import { getAssetUrl, getDirectusClient } from "@pulpo/cms";

const DIRECTUS_URL = import.meta.env.PUBLIC_DIRECTUS_URL;
const DIRECTUS_TOKEN = import.meta.env.DIRECTUS_TOKEN;

if (!DIRECTUS_URL) {
  throw new Error("PUBLIC_DIRECTUS_URL is not defined in .env");
}

export const cms = getDirectusClient(DIRECTUS_URL, DIRECTUS_TOKEN);

export const imageUrl = (id: string, width = 800) =>
  getAssetUrl(id, DIRECTUS_URL, { width });
