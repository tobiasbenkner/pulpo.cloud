import type { FlattenTranslation } from "../../lib/i18n";

const contentEs = `
<h3>¿Qué son las cookies?</h3>
<p>
  Una cookie es un fichero que se descarga en su ordenador al acceder a
  determinadas páginas web. Las cookies permiten a una página web, entre
  otras cosas, almacenar y recuperar información sobre los hábitos de
  navegación de un usuario o de su equipo.
</p>

<h3>¿Qué tipos de cookies utiliza esta web?</h3>
<p>Esta página web utiliza los siguientes tipos de cookies:</p>
<ul>
  <li>
    <strong>Cookies de análisis:</strong> Son aquéllas que bien tratadas por
    nosotros o por terceros, nos permiten cuantificar el número de usuarios
    y así realizar la medición y análisis estadístico de la utilización que
    hacen los usuarios del servicio ofertado. (Google Analytics).
  </li>
  <li>
    <strong>Cookies técnicas:</strong> Son aquellas que permiten al usuario
    la navegación a través del área restringida y la utilización de sus diferentes
    funciones.
  </li>
</ul>

<h3>Desactivar las cookies</h3>
<p>
  Puede usted permitir, bloquear o eliminar las cookies instaladas en su
  equipo mediante la configuración de las opciones del navegador
  instalado en su ordenador.
</p>

<h3>Cookies de terceros (Google Maps)</h3>
<p>
  Esta página web utiliza servicios de terceros para mostrar mapas
  interactivos. Al activar el mapa, se transfieren datos a Google y se
  guarda su consentimiento en su navegador (Local Storage) para mejorar
  su experiencia en futuras visitas.
</p>
`;

export const translations = {
  navigationLabel: {
    es: "Cookies",
    "es-ar": "Cookies",
    en: "Cookies",
    de: "Cookies",
  },
  seo: {
    title: {
      es: "Política de Cookies | El Búho Tuerto",
      "es-ar": "Política de Cookies | El Búho Tuerto",
      en: "Cookie Policy | El Búho Tuerto",
      de: "Cookie-Richtlinie | El Búho Tuerto",
    },
    description: {
      es: "Información sobre el uso de cookies.",
      "es-ar": "Información sobre el uso de cookies.",
      en: "Information about cookie usage.",
      de: "Informationen zur Cookie-Nutzung.",
    },
  },
  title: {
    es: "Cookies",
    "es-ar": "Cookies",
    en: "Cookies",
    de: "Cookies",
  },
  subtitle: {
    es: "Uso de Cookies",
    "es-ar": "Uso de Cookies",
    en: "Cookie Usage",
    de: "Cookie-Nutzung",
  },
  lastUpdate: {
    es: "Última actualización: Enero 2025",
    "es-ar": "Última actualización: Enero 2025",
    en: "Last update: January 2025",
    de: "Letzte Aktualisierung: Januar 2025",
  },
  content: {
    es: contentEs,
    "es-ar": contentEs,
    en: contentEs, // TODO: Translate
    de: contentEs, // TODO: Translate
  },
  maps: {
    title: {
      es: "Gestionar consentimiento de Mapas",
      "es-ar": "Gestionar consentimiento de Mapas",
      en: "Manage Maps Consent",
      de: "Karten-Einwilligung verwalten",
    },
    status_active: {
      es: "Actualmente has dado permiso para cargar Google Maps automáticamente.",
      "es-ar":
        "Actualmente has dado permiso para cargar Google Maps automáticamente.",
      en: "You have currently given permission to load Google Maps automatically.",
      de: "Sie haben aktuell die Erlaubnis erteilt, Google Maps automatisch zu laden.",
    },
    status_inactive: {
      es: "Google Maps está bloqueado por defecto.",
      "es-ar": "Google Maps está bloqueado por defecto.",
      en: "Google Maps is blocked by default.",
      de: "Google Maps ist standardmäßig blockiert.",
    },
    revoke_btn: {
      es: "Revocar permiso de Google Maps",
      "es-ar": "Revocar permiso de Google Maps",
      en: "Revoke Google Maps permission",
      de: "Google Maps Erlaubnis widerrufen",
    },
    no_consent: {
      es: "No hay consentimientos activos para mapas.",
      "es-ar": "No hay consentimientos activos para mapas.",
      en: "No active consents for maps.",
      de: "Keine aktiven Einwilligungen für Karten.",
    },
    checking: {
      es: "Comprobando estado...",
      "es-ar": "Comprobando estado...",
      en: "Checking status...",
      de: "Status wird geprüft...",
    },
  },
};

export type CookiesTranslations = FlattenTranslation<typeof translations>;
