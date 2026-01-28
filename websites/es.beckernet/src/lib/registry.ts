import {
  createRegistry,
  type RouteModules,
  type TranslationModules,
  type PageModules,
} from "@pulpo/i18n";
import { defaultLang, type Language, resolveTranslations } from "./i18n";

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
