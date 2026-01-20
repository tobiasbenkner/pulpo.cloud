import { defaultLang, type Language, type RouteDefinition } from "@/lib/types";

// Routes laden
const routeModules = import.meta.glob<{ route: RouteDefinition }>(
  "../views/**/*.route.ts",
  { eager: true },
);

// Translations laden
const translationModules = import.meta.glob<{ translations: any }>(
  "../views/**/*.i18n.ts",
  { eager: true },
);

// Pages laden
const pageModules = import.meta.glob("../views/**/*.page.astro", {
  eager: true,
});

export const routeSlugs: Record<string, Record<Language, string>> = {};
export const viewConfig: Record<string, any> = {};

// Routes verarbeiten
for (const path in routeModules) {
  const mod = routeModules[path];
  if (mod?.route) {
    routeSlugs[mod.route.key] = mod.route.slugs;
  }
}

// ViewConfig automatisch aufbauen
for (const path in pageModules) {
  // z.B. ../views/home/home.page.astro -> home
  const match = path.match(/\.\.\/views\/([^\/]+)\/\1\.page\.astro$/);
  if (!match) continue;

  const viewName = match[1];

  // Pfade sind jetzt vorhersehbar
  const translationPath = `../views/${viewName}/${viewName}.i18n.ts`;
  const translations = translationModules[translationPath]?.translations;

  const component = pageModules[path]?.default;

  if (component) {
    viewConfig[viewName] = {
      Component: component,
      translations: translations || {},
    };
  }
}

export function getTranslatedPath(routeKey: string, lang: Language): string {
  const isDefaultLang = lang === defaultLang;

  // Home-Spezialfall
  if (routeKey === "home") {
    return isDefaultLang ? "/" : `/${lang}`;
  }

  // Andere Routen
  const slugs = routeSlugs[routeKey];
  if (!slugs) {
    console.warn(`No slugs found for route key: ${routeKey}`);
    return "/404";
  }

  const slug = slugs[lang];
  if (!slug) {
    console.warn(`No slug found for route key: ${routeKey}, lang: ${lang}`);
    return "/404";
  }

  // Default-Sprache: nur der Slug
  // Andere Sprachen: /{lang}/{slug}
  return isDefaultLang ? `/${slug}` : `/${lang}/${slug}`;
}
