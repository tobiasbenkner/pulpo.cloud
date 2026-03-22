import { siteData } from "@/data/site";
import type { FlattenTranslation } from "@/lib/i18n";

const { pricing } = siteData;
const overage = String(pricing.overage).replace(".", ",");
const overageFormatted = `${overage}${pricing.currency}`;
const lastPlan = pricing.plans[pricing.plans.length - 1];
const maxInvoices = lastPlan.invoices.toLocaleString("de-DE");

export const translations = {
  navigationLabel: {
    es: "Precios",
    de: "Preise",
    en: "Pricing",
    it: "Prezzi",
  },
  seo: {
    title: {
      es: `Precios – ${siteData.meta.name}`,
      de: `Preise – ${siteData.meta.name}`,
      en: `Pricing – ${siteData.meta.name}`,
      it: `Prezzi – ${siteData.meta.name}`,
    },
    description: {
      es: "Precios basados en uso. Empieza gratis, paga según creces.",
      de: "Nutzungsbasierte Preise. Starte kostenlos, zahle wenn du wächst.",
      en: "Usage-based pricing. Start free, pay as you grow.",
      it: "Prezzi basati sull'uso. Inizia gratis, paga man mano che cresci.",
    },
  },
  hero: {
    title: {
      es: "Paga según creces",
      de: "Zahle wenn du wächst",
      en: "Pay as you grow",
      it: "Paga man mano che cresci",
    },
    subtitle: {
      es: "Todas las funciones incluidas. Sin límites artificiales. Solo pagas según el número de facturas que generas al mes.",
      de: "Alle Funktionen inklusive. Keine künstlichen Limits. Du zahlst nur nach der Anzahl der Rechnungen, die du im Monat erstellst.",
      en: "All features included. No artificial limits. You only pay based on the number of invoices you generate per month.",
      it: "Tutte le funzionalità incluse. Nessun limite artificiale. Paghi solo in base al numero di fatture che generi al mese.",
    },
  },
  allFeatures: {
    es: "Todas las funciones incluidas",
    de: "Alle Funktionen inklusive",
    en: "All features included",
    it: "Tutte le funzionalità incluse",
  },
  invoicesPerMonth: {
    es: "facturas/mes",
    de: "Rechnungen/Monat",
    en: "invoices/month",
    it: "fatture/mese",
  },
  perMonth: {
    es: "/mes",
    de: "/Monat",
    en: "/month",
    it: "/mese",
  },
  upTo: {
    es: "hasta",
    de: "bis",
    en: "up to",
    it: "fino a",
  },
  perInvoice: {
    es: "por factura",
    de: "pro Rechnung",
    en: "per invoice",
    it: "per fattura",
  },
  thenPerInvoice: {
    es: `Después: +${overageFormatted} por factura adicional`,
    de: `Danach: +${overageFormatted} pro weitere Rechnung`,
    en: `Then: +${overageFormatted} per additional invoice`,
    it: `Poi: +${overageFormatted} per fattura aggiuntiva`,
  },
  planNames: {
    free: { es: "Free", de: "Free", en: "Free", it: "Free" },
    starter: { es: "Starter", de: "Starter", en: "Starter", it: "Starter" },
    business: {
      es: "Business",
      de: "Business",
      en: "Business",
      it: "Business",
    },
    growth: { es: "Growth", de: "Growth", en: "Growth", it: "Growth" },
    scale: { es: "Scale", de: "Scale", en: "Scale", it: "Scale" },
  },
  cta: {
    es: "Empezar gratis",
    de: "Kostenlos starten",
    en: "Start for free",
    it: "Inizia gratis",
  },
  openSource: {
    title: {
      es: "100% Open Source",
      de: "100% Open Source",
      en: "100% Open Source",
      it: "100% Open Source",
    },
    description: {
      es: "Pulpo es open source. Puedes instalarlo en tu propio servidor y usarlo gratis, sin límites. La nube es solo para quien prefiere no preocuparse por el hosting.",
      de: "Pulpo ist Open Source. Du kannst es auf deinem eigenen Server installieren und kostenlos nutzen, ohne Limits. Die Cloud ist für alle, die sich nicht um Hosting kümmern wollen.",
      en: "Pulpo is open source. You can install it on your own server and use it for free, without limits. The cloud is for those who prefer not to worry about hosting.",
      it: "Pulpo è open source. Puoi installarlo sul tuo server e usarlo gratuitamente, senza limiti. Il cloud è per chi preferisce non preoccuparsi dell'hosting.",
    },
  },
  faq: {
    title: {
      es: "Preguntas frecuentes",
      de: "Häufige Fragen",
      en: "Frequently asked questions",
      it: "Domande frequenti",
    },
    items: [
      {
        question: {
          es: "¿Qué cuenta como factura?",
          de: "Was zählt als Rechnung?",
          en: "What counts as an invoice?",
          it: "Cosa conta come fattura?",
        },
        answer: {
          es: "Cada ticket, factura completa o rectificativa que generas cuenta como una factura.",
          de: "Jedes Ticket, jede vollständige Rechnung und jede Korrekturrechnung zählt als eine Rechnung.",
          en: "Every ticket, full invoice or credit note you generate counts as one invoice.",
          it: "Ogni scontrino, fattura completa o nota di credito che generi conta come una fattura.",
        },
      },
      {
        question: {
          es: "¿Qué pasa si supero mi límite?",
          de: "Was passiert, wenn ich mein Limit überschreite?",
          en: "What happens if I exceed my limit?",
          it: "Cosa succede se supero il mio limite?",
        },
        answer: {
          es: `Tu plan se ajusta automáticamente al siguiente nivel. Si superas las ${maxInvoices} facturas, se cobra ${overageFormatted} por factura adicional.`,
          de: `Dein Plan wird automatisch auf die nächste Stufe angepasst. Ab ${maxInvoices} Rechnungen werden ${overageFormatted} pro weitere Rechnung berechnet.`,
          en: `Your plan automatically adjusts to the next tier. Beyond ${maxInvoices} invoices, each additional invoice costs ${pricing.currency}${pricing.overage}.`,
          it: `Il tuo piano si adegua automaticamente al livello successivo. Oltre le ${maxInvoices} fatture, ogni fattura aggiuntiva costa ${overageFormatted}.`,
        },
      },
      {
        question: {
          es: "¿Hay permanencia?",
          de: "Gibt es eine Vertragsbindung?",
          en: "Is there a contract?",
          it: "C'è un vincolo contrattuale?",
        },
        answer: {
          es: "No. Cancela en cualquier momento. Sin penalizaciones.",
          de: "Nein. Jederzeit kündbar. Keine Strafgebühren.",
          en: "No. Cancel at any time. No penalties.",
          it: "No. Cancella in qualsiasi momento. Nessuna penale.",
        },
      },
      {
        question: {
          es: "¿Puedo instalar Pulpo en mi propio servidor?",
          de: "Kann ich Pulpo auf meinem eigenen Server installieren?",
          en: "Can I install Pulpo on my own server?",
          it: "Posso installare Pulpo sul mio server?",
        },
        answer: {
          es: "Sí. Pulpo es 100% open source. Todas las funciones están disponibles en la versión self-hosted, sin coste.",
          de: "Ja. Pulpo ist 100% Open Source. Alle Funktionen sind in der Self-Hosted-Version verfügbar, kostenlos.",
          en: "Yes. Pulpo is 100% open source. All features are available in the self-hosted version, at no cost.",
          it: "Sì. Pulpo è 100% open source. Tutte le funzionalità sono disponibili nella versione self-hosted, senza costi.",
        },
      },
    ],
  },
};

export type PricingTranslations = FlattenTranslation<typeof translations>;
