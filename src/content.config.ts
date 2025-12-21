import { defineCollection } from "astro:content";
import { CategorySchema } from "./collections/Product";
import { getFileUrl } from "./utils/getFile";

const categories = defineCollection({
  loader: async () => {
    const response = await fetch(
      `https://pulpo.cloud/api/collections/categories/records?expand=products_via_category&sort=sort`,
      {
        headers: {
          tenant: "mffp8qnmsnzuubx",
        },
      }
    );
    const json = await response.json();

    return json.items.map((category: any) => {
      return {
        ...category,
        photo: getFileUrl(category.id, category.photo, "categories"),
        products: (category.expand?.products_via_category ?? []).map(
          (product: any) => {
            return {
              ...product,
              photo: getFileUrl(category.id, category.photo, "products"),
            };
          }
        ),
      };
    });
  },
  schema: CategorySchema,
});

export const collections = { categories };
