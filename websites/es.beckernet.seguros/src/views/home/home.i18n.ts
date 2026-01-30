import type { FlattenTranslation } from "@/lib/i18n";

export const translations = {
  navigationLabel: {
    es: "Inicio",
    de: "Startseite",
    en: "Home",
  },
  seo: {
    title: {
      es: "Becker Insurance Broker | Correduría de Seguros en Las Palmas",
      de: "Becker Insurance Broker | Versicherungsmakler in Las Palmas",
      en: "Becker Insurance Broker | Insurance Brokerage in Las Palmas",
    },
    description: {
      es: "Contratar seguros a través de un corredor es la mejor manera de obtener la protección que realmente necesitas. Asesoría personalizada en Las Palmas.",
      de: "Versicherungen über einen Makler abzuschließen ist der beste Weg, den Schutz zu erhalten, den Sie wirklich brauchen. Persönliche Beratung in Las Palmas.",
      en: "Hiring insurance through a broker is the best way to get the protection you really need. Personalized advice in Las Palmas.",
    },
  },
  hero: {
    label: {
      es: "Becker Insurance Broker",
      de: "Becker Insurance Broker",
      en: "Becker Insurance Broker",
    },
    headline: {
      es: "Su corredor de seguros de confianza",
      de: "Ihr vertrauenswürdiger Versicherungsmakler",
      en: "Your trusted insurance broker",
    },
    subheadline: {
      es: "Contratar seguros a través de un corredor es la mejor manera de asegurarte de obtener la protección que realmente necesitas.",
      de: "Versicherungen über einen Makler abzuschließen ist der beste Weg, den Schutz zu erhalten, den Sie wirklich brauchen.",
      en: "Hiring insurance through a broker is the best way to ensure you get the protection you really need.",
    },
    cta: {
      es: "Conocer más",
      de: "Mehr erfahren",
      en: "Learn more",
    },
  },
  benefits: {
    title: {
      es: "¿Por qué un corredor de seguros?",
      de: "Warum ein Versicherungsmakler?",
      en: "Why an insurance broker?",
    },
    items: {
      advice: {
        title: {
          es: "Asesoría personalizada",
          de: "Persönliche Beratung",
          en: "Personalized advice",
        },
        desc: {
          es: "Los corredores de seguros te ofrecen asesoría personalizada, comparan múltiples opciones y te ayudan a elegir el plan que mejor se ajuste a tu situación.",
          de: "Versicherungsmakler bieten persönliche Beratung, vergleichen mehrere Optionen und helfen Ihnen, den Plan zu wählen, der am besten zu Ihrer Situation passt.",
          en: "Insurance brokers offer personalized advice, compare multiple options, and help you choose the plan that best fits your situation.",
        },
      },
      savings: {
        title: {
          es: "Maximizar coberturas, minimizar costos",
          de: "Deckung maximieren, Kosten minimieren",
          en: "Maximize coverage, minimize costs",
        },
        desc: {
          es: "Siempre buscando maximizar coberturas y minimizar costos para encontrar la mejor relación calidad-precio.",
          de: "Immer darauf bedacht, die Deckung zu maximieren und die Kosten zu minimieren, um das beste Preis-Leistungs-Verhältnis für Sie zu finden.",
          en: "Always seeking to maximize coverage and minimize costs to find the best value for money.",
        },
      },
      claims: {
        title: {
          es: "Gestión de siniestros",
          de: "Schadenmanagement",
          en: "Claims management",
        },
        desc: {
          es: "Con un corredor de tu lado, tienes a un experto gestionando tus siniestros, lo que te ahorra tiempo y preocupaciones.",
          de: "Mit einem Makler an Ihrer Seite haben Sie einen Experten, der Ihre Schäden verwaltet, was Ihnen Zeit und Sorgen erspart.",
          en: "With a broker on your side, you have an expert managing your claims, saving you time and worries.",
        },
      },
      independence: {
        title: {
          es: "Independencia total",
          de: "Vollständige Unabhängigkeit",
          en: "Total independence",
        },
        desc: {
          es: "Seguridad, ahorro y tranquilidad, todo de la mano de un profesional que trabaja para ti, no para las aseguradoras.",
          de: "Sicherheit, Ersparnis und Gelassenheit - alles aus der Hand eines Profis, der für Sie arbeitet, nicht für die Versicherer.",
          en: "Security, savings, and peace of mind, all from a professional who works for you, not for the insurers.",
        },
      },
    },
  },
  insurers: {
    title: {
      es: "Nuestros socios",
      de: "Unsere Partner",
      en: "Our partners",
    },
    subtitle: {
      es: "Principales aseguradoras con las que trabajamos",
      de: "Führende Versicherungsgesellschaften, mit denen wir zusammenarbeiten",
      en: "Leading insurance companies we work with",
    },
    cta: {
      es: "Ver todas las aseguradoras",
      de: "Alle Versicherer anzeigen",
      en: "View all insurers",
    },
  },
  services: {
    title: {
      es: "Tipos de seguros",
      de: "Versicherungsarten",
      en: "Types of insurance",
    },
    auto: {
      title: {
        es: "Automóviles",
        de: "Fahrzeuge",
        en: "Vehicles",
      },
      items: {
        es: ["Turismos", "Motos", "Autocaravanas"],
        de: ["PKW", "Motorräder", "Wohnmobile"],
        en: ["Cars", "Motorcycles", "Motorhomes"],
      },
    },
    property: {
      title: {
        es: "Patrimoniales",
        de: "Sachversicherungen",
        en: "Property",
      },
      items: {
        es: ["Hogar", "Mascotas", "Decesos"],
        de: ["Hausrat", "Haustiere", "Sterbegeld"],
        en: ["Home", "Pets", "Funeral"],
      },
    },
    business: {
      title: {
        es: "Empresas",
        de: "Unternehmen",
        en: "Business",
      },
      items: {
        es: ["Comercios", "Responsabilidad civil", "Accidentes colectivos"],
        de: ["Gewerbe", "Haftpflicht", "Gruppenunfälle"],
        en: ["Commercial", "Liability", "Group accidents"],
      },
    },
    health: {
      title: {
        es: "Salud",
        de: "Gesundheit",
        en: "Health",
      },
      items: {
        es: [
          "Asistencia sanitaria",
          "Seguros de reembolso",
          "Incapacidad laboral",
        ],
        de: ["Krankenversicherung", "Kostenerstattung", "Arbeitsunfähigkeit"],
        en: ["Medical assistance", "Reimbursement", "Temporary disability"],
      },
    },
    life: {
      title: {
        es: "Vida y ahorro",
        de: "Leben und Sparen",
        en: "Life and savings",
      },
      items: {
        es: ["Vida-riesgo", "Accidentes", "Vida-ahorro"],
        de: ["Risikoleben", "Unfälle", "Kapitallebensvers."],
        en: ["Term life", "Accidents", "Endowment"],
      },
    },
  },
  blog: {
    title: {
      es: "Últimos artículos",
      de: "Neueste Artikel",
      en: "Latest articles",
    },
    subtitle: {
      es: "Le mantenemos informado",
      de: "Wir halten Sie auf dem Laufenden",
      en: "We keep you informed",
    },
    empty: {
      es: "Aún no se ha escrito ningún artículo",
      de: "Es wurden noch keine Artikel verfasst",
      en: "No articles have been written yet",
    },
  },
  cta: {
    text: {
      es: "¿Cómo podemos ayudarle hoy?",
      de: "Wie können wir Ihnen heute helfen?",
      en: "How can we help you today?",
    },
    btn: {
      es: "Contactar",
      de: "Kontakt aufnehmen",
      en: "Get in touch",
    },
  },
};

export type HomeTranslations = FlattenTranslation<typeof translations>;
