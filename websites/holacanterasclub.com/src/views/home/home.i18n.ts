import type { FlattenTranslation } from "@/lib/i18n";

export const translations = {
  navigationLabel: {
    es: "Inicio",
    en: "Home",
  },
  seo: {
    title: {
      es: "Hola Canteras Club - Cada Fiesta, Una Historia",
      en: "Hola Canteras Club - Every Party, A Story",
    },
    description: {
      es: "El mejor club de Las Palmas de Gran Canaria. Eventos únicos, bebidas premium y una atmósfera inigualable en Las Canteras.",
      en: "The best club in Las Palmas de Gran Canaria. Unique events, premium drinks, and an unmatched atmosphere in Las Canteras.",
    },
  },
  hero: {
    title: {
      es: "Cada Fiesta, Una Historia",
      en: "Every Party, A Story",
    },
    subtitle: {
      es: "Vive experiencias únicas en el corazón de Las Canteras. Un lugar donde cada noche se convierte en un recuerdo inolvidable.",
      en: "Live unique experiences in the heart of Las Canteras. A place where every night becomes an unforgettable memory.",
    },
  },
  testimonial: {
    quote: {
      es: "Hola Canteras Club no es solo un lugar para bailar, es un espacio donde se crean conexiones auténticas y momentos que perduran. Cada evento está diseñado para que vivas algo especial.",
      en: "Hola Canteras Club is not just a place to dance, it's a space where authentic connections and lasting moments are created. Every event is designed for you to experience something special.",
    },
    author: {
      es: "Jose, Club",
      en: "Jose, Club",
    },
  },
  drinks: {
    title: {
      es: "Bebidas que hacen fiesta",
      en: "Drinks that make the party",
    },
    description: {
      es: "Nuestros bartenders crean cócteles únicos que complementan perfectamente la energía de cada noche. Desde clásicos reinventados hasta creaciones exclusivas, cada bebida es una experiencia en sí misma.",
      en: "Our bartenders create unique cocktails that perfectly complement the energy of every night. From reinvented classics to exclusive creations, each drink is an experience in itself.",
    },
  },
  uniqueEvents: {
    title: {
      es: "Fiestas únicas",
      en: "Unique parties",
    },
    description: {
      es: "Cada evento en Hola Canteras Club es diferente. Desde noches temáticas hasta fiestas con DJs internacionales, siempre hay algo nuevo que descubrir. No repetimos, innovamos.",
      en: "Every event at Hola Canteras Club is different. From themed nights to parties with international DJs, there's always something new to discover. We don't repeat, we innovate.",
    },
  },
  networking: {
    title: {
      es: "Conoce nuevos amigos o ven con los tuyos",
      en: "Meet new friends or come with yours",
    },
    description: {
      es: "Nuestro ambiente acogedor facilita que conozcas gente nueva mientras disfrutas de buena música y mejor compañía. Ven solo o acompañado, aquí todos encuentran su lugar.",
      en: "Our welcoming atmosphere makes it easy to meet new people while enjoying good music and even better company. Come alone or with friends, everyone finds their place here.",
    },
  },
  gallery: {
    title: {
      es: "Momentos inolvidables",
      en: "Unforgettable moments",
    },
  },
  reviews: {
    title: {
      es: "Lo que dicen nuestros clientes",
      en: "What our guests say",
    },
    review1: {
      text: {
        es: "El mejor club de Las Palmas. La atmósfera es increíble y el personal muy atento. Siempre vuelvo.",
        en: "The best club in Las Palmas. The atmosphere is incredible and the staff very attentive. I always come back.",
      },
      author: {
        es: "María G.",
        en: "María G.",
      },
    },
    review2: {
      text: {
        es: "Eventos únicos que no encuentras en ningún otro lugar. Los DJs son de primera y las bebidas excelentes.",
        en: "Unique events that you won't find anywhere else. The DJs are top-notch and the drinks excellent.",
      },
      author: {
        es: "Carlos R.",
        en: "Carlos R.",
      },
    },
    review3: {
      text: {
        es: "Un lugar perfecto para conocer gente nueva. El ambiente es muy acogedor y siempre hay buena música.",
        en: "A perfect place to meet new people. The atmosphere is very welcoming and there's always good music.",
      },
      author: {
        es: "Ana L.",
        en: "Ana L.",
      },
    },
  },
  agenda: {
    title: {
      es: "Nuestra agenda semanal",
      en: "Our weekly schedule",
    },
    specialEvents: {
      es: "Eventos especiales",
      en: "Special events",
    },
    comingSoon: {
      es: "Próximamente",
      en: "Coming soon",
    },
  },
};

export type HomeTranslations = FlattenTranslation<typeof translations>;
