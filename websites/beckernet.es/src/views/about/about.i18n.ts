import type { FlattenTranslation } from "@/lib/i18n";

export const translations = {
  seo: {
    title: {
      es: "Nuestra Historia | Becker & Associates",
      de: "Unsere Geschichte | Becker & Associates",
      en: "Our Story | Becker & Associates",
    },
    description: {
      es: "Conozca la historia de Becker & Associates, su socio de confianza desde 1999.",
      de: "Lernen Sie die Geschichte von Becker & Associates kennen, Ihr Partner seit 1999.",
      en: "Learn about the history of Becker & Associates, your trusted partner since 1999.",
    },
  },
  hero: {
    label: {
      es: "Sobre Nosotros",
      de: "Über Uns",
      en: "About Us",
    },
    headline: {
      es: "Más de 25 años de excelencia y confianza.",
      de: "Über 25 Jahre Exzellenz und Vertrauen.",
      en: "Over 25 years of excellence and trust.",
    },
    intro: {
      es: "Becker & Associates fue fundada con una visión clara: ofrecer asesoramiento integral y transparente en un mundo financiero complejo.",
      de: "Becker & Associates wurde mit einer klaren Vision gegründet: umfassende und transparente Beratung in einer komplexen Finanzwelt zu bieten.",
      en: "Becker & Associates was founded with a clear vision: to provide comprehensive and transparent advice in a complex financial world.",
    },
  },
  history: {
    title: {
      es: "Nuestra Trayectoria",
      de: "Unser Werdegang",
      en: "Our Journey",
    },
    p1: {
      es: "Fundada en 1999, nuestra firma comenzó como un pequeño despacho enfocado en la atención personalizada. A lo largo de las décadas, hemos crecido junto con nuestros clientes, adaptándonos a los cambios del mercado inmobiliario y financiero.",
      de: "Gegründet im Jahr 1999, begann unsere Firma als kleine Kanzlei mit Fokus auf persönliche Betreuung. Über die Jahrzehnte sind wir mit unseren Kunden gewachsen und haben uns an die Veränderungen des Immobilien- und Finanzmarktes angepasst.",
      en: "Founded in 1999, our firm began as a small practice focused on personalized attention. Over the decades, we have grown alongside our clients, adapting to changes in the real estate and financial markets.",
    },
    p2: {
      es: "Hoy, combinamos la tradición de un servicio al cliente excepcional con herramientas modernas para proteger y hacer crecer su patrimonio.",
      de: "Heute verbinden wir die Tradition exzellenten Kundenservice mit modernen Instrumenten, um Ihr Vermögen zu schützen und zu mehren.",
      en: "Today, we combine the tradition of exceptional customer service with modern tools to protect and grow your assets.",
    },
  },
  values: {
    title: {
      es: "Nuestros Principios",
      de: "Unsere Prinzipien",
      en: "Our Principles",
    },
    list: {
      trust: {
        title: { es: "Confianza", de: "Vertrauen", en: "Trust" },
        desc: {
          es: "La base de cada relación duradera. Operamos con total discreción.",
          de: "Die Basis jeder dauerhaften Beziehung. Wir arbeiten mit absoluter Diskretion.",
          en: "The foundation of every lasting relationship. We operate with total discretion.",
        },
      },
      integrity: {
        title: { es: "Integridad", de: "Integrität", en: "Integrity" },
        desc: {
          es: "Asesoramiento honesto, incluso cuando la verdad es incómoda.",
          de: "Ehrliche Beratung, auch wenn die Wahrheit unbequem ist.",
          en: "Honest advice, even when the truth is uncomfortable.",
        },
      },
      excellence: {
        title: { es: "Excelencia", de: "Exzellenz", en: "Excellence" },
        desc: {
          es: "No nos conformamos con el promedio. Buscamos la mejor solución para usted.",
          de: "Wir geben uns nicht mit dem Durchschnitt zufrieden. Wir suchen die beste Lösung für Sie.",
          en: "We don't settle for average. We seek the best solution for you.",
        },
      },
    },
  },
  cta: {
    text: {
      es: "¿Listo para dar el siguiente paso?",
      de: "Bereit für den nächsten Schritt?",
      en: "Ready for the next step?",
    },
    button: {
      es: "Contáctenos",
      de: "Kontaktieren Sie uns",
      en: "Contact Us",
    },
  },
};

export type AboutTranslations = FlattenTranslation<typeof translations>;
