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
    password: {
      es: "Contraseña (mín. 8 caracteres)",
      de: "Passwort (min. 8 Zeichen)",
      en: "Password (min. 8 characters)",
      it: "Password (min. 8 caratteri)",
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
      es: "¡Cuenta creada!",
      de: "Konto erstellt!",
      en: "Account created!",
      it: "Account creato!",
    },
    message: {
      es: "Revisa tu email para verificar tu cuenta. Después puedes iniciar sesión.",
      de: "Prüfe deine E-Mail, um dein Konto zu bestätigen. Danach kannst du dich anmelden.",
      en: "Check your email to verify your account. Then you can log in.",
      it: "Controlla la tua email per verificare il tuo account. Poi puoi accedere.",
    },
  },
  hasAccount: {
    es: "¿Ya tienes cuenta?",
    de: "Schon ein Konto?",
    en: "Already have an account?",
    it: "Hai già un account?",
  },
  loginLink: {
    es: "Iniciar sesión",
    de: "Anmelden",
    en: "Log in",
    it: "Accedi",
  },
};

export type SignupTranslations = FlattenTranslation<typeof translations>;
