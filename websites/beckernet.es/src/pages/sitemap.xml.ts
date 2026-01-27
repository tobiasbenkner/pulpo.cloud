import type { APIRoute } from "astro";
import {
  languages,
  defaultLang,
  resolveTranslations,
  type Language,
} from "@/lib/i18n";
import { routeSlugs, getTranslatedPath } from "@/lib/registry";
import { getBlogCategories, getPostsByCategory } from "@/lib/cms";

// Escape special XML characters in URLs
const escapeXml = (str: string): string => {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
};

export const GET: APIRoute = async ({ site }) => {
  const baseUrl =
    site?.toString().replace(/\/$/, "") || "http://localhost:4321";

  const otherRouteKeys = Object.keys(routeSlugs).filter(
    (key) => key !== "home",
  );
  const allRouteKeys = ["home", ...otherRouteKeys];

  // Static pages
  const pageUrls = allRouteKeys
    .flatMap((key) =>
      languages.map((currentLang) => {
        const path = getTranslatedPath(key, currentLang);
        if (path === "/404") return "";
        const currentUrl = escapeXml(`${baseUrl}${path}`);
        const alternates = languages
          .map((lang) => {
            const altPath = getTranslatedPath(key, lang);
            if (altPath === "/404") return "";
            return `    <xhtml:link rel="alternate" hreflang="${lang}" href="${escapeXml(`${baseUrl}${altPath}`)}"/>`;
          })
          .filter(Boolean)
          .join("\n");

        const xDefaultPath = getTranslatedPath(key, defaultLang);
        const xDefaultLink = `    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(`${baseUrl}${xDefaultPath}`)}"/>`;

        return `
  <url>
    <loc>${currentUrl}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
${alternates}
${xDefaultLink}
  </url>`;
      }),
    )
    .join("");

  // Blog categories and posts
  const categories = await getBlogCategories();
  let blogUrls = "";

  for (const category of categories) {
    const posts = await getPostsByCategory(category.id);

    // Category URLs
    for (const currentLang of languages) {
      const catSlug = resolveTranslations(category.slug, currentLang);
      const isDefault = currentLang === defaultLang;
      const path = isDefault
        ? `/blog/${catSlug}`
        : `/${currentLang}/blog/${catSlug}`;
      const currentUrl = escapeXml(`${baseUrl}${path}`);

      const alternates = languages
        .map((lang) => {
          const altCatSlug = resolveTranslations(category.slug, lang);
          const altPath =
            lang === defaultLang
              ? `/blog/${altCatSlug}`
              : `/${lang}/blog/${altCatSlug}`;
          return `    <xhtml:link rel="alternate" hreflang="${lang}" href="${escapeXml(`${baseUrl}${altPath}`)}"/>`;
        })
        .join("\n");

      const defaultCatSlug = resolveTranslations(category.slug, defaultLang);
      const xDefaultLink = `    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(`${baseUrl}/blog/${defaultCatSlug}`)}"/>`;

      blogUrls += `
  <url>
    <loc>${currentUrl}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
${alternates}
${xDefaultLink}
  </url>`;
    }

    // Post URLs
    for (const post of posts) {
      for (const currentLang of languages) {
        const catSlug = resolveTranslations(category.slug, currentLang);
        const postSlug = resolveTranslations(post.slug, currentLang);
        const isDefault = currentLang === defaultLang;
        const path = isDefault
          ? `/blog/${catSlug}/${postSlug}`
          : `/${currentLang}/blog/${catSlug}/${postSlug}`;
        const currentUrl = escapeXml(`${baseUrl}${path}`);

        const alternates = languages
          .map((lang) => {
            const altCatSlug = resolveTranslations(category.slug, lang);
            const altPostSlug = resolveTranslations(post.slug, lang);
            const altPath =
              lang === defaultLang
                ? `/blog/${altCatSlug}/${altPostSlug}`
                : `/${lang}/blog/${altCatSlug}/${altPostSlug}`;
            return `    <xhtml:link rel="alternate" hreflang="${lang}" href="${escapeXml(`${baseUrl}${altPath}`)}"/>`;
          })
          .join("\n");

        const defaultCatSlug = resolveTranslations(category.slug, defaultLang);
        const defaultPostSlug = resolveTranslations(post.slug, defaultLang);
        const xDefaultLink = `    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(`${baseUrl}/blog/${defaultCatSlug}/${defaultPostSlug}`)}"/>`;

        blogUrls += `
  <url>
    <loc>${currentUrl}</loc>
    <lastmod>${post.date_updated || post.date_created || new Date().toISOString()}</lastmod>
${alternates}
${xDefaultLink}
  </url>`;
      }
    }
  }

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${pageUrls}${blogUrls}
</urlset>`;

  return new Response(sitemap.trim(), {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
    },
  });
};
