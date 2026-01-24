import type { FlattenTranslation } from "@/lib/i18n";

export const translations = {
  navigationLabel: {
    es: "Contacto",
    en: "Contact",
  },
  seo: {
    title: {
      es: "Contacto",
      en: "Contact",
    },
    description: {
      es: "",
      en: "",
    },
  },
};

export type ContactTranslations = FlattenTranslation<typeof translations>;
