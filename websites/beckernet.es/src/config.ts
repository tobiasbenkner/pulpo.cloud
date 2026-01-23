import 'dotenv/config';

export const DIRECTUS_URL =
  process.env.DIRECTUS_URL || import.meta.env.DIRECTUS_URL;

export const DIRECTUS_TOKEN =
  process.env.DIRECTUS_TOKEN || import.meta.env.DIRECTUS_TOKEN;

export const TENANT = "17d1e5f7-7736-4628-8d21-5d08e18fb1dd";

if (!DIRECTUS_URL) {
  throw new Error("DIRECTUS_URL ist not defined in .env");
}

if (!DIRECTUS_TOKEN) {
  throw new Error("DIRECTUS_TOKEN ist not defined in .env");
}

if (!TENANT) {
  throw new Error("TENANT ist not defined in .env");
}
