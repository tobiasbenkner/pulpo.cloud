import { siteData } from "@/data/site";
import type { FlattenTranslation } from "@/lib/i18n";

export const translations = {
  navigationLabel: {
    es: "Verificar",
    de: "Verifizieren",
    en: "Verify",
    it: "Verifica",
  },
  seo: {
    title: {
      es: `Verificar email – ${siteData.meta.name}`,
      de: `E-Mail verifizieren – ${siteData.meta.name}`,
      en: `Verify email – ${siteData.meta.name}`,
      it: `Verifica email – ${siteData.meta.name}`,
    },
    description: {
      es: "Verificación de tu cuenta de Pulpo.",
      de: "Verifizierung deines Pulpo-Kontos.",
      en: "Verification of your Pulpo account.",
      it: "Verifica del tuo account Pulpo.",
    },
  },
  verifying: {
    es: "Verificando tu email...",
    de: "E-Mail wird verifiziert...",
    en: "Verifying your email...",
    it: "Verifica email in corso...",
  },
  success: {
    es: "Tu email ha sido verificado correctamente.",
    de: "Deine E-Mail-Adresse wurde erfolgreich bestätigt.",
    en: "Your email has been verified successfully.",
    it: "La tua email è stata verificata con successo.",
  },
  redirecting: {
    es: "Redirigiendo...",
    de: "Weiterleitung...",
    en: "Redirecting...",
    it: "Reindirizzamento...",
  },
  errorTitle: {
    es: "Error de verificación",
    de: "Verifizierungsfehler",
    en: "Verification error",
    it: "Errore di verifica",
  },
  errorMessage: {
    es: "El enlace de verificación es inválido o ha expirado.",
    de: "Der Verifizierungslink ist ungültig oder abgelaufen.",
    en: "The verification link is invalid or has expired.",
    it: "Il link di verifica non è valido o è scaduto.",
  },
  backToSignup: {
    es: "Volver a registrarse",
    de: "Zurück zur Registrierung",
    en: "Back to sign up",
    it: "Torna alla registrazione",
  },
};

export type VerifyTranslations = FlattenTranslation<typeof translations>;
