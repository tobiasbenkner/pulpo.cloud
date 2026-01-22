import { readItems } from "@directus/sdk";
import type { RestClient, DirectusClient } from "@directus/sdk";
import type { Schema } from "../types";

export async function getBlogCategories(
  client: DirectusClient<Schema> & RestClient<Schema>,
  categoryId?: string,
) {
  const filter: any = {};

  if (categoryId) {
    filter.category = { _eq: categoryId };
  }

  return await client.request(
    readItems("posts_categories", {
      fields: ["*", "translations.*"] as any,
      filter: filter,
    }),
  );
}

export async function getBlogPosts(
  client: DirectusClient<Schema> & RestClient<Schema>,
  categoryId?: string,
) {
  const filter: any = { status: { _eq: "published" } };

  if (categoryId) {
    filter.category = { _eq: categoryId };
  }

  return await client.request(
    readItems("posts", {
      filter: filter,
      sort: ["-date"],
      fields: ["*", "category.*", "image.*"] as any,
    }),
  );
}
