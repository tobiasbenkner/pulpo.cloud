import { siteData } from "@/data/site";
import type { FlattenTranslation } from "@/lib/i18n";

export const translations = {
  navigationLabel: {
    es: "Empezar gratis",
    de: "Kostenlos starten",
    en: "Start for free",
    it: "Inizia gratis",
  },
  seo: {
    title: {
      es: `Registro – ${siteData.meta.name}`,
      de: `Registrieren – ${siteData.meta.name}`,
      en: `Sign up – ${siteData.meta.name}`,
      it: `Registrazione – ${siteData.meta.name}`,
    },
    description: {
      es: "Crea tu cuenta gratuita de Pulpo. Sin tarjeta de crédito.",
      de: "Erstelle dein kostenloses Pulpo-Konto. Ohne Kreditkarte.",
      en: "Create your free Pulpo account. No credit card required.",
      it: "Crea il tuo account Pulpo gratuito. Senza carta di credito.",
    },
  },
  hero: {
    title: {
      es: "Empieza gratis",
      de: "Kostenlos starten",
      en: "Start for free",
      it: "Inizia gratis",
    },
    subtitle: {
      es: "Introduce tu email para crear tu cuenta.",
      de: "Gib deine E-Mail ein, um dein Konto zu erstellen.",
      en: "Enter your email to create your account.",
      it: "Inserisci la tua email per creare il tuo account.",
    },
  },
  form: {
    email: {
      es: "Tu email",
      de: "Deine E-Mail",
      en: "Your email",
      it: "La tua email",
    },
    submit: {
      es: "Crear cuenta",
      de: "Konto erstellen",
      en: "Create account",
      it: "Crea account",
    },
  },
  noCreditCard: {
    es: "Sin tarjeta de crédito",
    de: "Ohne Kreditkarte",
    en: "No credit card",
    it: "Senza carta di credito",
  },
  freeInvoices: {
    es: `${siteData.pricing.plans[0].invoices} facturas/mes gratis`,
    de: `${siteData.pricing.plans[0].invoices} Rechnungen/Monat kostenlos`,
    en: `${siteData.pricing.plans[0].invoices} invoices/month free`,
    it: `${siteData.pricing.plans[0].invoices} fatture/mese gratis`,
  },
  confirmation: {
    title: {
      es: "¡Revisa tu email!",
      de: "Prüfe deine E-Mail!",
      en: "Check your email!",
      it: "Controlla la tua email!",
    },
    message: {
      es: "Te enviaremos tus datos de acceso en breve.",
      de: "Wir senden dir deine Zugangsdaten in Kürze.",
      en: "We'll send you your login details shortly.",
      it: "Ti invieremo i tuoi dati di accesso a breve.",
    },
  },
};

export type SignupTranslations = FlattenTranslation<typeof translations>;
