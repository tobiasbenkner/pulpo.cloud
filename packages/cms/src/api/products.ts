import { readItems } from "@directus/sdk";
import type { RestClient, DirectusClient } from "@directus/sdk";
import type { Product, ProductCategory, Schema } from "../types";
import { reduceTranslations } from "../i18n";

export async function getCategoriesWithProducts(
  client: DirectusClient<Schema> & RestClient<Schema>,
  query?: { tenant: string },
) {
  const filter: any = {};
  if (query?.tenant) {
    filter.tenant = { _eq: query.tenant };
  }

  const categories = await client.request(
    readItems("categories", {
      fields: [
        "*",
        "image.*",
        "translations.*",
        "translations.languages_id.*",
        "products.*",
        "products.translations.*",
        "products.translations.languages_id.*",
        "products.image.*",
      ],
      filter: filter,
    }),
  );

  return categories.map((category) => {
    const products: Product[] = category.products.map((product: any) => {
      return {
        id: product.id,
        sort: product.sort,
        price: product.price,
        image: product.image,
        allergies: product.allergies ?? [],
        name: reduceTranslations(product.translations, "name"),
        description: reduceTranslations(product.translations, "description"),
        note: reduceTranslations(product.translations, "note"),
        category: product.category,
      } as Product;
    });

    return {
      id: category.id,
      name: reduceTranslations(category.translations, "name"),
      description: reduceTranslations(category.translations, "description"),
      products: products,
      sort: category.sort,
      image: category.image,
    } as ProductCategory;
  });
}
