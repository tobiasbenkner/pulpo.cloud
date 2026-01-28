import type { I18n } from "./types";

/**
 * Resolves a CMS i18n object to a string for the given language.
 * Falls back to base language (e.g., 'en' from 'en-US'), then to default value.
 */
export function t(i18n: I18n | undefined | null, lang: string): string {
  if (!i18n) return "";
  if (!lang) return i18n.value ?? "";

  if (i18n.translations?.[lang]) {
    return i18n.translations[lang];
  }

  const baseLang = lang.split("-")[0];
  if (baseLang !== lang && i18n.translations?.[baseLang]) {
    return i18n.translations[baseLang];
  }

  return i18n.value ?? "";
}
