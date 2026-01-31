import type { FlattenTranslation } from "@/lib/i18n";

export const translations = {
  navigationLabel: {
    pl: "Strona główna",
    en: "Home",
  },
  seo: {
    title: {
      pl: "Lumera",
      en: "Lumera",
    },
    description: {
      pl: "Lumera",
      en: "Lumera",
    },
  },
};

export type HomeTranslations = FlattenTranslation<typeof translations>;
