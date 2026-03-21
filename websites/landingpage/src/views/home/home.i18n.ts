import { siteData } from "@/data/site";
import type { FlattenTranslation } from "@/lib/i18n";

export const translations = {
  navigationLabel: {
    es: "Inicio",
    de: "Home",
    en: "Home",
    it: "Home",
  },
  seo: {
    title: {
      es: `${siteData.meta.name} – TPV en la nube para tu negocio`,
      de: `${siteData.meta.name} – Cloud-Kassensystem für dein Geschäft`,
      en: `${siteData.meta.name} – Cloud POS for your business`,
      it: `${siteData.meta.name} – POS in cloud per la tua attività`,
    },
    description: {
      es: "Sistema de punto de venta moderno, rápido y fácil de usar. Gestiona ventas, inventario y facturación desde cualquier dispositivo.",
      de: "Modernes, schnelles und einfach zu bedienendes Kassensystem. Verwalte Verkäufe, Inventar und Rechnungen von jedem Gerät aus.",
      en: "Modern, fast and easy-to-use point of sale system. Manage sales, inventory and invoicing from any device.",
      it: "Sistema di punto vendita moderno, veloce e facile da usare. Gestisci vendite, inventario e fatturazione da qualsiasi dispositivo.",
    },
  },
  hero: {
    title: {
      es: "Tu punto de venta en la nube",
      de: "Dein Kassensystem in der Cloud",
      en: "Your point of sale in the cloud",
      it: "Il tuo punto vendita nel cloud",
    },
    subtitle: {
      es: "Gestiona ventas, inventario y facturación desde cualquier dispositivo. Rápido, sencillo y sin complicaciones.",
      de: "Verwalte Verkäufe, Inventar und Rechnungen von jedem Gerät aus. Schnell, einfach und unkompliziert.",
      en: "Manage sales, inventory and invoicing from any device. Fast, simple and hassle-free.",
      it: "Gestisci vendite, inventario e fatturazione da qualsiasi dispositivo. Veloce, semplice e senza complicazioni.",
    },
    cta: {
      es: "Solicitar demo",
      de: "Demo anfordern",
      en: "Request a demo",
      it: "Richiedi una demo",
    },
    secondary: {
      es: "Ver funciones",
      de: "Funktionen ansehen",
      en: "See features",
      it: "Vedi funzionalità",
    },
  },
  highlights: {
    title: {
      es: "Todo lo que necesitas",
      de: "Alles was du brauchst",
      en: "Everything you need",
      it: "Tutto ciò di cui hai bisogno",
    },
    items: [
      {
        icon: "lucide:monitor",
        title: {
          es: "Punto de venta",
          de: "Kassensystem",
          en: "Point of sale",
          it: "Punto vendita",
        },
        description: {
          es: "Cobra rápido con una interfaz intuitiva.",
          de: "Schnell kassieren mit einer intuitiven Oberfläche.",
          en: "Check out quickly with an intuitive interface.",
          it: "Incassa velocemente con un'interfaccia intuitiva.",
        },
      },
      {
        icon: "lucide:file-text",
        title: {
          es: "Facturación",
          de: "Rechnungsstellung",
          en: "Invoicing",
          it: "Fatturazione",
        },
        description: {
          es: "Genera facturas y tickets automáticamente.",
          de: "Erstelle Rechnungen und Belege automatisch.",
          en: "Generate invoices and receipts automatically.",
          it: "Genera fatture e scontrini automaticamente.",
        },
      },
      {
        icon: "lucide:bar-chart-3",
        title: {
          es: "Informes",
          de: "Berichte",
          en: "Reports",
          it: "Report",
        },
        description: {
          es: "Toma decisiones basadas en datos reales.",
          de: "Triff Entscheidungen auf Basis realer Daten.",
          en: "Make decisions based on real data.",
          it: "Prendi decisioni basate su dati reali.",
        },
      },
    ],
    cta: {
      es: "Ver todas las funciones",
      de: "Alle Funktionen ansehen",
      en: "See all features",
      it: "Vedi tutte le funzionalità",
    },
  },
  pricingTeaser: {
    title: {
      es: "Empieza gratis",
      de: "Starte kostenlos",
      en: "Start for free",
      it: "Inizia gratis",
    },
    subtitle: {
      es: `${siteData.pricing.plans[0].invoices} facturas al mes gratis. Después, desde ${siteData.pricing.plans[1].price}${siteData.pricing.currency}/mes. Todas las funciones incluidas.`,
      de: `${siteData.pricing.plans[0].invoices} Rechnungen im Monat kostenlos. Danach ab ${siteData.pricing.plans[1].price}${siteData.pricing.currency}/Monat. Alle Funktionen inklusive.`,
      en: `${siteData.pricing.plans[0].invoices} invoices per month for free. Then from ${siteData.pricing.plans[1].price}${siteData.pricing.currency}/month. All features included.`,
      it: `${siteData.pricing.plans[0].invoices} fatture al mese gratis. Poi da ${siteData.pricing.plans[1].price}${siteData.pricing.currency}/mese. Tutte le funzionalità incluse.`,
    },
    cta: {
      es: "Ver precios",
      de: "Preise ansehen",
      en: "See pricing",
      it: "Vedi prezzi",
    },
  },
  cta: {
    title: {
      es: "¿Listo para empezar?",
      de: "Bereit loszulegen?",
      en: "Ready to get started?",
      it: "Pronto per iniziare?",
    },
    subtitle: {
      es: "Escríbenos y te ayudamos a poner en marcha tu negocio.",
      de: "Schreib uns und wir helfen dir, dein Geschäft zum Laufen zu bringen.",
      en: "Get in touch and we'll help you get your business up and running.",
      it: "Scrivici e ti aiuteremo ad avviare la tua attività.",
    },
    button: {
      es: "Contactar",
      de: "Kontaktieren",
      en: "Get in touch",
      it: "Contattaci",
    },
  },
};

export type HomeTranslations = FlattenTranslation<typeof translations>;
