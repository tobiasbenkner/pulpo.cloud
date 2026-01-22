import type { FlattenTranslation } from "@/lib/i18n";

export const translations = {
  navigationLabel: {
    es: "Nosotros",
    de: "Über uns",
    en: "About",
  },
  seo: {
    title: {
      es: "Nuestra Historia | Becker & Associates",
      de: "Unsere Geschichte | Becker & Associates",
      en: "Our Story | Becker & Associates",
    },
    description: {
      es: "Desde 1999: Finanzas, Inmobiliaria y Tecnología. Una empresa familiar con visión de futuro.",
      de: "Seit 1999: Finanzen, Immobilien und Technologie. Ein Familienunternehmen mit Weitblick.",
      en: "Since 1999: Finance, Real Estate, and Technology. A family business with a vision for the future.",
    },
  },
  hero: {
    label: {
      es: "Sobre Nosotros",
      de: "Über Uns",
      en: "About Us",
    },
    headline: {
      es: "Tradición familiar e innovación tecnológica.",
      de: "Familientradition und technologische Innovation.",
      en: "Family tradition and technological innovation.",
    },
  },
  story: {
    title: {
      es: "Nuestros Orígenes",
      de: "Unsere Ursprünge",
      en: "Our Origins",
    },
    // Gründung
    p1: {
      es: "Becker nació como empresa familiar en 1999, cuando madre e hijo, dada nuestra experiencia en este sector, decidimos lanzarnos a la aventura y montar nuestro propio negocio: una oficina de Agentes Financieros de Deutsche Bank: en la práctica una especie de sucursal bancaria en régimen de franquicia.",
      de: "Becker wurde 1999 als Familienunternehmen gegründet, als Mutter und Sohn beschlossen, ihre Branchenerfahrung zu nutzen und das Abenteuer der Selbstständigkeit zu wagen: als Finanzagenten der Deutschen Bank – in der Praxis eine Art Bankfiliale im Franchise-System.",
      en: "Becker was born as a family business in 1999, when mother and son, given our experience in the sector, decided to embark on the adventure of starting our own business: a Deutsche Bank Financial Agents office—in practice, a kind of franchised bank branch.",
    },
    // Expansion Immobilien
    p2: {
      es: "Al poco tiempo decidimos ampliar la paleta de servicios para nuestros clientes, incorporando la actividad de intermediarios de la compraventa y el alquiler de propiedades inmobiliarias a través de nuestra marca Becker24.es. Acometimos esta actividad con el propósito firme de llevarla a cabo de una forma clara y transparente, a sabiendas de lo opaco que es este mercado en ocasiones, creando así una seña diferencial.",
      de: "Schon bald beschlossen wir, das Dienstleistungsangebot für unsere Kunden zu erweitern und die Vermittlung von Immobilienverkäufen und -vermietungen über unsere Marke Becker24.es aufzunehmen. Wir gingen diese Tätigkeit mit dem festen Vorsatz an, sie klar und transparent zu gestalten – im Wissen um die Undurchsichtigkeit dieses Marktes – und schufen so ein Alleinstellungsmerkmal.",
      en: "Shortly after, we decided to expand our service palette for our clients by incorporating real estate brokerage for sales and rentals through our brand Becker24.es. We undertook this activity with the firm purpose of carrying it out clearly and transparently, knowing how opaque this market can sometimes be, thus creating a differentiating mark.",
    },
    // Versicherung
    p3: {
      es: "De forma casi predestinada, tratándose de una tercera pata fundamental en la que se sustenta la economía tanto familiar como de la empresa, hicimos nuestra entrada en el mundo de los seguros. Primero, durante largos años, como mediadores exclusivos de Allianz y, de forma relativamente reciente, como Becker Insurance Broker, es decir, como corredores. Esto posibilita el ofrecer a nuestros clientes siempre la solución óptima en lo que a precio por un lado y a coberturas por otro se refiere.",
      de: "Beinahe vorherbestimmt traten wir in die Welt der Versicherungen ein – das dritte fundamentale Standbein für Familien- und Unternehmensfinanzen. Zunächst jahrelang als exklusive Vermittler der Allianz und seit Kurzem als unabhängige Makler (Becker Insurance Broker). Dies ermöglicht es uns, unseren Kunden stets die optimale Lösung in Bezug auf Preis und Deckung anzubieten.",
      en: "Almost predestined, as a third fundamental pillar underpinning both family and business economy, we entered the world of insurance. First, for many years, as exclusive agents for Allianz, and relatively recently, as Becker Insurance Broker—that is, as independent brokers. This enables us to always offer our clients the optimal solution regarding both price and coverage.",
    },
    // Technologie & Innovation
    subtitle_innovation: {
      es: "Innovación y Beevelo",
      de: "Innovation & Beevelo",
      en: "Innovation & Beevelo",
    },
    p4: {
      es: "Si algo ha caracterizado a Becker es la forma crítica en la manera de optimizar los procesos y en general la atención al cliente en los distintos campos de actuación en los que opera. Siempre con la humildad de quien aprende de quien está consolidado, pero huyendo de la zona de confort. Así, ya hace muchos años, decidimos desarrollar desde cero nuestra propia aplicación informática para la gestión de una oficina inmobiliaria basándonos en la experiencia que solo da el día a día.",
      de: "Wenn etwas Becker auszeichnet, dann ist es die kritische Art und Weise, Prozesse und den Kundenservice in unseren Tätigkeitsfeldern zu optimieren. Immer mit der Demut dessen, der von Etablierten lernt, aber stets die Komfortzone meidend. So entschieden wir uns schon vor vielen Jahren, unsere eigene Software für das Immobilienmanagement von Grund auf neu zu entwickeln, basierend auf der Erfahrung, die nur das Tagesgeschäft bietet.",
      en: "If anything has characterized Becker, it is our critical approach to optimizing processes and customer service across our fields of operation. Always with the humility of one who learns from the established, but fleeing the comfort zone. Thus, many years ago, we decided to develop our own software for real estate office management from scratch, based on the experience that only day-to-day work provides.",
    },
    p5: {
      es: "Recientemente hemos dado el paso también a permitir el acceso a esta tecnología a otros profesionales del sector a través de Beevelo. Destacan en ella su simplicidad, competitividad en el precio y sobre todo: la posibilidad de publicar en los principales portales inmobiliarios de forma completamente flexible y directa a través de nuestro Club Beevelo.",
      de: "Kürzlich haben wir den Schritt gewagt, diese Technologie über Beevelo auch anderen Branchenprofis zugänglich zu machen. Sie zeichnet sich durch Einfachheit, wettbewerbsfähige Preise und vor allem durch die Möglichkeit aus, über unseren Club Beevelo völlig flexibel und direkt auf den wichtigsten Immobilienportalen zu veröffentlichen.",
      en: "Recently, we have also taken the step to allow other professionals in the sector access to this technology through Beevelo. It stands out for its simplicity, price competitiveness, and above all: the possibility of publishing on major real estate portals in a completely flexible and direct way through our Club Beevelo.",
    },
    // Identität
    p6: {
      es: "Cabe destacar también que, dada nuestra ascendencia alemana y la habitualidad en el manejo del inglés, hemos podido consolidarnos como gestores de referencia para el público noreuropeo.",
      de: "Hervorzuheben ist auch, dass wir uns aufgrund unserer deutschen Abstammung und unserer Englischkenntnisse als Referenzverwalter für das nordeuropäische Publikum etablieren konnten.",
      en: "It is also worth noting that, given our German heritage and fluency in English, we have established ourselves as reference managers for the Northern European public.",
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
        title: { es: "Transparencia", de: "Transparenz", en: "Transparency" },
        desc: { 
          es: "Combatimos la opacidad del mercado con claridad absoluta.", 
          de: "Wir bekämpfen Marktundurchsichtigkeit mit absoluter Klarheit.",
          en: "We combat market opacity with absolute clarity."
        }
      },
      integrity: {
        title: { es: "Independencia", de: "Unabhängigkeit", en: "Independence" },
        desc: { 
          es: "Como corredores, buscamos la mejor opción para usted, no para la aseguradora.", 
          de: "Als Makler suchen wir die beste Option für Sie, nicht für den Versicherer.",
          en: "As brokers, we seek the best option for you, not for the insurer."
        }
      },
      excellence: {
        title: { es: "Tecnología", de: "Technologie", en: "Technology" },
        desc: { 
          es: "Desarrollamos nuestras propias herramientas para ser más eficientes.", 
          de: "Wir entwickeln unsere eigenen Tools, um effizienter zu sein.",
          en: "We develop our own tools to be more efficient."
        }
      }
    }
  },
  cta: {
    text: {
      es: "¿Hablamos?",
      de: "Sprechen wir?",
      en: "Shall we talk?",
    },
    button: {
      es: "Contactar",
      de: "Kontakt",
      en: "Contact",
    }
  }
};

export type AboutTranslations = FlattenTranslation<typeof translations>;