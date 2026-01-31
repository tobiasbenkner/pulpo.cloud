import {
  createResolver,
  getOpenGraphLocale,
  type FlattenTranslation as BaseFlattenTranslation,
} from "@pulpo/i18n";

export const languages = ["pl", "en"] as const;
export const defaultLang = "pl" as const;
export type Language = (typeof languages)[number];

export const openGraphLocales: Record<Language, string> = {
  pl: getOpenGraphLocale("pl"),
  en: getOpenGraphLocale("en"),
};

export const resolveTranslations = createResolver({ languages, defaultLang });

// Re-export with Language type bound
export type FlattenTranslation<T> = BaseFlattenTranslation<T, Language>;
