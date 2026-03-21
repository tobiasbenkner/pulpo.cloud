import { siteData } from "@/data/site";
import type { FlattenTranslation } from "@/lib/i18n";

const { pricing } = siteData;

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
      es: "Planes y precios de Pulpo. Sin sorpresas, sin permanencia.",
      de: "Pläne und Preise von Pulpo. Keine Überraschungen, keine Bindung.",
      en: "Pulpo plans and pricing. No surprises, no lock-in.",
      it: "Piani e prezzi di Pulpo. Nessuna sorpresa, nessun vincolo.",
    },
  },
  hero: {
    title: {
      es: "Precios sencillos",
      de: "Einfache Preise",
      en: "Simple pricing",
      it: "Prezzi semplici",
    },
    subtitle: {
      es: "Sin sorpresas. Elige el plan que mejor se adapte a tu negocio.",
      de: "Keine Überraschungen. Wähle den Plan, der am besten zu deinem Geschäft passt.",
      en: "No surprises. Choose the plan that best fits your business.",
      it: "Nessuna sorpresa. Scegli il piano più adatto alla tua attività.",
    },
  },
  monthly: {
    es: "/mes",
    de: "/Monat",
    en: "/month",
    it: "/mese",
  },
  plans: [
    {
      name: {
        es: "Básico",
        de: "Basis",
        en: "Basic",
        it: "Base",
      },
      description: {
        es: "Para negocios que empiezan.",
        de: "Für Geschäfte, die gerade starten.",
        en: "For businesses just getting started.",
        it: "Per attività che iniziano.",
      },
      price: `${pricing.plans.basic.price}${pricing.currency}`,
      features: {
        es: ["Punto de venta", "Facturación", "Inventario básico", "1 usuario"],
        de: ["Kassensystem", "Rechnungsstellung", "Basis-Inventar", "1 Benutzer"],
        en: ["Point of sale", "Invoicing", "Basic inventory", "1 user"],
        it: ["Punto vendita", "Fatturazione", "Inventario base", "1 utente"],
      },
      cta: {
        es: "Empezar",
        de: "Loslegen",
        en: "Get started",
        it: "Inizia",
      },
      highlighted: false,
    },
    {
      name: {
        es: "Profesional",
        de: "Professionell",
        en: "Professional",
        it: "Professionale",
      },
      description: {
        es: "Para negocios en crecimiento.",
        de: "Für wachsende Geschäfte.",
        en: "For growing businesses.",
        it: "Per attività in crescita.",
      },
      price: `${pricing.plans.professional.price}${pricing.currency}`,
      features: {
        es: ["Todo lo del plan Básico", "Tienda online", "Informes avanzados", "Usuarios ilimitados"],
        de: ["Alles aus dem Basis-Plan", "Online-Shop", "Erweiterte Berichte", "Unbegrenzte Benutzer"],
        en: ["Everything in Basic", "Online store", "Advanced reports", "Unlimited users"],
        it: ["Tutto del piano Base", "Negozio online", "Report avanzati", "Utenti illimitati"],
      },
      cta: {
        es: "Empezar",
        de: "Loslegen",
        en: "Get started",
        it: "Inizia",
      },
      highlighted: true,
    },
  ],
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
          es: "¿Puedo cambiar de plan en cualquier momento?",
          de: "Kann ich jederzeit den Plan wechseln?",
          en: "Can I change plans at any time?",
          it: "Posso cambiare piano in qualsiasi momento?",
        },
        answer: {
          es: "Sí, puedes actualizar o reducir tu plan cuando quieras. Los cambios se aplican en el siguiente ciclo de facturación.",
          de: "Ja, du kannst deinen Plan jederzeit upgraden oder downgraden. Die Änderung gilt ab dem nächsten Abrechnungszeitraum.",
          en: "Yes, you can upgrade or downgrade your plan at any time. Changes take effect in the next billing cycle.",
          it: "Sì, puoi aggiornare o ridurre il tuo piano quando vuoi. Le modifiche si applicano nel prossimo ciclo di fatturazione.",
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
          es: "No, puedes cancelar en cualquier momento. Sin permanencia ni penalizaciones.",
          de: "Nein, du kannst jederzeit kündigen. Keine Bindung, keine Strafgebühren.",
          en: "No, you can cancel at any time. No lock-in, no penalties.",
          it: "No, puoi cancellare in qualsiasi momento. Nessun vincolo, nessuna penale.",
        },
      },
      {
        question: {
          es: "¿Qué métodos de pago aceptan?",
          de: "Welche Zahlungsmethoden akzeptiert ihr?",
          en: "What payment methods do you accept?",
          it: "Quali metodi di pagamento accettate?",
        },
        answer: {
          es: "Aceptamos tarjeta de crédito, débito y transferencia bancaria.",
          de: "Wir akzeptieren Kreditkarte, Debitkarte und Banküberweisung.",
          en: "We accept credit card, debit card and bank transfer.",
          it: "Accettiamo carta di credito, carta di debito e bonifico bancario.",
        },
      },
    ],
  },
};

export type PricingTranslations = FlattenTranslation<typeof translations>;
