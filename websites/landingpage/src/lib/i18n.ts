import { getOpenGraphLocale } from "./i18n/locales";
import { createResolver } from "./i18n/resolve";
import { type FlattenTranslation as BaseFlattenTranslation } from "./i18n/types";

export const languages = ["es", "de", "en", "it"] as const;
export const defaultLang = "es" as const;
export type Language = (typeof languages)[number];

export const openGraphLocales: Record<Language, string> = {
  es: getOpenGraphLocale("es"),
  en: getOpenGraphLocale("en"),
  de: getOpenGraphLocale("de"),
  it: getOpenGraphLocale("its"),
};

export const resolveTranslations = createResolver({ languages, defaultLang });

// Re-export with Language type bound
export type FlattenTranslation<T> = BaseFlattenTranslation<T, Language>;
