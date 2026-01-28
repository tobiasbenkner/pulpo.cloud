import type { FlattenTranslation } from "../../lib/i18n";

export const translations = {
  navigationLabel: {
    es: "Menu",
    "es-ar": "Carta",
    en: "Menu",
    de: "Speisekarte",
  },
  seo: {
    title: {
      es: "Carta | El Búho Tuerto",
      "es-ar": "Carta | El Búho Tuerto",
      en: "Menu | El Búho Tuerto",
      de: "Speisekarte | El Búho Tuerto",
    },
    description: {
      es: "Descubre nuestra carta con los mejores cortes de carne argentina, empanadas caseras y vinos Malbec.",
      "es-ar": "Descubrí nuestra carta con los mejores cortes de carne argentina, empanadas caseras y vinos Malbec.",
      en: "Discover our menu featuring the finest Argentine beef cuts, homemade empanadas, and Malbec wines.",
      de: "Entdecken Sie unsere Speisekarte mit den besten argentinischen Fleischstücken, hausgemachten Empanadas und Malbec-Weinen.",
    },
  },
  title: {
    es: "Nuestra Carta",
    "es-ar": "Nuestra Carta",
    en: "Our Menu",
    de: "Unsere Speisekarte",
  },
  subtitle: {
    es: "Sabores auténticos de Argentina",
    "es-ar": "Sabores auténticos de Argentina",
    en: "Authentic flavors from Argentina",
    de: "Authentische Aromen aus Argentinien",
  },
};

export type MenuTranslations = FlattenTranslation<typeof translations>;
