// content.config.ts

import { z } from "astro/zod";
import { defineCollection } from "astro:content";

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
    price: z.number(),
    expand: z.object({
      category: z.object({
        id: z.string(),
      })
    })
  }),
});

export const collections = { products };
