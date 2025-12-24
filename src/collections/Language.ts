import { z } from "astro/zod";

export const LanguageSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  flag: z.string(),
});

export type Language = z.infer<typeof LanguageSchema>;
