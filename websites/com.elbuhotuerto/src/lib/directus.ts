import { createDirectus, rest, staticToken } from "@directus/sdk";

export const directus = createDirectus(import.meta.env.DIRECTUS_URL)
  .with(staticToken(import.meta.env.DIRECTUS_TOKEN))
  .with(rest());
