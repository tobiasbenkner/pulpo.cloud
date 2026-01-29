import { readItems } from "@directus/sdk";
import {  client } from "../lib/directus";

export async function getDefaultLanguage(tenantId: string) {
  const languages = await client.request(
    readItems("languages", {
      sort: ["sort"],
      filter: {
        tenant: {
          _eq: tenantId,
        },
      },
      limit: 1,
    })
  );

  return languages[0] || null;
}