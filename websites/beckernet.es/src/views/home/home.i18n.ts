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
  hero: {
    headline: {
      es: "Confianza y Experiencia desde 1999.",
      de: "Vertrauen und Erfahrung seit 1999.",
      en: "Trust and Experience since 1999.",
    },
    subheadline: {
      es: "Somos su socio para servicios financieros.",
      de: "Wir sind Ihr Partner für Finanzen.",
      // EN fehlt hier absichtlich zum Testen des Fallbacks auf ES (Default)
    },
    ctaPrimary: {
      es: "Nuestros Servicios",
      de: "Unsere Dienstleistungen",
      en: "Our Services",
    },
    ctaSecondary: {
      es: "Contáctenos",
      de: "Kontakt aufnehmen",
      en: "Contact Us",
    },
  },
  contact: {
    headline: { es: "Hablemos", de: "Sprechen wir miteinander", en: "Let's Talk" },
    subheadline: {
      es: "Estamos listos para ayudarle.",
      de: "Wir sind bereit, Ihnen zu helfen.",
      en: "We are ready to assist you.",
    },
    email: { es: "Correo Electrónico", de: "E-Mail", en: "Email" },
    phone: { es: "Teléfono", de: "Telefon", en: "Phone" },
    whatsapp: { es: "WhatsApp", de: "WhatsApp", en: "WhatsApp" },
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

export type HomeTranslations = FlattenTranslation<typeof translations>;