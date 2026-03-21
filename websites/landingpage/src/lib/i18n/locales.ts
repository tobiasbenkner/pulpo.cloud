/**
 * Common OpenGraph locale mappings
 */
export const openGraphLocales: Record<string, string> = {
  de: "de_DE",
  en: "en_GB",
};

/**
 * Get OpenGraph locale for a language code
 */
export function getOpenGraphLocale(lang: string): string {
  return (
    openGraphLocales[lang.toLowerCase()] ?? `${lang}_${lang.toUpperCase()}`
  );
}
