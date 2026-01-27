import type { FlattenTranslation } from "@/lib/i18n";

export const translations = {
  navigationLabel: {
    es: "Nuestros comienzos",
    de: "Unsere Anfänge",
    en: "Our beginnings",
  },
  seo: {
    title: {
      es: "Nuestros Comienzos | Becker Insurance Broker",
      de: "Unsere Anfänge | Becker Insurance Broker",
      en: "Our Beginnings | Becker Insurance Broker",
    },
    description: {
      es: "En 2020 tomamos la decisión de añadir la mediación de seguros a nuestra paleta de servicios. Atención personalizada y cercana.",
      de: "2020 haben wir beschlossen, Versicherungsvermittlung in unser Dienstleistungsangebot aufzunehmen. Persönliche und nahe Betreuung.",
      en: "In 2020 we decided to add insurance brokerage to our range of services. Personalized and close attention.",
    },
  },
  hero: {
    label: {
      es: "Sobre Nosotros",
      de: "Über Uns",
      en: "About Us",
    },
    headline: {
      es: "Nuestros comienzos",
      de: "Unsere Anfänge",
      en: "Our beginnings",
    },
  },
  story: {
    text: {
      es: "En nuestro constante afán de mejora y voluntad de servicio al cliente, aprovechando el parón obligado que supuso el confinamiento en 2020, tomamos la decisión en el Grupo Becker de añadir un nuevo campo a la paleta de servicios que ofrecemos a nuestros clientes: la mediación de seguros. Con una atención personalizada y muy cercana, son ya muchos los clientes beneficiados de ver gestionados sus seguros a través de un corredor de su confianza.",
      de: "In unserem ständigen Streben nach Verbesserung und unserem Willen zum Kundenservice haben wir bei der Becker-Gruppe die Zwangspause während des Lockdowns 2020 genutzt, um einen neuen Bereich zu unserem Serviceangebot hinzuzufügen: die Versicherungsvermittlung. Mit einer persönlichen und sehr nahen Betreuung profitieren bereits viele Kunden davon, ihre Versicherungen über einen vertrauenswürdigen Makler verwalten zu lassen.",
      en: "In our constant desire for improvement and willingness to serve the customer, taking advantage of the forced break that the 2020 lockdown brought, we at Grupo Becker decided to add a new field to the range of services we offer our clients: insurance brokerage. With personalized and very close attention, many clients are already benefiting from having their insurance managed through a broker they trust.",
    },
  },
  values: {
    title: {
      es: "Nuestros valores",
      de: "Unsere Werte",
      en: "Our values",
    },
    trust: {
      title: {
        es: "Confianza",
        de: "Vertrauen",
        en: "Trust",
      },
      desc: {
        es: "Trabajamos para ti, no para las aseguradoras.",
        de: "Wir arbeiten für Sie, nicht für die Versicherer.",
        en: "We work for you, not for the insurers.",
      },
    },
    personalized: {
      title: {
        es: "Atención personalizada",
        de: "Persönliche Betreuung",
        en: "Personalized attention",
      },
      desc: {
        es: "Cada cliente es único y merece soluciones a medida.",
        de: "Jeder Kunde ist einzigartig und verdient maßgeschneiderte Lösungen.",
        en: "Each client is unique and deserves tailored solutions.",
      },
    },
    proximity: {
      title: {
        es: "Cercanía",
        de: "Nähe",
        en: "Proximity",
      },
      desc: {
        es: "Estamos a tu lado en cada paso del proceso.",
        de: "Wir sind bei jedem Schritt des Prozesses an Ihrer Seite.",
        en: "We are by your side every step of the way.",
      },
    },
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
    },
  },
};

export type AboutTranslations = FlattenTranslation<typeof translations>;
