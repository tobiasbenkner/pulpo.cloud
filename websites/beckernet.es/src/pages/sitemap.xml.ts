import type { APIRoute } from "astro";
import { languages, defaultLang } from "@/lib/i18n";
import { routeSlugs, getTranslatedPath } from "@/lib/registry";

export const GET: APIRoute = ({ site }) => {
  const baseUrl =
    site?.toString().replace(/\/$/, "") || "http://localhost:4321";

  const otherRouteKeys = Object.keys(routeSlugs).filter(
    (key) => key !== "home",
  );
  const allRouteKeys = ["home", ...otherRouteKeys];

  const urls = allRouteKeys
    .flatMap((key) =>
      languages.map((currentLang) => {
        const path = getTranslatedPath(key, currentLang);
        if (path === "/404") return "";
        const currentUrl = `${baseUrl}${path}`;
        const alternates = languages
          .map((lang) => {
            const altPath = getTranslatedPath(key, lang);
            if (altPath === "/404") return "";
            return `    <xhtml:link rel="alternate" hreflang="${lang}" href="${baseUrl}${altPath}"/>`;
          })
          .filter(Boolean)
          .join("\n");

        // X-Default generieren
        const xDefaultPath = getTranslatedPath(key, defaultLang);
        const xDefaultLink = `    <xhtml:link rel="alternate" hreflang="x-default" href="${baseUrl}${xDefaultPath}"/>`;

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

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls}
</urlset>`;

  return new Response(sitemap.trim(), {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
    },
  });
};
