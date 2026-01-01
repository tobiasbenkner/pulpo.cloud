import { defineCollection, z } from "astro:content";
import { getDefaultLanguage } from "./language";
import { readItems } from "@directus/sdk";
import { directus } from "../lib/directus";
import { convertI18n } from "./utils";
import { I18nSchema } from "../utils/t";

export const pages = defineCollection({
  loader: async () => {
    const tenantId = import.meta.env.TENANT_ID;

    if (!tenantId) {
      throw new Error("TENANT_ID environment variable is missing!");
    }

    const defaultLanguage = await getDefaultLanguage(tenantId);

    const pages = await directus.request(
      readItems("pages", {
        sort: ["sort"],
        fields: [
          "*",
          "blocks.*",
          "blocks.item.*",
          "blocks.item.image.*",
          "blocks.item.video.*",
          "blocks.item.translations.*",
          "blocks.item.translations.languages_id.*",
          "blocks.item.links.*",
          "blocks.item.links.actions_id.*",
          "blocks.item.links.actions_id.translations.*",
          "blocks.item.links.actions_id.translations.languages_id.*",
          "blocks.item.links.actions_id.page.*",
          "blocks.item.links.actions_id.page.slugs.*",
          "blocks.item.links.actions_id.page.slugs.languages_id.*",
          "seo.*",
          "seo.languages_id.*",
          "slugs.*",
          "slugs.languages_id.*",
        ],
        filter: {
          tenant: {
            _eq: tenantId,
          },
        },
      })
    );

    // let localVideoPath = null;
    //   if (prod.video_file) {
    //      const remoteUrl = `${process.env.DIRECTUS_URL}/assets/${prod.video_file.id}`;
    //      // Download starten und lokalen Pfad (/videos/xyz.mp4) erhalten
    //      localVideoPath = await downloadVideoToPublic(remoteUrl, prod.id, prod.video_file.filename_disk);
    //   }

    return pages.map((page) => {
      console.log(page.blocks);
      
      return {
        ...page,
        id: page.id,
        slug: convertI18n(page.slugs, "slug", defaultLanguage.code),
        seo: {
          title: convertI18n(page.seo, "seo.title", defaultLanguage.code),
          description: convertI18n(
            page.seo,
            "seo.meta_description",
            defaultLanguage.code
          ),
          og_image: convertI18n(page.seo, "seo.og_image", defaultLanguage.code),
        },
      };
    });
  },
  schema: z.object({
    id: z.string(),
    date_created: z.string(),
    date_updated: z.string().optional().nullable(),
    slug: I18nSchema,
    title: z.string().optional(),
    seo: z.object({
      title: I18nSchema,
      description: I18nSchema,
      og_image: I18nSchema,
    }),
    blocks: z.array(z.any()),
  }),
});
