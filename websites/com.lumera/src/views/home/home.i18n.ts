import type { FlattenTranslation } from "@/lib/i18n";

export const translations = {
  navigationLabel: {
    pl: "Strona główna",
    en: "Home",
  },
  seo: {
    title: {
      pl: "Lumera — AI Portrait Studio",
      en: "Lumera — AI Portrait Studio",
    },
    description: {
      pl: "Artystyczne portrety AI. Emocja ponad technikę, światło ponad perfekcję.",
      en: "Artistic AI portraits. Emotion over technique, light over perfection.",
    },
  },
  hero: {
    subtitle: {
      pl: "AI Portrait Studio",
      en: "AI Portrait Studio",
    },
    tagline: {
      pl: "To nie są filtry.\nTo nowy sposób zobaczenia siebie.",
      en: "This is not a filter.\nIt's a new way to see yourself.",
    },
    motto: {
      pl: "Emotion over technique. Light over perfection.",
      en: "Emotion over technique. Light over perfection.",
    },
  },
  about: {
    heading: {
      pl: "Idea",
      en: "The Idea",
    },
    text: {
      pl: "Lumera to artystyczne studio portretów AI.\n\nPowstała z potrzeby ciszy, światła i autentyczności. To miejsce, w którym technologia przestaje dominować, a zaczyna służyć emocji.",
      en: "Lumera is an artistic AI portrait studio.\n\nCreated from the need for silence, light and authenticity. A place where technology stops leading and starts serving emotion.",
    },
    quote: {
      pl: "Nie przestałam tworzyć. Zmieniam tylko medium.",
      en: "I didn't stop creating. I only changed the medium.",
    },
  },
  gallery: {
    heading: {
      pl: "Portfolio",
      en: "Portfolio",
    },
  },
  contact: {
    heading: {
      pl: "Kontakt",
      en: "Contact",
    },
    text: {
      pl: "Gotowa zobaczyć swoje światło?\nSkontaktuj się lub zajrzyj na Instagram.",
      en: "Ready to see your light?\nGet in touch or visit Instagram.",
    },
  },
  manifest: {
    quote: {
      pl: "Światło nie znika.\nOno tylko zmienia formę.",
      en: "Light doesn't disappear.\nIt only changes form.",
    },
    tagline: {
      pl: "Lumera — The Era of Light",
      en: "Lumera — The Era of Light",
    },
  },
};

export type HomeTranslations = FlattenTranslation<typeof translations>;
