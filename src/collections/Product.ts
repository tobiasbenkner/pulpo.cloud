import { z } from "astro/zod";
import { I18nSchema } from "../utils/t";

export const CategorySchema = z.object({
  id: z.string(),
  name: I18nSchema,
  sort: z.number(),
  photo: z.string(),
});

export const ProductSchema = z.object({
  id: z.string(),
  name: I18nSchema,
  description: I18nSchema,
  note: I18nSchema,
  price: z.number(),
  photo: z.string(),
  allergies: z.array(z.string()),
  category: z.string(),
  expand: z.object({
    category: CategorySchema,
  }),
});

export type Category = z.infer<typeof CategorySchema>;
export type Product = z.infer<typeof ProductSchema>;
