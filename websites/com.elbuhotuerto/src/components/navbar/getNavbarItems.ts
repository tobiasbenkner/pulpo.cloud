import { type Language } from "@/lib/i18n";
import { getTranslatedPath, getRouteLabel } from "@/lib/registry";

export type NavbarItem = {
  label: string;
  href: string;
  isActive: boolean;
};

const createItem = (
  routeKey: string,
  lang: Language,
  currentPath: string,
): NavbarItem => {
  const href = getTranslatedPath(routeKey, lang);
  return {
    label: getRouteLabel(routeKey, lang),
    href,
    isActive:
      currentPath === href ||
      (href !== "/" && href !== `/${lang}` && currentPath.startsWith(href)),
  };
};

export async function getNavbarItems(
  lang: Language,
  currentPath: string,
): Promise<NavbarItem[]> {
  return ["home", "menu", "contact"].map((routeKey) =>
    createItem(routeKey, lang, currentPath),
  );
}

export async function getFooterItems(
  lang: Language,
  currentPath: string,
): Promise<NavbarItem[]> {
  return ["legal", "privacy", "cookies"].map((routeKey) =>
    createItem(routeKey, lang, currentPath),
  );
}
