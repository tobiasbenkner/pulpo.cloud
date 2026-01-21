import type { FlattenTranslation } from "@/lib/i18n";

export const translations = {
  seo: {
    title: {
      es: "Contacto | Becker & Associates",
      de: "Kontakt | Becker & Associates",
      en: "Contact | Becker & Associates",
    },
    description: {
      es: "Estamos aquí para ayudarle. Contáctenos hoy.",
      de: "Wir sind hier, um Ihnen zu helfen. Kontaktieren Sie uns heute.",
      en: "We are here to help you. Contact us today.",
    },
  },
  header: {
    title: { es: "Contacto", de: "Kontakt", en: "Contact" },
    subtitle: {
      es: "Estamos a su disposición para cualquier consulta.",
      de: "Wir stehen Ihnen für alle Fragen zur Verfügung.",
      en: "We are at your disposal for any questions.",
    },
  },
  info: {
    address: { es: "Dirección", de: "Adresse", en: "Address" },
    phone: { es: "Teléfono", de: "Telefon", en: "Phone" },
    email: { es: "Email", de: "E-Mail", en: "Email" },
    hours: { es: "Horario", de: "Öffnungszeiten", en: "Hours" },
    hoursValue: {
      es: "Lun - Vie: 09:00 - 18:00",
      de: "Mo - Fr: 09:00 - 18:00",
      en: "Mon - Fri: 09:00 - 18:00",
    },
  },
  map: {
    loadMap: { es: "Cargar Mapa", de: "Karte laden", en: "Load Map" },
    address: {
      es: "Al hacer clic, acepta la carga de datos de Google Maps.",
      de: "Mit Klick akzeptieren Sie das Laden von Daten von Google Maps.",
      en: "By clicking, you agree to load data from Google Maps.",
    },
  },
};

export type ContactTranslations = FlattenTranslation<typeof translations>;
