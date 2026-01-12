Erstelle eine vollständige SEO-Implementierung für eine Astro-Website mit TypeScript.

ANFORDERUNGEN:
Implementiere Best-Practice SEO mit Meta-Tags, Open Graph, Twitter Cards, JSON-LD Schema, Sitemap und robots.txt.

1. SEO-KOMPONENTE (src/components/SEO.astro):

```astro
---
import { languages, defaultLang } from '@/lib/i18n';
import type { Language } from '@/lib/i18n';

interface Props {
  // Basis Meta Tags
  title: string;
  description: string;
  canonical?: string;

  // Open Graph
  ogType?: 'website' | 'article' | 'product';
  ogImage?: string;
  ogImageAlt?: string;
  ogImageWidth?: number;
  ogImageHeight?: number;

  // Twitter Card
  twitterCard?: 'summary' | 'summary_large_image' | 'app' | 'player';
  twitterSite?: string;
  twitterCreator?: string;

  // Artikel-spezifisch
  publishedTime?: string;
  modifiedTime?: string;
  author?: string;
  tags?: string[];

  // Sprache
  lang: Language;

  // Robots
  noindex?: boolean;
  nofollow?: boolean;
}

const {
  title,
  description,
  canonical,
  ogType = 'website',
  ogImage = '/og-image-default.jpg',
  ogImageAlt = title,
  ogImageWidth = 1200,
  ogImageHeight = 630,
  twitterCard = 'summary_large_image',
  twitterSite,
  twitterCreator,
  publishedTime,
  modifiedTime,
  author,
  tags = [],
  lang,
  noindex = false,
  nofollow = false
} = Astro.props;

const siteUrl = Astro.site?.toString() || 'https://example.com';
const currentUrl = new URL(Astro.url.pathname, siteUrl).toString();
const canonicalUrl = canonical ? new URL(canonical, siteUrl).toString() : currentUrl;

// OG Image absolute URL
const ogImageUrl = ogImage.startsWith('http')
  ? ogImage
  : new URL(ogImage, siteUrl).toString();

// Robots meta
const robotsContent = [
  noindex ? 'noindex' : 'index',
  nofollow ? 'nofollow' : 'follow'
].join(', ');

// Alternate language URLs
function getLanguageUrl(targetLang: Language): string {
  const pathWithoutLang = Astro.url.pathname.replace(/^\/(en|fr|es|it)/, '') || '/';
  if (targetLang === defaultLang) {
    return new URL(pathWithoutLang, siteUrl).toString();
  }
  return new URL(`/${targetLang}${pathWithoutLang}`, siteUrl).toString();
}
---

<!-- Primary Meta Tags -->
<title>{title}</title>
<meta name="title" content={title} />
<meta name="description" content={description} />
<meta name="robots" content={robotsContent} />
<link rel="canonical" href={canonicalUrl} />

<!-- Language alternates -->
<link rel="alternate" hreflang="x-default" href={getLanguageUrl(defaultLang)} />
{languages.map(l => (
  <link rel="alternate" hreflang={l} href={getLanguageUrl(l)} />
))}

<!-- Open Graph / Facebook -->
<meta property="og:type" content={ogType} />
<meta property="og:url" content={currentUrl} />
<meta property="og:title" content={title} />
<meta property="og:description" content={description} />
<meta property="og:image" content={ogImageUrl} />
<meta property="og:image:alt" content={ogImageAlt} />
<meta property="og:image:width" content={ogImageWidth.toString()} />
<meta property="og:image:height" content={ogImageHeight.toString()} />
<meta property="og:locale" content={lang === 'de' ? 'de_DE' : lang === 'en' ? 'en_US' : `${lang}_${lang.toUpperCase()}`} />
<meta property="og:site_name" content="Site Name" />

{publishedTime && <meta property="article:published_time" content={publishedTime} />}
{modifiedTime && <meta property="article:modified_time" content={modifiedTime} />}
{author && <meta property="article:author" content={author} />}
{tags.length > 0 && tags.map(tag => (
  <meta property="article:tag" content={tag} />
))}

<!-- Twitter -->
<meta name="twitter:card" content={twitterCard} />
<meta name="twitter:url" content={currentUrl} />
<meta name="twitter:title" content={title} />
<meta name="twitter:description" content={description} />
<meta name="twitter:image" content={ogImageUrl} />
<meta name="twitter:image:alt" content={ogImageAlt} />
{twitterSite && <meta name="twitter:site" content={twitterSite} />}
{twitterCreator && <meta name="twitter:creator" content={twitterCreator} />}
```

2. JSON-LD SCHEMA KOMPONENTEN (src/components/schemas/):

a) Website Schema (src/components/schemas/WebsiteSchema.astro):

```astro
---
interface Props {
  name: string;
  description: string;
  url: string;
  logo?: string;
}

const { name, description, url, logo } = Astro.props;

const schema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": name,
  "description": description,
  "url": url,
  ...(logo && { "logo": logo })
};
---

<script type="application/ld+json" set:html={JSON.stringify(schema)} />
```

b) Organization Schema (src/components/schemas/OrganizationSchema.astro):

```astro
---
interface Props {
  name: string;
  url: string;
  logo: string;
  description?: string;
  address?: {
    streetAddress: string;
    addressLocality: string;
    postalCode: string;
    addressCountry: string;
  };
  contactPoint?: {
    telephone: string;
    contactType: string;
    email?: string;
  };
  sameAs?: string[]; // Social media URLs
}

const { name, url, logo, description, address, contactPoint, sameAs } = Astro.props;

const schema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": name,
  "url": url,
  "logo": logo,
  ...(description && { "description": description }),
  ...(address && { "address": {
    "@type": "PostalAddress",
    ...address
  }}),
  ...(contactPoint && { "contactPoint": {
    "@type": "ContactPoint",
    ...contactPoint
  }}),
  ...(sameAs && { "sameAs": sameAs })
};
---

<script type="application/ld+json" set:html={JSON.stringify(schema)} />
```

c) Article Schema (src/components/schemas/ArticleSchema.astro):

```astro
---
interface Props {
  headline: string;
  description: string;
  image: string;
  datePublished: string;
  dateModified?: string;
  author: {
    name: string;
    url?: string;
  };
  publisher: {
    name: string;
    logo: string;
  };
  url: string;
}

const { headline, description, image, datePublished, dateModified, author, publisher, url } = Astro.props;

const schema = {
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": headline,
  "description": description,
  "image": image,
  "datePublished": datePublished,
  "dateModified": dateModified || datePublished,
  "author": {
    "@type": "Person",
    "name": author.name,
    ...(author.url && { "url": author.url })
  },
  "publisher": {
    "@type": "Organization",
    "name": publisher.name,
    "logo": {
      "@type": "ImageObject",
      "url": publisher.logo
    }
  },
  "mainEntityOfPage": {
    "@type": "WebPage",
    "@id": url
  }
};
---

<script type="application/ld+json" set:html={JSON.stringify(schema)} />
```

d) LocalBusiness Schema (src/components/schemas/LocalBusinessSchema.astro):

```astro
---
interface Props {
  name: string;
  type: string; // z.B. "Restaurant", "Hotel", "Store"
  image: string;
  url: string;
  telephone: string;
  email?: string;
  address: {
    streetAddress: string;
    addressLocality: string;
    postalCode: string;
    addressCountry: string;
  };
  geo?: {
    latitude: number;
    longitude: number;
  };
  openingHours?: string[]; // z.B. ["Mo-Fr 09:00-18:00"]
  priceRange?: string; // z.B. "$$"
  menu?: string; // URL zur Speisekarte
  servesCuisine?: string[]; // z.B. ["Italian", "Pizza"]
}

const { name, type, image, url, telephone, email, address, geo, openingHours, priceRange, menu, servesCuisine } = Astro.props;

const schema = {
  "@context": "https://schema.org",
  "@type": type,
  "name": name,
  "image": image,
  "url": url,
  "telephone": telephone,
  ...(email && { "email": email }),
  "address": {
    "@type": "PostalAddress",
    ...address
  },
  ...(geo && { "geo": {
    "@type": "GeoCoordinates",
    "latitude": geo.latitude,
    "longitude": geo.longitude
  }}),
  ...(openingHours && { "openingHoursSpecification": openingHours.map(hours => ({
    "@type": "OpeningHoursSpecification",
    "dayOfWeek": hours.split(' ')[0],
    "opens": hours.split(' ')[1]?.split('-')[0],
    "closes": hours.split(' ')[1]?.split('-')[1]
  }))}),
  ...(priceRange && { "priceRange": priceRange }),
  ...(menu && { "menu": menu }),
  ...(servesCuisine && { "servesCuisine": servesCuisine })
};
---

<script type="application/ld+json" set:html={JSON.stringify(schema)} />
```

e) BreadcrumbList Schema (src/components/schemas/BreadcrumbSchema.astro):

```astro
---
interface BreadcrumbItem {
  name: string;
  url: string;
}

interface Props {
  items: BreadcrumbItem[];
}

const { items } = Astro.props;
const siteUrl = Astro.site?.toString() || 'https://example.com';

const schema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": items.map((item, index) => ({
    "@type": "ListItem",
    "position": index + 1,
    "name": item.name,
    "item": new URL(item.url, siteUrl).toString()
  }))
};
---

<script type="application/ld+json" set:html={JSON.stringify(schema)} />
```

3. SITEMAP GENERIERUNG (src/pages/sitemap.xml.ts):

```typescript
import type { APIRoute } from "astro";
import { languages, defaultLang } from "@/lib/i18n";

// Hier alle deine statischen Routen definieren
const staticRoutes = [
  "",
  "about",
  "contact",
  "services",
  "blog",
  // etc.
];

export const GET: APIRoute = ({ site }) => {
  const siteUrl = site?.toString() || "https://example.com";

  const urls = staticRoutes
    .flatMap((route) => {
      return languages.map((lang) => {
        const path = lang === defaultLang ? `/${route}` : `/${lang}/${route}`;

        const cleanPath = path.replace(/\/+$/, "") || "/";

        return `
    <url>
      <loc>${siteUrl}${cleanPath}</loc>
      <lastmod>${new Date().toISOString()}</lastmod>
      <changefreq>weekly</changefreq>
      <priority>${route === "" ? "1.0" : "0.8"}</priority>
      <xhtml:link rel="alternate" hreflang="${lang}" href="${siteUrl}${cleanPath}"/>
      ${languages
        .filter((l) => l !== lang)
        .map((altLang) => {
          const altPath =
            altLang === defaultLang ? `/${route}` : `/${altLang}/${route}`;
          const cleanAltPath = altPath.replace(/\/+$/, "") || "/";
          return `<xhtml:link rel="alternate" hreflang="${altLang}" href="${siteUrl}${cleanAltPath}"/>`;
        })
        .join("\n      ")}
    </url>`;
      });
    })
    .join("");

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
  ${urls}
</urlset>`.trim();

  return new Response(sitemap, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
    },
  });
};
```

4. ROBOTS.TXT (src/pages/robots.txt.ts):

```typescript
import type { APIRoute } from "astro";

export const GET: APIRoute = ({ site }) => {
  const siteUrl = site?.toString() || "https://example.com";

  const robots = `
# Allow all crawlers
User-agent: *
Allow: /

# Disallow specific paths (wenn nötig)
# Disallow: /admin/
# Disallow: /api/

# Sitemap
Sitemap: ${siteUrl}sitemap.xml
  `.trim();

  return new Response(robots, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
};
```

5. OG IMAGE GENERIERUNG (optional, mit @vercel/og):

```typescript
// src/pages/og/[...path].png.ts
import { ImageResponse } from "@vercel/og";
import type { APIRoute } from "astro";

export const GET: APIRoute = async ({ params }) => {
  const { path } = params;

  // Hier Daten basierend auf path laden
  const title = "Dein Titel";
  const description = "Deine Beschreibung";

  return new ImageResponse(
    {
      type: "div",
      props: {
        style: {
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#1a1a1a",
          fontFamily: "sans-serif",
        },
        children: [
          {
            type: "div",
            props: {
              style: {
                fontSize: 60,
                fontWeight: "bold",
                color: "white",
                marginBottom: 20,
              },
              children: title,
            },
          },
          {
            type: "div",
            props: {
              style: {
                fontSize: 30,
                color: "#888",
              },
              children: description,
            },
          },
        ],
      },
    },
    {
      width: 1200,
      height: 630,
    }
  );
};

export function getStaticPaths() {
  return [
    { params: { path: "home" } },
    { params: { path: "about" } },
    // Für jede Seite einen OG Image
  ];
}
```

6. VERWENDUNG IM LAYOUT (src/layouts/Layout.astro):

```astro
---
import SEO from '@/components/SEO.astro';
import WebsiteSchema from '@/components/schemas/WebsiteSchema.astro';
import type { Language } from '@/lib/i18n';

interface Props {
  title: string;
  description: string;
  lang: Language;
  ogImage?: string;
  ogType?: 'website' | 'article';
  noindex?: boolean;
}

const { title, description, lang, ogImage, ogType, noindex } = Astro.props;
---

<!DOCTYPE html>
<html lang={lang}>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />

    <SEO
      title={title}
      description={description}
      lang={lang}
      ogType={ogType}
      ogImage={ogImage}
      noindex={noindex}
      twitterSite="@yourhandle"
    />

    <WebsiteSchema
      name="Your Site Name"
      description="Your site description"
      url={Astro.site?.toString() || 'https://example.com'}
      logo="/logo.png"
    />
  </head>
  <body>
    <slot />
  </body>
</html>
```

7. VERWENDUNG IN SEITEN:

```astro
---
import Layout from '@/layouts/Layout.astro';
import OrganizationSchema from '@/components/schemas/OrganizationSchema.astro';
import BreadcrumbSchema from '@/components/schemas/BreadcrumbSchema.astro';
import { createI18nStaticPaths } from '@/lib/i18n';
import { translations } from './index.i18n';

export const getStaticPaths = () => createI18nStaticPaths(translations);
const { t, lang } = Astro.props;
---

<Layout
  title={t.seo.title}
  description={t.seo.description}
  lang={lang}
  ogImage="/og-home.jpg"
>
  <OrganizationSchema
    name="Your Company"
    url={Astro.site?.toString() || ''}
    logo="/logo.png"
    description="Your company description"
    address={{
      streetAddress: "123 Main St",
      addressLocality: "City",
      postalCode: "12345",
      addressCountry: "DE"
    }}
    contactPoint={{
      telephone: "+49-123-456789",
      contactType: "customer service",
      email: "info@example.com"
    }}
    sameAs={[
      "https://facebook.com/yourpage",
      "https://twitter.com/yourhandle",
      "https://instagram.com/yourhandle"
    ]}
  />

  <BreadcrumbSchema
    items={[
      { name: 'Home', url: '/' },
      { name: t.breadcrumb, url: Astro.url.pathname }
    ]}
  />

  <!-- Your content -->
</Layout>
```

8. ASTRO CONFIG (astro.config.mjs):

```javascript
import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://your-domain.com",
  // Wichtig für korrekte URLs in Sitemap und Meta Tags
});
```

9. TRANSLATION FILE FÜR SEO (pages/[...lang]/index.i18n.ts):

```typescript
export const translations = {
  de: {
    seo: {
      title: "Startseite | Your Brand",
      description: "Willkommen bei Your Brand. Wir bieten...",
    },
    breadcrumb: "Startseite",
    // ... rest
  },
  en: {
    seo: {
      title: "Home | Your Brand",
      description: "Welcome to Your Brand. We offer...",
    },
    breadcrumb: "Home",
  },
} as const;
```

CHECKLISTE:
✅ Meta Tags (Title, Description, Robots)
✅ Open Graph (Facebook, LinkedIn)
✅ Twitter Cards
✅ Canonical URLs
✅ Alternate Language Links (hreflang)
✅ JSON-LD Structured Data (Schema.org)

- WebSite Schema
- Organization Schema
- Article Schema (für Blog)
- LocalBusiness Schema (für Lokale Geschäfte)
- BreadcrumbList Schema
  ✅ Sitemap.xml mit mehrsprachigen URLs
  ✅ Robots.txt
  ✅ OG Images (optional, dynamisch generiert)
  ✅ SEO-Texte in i18n translations
  ✅ Responsive Images mit srcset
  ✅ Performance: Preload, Prefetch für kritische Assets

BEST PRACTICES:

- Title: 50-60 Zeichen optimal
- Description: 150-160 Zeichen optimal
- OG Images: 1200x630px (empfohlen)
- Alt-Texte für alle Bilder
- Semantic HTML (h1, h2, header, nav, main, footer)
- Page Speed optimieren (Lighthouse Score > 90)
- Mobile-First Design
