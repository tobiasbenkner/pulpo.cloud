import { createRegistry } from "@pulpo/i18n";
import { defaultLang, type Language, resolveTranslations } from "./i18n";
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

export const { routeSlugs, addRoute, getTranslatedPath, getView, getRouteLabel } =
  createRegistry<Language>({
    routeModules,
    translationModules,
    pageModules,
    defaultLang,
    resolveTranslations,
  });
