export const languages = ['es', 'de', 'en'] as const;
export const defaultLang = 'es' as const;
export type Language = typeof languages[number];

export const openGraphLocales: Record<Language, string> = {
  es: "es_ES",
  de: "de_DE",
  en: "en_GB",
};

/**
 * TypeScript Helper:
 * Wandelt die verschachtelte Definitionsstruktur in das flache Objekt für die Komponente um.
 * 
 * Beispiel:
 * Input:  { seo: { title: { es: string, de: string } } }
 * Output: { seo: { title: string } }
 */
export type FlattenTranslation<T> = {
  [K in keyof T]: T[K] extends Record<string, any>
    ? // Check if the object keys look like languages (intersection check)
      keyof T[K] extends string // Simple check implies object
      ? Extract<keyof T[K], Language> extends never
        ? FlattenTranslation<T[K]> // No language keys found? Recurse deeper
        : string // Language keys found? It's a string leaf
      : never
    : T[K];
};

/**
 * Löst das Übersetzungsobjekt rekursiv zur Laufzeit auf.
 */
export function resolveTranslations(obj: any, lang: Language | string): any {
  if (typeof obj !== "object" || obj === null) return obj;

  const keys = Object.keys(obj);
  const hasLangKey = keys.some((k) => languages.includes(k as any));

  if (hasLangKey) {
    if (obj[lang]) return obj[lang];
    const baseLang = lang.split("-")[0];
    if (obj[baseLang]) return obj[baseLang];
    if (obj[defaultLang]) return obj[defaultLang];
    return Object.values(obj)[0] || "";
  }

  const result: any = {};
  for (const key of keys) {
    result[key] = resolveTranslations(obj[key], lang);
  }
  return result;
}
