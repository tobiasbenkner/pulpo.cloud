import type { FlattenTranslation } from "@/lib/i18n";

export const translations = {
  navigationLabel: {
    es: "Inicio",
    en: "Home",
  },
  seo: {
    title: {
      es: "Inicio",
      en: "Home",
    },
    description: {
      es: "",
      en: "",
    },
  },
};

export type HomeTranslations = FlattenTranslation<typeof translations>;
