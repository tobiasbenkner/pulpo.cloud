import { defineCollection, z } from "astro:content";
import { client } from "./lib/directus";
import { readItems } from "@directus/sdk";
import { TENANT_ID } from "./config";

const languages = defineCollection({
  loader: async () => {
    const tenantId = TENANT_ID;

    if (!tenantId) {
      throw new Error("TENANT_ID environment variable is missing!");
    }
    const languages = await client.request(
      readItems("languages", {
        sort: ["sort"],
        filter: {
          tenant: {
            _eq: tenantId,
          },
        },
      })
    );

    return languages.map((lang) => ({
      ...lang,
      id: lang.id,
    }));
  },
  schema: z.object({
    id: z.string(),
    code: z.string(),
    name: z.string(),
    flag: z.string(),
  }),
});

export const collections = {
  categories,
  languages,
  // tenant,
};
