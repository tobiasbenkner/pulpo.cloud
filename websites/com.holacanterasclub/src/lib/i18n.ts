import { createResolver, getOpenGraphLocale } from "@pulpo/i18n";

export const languages = ["es", "en"] as const;
export const defaultLang = "es" as const;
export type Language = (typeof languages)[number];

export const openGraphLocales: Record<Language, string> = {
  es: getOpenGraphLocale("es"),
  en: getOpenGraphLocale("en"),
};

export const resolveTranslations = createResolver({ languages, defaultLang });

// Re-export for convenience
export type { FlattenTranslation } from "@pulpo/i18n";
