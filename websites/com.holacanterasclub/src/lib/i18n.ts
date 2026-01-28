export const languages = ["es", "en"] as const;
export const defaultLang = "es" as const;
export type Language = (typeof languages)[number];

export const openGraphLocales: Record<Language, string> = {
  es: "es_ES",
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
export function resolveTranslations<T>(
  obj: T,
  lang: Language | string,
): FlattenTranslation<T> {
  if (typeof obj !== "object" || obj === null) return obj as any;

  const keys = Object.keys(obj);
  const hasLangKey = keys.some((k) => languages.includes(k as any));

  if (hasLangKey) {
    const typedObj = obj as Record<string, any>;
    if (typedObj[lang]) return typedObj[lang];
    const baseLang = lang.split("-")[0];
    if (typedObj[baseLang]) return typedObj[baseLang];
    if (typedObj[defaultLang]) return typedObj[defaultLang];
    return Object.values(typedObj)[0] || "";
  }

  const result: any = {};
  for (const key of keys) {
    result[key] = resolveTranslations((obj as any)[key], lang);
  }
  return result as FlattenTranslation<T>;
}
