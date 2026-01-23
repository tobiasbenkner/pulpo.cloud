import { defineCollection, z } from "astro:content";
import { directus } from "../lib/directus";
import { getDefaultLanguage } from "./language";
import { readItems } from "@directus/sdk";
import { I18nSchema } from "../utils/t";
import { convertI18n, getImage } from "./utils";
import { TENANT_ID } from "../config";

export const navigations = defineCollection({
  loader: async () => {
    const tenantId = TENANT_ID;

    if (!tenantId) {
      throw new Error("TENANT_ID environment variable is missing!");
    }

    const defaultLanguage = await getDefaultLanguage(tenantId);

    const response = await directus.request(
      readItems("navigations", {
        sort: ["sort"],
        fields: [
          "*",
          "image.*",
          "navigation_items.*",
          "navigation_items.navigation_items_id.*",
          "navigation_items.navigation_items_id.translations.*",
          "navigation_items.navigation_items_id.translations.languages_id.*",
          "navigation_items.navigation_items_id.page.*",
          "navigation_items.navigation_items_id.page.slugs.*",
          "navigation_items.navigation_items_id.page.slugs.languages_id.*",
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
        image: getImage(it.image),
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
            page: {
              ...navItem.page,
              slug: convertI18n(
                navItem.page.slugs,
                "slug",
                defaultLanguage.code
              ),
            },
          };
        }),
      };
    });
  },
  schema: ({ image }) =>
    z.object({
      id: z.string(),
      type: z.enum(["header", "footer"]),
      image: z
        .object({
          src: image(),
          title: z.string().nullable().optional(),
          width: z.number().optional(),
          height: z.number().optional(),
          focalPoint: z
            .object({
              x: z.number().nullable().optional(),
              y: z.number().nullable().optional(),
            })
            .optional(),
        })
        .nullable()
        .optional(),
      navigation_items: z.array(
        z.object({
          id: z.number(),
          url: z.string().optional().nullable(),
          label: I18nSchema,
          type: z.enum(["internal", "external"]).optional().nullable(),
          page: z
            .object({
              id: z.string(),
              slug: I18nSchema,
            })
            .optional()
            .nullable(),
        })
      ),
    }),
});
