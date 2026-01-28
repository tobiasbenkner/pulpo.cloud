import type { FlattenTranslation } from "@/lib/i18n";

export const translations = {
  navigationLabel: {
    es: "Cookies",
    en: "Cookies",
  },
  seo: {
    title: {
      es: "Política de Cookies",
      en: "Cookies Policy",
    },
    description: {
      es: "Información sobre el uso de cookies y gestión del consentimiento.",
      en: "Information about cookie usage and consent management.",
    },
  },
  header: {
    title: {
      es: "Política de Cookies",
      en: "Cookies Policy",
    },
    subtitle: {
      es: "Uso de Cookies",
      en: "Cookie Usage",
    },
  },
  content: {
    intro: {
      title: {
        es: "¿Qué son las cookies?",
        en: "What are cookies?",
      },
      text: {
        es: "Una cookie es un fichero que se descarga en su ordenador al acceder a determinadas páginas web. Las cookies permiten a una página web, entre otras cosas, almacenar y recuperar información sobre los hábitos de navegación de un usuario o de su equipo.",
        en: "A cookie is a file that is downloaded to your computer when you access certain web pages. Cookies allow a web page, among other things, to store and retrieve information about the browsing habits of a user or their equipment.",
      },
    },
    types: {
      title: {
        es: "Tipos de cookies",
        en: "Types of Cookies",
      },
      text: {
        es: "Esta página web utiliza los siguientes tipos de cookies:",
        en: "This website uses the following types of cookies:",
      },
      l1: {
        es: "Cookies técnicas (necesarias para la navegación).",
        en: "Technical cookies (necessary for navigation).",
      },
      l2: {
        es: "Cookies de terceros (Google Maps).",
        en: "Third-party cookies (Google Maps).",
      },
    },
    maps: {
      title: {
        es: "Gestión de Google Maps",
        en: "Manage Google Maps",
      },
      text: {
        es: "Esta página web utiliza servicios de terceros para mostrar mapas interactivos. Si aceptó la carga automática, se guardó un consentimiento en su navegador.",
        en: "This website uses third-party services to display interactive maps. If you accepted automatic loading, a consent was saved in your browser.",
      },
      status_check: {
        es: "Comprobando estado...",
        en: "Checking status...",
      },
      status_active: {
        es: "Actualmente tiene activada la carga automática de mapas.",
        en: "Automatic map loading is currently enabled.",
      },
      status_inactive: {
        es: "Google Maps está bloqueado por defecto.",
        en: "Google Maps is blocked by default.",
      },
      btn_revoke: {
        es: "Revocar permiso de Google Maps",
        en: "Revoke Google Maps permission",
      },
      msg_inactive: {
        es: "No hay consentimientos activos para mapas.",
        en: "No active consents for maps.",
      },
    },
  },
};

export type CookiesTranslations = FlattenTranslation<typeof translations>;
