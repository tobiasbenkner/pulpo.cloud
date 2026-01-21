import { readItems } from "@directus/sdk";
import type { RestClient, DirectusClient } from "@directus/sdk";
import type { Schema } from "./types";

export async function getBlogPosts(
  client: DirectusClient<Schema> & RestClient<Schema>,
  lang: string,
) {
  return await client.request(
    readItems("posts", {
      filter: {
        status: { _eq: "published" },
      },
      sort: ["-date_created"],
      fields: [
        "id",
        "slug",
        "date_created",
        "image",
        {
          translations: ["title", "excerpt", "languages_code"],
        },
      ],
      deep: {
        translations: {
          _filter: {
            languages_code: { _eq: lang },
          },
        },
      },
    }),
  );
}

/**
 * Holt einen einzelnen Post anhand des Slugs und der Sprache.
 */
export async function getBlogPostBySlug(
  client: DirectusClient<Schema> & RestClient<Schema>,
  slug: string,
  lang: string,
) {
  const result = await client.request(
    readItems("posts", {
      filter: {
        _and: [{ status: { _eq: "published" } }, { slug: { _eq: slug } }],
      },
      fields: [
        "id",
        "slug",
        "date_created",
        "image",
        {
          translations: ["title", "content", "excerpt", "languages_code"],
        },
      ],
      deep: {
        translations: {
          _filter: {
            languages_code: { _eq: lang },
          },
        },
      },
      limit: 1,
    }),
  );

  return result[0] || null;
}
