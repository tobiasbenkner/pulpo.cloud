import { readItems, updateItem } from "@directus/sdk";
import type { RestClient, DirectusClient } from "@directus/sdk";
import type { Product, ProductCategory, Schema } from "../types";
import { reduceTranslations } from "../i18n";

type Client = DirectusClient<Schema> & RestClient<Schema>;

export async function updateProductStock(
  client: Client,
  productId: string,
  stock: number | null,
): Promise<void> {
  await client.request(updateItem("products", productId, { stock }));
}

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
        "products.tax_class.*",
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
        price_gross: product.price_gross,
        image: product.image,
        allergies: product.allergies ?? [],
        name: reduceTranslations(product.translations, "name"),
        description: reduceTranslations(product.translations, "description"),
        note: reduceTranslations(product.translations, "note"),
        category: product.category,
        stock: product.stock ?? null,
        tax_class: product.tax_class ?? null,
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
