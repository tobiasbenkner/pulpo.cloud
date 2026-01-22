export const DIRECTUS_URL = import.meta.env.PUBLIC_DIRECTUS_URL;
export const DIRECTUS_TOKEN = import.meta.env.DIRECTUS_TOKEN;
export const TENANT = import.meta.env.TENANT;

if (!DIRECTUS_URL) {
  throw new Error("PUBLIC_DIRECTUS_URL ist not defined in .env");
}

if (!DIRECTUS_TOKEN) {
  throw new Error("DIRECTUS_TOKEN ist not defined in .env");
}

if (!TENANT) {
  throw new Error("TENANT ist not defined in .env");
}
