import type { FlattenTranslation } from "@/lib/i18n";

export const translations = {
  navigationLabel: {
    pl: "Kontakt",
    en: "Contact",
  },
  seo: {
    title: {
      pl: "Kontakt — Lumera",
      en: "Contact — Lumera",
    },
    description: {
      pl: "Zamów swój artystyczny portret AI. Napisz do mnie lub znajdź mnie na Instagramie.",
      en: "Book your artistic AI portrait. Reach out directly or find me on Instagram.",
    },
  },
  hero: {
    heading: {
      pl: "Twoje światło\nczeka na odkrycie",
      en: "Your light\nawaits discovery",
    },
    subheading: {
      pl: "Każdy portret zaczyna się od rozmowy. Napisz — opowiedz mi, jak chcesz się zobaczyć.",
      en: "Every portrait begins with a conversation. Write to me — tell me how you want to see yourself.",
    },
  },
  cta: {
    email: {
      pl: "Napisz do mnie",
      en: "Write to me",
    },
    emailHint: {
      pl: "Odpowiadam w ciągu 24h",
      en: "I reply within 24h",
    },
    instagram: {
      pl: "Znajdź mnie na Instagramie",
      en: "Find me on Instagram",
    },
    instagramHint: {
      pl: "Portfolio, kulisy, inspiracje",
      en: "Portfolio, behind the scenes, inspiration",
    },
    whatsapp: {
      pl: "Napisz na WhatsApp",
      en: "Message on WhatsApp",
    },
    whatsappHint: {
      pl: "Szybka odpowiedź, bez formalności",
      en: "Quick reply, no formalities",
    },
  },
  closing: {
    quote: {
      pl: "Nie musisz wiedzieć, czego szukasz.\nWystarczy, że chcesz się zobaczyć inaczej.",
      en: "You don't need to know what you're looking for.\nYou just need to want to see yourself differently.",
    },
  },
};

export type ContactTranslations = FlattenTranslation<typeof translations>;
