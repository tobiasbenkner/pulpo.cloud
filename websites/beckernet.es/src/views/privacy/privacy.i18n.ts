import type { FlattenTranslation } from "@/lib/i18n";

export const translations = {
  seo: {
    title: {
      es: "Política de Privacidad",
      de: "Datenschutzerklärung",
      en: "Privacy Policy",
    },
    description: {
      es: "Detalles sobre nuestra política de privacidad.",
      de: "Details zu unserer Datenschutzerklärung.",
      en: "Details about our privacy policy.",
    },
  },
  headline: {
    es: "Política de Privacidad",
    de: "Datenschutzerklärung",
    en: "Privacy Policy",
  },
  mapConsent: {
    title: {
      es: "Consentimiento de Google Maps",
      de: "Google Maps Zustimmung",
      en: "Google Maps Consent",
    },
    description: {
      es: "Ha consentido la carga de Google Maps. Puede revocar este consentimiento aquí.",
      de: "Sie haben dem Laden von Google Maps zugestimmt. Sie können diese Zustimmung hier widerrufen.",
      en: "You have consented to loading Google Maps. You can revoke this consent here.",
    },
    button: {
      es: "Revocar Consentimiento de Mapas",
      de: "Karten-Zustimmung widerrufen",
      en: "Revoke Maps Consent",
    },
  },
};

export type PrivacyTranslations = FlattenTranslation<typeof translations>;