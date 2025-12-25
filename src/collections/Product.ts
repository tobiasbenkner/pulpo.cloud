import { z } from "astro/zod";
import { I18nSchema } from "../utils/t";

export const ProductSchema = z.object({
  id: z.string(),
  name: I18nSchema,
  description: I18nSchema,
  note: I18nSchema,
  price: z.number(),
  image: z.string(),
  allergies: z.array(z.string()),
  category: z.string(),
});

export type Product = z.infer<typeof ProductSchema>;
