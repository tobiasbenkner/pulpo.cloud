import { defaultLang, type Language, resolveTranslations } from "./i18n";
import { createRegistry } from "./i18n/registry";
import type { PageModules, RouteModules, TranslationModules } from "./i18n/types";

const routeModules: RouteModules<Language> = import.meta.glob(
  "../views/**/*.route.ts",
  { eager: true },
);

const translationModules: TranslationModules = import.meta.glob(
  "../views/**/*.i18n.ts",
  { eager: true },
);

const pageModules: PageModules = import.meta.glob("../views/**/*.page.astro", {
  eager: true,
});

export const {
  routeSlugs,
  addRoute,
  getTranslatedPath,
  getView,
  getRouteLabel,
} = createRegistry({
  routeModules,
  translationModules,
  pageModules,
  defaultLang,
  resolveTranslations,
});
