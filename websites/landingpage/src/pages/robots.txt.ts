import type { APIRoute } from "astro";

export const GET: APIRoute = ({ site }) => {
  const baseUrl = site ? site.toString() : "http://localhost:4321/";
  const sitemapUrl = new URL("sitemap.xml", baseUrl).toString();
  const content = `
User-agent: *
Allow: /
Disallow: /login
Disallow: /onboarding
Disallow: /registro
Disallow: /registrieren
Disallow: /signup
Disallow: /registrazione
Disallow: /verificar
Disallow: /verifizieren
Disallow: /verify
Disallow: /verifica

Sitemap: ${sitemapUrl}
`.trim();

  return new Response(content, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};
