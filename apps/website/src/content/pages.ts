import { defineCollection, z } from "astro:content";
import { readItems } from "@directus/sdk";

// Deine eigenen Imports (Pfade ggf. anpassen)
import { directus } from "../lib/directus";
import { getDefaultLanguage } from "./language";
import { convertI18n } from "./utils";
import { I18nSchema } from "../utils/t";
import { downloadVideoToPublic } from "../utils/downloadVideo";

async function manageVideo(video: any) {
  let localVideoPath = null;

  if (video && video.id) {
    const directusUrl =
      import.meta.env.DIRECTUS_URL || process.env.DIRECTUS_URL;

    if (!directusUrl) {
      console.warn("Warnung: DIRECTUS_URL ist nicht definiert.");
      return null;
    }

    const remoteUrl = `${directusUrl}/assets/${video.id}`;
    localVideoPath = await downloadVideoToPublic(
      remoteUrl,
      video.id,
      video.filename_disk
    );
  }
  return localVideoPath;
}

export const pages = defineCollection({
  loader: async () => {
    const tenantId = import.meta.env.TENANT_ID;

    if (!tenantId) {
      throw new Error("TENANT_ID environment variable is missing!");
    }

    const defaultLanguage = await getDefaultLanguage(tenantId);

    const rawPages = await directus.request(
      readItems("pages", {
        sort: ["sort"],
        fields: [
          "*",
          "blocks.*",
          "blocks.item.*",
          "blocks.item.image.*",
          "blocks.item.images.*",
          "blocks.item.images.directus_files_id.*",
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

    const processedPages = [];
    for (const page of rawPages) {
      const processedBlocks = [];
      if (page.blocks && Array.isArray(page.blocks)) {
        for (const block of page.blocks) {
          const item = block.item;
          let processedVideoPath = null;
          if (item && item.video) {
            processedVideoPath = await manageVideo(item.video);
          }

          processedBlocks.push({
            ...block,
            item: {
              ...item,
              video: processedVideoPath,
            },
          });
        }
      }

      processedPages.push({
        ...page,
        id: page.id,
        blocks: processedBlocks,
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
      });
    }

    return processedPages;
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
