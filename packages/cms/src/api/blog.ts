import { readItems } from "@directus/sdk";
import type { RestClient, DirectusClient } from "@directus/sdk";
import type { BlogPost, BlogPostCategory, Schema } from "../types";
import { reduceTranslations } from "../i18n";

export async function getBlogCategories(
  client: DirectusClient<Schema> & RestClient<Schema>,
  query?: { tenant: string; categoryId?: string },
) {
  const filter: any = {};
  if (query?.tenant) {
    filter.tenant = { _eq: query.tenant };
  }

  if (query?.categoryId) {
    filter.category = { _eq: query.categoryId };
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
      nav_label: reduceTranslations(category.translations, "nav_label"),
      title: reduceTranslations(category.translations, "title"),
      description: reduceTranslations(category.translations, "description"),
      seo_title: reduceTranslations(category.translations, "seo.title"),
      seo_description: reduceTranslations(
        category.translations,
        "seo.meta_description",
      ),
      seo_image: reduceTranslations(category.translations, "seo.og_image"),
    } as BlogPostCategory;
  });
}

export async function getBlogPosts(
  client: DirectusClient<Schema> & RestClient<Schema>,
  query?: { tenant: string; categoryId?: string },
) {
  const filter: any = { status: { _eq: "published" } };

  if (query?.tenant) {
    filter.tenant = { _eq: query.tenant };
  }

  if (query?.categoryId) {
    filter.category = { _eq: query.categoryId };
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
