import { defaultLang, type Language } from "@/lib/i18n";
import { resolveTranslations } from "./i18n";
import type { RouteDefinition } from "./types";

const routeModules = import.meta.glob<{ route: RouteDefinition }>(
  "../views/**/*.route.ts",
  { eager: true },
);

const translationModules = import.meta.glob<{ translations: any }>(
  "../views/**/*.i18n.ts",
  { eager: true },
);

const pageModules = import.meta.glob("../views/**/*.page.astro", {
  eager: true,
});

export const routeSlugs: Record<string, Record<Language, string>> = {};
const viewConfig: Record<string, any> = {};

for (const path in routeModules) {
  const mod = routeModules[path];
  if (mod?.route) {
    routeSlugs[mod.route.key] = mod.route.slugs;
  }
}

for (const path in pageModules) {
  const match = path.match(/\.\.\/views\/([^\/]+)\/\1\.page\.astro$/);
  if (!match) continue;

  const viewName = match[1];
  const translationPath = `../views/${viewName}/${viewName}.i18n.ts`;
  const rawTranslations =
    translationModules[translationPath]?.translations || {};
  const component = (pageModules[path] as any)?.default;

  if (component) {
    viewConfig[viewName] = {
      Component: component,
      rawTranslations: rawTranslations,
    };
  }
}

export function getTranslatedPath(routeKey: string, lang: Language): string {
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

export function getView(routeKey: string, lang: Language) {
  const config = viewConfig[routeKey];

  if (!config) {
    return null;
  }

  return {
    Component: config.Component,
    t: resolveTranslations(config.rawTranslations, lang),
  };
}
