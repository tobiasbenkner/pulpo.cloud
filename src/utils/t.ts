import { z } from "astro/zod";

export const I18nSchema = z.object({
  value: z.string().nullable().optional(),
  translations: z.record(z.string(), z.string()).optional(),
});
export type I18n = z.infer<typeof I18nSchema>;

export function t(i18n: I18n | undefined | null, lang: string): string {
  if (!i18n) return "";
  if (!lang) return "";

  if (i18n.translations?.[lang]) {
    return i18n.translations[lang];
  }

  const baseLang = lang.split("-")[0];
  if (baseLang !== lang && i18n.translations?.[baseLang]) {
    return i18n.translations[baseLang];
  }

  return i18n.value ?? "";
}
