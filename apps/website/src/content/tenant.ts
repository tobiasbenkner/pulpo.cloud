import { z } from "astro/zod";
import { directus } from "../lib/directus";
import { defineCollection } from "astro:content";
import { readItem } from "@directus/sdk";
import { I18nSchema } from "../utils/t";
import { convertI18n } from "./utils";
import { getDefaultLanguage } from "./language";

const SOCIAL_KEYS = [
  "facebook",
  "instagram",
  "tiktok",
  "youtube",
  "whatsapp",
  "tripadvisor",
  "yelp",
  "restaurantguru",
] as const;

export const tenant = defineCollection({
  loader: async () => {
    const tenantId = import.meta.env.TENANT_ID;

    if (!tenantId) {
      throw new Error("TENANT_ID environment variable is missing!");
    }

    const defaultLanguage = await getDefaultLanguage(tenantId);

    const tenant = await directus.request(
      readItem("tenants", tenantId, {
        fields: [
          "*",
          "opening_hours.*",
          "opening_hours.translations.*",
          "opening_hours.translations.languages_id.*",
        ],
      })
    );
    return [
      {
        ...tenant,
        opening_hours: (tenant?.opening_hours ?? []).map((it: any) => {
          return {
            days_label: convertI18n(
              it?.translations,
              "days_label",
              defaultLanguage.code
            ),
            hours_text: convertI18n(
              it?.translations,
              "hours_text",
              defaultLanguage.code
            ),
            additional_info: convertI18n(
              it?.translations,
              "additional_info",
              defaultLanguage.code
            ),
          };
        }),
        id: "main",
      },
    ];
  },
  schema: z
    .object({
      id: z.string(),
      name: z.string(),
      street: z.string().optional(),
      postcode: z.string().optional(),
      city: z.string().optional(),
      maps: z.string().optional(),
      phone: z.string().optional(),
      whatsapp: z.string().optional(),
      facebook: z.string().optional(),
      instagram: z.string().optional(),
      youtube: z.string().optional(),
      tripadvisor: z.string().optional(),
      yelp: z.string().optional(),
      restaurantguru: z.string().optional(),
      tiktok: z.string().optional(),
      opening_hours: z.array(
        z.object({
          days_label: I18nSchema,
          hours_text: I18nSchema,
          additional_info: I18nSchema,
        })
      ),
    })
    .transform((data) => {
      const social_links = SOCIAL_KEYS.filter((key) => data[key]).map(
        (key) => ({
          name: key,
          url: data[key] as string,
        })
      );

      return {
        ...data,
        social_links,
      };
    }),
});
