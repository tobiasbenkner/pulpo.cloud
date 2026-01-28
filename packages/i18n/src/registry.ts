import type { RouteDefinition, FlattenTranslation } from "./types";

export type RegistryOptions<L extends string> = {
  routeModules: Record<string, { route?: RouteDefinition<L> } | unknown>;
  translationModules: Record<string, { translations?: any } | unknown>;
  pageModules: Record<string, unknown>;
  defaultLang: L;
  resolveTranslations: <T>(
    obj: T,
    lang: L | string,
  ) => FlattenTranslation<T, L>;
};

export type Registry<L extends string> = {
  routeSlugs: Record<string, Record<L, string>>;
  addRoute: (key: string, slugs: Record<L, string>) => void;
  getTranslatedPath: (routeKey: string, lang: L) => string;
  getView: (routeKey: string, lang: L) => { Component: any; t: any } | null;
  getRouteLabel: (routeKey: string, lang: L) => string;
};

/**
 * Creates a view registry from Vite glob imports.
 *
 * Usage in website:
 * ```ts
 * import { createRegistry, createResolver } from "@pulpo/i18n";
 *
 * const languages = ["es", "de", "en"] as const;
 * const defaultLang = "es";
 * const resolveTranslations = createResolver({ languages, defaultLang });
 *
 * const routeModules = import.meta.glob("../views/**\/*.route.ts", { eager: true });
 * const translationModules = import.meta.glob("../views/**\/*.i18n.ts", { eager: true });
 * const pageModules = import.meta.glob("../views/**\/*.page.astro", { eager: true });
 *
 * export const { routeSlugs, addRoute, getTranslatedPath, getView, getRouteLabel } =
 *   createRegistry({ routeModules, translationModules, pageModules, defaultLang, resolveTranslations });
 * ```
 */
export function createRegistry<L extends string>(
  options: RegistryOptions<L>,
): Registry<L> {
  const {
    routeModules,
    translationModules,
    pageModules,
    defaultLang,
    resolveTranslations,
  } = options;

  const routeSlugs: Record<string, Record<L, string>> = {};
  const viewConfig: Record<string, { Component: any; rawTranslations: any }> =
    {};

  function addRoute(key: string, slugs: Record<L, string>) {
    routeSlugs[key] = slugs;
  }

  // Load routes from glob modules
  for (const path in routeModules) {
    const mod = routeModules[path] as
      | { route?: RouteDefinition<L> }
      | undefined;
    if (mod?.route) {
      routeSlugs[mod.route.key] = mod.route.slugs;
    }
  }

  // Load view components and translations
  for (const path in pageModules) {
    const match = path.match(/views\/([^\/]+)\/\1\.page\.astro$/);
    if (!match) continue;

    const viewName = match[1];
    const translationPath = Object.keys(translationModules).find((p) =>
      p.endsWith(`/${viewName}/${viewName}.i18n.ts`),
    );
    const translationMod = translationPath
      ? (translationModules[translationPath] as
          | { translations?: any }
          | undefined)
      : undefined;
    const rawTranslations = translationMod?.translations || {};
    const component = (pageModules[path] as any)?.default;

    if (component) {
      viewConfig[viewName] = {
        Component: component,
        rawTranslations,
      };
    }
  }

  function getTranslatedPath(routeKey: string, lang: L): string {
    const isDefaultLang = lang === defaultLang;

    if (routeKey === "home") {
      return isDefaultLang ? "/" : `/${lang}`;
    }

    const slugs = routeSlugs[routeKey];
    if (!slugs) return "/404";

    const slug = slugs[lang];
    if (!slug) return "/404";

    return isDefaultLang ? `/${slug}` : `/${lang}/${slug}`;
  }

  function getView(routeKey: string, lang: L) {
    const config = viewConfig[routeKey];

    if (!config) {
      return null;
    }

    return {
      Component: config.Component,
      t: resolveTranslations(config.rawTranslations, lang),
    };
  }

  function getRouteLabel(routeKey: string, lang: L): string {
    const config = viewConfig[routeKey];

    if (!config || !config.rawTranslations?.navigationLabel) {
      return routeKey.charAt(0).toUpperCase() + routeKey.slice(1);
    }

    const labelObj = config.rawTranslations.navigationLabel;
    return labelObj[lang] || labelObj[defaultLang] || routeKey;
  }

  return {
    routeSlugs,
    addRoute,
    getTranslatedPath,
    getView,
    getRouteLabel,
  };
}
