import type { FlattenTranslation } from "@/lib/i18n";

export const translations = {
  navigationLabel: {
    es: "Inicio",
    de: "Start",
    en: "Home",
  },
  seo: {
    title: {
      es: "Becker & Associates | Finanzas, Inmobiliaria, Seguros",
      de: "Becker & Associates | Finanzen, Immobilien, Versicherungen",
      en: "Becker & Associates | Finance, Real Estate, Insurance",
    },
    description: {
      es: "Agentes financieros de Deutsche Bank, servicios inmobiliarios y correduría de seguros en la Costa del Sol.",
      de: "Finanzagenten der Deutschen Bank, Immobiliendienstleistungen und Versicherungsmakler an der Costa del Sol.",
      en: "Deutsche Bank financial agents, real estate services, and insurance brokers on the Costa del Sol.",
    },
  },
  hero: {
    label: {
      es: "Becker & Associates",
      de: "Becker & Associates",
      en: "Becker & Associates",
    },
    headline: {
      es: "Finanzas. Inmobiliaria. Seguros.",
      de: "Finanzen. Immobilien. Versicherungen.",
      en: "Finance. Real Estate. Insurance.",
    },
    subheadline: {
      es: "Tres áreas, un solo socio de confianza. Desde 1999.",
      de: "Drei Bereiche, ein vertrauenswürdiger Partner. Seit 1999.",
      en: "Three areas, one trusted partner. Since 1999.",
    },
    cta: {
      es: "Nuestros Servicios",
      de: "Unsere Leistungen",
      en: "Our Services",
    },
  },
  services: {
    finance: {
      title: {
        es: "Agentes Financieros",
        de: "Finanzagenten",
        en: "Financial Agents",
      },
      subtitle: {
        es: "Deutsche Bank",
        de: "Deutsche Bank",
        en: "Deutsche Bank",
      },
      desc: {
        es: "Operamos como una oficina de Agentes Financieros de Deutsche Bank, ofreciendo la solidez de una gran entidad con un trato personal.",
        de: "Wir agieren als Finanzagentur der Deutschen Bank und bieten die Solidität eines großen Instituts mit persönlicher Betreuung.",
        en: "We operate as a Deutsche Bank Financial Agents office, offering the solidity of a major entity with personal service.",
      },
    },
    realestate: {
      title: { es: "Inmobiliaria", de: "Immobilien", en: "Real Estate" },
      subtitle: { es: "Becker24.es", de: "Becker24.es", en: "Becker24.es" },
      desc: {
        es: "Intermediación en compraventa y alquiler. Transparencia y tecnología propia para navegar el mercado inmobiliario.",
        de: "Vermittlung von Kauf und Miete. Transparenz und eigene Technologie, um den Immobilienmarkt zu navigieren.",
        en: "Brokerage in sales and rentals. Transparency and proprietary technology to navigate the real estate market.",
      },
    },
    insurance: {
      title: {
        es: "Correduría de Seguros",
        de: "Versicherungsmakler",
        en: "Insurance Broker",
      },
      subtitle: {
        es: "Becker Insurance Broker",
        de: "Becker Insurance Broker",
        en: "Becker Insurance Broker",
      },
      desc: {
        es: "Buscamos la solución óptima en precio y coberturas para proteger su patrimonio familiar y empresarial.",
        de: "Wir suchen die optimale Lösung in Preis und Deckung, um Ihr Familien- und Betriebsvermögen zu schützen.",
        en: "We seek the optimal solution in price and coverage to protect your family and business assets.",
      },
    },
  },
  synergy: {
    title: {
      es: "La ventaja de una visión 360°",
      de: "Der Vorteil einer 360°-Vision",
      en: "The advantage of a 360° vision",
    },
    desc: {
      es: "En Becker, no vemos las finanzas, los inmuebles y los seguros como islas separadas. Entendemos las interconexiones.",
      de: "Bei Becker sehen wir Finanzen, Immobilien und Versicherungen nicht als getrennte Inseln. Wir verstehen die Zusammenhänge.",
      en: "At Becker, we don't see finance, real estate, and insurance as separate islands. We understand the interconnections.",
    },
    list: {
      p1: {
        es: "Comprar una propiedad e hipotecarla con las mejores condiciones.",
        de: "Eine Immobilie kaufen und zu besten Konditionen finanzieren.",
        en: "Buy a property and finance it with the best conditions.",
      },
      p2: {
        es: "Asegurar sus activos correctamente desde el primer día.",
        de: "Ihre Vermögenswerte vom ersten Tag an richtig versichern.",
        en: "Insure your assets correctly from day one.",
      },
      p3: {
        es: "Gestionar su liquidez y sus inversiones con visión global.",
        de: "Ihre Liquidität und Investitionen mit globalem Blick verwalten.",
        en: "Manage your liquidity and investments with a global view.",
      },
    },
  },
  features: {
    y1: {
      es: "Años de Experiencia",
      de: "Jahre Erfahrung",
      en: "Years of Experience",
    },
    y2: {
      es: "Áreas de Negocio",
      de: "Geschäftsbereiche",
      en: "Business Areas",
    },
    y3: {
      es: "Enfoque Personal",
      de: "Persönlicher Fokus",
      en: "Personal Focus",
    },
  },
  cta: {
    text: {
      es: "¿Cómo podemos ayudarle hoy?",
      de: "Wie können wir Ihnen heute helfen?",
      en: "How can we help you today?",
    },
    btn: { es: "Contactar", de: "Kontakt aufnehmen", en: "Get in touch" },
  },
  intro: {
    text: {
      es: "Nacimos en 1999 como empresa familiar. Hoy combinamos esa cercanía con herramientas tecnológicas avanzadas.",
      de: "Wir wurden 1999 als Familienunternehmen gegründet. Heute verbinden wir diese Nähe mit fortschrittlichen technologischen Werkzeugen.",
      en: "We were born in 1999 as a family business. Today we combine that closeness with advanced technological tools.",
    },
    link: {
      es: "Conozca nuestra historia",
      de: "Unsere Geschichte",
      en: "Read our story",
    },
  },
};

export type HomeTranslations = FlattenTranslation<typeof translations>;
