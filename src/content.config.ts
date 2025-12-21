import { defineCollection } from "astro:content";
import { getFileUrl } from "./utils/getFile";
import { ProductSchema } from "./collections/Product";

const products = defineCollection({
  loader: async () => {
    const records = 200;
    const response = await fetch(
      `https://pulpo.cloud/api/collections/products/records?perPage=${records}&expand=category`,
      {
        headers: {
          tenant: "mffp8qnmsnzuubx",
        },
      }
    );
    const json = await response.json();
    const items = json.items;
    // console.log(items[0]);
    return items.map((item: any) => ({
      ...item,
      allergies: item.allergies || [],
      photo: getFileUrl(item.id, item.photo, "products"),
      expand: {
        ...(item?.expand ?? {}),
        category: {
          ...(item?.expand?.category ?? {}),
          photo: getFileUrl(
            item?.expand?.category?.id,
            item?.expand?.category?.photo,
            "categories"
          ),
        },
      },
    }));
  },
  schema: ProductSchema,
});

export const collections = { products };
