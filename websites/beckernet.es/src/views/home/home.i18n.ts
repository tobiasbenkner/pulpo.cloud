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
      es: "Consultoría Inmobiliaria. Correduría de Seguros",
      de: "Immobilienberatung. Versicherungsvermittlung",
      en: "Real Estate Consulting. Insurance Brokerage",
    },
    subheadline: {
      es: "Dos áreas, un solo socio de confianza. Desde 1999.",
      de: "Zwei Bereiche, ein vertrauenswürdiger Partner. Seit 1999.",
      en: "Two areas, one trusted partner. Since 1999.",
    },
    cta: {
      es: "Nuestros Servicios",
      de: "Unsere Leistungen",
      en: "Our Services",
    },
  },
  services: {
    realestate: {
      title: {
        es: "Consultoría Inmobiliaria Personalizada",
        de: "Personalisierte Immobilienberatung",
        en: "Personalized Real Estate Consulting",
      },
      subtitle: {
        es: "Becker 24.es",
        de: "Becker 24.es",
        en: "Becker 24.es",
      },
      desc: {
        es: "Asesoramos con dedicación para encontrar la propiedad ideal, optimizando cada paso y asegurando una inversión segura y rentable.",
        de: "Wir beraten mit Engagement, um die ideale Immobilie zu finden, optimieren jeden Schritt und sichern eine sichere und rentable Investition.",
        en: "We provide dedicated advice to find the ideal property, optimizing every step and ensuring a safe and profitable investment.",
      },
    },
    insurance: {
      title: {
        es: "Correduría de Seguros Integral",
        de: "Ganzheitliche Versicherungsvermittlung",
        en: "Comprehensive Insurance Brokerage",
      },
      subtitle: {
        es: "Becker Insurance Broker",
        de: "Becker Insurance Broker",
        en: "Becker Insurance Broker",
      },
      desc: {
        es: "Ofrecemos pólizas adaptadas a sus necesidades, protegiendo su patrimonio y brindándole la confianza que merece en todo momento.",
        de: "Wir bieten individuell angepasste Versicherungslösungen, schützen Ihr Vermögen und geben Ihnen jederzeit die Sicherheit, die Sie verdienen.",
        en: "We offer insurance policies tailored to your needs, protecting your assets and providing you with the confidence you deserve at all times.",
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
