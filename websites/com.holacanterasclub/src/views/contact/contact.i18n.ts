import type { FlattenTranslation } from "@/lib/i18n";

export const translations = {
  navigationLabel: {
    es: "Contacto",
    en: "Contact",
  },
  seo: {
    title: {
      es: "Contacto - Hola Canteras Club",
      en: "Contact - Hola Canteras Club",
    },
    description: {
      es: "Ponte en contacto con Hola Canteras Club. Estamos en el corazón de Las Canteras, Las Palmas de Gran Canaria.",
      en: "Get in touch with Hola Canteras Club. We're located in the heart of Las Canteras, Las Palmas de Gran Canaria.",
    },
  },
  hero: {
    title: {
      es: "¿Hablamos?",
      en: "Let's Talk!",
    },
    subtitle: {
      es: "Estamos aquí para ti. Ya sea para reservar, preguntar o simplemente saludar.",
      en: "We're here for you. Whether to book, ask questions, or just say hello.",
    },
  },
  intro: {
    title: {
      es: "Tu próxima historia empieza aquí",
      en: "Your next story starts here",
    },
    text1: {
      es: "En Hola Canteras Club creemos que las mejores noches comienzan con una buena conversación. Por eso, queremos escucharte. ¿Tienes una pregunta? ¿Quieres reservar para un grupo? ¿O simplemente quieres saber qué evento viene este fin de semana?",
      en: "At Hola Canteras Club, we believe the best nights start with a good conversation. That's why we want to hear from you. Have a question? Want to book for a group? Or just curious about what's happening this weekend?",
    },
    text2: {
      es: "Nuestro equipo está siempre dispuesto a ayudarte. Respondemos rápido porque sabemos que la vida es corta y las fiestas no esperan.",
      en: "Our team is always ready to help. We respond quickly because we know life is short and parties don't wait.",
    },
  },
  reasons: {
    title: {
      es: "¿Por qué contactarnos?",
      en: "Why contact us?",
    },
    reason1: {
      title: {
        es: "Reservas de grupo",
        en: "Group bookings",
      },
      text: {
        es: "¿Vienes con amigos, familia o compañeros de trabajo? Podemos preparar algo especial para vosotros.",
        en: "Coming with friends, family, or colleagues? We can prepare something special for you.",
      },
    },
    reason2: {
      title: {
        es: "Eventos privados",
        en: "Private events",
      },
      text: {
        es: "Cumpleaños, despedidas, celebraciones... Nuestro espacio puede ser tuyo por una noche.",
        en: "Birthdays, farewells, celebrations... Our space can be yours for a night.",
      },
    },
    reason3: {
      title: {
        es: "Colaboraciones",
        en: "Collaborations",
      },
      text: {
        es: "¿Eres DJ, artista o tienes una idea de evento? Nos encanta descubrir nuevos talentos.",
        en: "Are you a DJ, artist, or have an event idea? We love discovering new talent.",
      },
    },
    reason4: {
      title: {
        es: "Sugerencias",
        en: "Suggestions",
      },
      text: {
        es: "Tu opinión nos importa. Cuéntanos cómo podemos hacer tu experiencia aún mejor.",
        en: "Your opinion matters. Tell us how we can make your experience even better.",
      },
    },
  },
  contact: {
    label: {
      es: "Contacto",
      en: "Contact",
    },
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
    viewOnMap: {
      es: "Ver en Google Maps",
      en: "View on Google Maps",
    },
    socialLabel: {
      es: "Síguenos",
      en: "Follow us",
    },
    mapLoad: {
      es: "Cargar mapa",
      en: "Load map",
    },
    mapAccept: {
      es: "Al hacer clic, acepta la transferencia de datos a Google.",
      en: "By clicking, you accept data transfer to Google.",
    },
    mapShow: {
      es: "Mostrar mapa",
      en: "Show map",
    },
  },
  cta: {
    title: {
      es: "¿Listo para vivir la experiencia?",
      en: "Ready to live the experience?",
    },
    text: {
      es: "No te quedes con las ganas. Escríbenos y te responderemos lo antes posible. Porque en Hola Canteras Club, cada mensaje es el inicio de una nueva historia.",
      en: "Don't hold back. Write to us and we'll respond as soon as possible. Because at Hola Canteras Club, every message is the beginning of a new story.",
    },
    button: {
      es: "Envíanos un email",
      en: "Send us an email",
    },
  },
};

export type ContactTranslations = FlattenTranslation<typeof translations>;
