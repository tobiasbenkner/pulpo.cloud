import { siteData } from "@/data/site";
import type { FlattenTranslation } from "@/lib/i18n";

export const translations = {
  navigationLabel: {
    es: "Aviso legal",
    de: "Impressum",
    en: "Legal notice",
    it: "Note legali",
  },
  seo: {
    title: {
      es: `Aviso legal – ${siteData.meta.name}`,
      de: `Impressum – ${siteData.meta.name}`,
      en: `Legal notice – ${siteData.meta.name}`,
      it: `Note legali – ${siteData.meta.name}`,
    },
    description: {
      es: "Información legal y datos del responsable.",
      de: "Rechtliche Informationen und Angaben zum Verantwortlichen.",
      en: "Legal information and details of the responsible party.",
      it: "Informazioni legali e dati del responsabile.",
    },
  },
  title: {
    es: "Aviso legal",
    de: "Impressum",
    en: "Legal notice",
    it: "Note legali",
  },
  content: {
    es: "El contenido legal se añadirá aquí.",
    de: "Der rechtliche Inhalt wird hier ergänzt.",
    en: "Legal content will be added here.",
    it: "Il contenuto legale sarà aggiunto qui.",
  },
};

export type ImprintTranslations = FlattenTranslation<typeof translations>;
