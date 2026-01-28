import {
  createResolver,
  getOpenGraphLocale,
  type FlattenTranslation as BaseFlattenTranslation,
} from "@pulpo/i18n";

export const languages = ["es", "en"] as const;
export const defaultLang = "es" as const;
export type Language = (typeof languages)[number];

export const openGraphLocales: Record<Language, string> = {
  es: getOpenGraphLocale("es"),
  en: getOpenGraphLocale("en"),
};

export const resolveTranslations = createResolver({ languages, defaultLang });

// Re-export with Language type bound
export type FlattenTranslation<T> = BaseFlattenTranslation<T, Language>;
