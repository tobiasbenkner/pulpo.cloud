import { siteData } from "@/data/site";
import type { FlattenTranslation } from "@/lib/i18n";

export const translations = {
  navigationLabel: {
    es: "Login",
    de: "Login",
    en: "Login",
    it: "Login",
  },
  seo: {
    title: {
      es: `Login – ${siteData.meta.name}`,
      de: `Login – ${siteData.meta.name}`,
      en: `Login – ${siteData.meta.name}`,
      it: `Login – ${siteData.meta.name}`,
    },
    description: {
      es: "Inicia sesión en tu cuenta de Pulpo.",
      de: "Melde dich bei deinem Pulpo-Konto an.",
      en: "Log in to your Pulpo account.",
      it: "Accedi al tuo account Pulpo.",
    },
  },
  title: {
    es: "Iniciar sesión",
    de: "Anmelden",
    en: "Log in",
    it: "Accedi",
  },
  email: {
    es: "Email",
    de: "E-Mail",
    en: "Email",
    it: "Email",
  },
  password: {
    es: "Contraseña",
    de: "Passwort",
    en: "Password",
    it: "Password",
  },
  submit: {
    es: "Iniciar sesión",
    de: "Anmelden",
    en: "Log in",
    it: "Accedi",
  },
  noAccount: {
    es: "¿No tienes cuenta?",
    de: "Noch kein Konto?",
    en: "Don't have an account?",
    it: "Non hai un account?",
  },
  signupLink: {
    es: "Regístrate gratis",
    de: "Kostenlos registrieren",
    en: "Sign up for free",
    it: "Registrati gratis",
  },
  errorInvalidCredentials: {
    es: "Email o contraseña incorrectos.",
    de: "E-Mail oder Passwort falsch.",
    en: "Invalid email or password.",
    it: "Email o password errati.",
  },
  errorUnverified: {
    es: "Por favor, confirma tu email antes de iniciar sesión. Revisa tu bandeja de entrada.",
    de: "Bitte bestätige zuerst deine E-Mail-Adresse. Prüfe deinen Posteingang.",
    en: "Please verify your email address before logging in. Check your inbox.",
    it: "Per favore, conferma il tuo indirizzo email prima di accedere. Controlla la tua casella di posta.",
  },
};

export type LoginTranslations = FlattenTranslation<typeof translations>;
