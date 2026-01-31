/**
 * Common OpenGraph locale mappings
 */
export const openGraphLocales: Record<string, string> = {
  es: "es_ES",
  de: "de_DE",
  en: "en_GB",
  "es-ar": "es_AR",
  "en-us": "en_US",
  "en-gb": "en_GB",
  fr: "fr_FR",
  it: "it_IT",
  pt: "pt_PT",
  "pt-br": "pt_BR",
  pl: "pl_PL",
};

/**
 * Get OpenGraph locale for a language code
 */
export function getOpenGraphLocale(lang: string): string {
  return (
    openGraphLocales[lang.toLowerCase()] ?? `${lang}_${lang.toUpperCase()}`
  );
}
