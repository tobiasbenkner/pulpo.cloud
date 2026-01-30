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
      "es-ar":
        "Reservá tu mesa en El Búho Tuerto. Encontranos en C. Tomás Miller 13, Las Palmas de Gran Canaria.",
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
  contact_cta: {
    title: {
      es: "Contacta & Reserva",
      "es-ar": "Contacta & Reserva",
      en: "Contact & Booking",
      de: "Kontakt & Buchung",
    },
    subtitle: {
      es: "Estamos aquí para ti",
      "es-ar": "Estamos aquí para ti",
      en: "We are here for you",
      de: "Wir sind für Sie da",
    },
  },
};

export type ContactTranslations = FlattenTranslation<typeof translations>;
