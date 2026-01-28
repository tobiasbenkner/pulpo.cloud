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

  /**
   * Resolves nested translation object recursively at runtime.
   */
  function resolveTranslations<T>(
    obj: T,
    lang: L | string,
  ): FlattenTranslation<T, L> {
    if (typeof obj !== "object" || obj === null) return obj as any;

    const keys = Object.keys(obj);
    const hasLangKey = keys.some((k) => languages.includes(k as L));

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
    return result as FlattenTranslation<T, L>;
  }

  return resolveTranslations;
}
