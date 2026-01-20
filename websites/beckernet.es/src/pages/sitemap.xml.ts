import type { APIRoute } from 'astro';
import { languages } from '@/lib/types';
import { routeSlugs, getTranslatedPath } from '@/lib/registry';

export const GET: APIRoute = ({ site }) => {
  const baseUrl = site?.toString().replace(/\/$/, '') || 'http://localhost:4321';
  const allRouteKeys = ['home', ...Object.keys(routeSlugs)];

  const urls = allRouteKeys.flatMap(key => 
    languages.map(lang => {
      const path = getTranslatedPath(key, lang);
      const alternates = languages
        .map(altLang => `    <xhtml:link rel="alternate" hreflang="${altLang}" href="${baseUrl}${getTranslatedPath(key, altLang)}"/>`)
        .join('\n');

      return `
  <url>
    <loc>${baseUrl}${path}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
${alternates}
  </url>`;
    })
  ).join('');

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls}
</urlset>`;

  return new Response(sitemap.trim(), { headers: { 'Content-Type': 'application/xml' } });
};