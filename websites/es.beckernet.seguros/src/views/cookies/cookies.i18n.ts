import type { FlattenTranslation } from "@/lib/i18n";

export const translations = {
  navigationLabel: {
    es: "Cookies",
    de: "Cookies",
    en: "Cookies",
  },
  seo: {
    title: {
      es: "Política de Cookies | Becker & Associates",
      de: "Cookie-Richtlinie | Becker & Associates",
      en: "Cookies Policy | Becker & Associates",
    },
    description: {
      es: "Información sobre el uso de cookies y gestión del consentimiento.",
      de: "Informationen zur Verwendung von Cookies und zur Einwilligungsverwaltung.",
      en: "Information about cookie usage and consent management.",
    },
  },
  header: {
    title: {
      es: "Política de Cookies",
      de: "Cookie-Richtlinie",
      en: "Cookies Policy",
    },
    subtitle: {
      es: "Uso de Cookies",
      de: "Verwendung von Cookies",
      en: "Cookie Usage",
    },
  },
  content: {
    intro: {
      title: {
        es: "¿Qué son las cookies?",
        de: "Was sind Cookies?",
        en: "What are cookies?",
      },
      text: {
        es: "Una cookie es un fichero que se descarga en su ordenador al acceder a determinadas páginas web. Las cookies permiten a una página web, entre otras cosas, almacenar y recuperar información sobre los hábitos de navegación de un usuario o de su equipo.",
        de: "Ein Cookie ist eine Datei, die beim Zugriff auf bestimmte Webseiten auf Ihren Computer heruntergeladen wird. Cookies ermöglichen es einer Webseite unter anderem, Informationen über die Surfgewohnheiten eines Benutzers oder seines Computers zu speichern und abzurufen.",
        en: "A cookie is a file that is downloaded to your computer when you access certain web pages. Cookies allow a web page, among other things, to store and retrieve information about the browsing habits of a user or their equipment.",
      },
    },
    types: {
      title: {
        es: "Tipos de cookies",
        de: "Arten von Cookies",
        en: "Types of Cookies",
      },
      text: {
        es: "Esta página web utiliza los siguientes tipos de cookies:",
        de: "Diese Website verwendet folgende Arten von Cookies:",
        en: "This website uses the following types of cookies:",
      },
      l1: {
        es: "Cookies técnicas (necesarias para la navegación).",
        de: "Technische Cookies (notwendig für die Navigation).",
        en: "Technical cookies (necessary for navigation).",
      },
      l2: {
        es: "Cookies de terceros (Google Maps).",
        de: "Cookies von Drittanbietern (Google Maps).",
        en: "Third-party cookies (Google Maps).",
      },
    },
    maps: {
      title: {
        es: "Gestión de Google Maps",
        de: "Google Maps verwalten",
        en: "Manage Google Maps",
      },
      text: {
        es: "Esta página web utiliza servicios de terceros para mostrar mapas interactivos. Si aceptó la carga automática, se guardó un consentimiento en su navegador.",
        de: "Diese Webseite nutzt Dienste von Dritten, um interaktive Karten anzuzeigen. Wenn Sie das automatische Laden akzeptiert haben, wurde eine Zustimmung in Ihrem Browser gespeichert.",
        en: "This website uses third-party services to display interactive maps. If you accepted automatic loading, a consent was saved in your browser.",
      },
      status_check: {
        es: "Comprobando estado...",
        de: "Status wird geprüft...",
        en: "Checking status...",
      },
      status_active: {
        es: "Actualmente tiene activada la carga automática de mapas.",
        de: "Das automatische Laden von Karten ist derzeit aktiviert.",
        en: "Automatic map loading is currently enabled.",
      },
      status_inactive: {
        es: "Google Maps está bloqueado por defecto.",
        de: "Google Maps ist standardmäßig blockiert.",
        en: "Google Maps is blocked by default.",
      },
      btn_revoke: {
        es: "Revocar permiso de Google Maps",
        de: "Google Maps Erlaubnis widerrufen",
        en: "Revoke Google Maps permission",
      },
      msg_inactive: {
        es: "No hay consentimientos activos para mapas.",
        de: "Keine aktiven Zustimmungen für Karten.",
        en: "No active consents for maps.",
      },
    },
  },
};

export type CookiesTranslations = FlattenTranslation<typeof translations>;
