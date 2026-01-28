import type { FlattenTranslation } from "../../lib/i18n";

export const translations = {
  navigationLabel: {
    es: "Contacto",
    "es-ar": "Contacto",
    en: "Contact",
    de: "Kontakt",
  },
  seo: {
    title: {
      es: "Contacto | El Búho Tuerto",
      "es-ar": "Contacto | El Búho Tuerto",
      en: "Contact | El Búho Tuerto",
      de: "Kontakt | El Búho Tuerto",
    },
    description: {
      es: "Reserva tu mesa en El Búho Tuerto. Encuéntranos en C. Tomás Miller 13, Las Palmas de Gran Canaria.",
      "es-ar": "Reservá tu mesa en El Búho Tuerto. Encontranos en C. Tomás Miller 13, Las Palmas de Gran Canaria.",
      en: "Book your table at El Búho Tuerto. Find us at C. Tomás Miller 13, Las Palmas de Gran Canaria.",
      de: "Reservieren Sie Ihren Tisch im El Búho Tuerto. Finden Sie uns in C. Tomás Miller 13, Las Palmas de Gran Canaria.",
    },
  },
  title: {
    es: "Contacto",
    "es-ar": "Contacto",
    en: "Contact",
    de: "Kontakt",
  },
  subtitle: {
    es: "Estamos aquí para ti",
    "es-ar": "Estamos acá para vos",
    en: "We are here for you",
    de: "Wir sind für Sie da",
  },
  location: {
    es: "Ubicación",
    "es-ar": "Ubicación",
    en: "Location",
    de: "Standort",
  },
  follow: {
    es: "Síguenos",
    "es-ar": "Seguinos",
    en: "Follow us",
    de: "Folge uns",
  },
  schedule: {
    es: "Horario",
    "es-ar": "Horario",
    en: "Schedule",
    de: "Öffnungszeiten",
  },
  phone: {
    es: "Teléfono",
    "es-ar": "Teléfono",
    en: "Phone",
    de: "Telefon",
  },
  email: {
    es: "Correo",
    "es-ar": "Correo",
    en: "Email",
    de: "E-Mail",
  },
  whatsapp: {
    es: "WhatsApp",
    "es-ar": "WhatsApp",
    en: "WhatsApp",
    de: "WhatsApp",
  },
};

export type ContactTranslations = FlattenTranslation<typeof translations>;
