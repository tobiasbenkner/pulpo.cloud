import type { FlattenTranslation } from "./types";

export type ResolveOptions<L extends string> = {
  languages: readonly L[];
  defaultLang: L;
};

/**
 * Creates a resolveTranslations function configured for specific languages.
 */
export function createResolver<L extends string>(options: ResolveOptions<L>) {
  const { languages, defaultLang } = options;

  function resolveTranslations<T>(
    obj: T,
    lang: L | string,
  ): FlattenTranslation<T, L> {
    // 1. Primitive Werte direkt zurückgeben
    if (typeof obj !== "object" || obj === null) return obj as any;

    // 2. Falls es ein Array ist, jedes Element rekursiv verarbeiten
    if (Array.isArray(obj)) {
      return obj.map((item) => resolveTranslations(item, lang)) as any;
    }

    const keys = Object.keys(obj);
    const hasLangKey = keys.some((k) => languages.includes(k as L));

    // 3. Falls das Objekt Sprach-Keys enthält (Blatt-Knoten)
    if (hasLangKey) {
      const typedObj = obj as Record<string, any>;
      if (typedObj[lang]) return typedObj[lang];
      const baseLang = lang.split("-")[0];
      if (typedObj[baseLang]) return typedObj[baseLang];
      if (typedObj[defaultLang]) return typedObj[defaultLang];
      return Object.values(typedObj)[0] || "";
    }

    // 4. Normales verschachteltes Objekt verarbeiten
    const result: any = {};
    for (const key of keys) {
      result[key] = resolveTranslations((obj as any)[key], lang);
    }
    return result as FlattenTranslation<T, L>;
  }

  return resolveTranslations;
}
