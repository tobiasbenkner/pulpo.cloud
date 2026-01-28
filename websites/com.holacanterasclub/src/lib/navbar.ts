import { type Language } from "@/lib/i18n";
import { getTranslatedPath, getRouteLabel, routeSlugs } from "@/lib/registry";

export type NavbarItem = {
  label: string;
  href: string;
  isActive: boolean;
};

export async function getNavbarItems(
  lang: Language,
  currentPath: string,
): Promise<NavbarItem[]> {

  const createItem = (routeKey: string): NavbarItem => {
    const href = getTranslatedPath(routeKey, lang);
    return {
      label: getRouteLabel(routeKey, lang),
      href,
      isActive:
        currentPath === href ||
        (href !== "/" && href !== `/${lang}` && currentPath.startsWith(href)),
    };
  };

  return ["home", "contact"].map(createItem);
}
