import { readItems } from "@directus/sdk";
import type { RestClient, DirectusClient } from "@directus/sdk";
import type { Schema } from "./types";

export async function getBlogCategories(
  client: DirectusClient<Schema> & RestClient<Schema>,
  category?: string,
) {
  return await client.request(
    readItems("posts_categories", {
      fields: ["*", "translations.*"],
    }),
  );
}

export async function getBlogPosts(
  client: DirectusClient<Schema> & RestClient<Schema>,
  category?: string,
) {
  const filter: any = { status: { _eq: "published" } };

  if (category) {
    filter.category = { _eq: category };
  }

  return await client.request(
    readItems("posts", {
      filter: filter,
      sort: ["-date"],
      fields: ["*", "category.*", "image.*"] as any,
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
      fields: ["*"],
      limit: 1,
    }),
  );

  return result[0] || null;
}

export async function getLanguages(
  client: DirectusClient<Schema> & RestClient<Schema>,
  tenant: string,
) {
  const result = await client.request(
    readItems("languages", {
      filter: {
        _and: [{ tenant: { _eq: tenant } }],
      },
      fields: ["*"],
    }),
  );

  return result[0] || null;
}
