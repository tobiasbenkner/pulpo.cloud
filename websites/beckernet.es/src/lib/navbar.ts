import { getBlogCategories } from "@/lib/cms";
import { resolveTranslations, defaultLang, type Language } from "@/lib/i18n";
import { getTranslatedPath, getRouteLabel } from "@/lib/registry";

export type NavbarItem = {
  label: string;
  href: string;
  isActive: boolean;
};

export async function getNavbarItems(
  lang: Language,
  currentPath: string,
): Promise<NavbarItem[]> {
  const isDefaultLang = lang === defaultLang;

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

  const leftRoutes = ["home", "about"];
  const leftItems = leftRoutes.map(createItem);

  const rightRoutes = ["contact"];
  const rightItems = rightRoutes.map(createItem);

  const categories = await getBlogCategories();
  const dynamicItems: NavbarItem[] = categories.map((cat) => {
    const t = resolveTranslations(cat, lang);
    const label = String(t.nav_label) || "please set nav label";

    const slug = String(t.slug);
    const href = isDefaultLang ? `/blog/${slug}` : `/${lang}/blog/${slug}`;
    return {
      label,
      href,
      isActive: currentPath === href || currentPath.startsWith(href + "/"),
    };
  });

  return [...leftItems, ...dynamicItems, ...rightItems];
}
