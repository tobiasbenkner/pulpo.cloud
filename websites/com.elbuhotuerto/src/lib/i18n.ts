import {
  createResolver,
  getOpenGraphLocale,
  type FlattenTranslation as BaseFlattenTranslation,
} from "@pulpo/i18n";

export const languages = ["es", "es-ar", "en", "de"] as const;
export const defaultLang = "es" as const;
export type Language = (typeof languages)[number];

export const openGraphLocales: Record<Language, string> = {
  es: getOpenGraphLocale("es"),
  "es-ar": getOpenGraphLocale("es-ar"),
  en: getOpenGraphLocale("en"),
  de: getOpenGraphLocale("de"),
};

export const resolveTranslations = createResolver({ languages, defaultLang });

// Re-export with Language type bound
export type FlattenTranslation<T> = BaseFlattenTranslation<T, Language>;
