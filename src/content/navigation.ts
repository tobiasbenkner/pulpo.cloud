import { defineCollection, z } from "astro:content";
import { directus } from "../lib/directus";
import { getDefaultLanguage } from "./language";
import { readItems } from "@directus/sdk";
import { I18nSchema } from "../utils/t";
import { convertI18n } from "./utils";

export const navigations = defineCollection({
  loader: async () => {
    const tenantId = import.meta.env.TENANT_ID;

    if (!tenantId) {
      throw new Error("TENANT_ID environment variable is missing!");
    }

    const defaultLanguage = await getDefaultLanguage(tenantId);

    const response = await directus.request(
      readItems("navigations", {
        fields: [
          "*",
          "navigation_items.*",
          "navigation_items.navigation_items_id.*",
          "navigation_items.navigation_items_id.translations.*",
          "navigation_items.navigation_items_id.translations.languages_id.*",
          "navigation_items.navigation_items_id.page.*",
        ],
        filter: {
          tenant: {
            _eq: tenantId,
          },
        },
      })
    );

    return response.map((it) => {
      return {
        ...it,
        id: it.id,
        navigation_items: (it.navigation_items ?? []).map((it: any) => {
          const navItem = it.navigation_items_id;
          return {
            ...navItem,
            id: it.id,
            label: convertI18n(
              navItem.translations,
              "label",
              defaultLanguage.code
            ),
          };
        }),
      };
    });
  },
  schema: ({ image }) =>
    z.object({
      id: z.string(),
      type: z.enum(["header", "footer"]),
      navigation_items: z.array(
        z.object({
          id: z.number(),
          url: z.string().optional().nullable(),
          label: I18nSchema,
          type: z.enum(["internal", "external"]).optional().nullable(),
          page: z
            .object({
              id: z.string(),
              slug: z.string().optional().nullable(),
            })
            .optional()
            .nullable(),
        })
      ),
    }),
});
