import type { FlattenTranslation } from "@/lib/i18n";

export const translations = {
  seo: {
    title: {
      es: "Becker & Associates | Finanzas, Inmobiliaria, Seguros",
      de: "Becker & Associates | Finanzen, Immobilien, Versicherungen",
      en: "Becker & Associates | Finance, Real Estate, Insurance",
    },
    description: {
      es: "Su socio de confianza para servicios financieros, inmobiliarios y de seguros desde 1999.",
      de: "Ihr vertrauenswürdiger Partner für Finanzdienstleistungen, Immobilien und Versicherungen seit 1999.",
      en: "Your trusted partner for financial, real estate, and insurance services since 1999.",
    },
  },
  title: {
    es: "Nuestra Historia", // Habe ich etwas aussagekräftiger gemacht als "Hola"
    de: "Über uns",
    en: "Our Story",
  },
};

export type AboutTranslations = FlattenTranslation<typeof translations>;