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
      es: "Vive noches inolvidables en Las Palmas, copas, música, baile y conexiones que se convierten en historias.",
      en: "Experience unforgettable nights in Las Palmas - where every drink, every song, and every encounter creates lasting memories.",
    },
  },
  hero: {
    title: {
      es: "Cada Fiesta, Una Historia",
      en: "Every Party, A Story...",
    },
    subtitle: {
      es: "Vive noches inolvidables en Las Palmas, copas, música, baile y conexiones que se convierten en historias.",
      en: "Experience unforgettable nights in Las Palmas - where every drink, every song, and every encounter creates lasting memories.",
    },
  },
  testimonial: {
    quote: {
      es: "Baila, ríe, vive y aprovecha cada momento… la vida puede ser genial si la disfrutas.",
      en: "Dance, laugh, live — make every moment count… life's amazing if you let it be.",
    },
    author: {
      es: "Jose - Hola Canteras Club",
      en: "Jose - Hola Canteras Club",
    },
  },
  drinks: {
    title: {
      es: "Bebidas que hacen fiesta",
      en: "Drinks that steal the show",
    },
    description: {
      es: "Ya sea una cerveza fría, una bebida sin alcohol con sabor a frutas, un cóctel bien preparado o cualquier cosa que te apetezca en ese momento, las bebidas de nuestro bar serán protagonistas clave de tu noche. Si de verdad quieres divertirte —como dice alguien muy sabio—, ten en cuenta que las mejores historias no se escriben con una botellita de agua 😉",
      en: "Whether it's a cold beer, a fruity soft drink, a perfectly mixed cocktail, or anything else you're craving, the drinks at our bar will be one of the main stars of your evening. And if you really want to have fun — as someone wise once said — remember that the best stories don't usually start with a little bottle of water 😉",
    },
  },
  uniqueEvents: {
    title: {
      es: "Fiestas únicas",
      en: "Unique Parties",
    },
    description: {
      es: "Cada fiesta es un universo distinto. Desde noches latinas hasta fiestas retro y temáticas, transformamos el espacio para crear historias únicas. ¿Quieres escribir la tuya? También puedes alquilar la sala para tus eventos privados.",
      en: "Every party is its own universe. From Latin nights to retro and themed parties, we transform the space to create unique stories. Want to write yours? The venue is also available for private events.",
    },
  },
  networking: {
    title: {
      es: "Conoce nuevos amigos o ven con los tuyos",
      en: "Meet new friends or bring your own",
    },
    description: {
      es: "En Hola Canteras Club, el ambiente perfecto para conocer gente nueva o divertirte con tu grupo. Copas, música e historias por vivir.",
      en: "At Hola Canteras Club, find the perfect vibe whether you're looking to meet new people or party with your crew. Drinks, music and stories to share.",
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
        es: "¡Increíble ambiente y variedad de eventos! Fui a una fiesta retro de los 90 y luego a una noche de baile latino... ¡en la misma semana!",
        en: "Unreal vibe and insane variety! Hit a '90s retro party and a Latin dance night... IN THE SAME WEEK!",
      },
      author: {
        es: "Maria G.G.",
        en: "Maria G.G.",
      },
    },
    review2: {
      text: {
        es: "El evento de los 80s fue una bomba de nostalgia y ritmo. Sonaron todos los clásicos del pop, como Michael Jackson.",
        en: "The 80s event was a blast of nostalgia and rhythm. All the classic pop hits played, including Michael Jackson.",
      },
      author: {
        es: "Paula",
        en: "Paula",
      },
    },
    review3: {
      text: {
        es: "¡Este lugar nunca decepciona! La semana pasada fui y quedé alucinado con la mezcla de ritmos vintage y beats modernos.",
        en: "This place never disappoints! I went last week and was blown away by the mix of vintage rhythms and modern beats.",
      },
      author: {
        es: "Mario",
        en: "Mario",
      },
    },
  },
  agenda: {
    title: {
      es: "Nuestra agenda semanal",
      en: "Our weekly schedule",
    },
    eventTitle: {
      es: "Sábado Latino",
      en: "Latin Saturday",
    },
    eventTime: {
      es: "20:00 - 02:00",
      en: "20:00 - 02:00",
    },
    eventDescription: {
      es: "Cada sábado, Fiesta. Gente de Todo el Mundo hablando en Salsa y susurrando en Bachata.",
      en: "Every Saturday, Party. People from all over the world speaking in Salsa and whispering in Bachata.",
    },
  },
  contact: {
    title: {
      es: "Encuéntranos",
      en: "Find us",
    },
    addressLabel: {
      es: "Dirección",
      en: "Address",
    },
    emailLabel: {
      es: "Email",
      en: "Email",
    },
    hoursLabel: {
      es: "Horario",
      en: "Opening Hours",
    },
    hoursText: {
      es: "Sábado: 20:00 - 02:00",
      en: "Saturday: 20:00 - 02:00",
    },
    viewOnMap: {
      es: "Ver en Google Maps",
      en: "View on Google Maps",
    },
  },
};

export type HomeTranslations = FlattenTranslation<typeof translations>;
