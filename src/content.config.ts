import { z } from "astro/zod";
import { defineCollection } from "astro:content";
import { I18nSchema } from "./utils/t";

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
    return items;
  },
  schema: z.object({
    id: z.string(),
    name: I18nSchema,
    description: I18nSchema,
    note: I18nSchema,
    price: z.number(),
    photo: z.string(),
    allergies: z.array(z.string()),
    category: z.string(),
    expand: z.object({
      category: z.object({
        id: z.string(),
        name: I18nSchema,
        sort: z.number(),
        photo: z.string(),
      }),
    }),
  }),
});

export const collections = { products };
