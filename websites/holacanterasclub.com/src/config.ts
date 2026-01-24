import 'dotenv/config';

export const DIRECTUS_URL =
  process.env.DIRECTUS_URL || import.meta.env.DIRECTUS_URL;

export const DIRECTUS_TOKEN =
  process.env.DIRECTUS_TOKEN || import.meta.env.DIRECTUS_TOKEN;

export const TENANT = "fba29714-8ec3-4f21-bd7a-9889bbeb92a3";

if (!DIRECTUS_URL) {
  throw new Error("DIRECTUS_URL ist not defined in .env");
}

if (!DIRECTUS_TOKEN) {
  throw new Error("DIRECTUS_TOKEN ist not defined in .env");
}

if (!TENANT) {
  throw new Error("TENANT ist not defined in .env");
}
