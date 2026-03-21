import { siteData } from "@/data/site";
import type { FlattenTranslation } from "@/lib/i18n";

export const translations = {
  navigationLabel: {
    es: "Condiciones",
    de: "AGB",
    en: "Terms",
    it: "Termini",
  },
  seo: {
    title: {
      es: `Condiciones generales – ${siteData.meta.name}`,
      de: `Allgemeine Geschäftsbedingungen – ${siteData.meta.name}`,
      en: `Terms and conditions – ${siteData.meta.name}`,
      it: `Termini e condizioni – ${siteData.meta.name}`,
    },
    description: {
      es: "Condiciones generales de contratación.",
      de: "Allgemeine Geschäftsbedingungen.",
      en: "General terms and conditions.",
      it: "Termini e condizioni generali.",
    },
  },
  title: {
    es: "Condiciones generales",
    de: "Allgemeine Geschäftsbedingungen",
    en: "Terms and conditions",
    it: "Termini e condizioni",
  },
  content: {
    es: "Las condiciones generales se añadirán aquí.",
    de: "Die AGB werden hier ergänzt.",
    en: "Terms and conditions will be added here.",
    it: "I termini e le condizioni saranno aggiunti qui.",
  },
};

export type TermsTranslations = FlattenTranslation<typeof translations>;
