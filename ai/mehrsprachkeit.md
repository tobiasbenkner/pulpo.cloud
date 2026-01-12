Erstelle ein i18n-System für Astro mit TypeScript.

MEHRSPRACHIGKEIT (i18n):
Implementiere ein optimiertes TypeScript-basiertes i18n-System mit automatischem Fallback.

1. SPRACHKONFIGURATION (src/lib/i18n.ts):

```typescript
export const languages = ["de", "en", "fr"] as const;
export const defaultLang = "de" as const;
export type Language = (typeof languages)[number];

export function getStaticLanguagePaths() {
  return languages.map((lang) => ({
    params: { lang: lang === defaultLang ? undefined : lang },
  }));
}

export function getLangFromParams(lang: string | undefined): Language {
  if (lang && languages.includes(lang as Language)) {
    return lang as Language;
  }
  return defaultLang;
}

// Helper um aktuellen Pfad ohne Sprach-Prefix zu bekommen
export function getPathWithoutLang(currentPath: string): string {
  const langPattern = new RegExp(
    `^/(${languages.filter((l) => l !== defaultLang).join("|")})`
  );
  return currentPath.replace(langPattern, "") || "/";
}

// Helper um URL für eine bestimmte Sprache zu generieren
export function getLanguageUrl(
  targetLang: Language,
  currentPath: string
): string {
  const pathWithoutLang = getPathWithoutLang(currentPath);

  if (targetLang === defaultLang) {
    return pathWithoutLang;
  }
  return `/${targetLang}${pathWithoutLang}`;
}

export function createTranslationProxy<T extends Record<string, any>>(
  translations: Record<Language, T>,
  lang: Language
): T {
  const handler: ProxyHandler<T> = {
    get(target, prop: string | symbol) {
      if (typeof prop === "string") {
        const value = target[prop];
        // Nested objects auch mit Proxy wrappen
        if (value && typeof value === "object" && !Array.isArray(value)) {
          return new Proxy(value, handler);
        }
        // Versuche gewählte Sprache, sonst Fallback auf defaultLang
        return target[prop] ?? translations[defaultLang][prop];
      }
      return target[prop as keyof T];
    },
  };

  return new Proxy(translations[lang], handler);
}

export function createI18nStaticPaths<T extends Record<Language, any>>(
  translations: T
) {
  return getStaticLanguagePaths().map(({ params }) => {
    const lang = getLangFromParams(params.lang);
    return {
      params,
      props: {
        t: createTranslationProxy(translations, lang),
        lang,
      },
    };
  });
}
```

2. DATEISTRUKTUR:
   src/
   ├── lib/
   │ └── i18n.ts (zentrale i18n-Logik)
   ├── i18n/
   │ └── common.i18n.ts (gemeinsame Übersetzungen)
   ├── components/
   │ └── LanguageSwitcher.astro (wiederverwendbar)
   └── pages/
   └── [...lang]/ (optionaler Sprachparameter)
   ├── index.astro
   ├── index.i18n.ts
   └── [weitere-seiten]/

3. TRANSLATION-FILES FORMAT (.i18n.ts):
   Jede Seite hat eine eigene .i18n.ts Datei. Fehlende Übersetzungen fallen automatisch auf defaultLang zurück:

```typescript
export const translations = {
  de: {
    title: "Willkommen",
    subtitle: "Reservieren Sie jetzt",
    cta: "Jetzt buchen",
    navigation: {
      home: "Startseite",
      about: "Über uns",
    },
  },
  en: {
    title: "Welcome",
    subtitle: "Book now",
    // cta fehlt - wird automatisch aus DE genommen
    navigation: {
      home: "Home",
      about: "About",
    },
  },
  fr: {
    title: "Bienvenue",
    // subtitle, cta, navigation fehlen - werden aus DE genommen
  },
} as const;
```

4. SEITEN-IMPLEMENTIERUNG (nur 3 Zeilen!):

```astro
---
import { createI18nStaticPaths } from '@/lib/i18n';
import { translations } from './index.i18n';

export const getStaticPaths = () => createI18nStaticPaths(translations);
const { t, lang } = Astro.props;
---

<html lang={lang}>
  <body>
    <h1>{t.title}</h1>
    <p>{t.subtitle}</p>
    <button>{t.cta}</button>
  </body>
</html>
```

5. GEMEINSAME ÜBERSETZUNGEN (src/i18n/common.i18n.ts):
   Für häufig verwendete Texte über alle Seiten hinweg:

```typescript
export const common = {
  de: {
    buttons: {
      save: "Speichern",
      cancel: "Abbrechen",
      edit: "Bearbeiten",
      delete: "Löschen",
    },
    messages: {
      loading: "Lädt...",
      error: "Ein Fehler ist aufgetreten",
      success: "Erfolgreich gespeichert",
    },
  },
  en: {
    buttons: {
      save: "Save",
      cancel: "Cancel",
      edit: "Edit",
      delete: "Delete",
    },
    messages: {
      loading: "Loading...",
      error: "An error occurred",
      success: "Successfully saved",
    },
  },
  fr: {
    buttons: {
      save: "Enregistrer",
      cancel: "Annuler",
      edit: "Modifier",
      delete: "Supprimer",
    },
    messages: {
      loading: "Chargement...",
      error: "Une erreur est survenue",
      success: "Enregistré avec succès",
    },
  },
} as const;
```

6. LANGUAGE SWITCHER KOMPONENTE (src/components/LanguageSwitcher.astro):
   Standalone-Komponente ohne Layout-Abhängigkeit:

```astro
---
import { languages, defaultLang, getLanguageUrl } from '@/lib/i18n';
import type { Language } from '@/lib/i18n';

interface Props {
  lang: Language;
  currentPath: string;
}

const { lang, currentPath } = Astro.props;
---

<nav class="flex gap-4" aria-label="Language switcher">
  {languages.map(l => (
    <a
      href={getLanguageUrl(l, currentPath)}
      aria-current={l === lang ? 'page' : undefined}
      class:list={[
        'px-3 py-1 rounded transition-colors',
        { 'bg-blue-500 text-white': l === lang },
        { 'hover:bg-gray-100': l !== lang }
      ]}
    >
      {l.toUpperCase()}
    </a>
  ))}
</nav>
```

Verwendung in beliebigen Komponenten:

```astro
---
import LanguageSwitcher from '@/components/LanguageSwitcher.astro';
const { lang } = Astro.props;
---

<LanguageSwitcher lang={lang} currentPath={Astro.url.pathname} />
```

7. SEO HELPER (optional, für <head>):

```astro
---
// src/components/LanguageLinks.astro
import { languages, defaultLang, getLanguageUrl } from '@/lib/i18n';

interface Props {
  currentPath: string;
  siteUrl: string;
}

const { currentPath, siteUrl } = Astro.props;
---

<!-- SEO: Alternate Language Links -->
<link rel="alternate" hreflang="x-default" href={`${siteUrl}${getLanguageUrl(defaultLang, currentPath).slice(1)}`} />
{languages.map(l => (
  <link
    rel="alternate"
    hreflang={l}
    href={`${siteUrl}${getLanguageUrl(l, currentPath).slice(1)}`}
  />
))}
```

WICHTIGE FEATURES:
✅ Automatischer Fallback auf Default-Language bei fehlenden Übersetzungen
✅ Nur 3 Zeilen Code pro Seite für i18n
✅ TypeScript (.i18n.ts) für Type Safety und Autocomplete
✅ Nested objects werden unterstützt (z.B. t.navigation.home)
✅ Default-Sprache (DE) ohne URL-Prefix (/, /about)
✅ Andere Sprachen mit Prefix (/en, /en/about, /fr, /fr/about)
✅ KEIN Hardcoding - alle Sprachen dynamisch aus languages-Array
✅ DRY: Alle Logik zentral in i18n.ts
✅ LanguageSwitcher als standalone Komponente (keine Layout-Abhängigkeit)
✅ Helper für Pfad-Manipulation (getPathWithoutLang, getLanguageUrl)

ROUTING-BEISPIELE:

- DE (default): /, /about, /contact
- EN: /en, /en/about, /en/contact
- FR: /fr, /fr/about, /fr/contact

VERWENDUNG:

1. Import createI18nStaticPaths in jeder Seite
2. Import translations aus .i18n.ts
3. Export getStaticPaths mit helper
4. Verwende {t.deinKey} in Template
5. Optional: LanguageSwitcher Komponente wo benötigt
