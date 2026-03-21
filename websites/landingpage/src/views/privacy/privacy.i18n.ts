import { siteData } from "@/data/site";
import type { FlattenTranslation } from "@/lib/i18n";

export const translations = {
  navigationLabel: {
    es: "Privacidad",
    de: "Datenschutz",
    en: "Privacy",
    it: "Privacy",
  },
  seo: {
    title: {
      es: `Política de privacidad – ${siteData.meta.name}`,
      de: `Datenschutzerklärung – ${siteData.meta.name}`,
      en: `Privacy policy – ${siteData.meta.name}`,
      it: `Informativa sulla privacy – ${siteData.meta.name}`,
    },
    description: {
      es: "Política de privacidad y protección de datos.",
      de: "Datenschutzerklärung und Informationen zum Datenschutz.",
      en: "Privacy policy and data protection information.",
      it: "Informativa sulla privacy e protezione dei dati.",
    },
  },
  title: {
    es: "Política de privacidad",
    de: "Datenschutzerklärung",
    en: "Privacy policy",
    it: "Informativa sulla privacy",
  },
  content: {
    es: "La política de privacidad se añadirá aquí.",
    de: "Die Datenschutzerklärung wird hier ergänzt.",
    en: "The privacy policy will be added here.",
    it: "L'informativa sulla privacy sarà aggiunta qui.",
  },
};

export type PrivacyTranslations = FlattenTranslation<typeof translations>;
