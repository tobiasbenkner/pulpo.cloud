import { readItems } from "@directus/sdk";
import type { RestClient, DirectusClient } from "@directus/sdk";
import type { BlogPost, BlogPostCategory, Schema } from "../types";
import { reduceTranslations } from "../i18n";

export async function getBlogCategories(
  client: DirectusClient<Schema> & RestClient<Schema>,
  categoryId?: string,
) {
  const filter: any = {};

  if (categoryId) {
    filter.category = { _eq: categoryId };
  }

  const categories = await client.request(
    readItems("posts_categories", {
      fields: ["*", "translations.*", "translations.languages_id.*"],
      filter: filter,
    }),
  );

  return categories.map((category) => {
    return {
      ...category,
      slug: reduceTranslations(category.translations, "slug"),
    } as BlogPostCategory;
  });
}

export async function getBlogPosts(
  client: DirectusClient<Schema> & RestClient<Schema>,
  categoryId?: string,
) {
  const filter: any = { status: { _eq: "published" } };

  if (categoryId) {
    filter.category = { _eq: categoryId };
  }

  const posts = await client.request(
    readItems("posts", {
      filter: filter,
      sort: ["-date"],
      fields: ["*", "image.*", "translations.*", "translations.languages_id.*"],
    }),
  );

  return posts.map((post) => {
    return {
      ...post,
      slug: reduceTranslations(post.translations, "slug"),
      title: reduceTranslations(post.translations, "title"),
      content: reduceTranslations(post.translations, "content"),
      excerpt: reduceTranslations(post.translations, "excerpt"),
      seo_title: reduceTranslations(post.translations, "seo.title"),
      seo_description: reduceTranslations(
        post.translations,
        "seo.meta_description",
      ),
    } as BlogPost;
  });
}
