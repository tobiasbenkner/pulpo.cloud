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
};

export type LoginTranslations = FlattenTranslation<typeof translations>;
