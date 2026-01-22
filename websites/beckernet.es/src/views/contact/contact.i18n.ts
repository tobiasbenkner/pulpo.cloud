import type { FlattenTranslation } from "@/lib/i18n";

export const translations = {
  navigationLabel: {
    es: "Contacto",
    de: "Kontakt",
    en: "Contact",
  },
  seo: {
    title: {
      es: "Contacto | Becker & Associates",
      de: "Kontakt | Becker & Associates",
      en: "Contact | Becker & Associates",
    },
    description: {
      es: "Solicite una cita personal. Asesoramiento financiero, inmobiliario y seguros en la Costa del Sol.",
      de: "Vereinbaren Sie einen persönlichen Termin. Finanz-, Immobilien- und Versicherungsberatung an der Costa del Sol.",
      en: "Request a personal appointment. Financial, real estate, and insurance advice on the Costa del Sol.",
    },
  },
  hero: {
    label: { es: "Contacto", de: "Kontakt", en: "Contact" },
    headline: {
        es: "Hablemos de su futuro.",
        de: "Sprechen wir über Ihre Zukunft.",
        en: "Let's talk about your future.",
    }
  },
  intro: {
    headline: {
      es: "Atención personalizada y discreta.",
      de: "Persönliche und diskrete Betreuung.",
      en: "Personalized and discrete attention.",
    },
    text: {
      es: "Entendemos que los asuntos financieros e inmobiliarios requieren confianza y claridad. Ya sea que esté buscando invertir, asegurar su patrimonio o necesite gestión bancaria, nuestro equipo está listo para ofrecerle una solución a medida. Respondemos a todas las consultas con la máxima confidencialidad.",
      de: "Wir verstehen, dass Finanz- und Immobilienangelegenheiten Vertrauen und Klarheit erfordern. Egal, ob Sie investieren möchten, Ihr Vermögen absichern wollen oder Bankdienstleistungen benötigen, unser Team steht bereit, um Ihnen eine maßgeschneiderte Lösung zu bieten. Wir beantworten alle Anfragen mit höchster Vertraulichkeit.",
      en: "We understand that financial and real estate matters require trust and clarity. Whether you are looking to invest, insure your assets, or need banking management, our team is ready to offer you a tailored solution. We respond to all inquiries with the utmost confidentiality.",
    }
  },
  actions: {
    call: {
      title: { es: "Llámenos", de: "Rufen Sie uns an", en: "Call Us" },
      desc: { es: "Atención inmediata en horario de oficina.", de: "Sofortige Betreuung zu Bürozeiten.", en: "Immediate attention during office hours." },
      btn: { es: "Llamar ahora", de: "Jetzt anrufen", en: "Call now" }
    },
    email: {
      title: { es: "Escríbanos", de: "Schreiben Sie uns", en: "Write to us" },
      desc: { es: "Responderemos en menos de 24 horas.", de: "Wir antworten in weniger als 24 Stunden.", en: "We will respond within 24 hours." },
      btn: { es: "Enviar Email", de: "E-Mail senden", en: "Send Email" }
    }
  },
  info: {
    visit: {
        title: { es: "Visítenos", de: "Besuchen Sie uns", en: "Visit Us" },
        desc: { 
            es: "Nuestras oficinas están diseñadas para ofrecerle privacidad y comodidad.",
            de: "Unsere Büros sind darauf ausgelegt, Ihnen Privatsphäre und Komfort zu bieten.",
            en: "Our offices are designed to offer you privacy and comfort."
        }
    },
    address: { es: "Dirección", de: "Adresse", en: "Address" },
    hoursLabel: { es: "Horario", de: "Öffnungszeiten", en: "Hours" },
    appointmentNote: {
        es: "Para su comodidad únicamente con cita previa",
        de: "Zu Ihrem Komfort nur nach Vereinbarung",
        en: "For your convenience by appointment only"
    },
    days: { es: "Lunes - Viernes", de: "Montag - Freitag", en: "Monday - Friday" }
  },
  map: {
    loadMap: { es: "Cargar Mapa", de: "Karte laden", en: "Load Map" },
    address: {
      es: "Al hacer clic, acepta la carga de datos de Google Maps.",
      de: "Mit Klick akzeptieren Sie das Laden von Daten von Google Maps.",
      en: "By clicking, you agree to load data from Google Maps.",
    },
  },
};

export type ContactTranslations = FlattenTranslation<typeof translations>;