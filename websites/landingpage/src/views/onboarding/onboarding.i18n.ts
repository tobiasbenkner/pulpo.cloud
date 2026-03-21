import { siteData } from "@/data/site";
import type { FlattenTranslation } from "@/lib/i18n";

export const translations = {
  navigationLabel: {
    es: "Onboarding",
    de: "Onboarding",
    en: "Onboarding",
    it: "Onboarding",
  },
  seo: {
    title: {
      es: `Configuración – ${siteData.meta.name}`,
      de: `Einrichtung – ${siteData.meta.name}`,
      en: `Setup – ${siteData.meta.name}`,
      it: `Configurazione – ${siteData.meta.name}`,
    },
    description: {
      es: "Completa los datos de tu negocio.",
      de: "Vervollständige deine Geschäftsdaten.",
      en: "Complete your business details.",
      it: "Completa i dati della tua attività.",
    },
  },
  title: {
    es: "Configura tu negocio",
    de: "Richte dein Geschäft ein",
    en: "Set up your business",
    it: "Configura la tua attività",
  },
  subtitle: {
    es: "Completa los datos de tu negocio para que podamos configurar tu sistema.",
    de: "Vervollständige deine Geschäftsdaten, damit wir dein System einrichten können.",
    en: "Complete your business details so we can set up your system.",
    it: "Completa i dati della tua attività per poter configurare il tuo sistema.",
  },
  steps: [
    {
      es: "Rellena los datos de tu negocio",
      de: "Fülle deine Geschäftsdaten aus",
      en: "Fill in your business details",
      it: "Compila i dati della tua attività",
    },
    {
      es: "Revisamos tus datos y configuramos tu instancia",
      de: "Wir prüfen deine Daten und richten deine Instanz ein",
      en: "We review your details and set up your instance",
      it: "Esaminiamo i tuoi dati e configuriamo la tua istanza",
    },
    {
      es: "Recibes un email con tus datos de acceso",
      de: "Du bekommst eine E-Mail mit deinen Zugangsdaten",
      en: "You receive an email with your login details",
      it: "Ricevi un'email con i tuoi dati di accesso",
    },
  ],
  fields: {
    businessName: {
      label: { es: "Nombre comercial", de: "Geschäftsname", en: "Business name", it: "Nome commerciale" },
      placeholder: { es: "Bar La Esquina", de: "Café Sonnenschein", en: "The Corner Café", it: "Bar L'Angolo" },
    },
    legalName: {
      label: { es: "Razón social", de: "Firmenname", en: "Legal name", it: "Ragione sociale" },
      placeholder: { es: "La Esquina S.L.", de: "Sonnenschein GmbH", en: "Corner Café Ltd.", it: "L'Angolo S.r.l." },
    },
    nif: {
      label: { es: "NIF / CIF", de: "NIF / CIF", en: "Tax ID (NIF)", it: "NIF / CIF" },
      placeholder: { es: "B12345678", de: "B12345678", en: "B12345678", it: "B12345678" },
    },
    address: {
      label: { es: "Dirección", de: "Adresse", en: "Address", it: "Indirizzo" },
      placeholder: { es: "Calle Mayor 1", de: "Hauptstraße 1", en: "1 Main Street", it: "Via Roma 1" },
    },
    postalCode: {
      label: { es: "Código postal", de: "Postleitzahl", en: "Postal code", it: "CAP" },
      placeholder: { es: "28001", de: "28001", en: "28001", it: "28001" },
    },
    city: {
      label: { es: "Ciudad", de: "Stadt", en: "City", it: "Città" },
      placeholder: { es: "Madrid", de: "Madrid", en: "Madrid", it: "Madrid" },
    },
    phone: {
      label: { es: "Teléfono", de: "Telefon", en: "Phone", it: "Telefono" },
      placeholder: { es: "+34 600 000 000", de: "+34 600 000 000", en: "+34 600 000 000", it: "+34 600 000 000" },
    },
    businessType: {
      label: { es: "Tipo de negocio", de: "Art des Geschäfts", en: "Business type", it: "Tipo di attività" },
      options: {
        gastro: { es: "Gastronomía", de: "Gastronomie", en: "Gastronomy", it: "Gastronomia" },
        retail: { es: "Comercio", de: "Einzelhandel", en: "Retail", it: "Commercio" },
        other: { es: "Otro", de: "Sonstiges", en: "Other", it: "Altro" },
      },
    },
  },
  submit: {
    es: "Guardar datos",
    de: "Daten speichern",
    en: "Save details",
    it: "Salva dati",
  },
  saved: {
    title: {
      es: "¡Datos guardados!",
      de: "Daten gespeichert!",
      en: "Details saved!",
      it: "Dati salvati!",
    },
    message: {
      es: "Estamos preparando tu sistema. Te avisaremos por email cuando esté listo.",
      de: "Wir richten dein System ein. Wir benachrichtigen dich per E-Mail, wenn alles bereit ist.",
      en: "We're setting up your system. We'll notify you by email when it's ready.",
      it: "Stiamo preparando il tuo sistema. Ti avviseremo via email quando sarà pronto.",
    },
  },
  logout: {
    es: "Cerrar sesión",
    de: "Abmelden",
    en: "Log out",
    it: "Esci",
  },
  postalCodeHint: {
    es: "Tu región fiscal se detecta automáticamente.",
    de: "Deine Steuerregion wird automatisch erkannt.",
    en: "Your tax region is detected automatically.",
    it: "La tua regione fiscale viene rilevata automaticamente.",
  },
};

export type OnboardingTranslations = FlattenTranslation<typeof translations>;
