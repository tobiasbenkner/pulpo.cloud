import { siteData } from "@/data/site";
import type { FlattenTranslation } from "@/lib/i18n";

export const translations = {
  navigationLabel: {
    es: "Contacto",
    de: "Kontakt",
    en: "Contact",
    it: "Contatto",
  },
  seo: {
    title: {
      es: `Contacto – ${siteData.meta.name}`,
      de: `Kontakt – ${siteData.meta.name}`,
      en: `Contact – ${siteData.meta.name}`,
      it: `Contatto – ${siteData.meta.name}`,
    },
    description: {
      es: "Ponte en contacto con nosotros. Estamos aquí para ayudarte.",
      de: "Nimm Kontakt mit uns auf. Wir sind für dich da.",
      en: "Get in touch with us. We're here to help.",
      it: "Mettiti in contatto con noi. Siamo qui per aiutarti.",
    },
  },
  hero: {
    title: {
      es: "Hablemos",
      de: "Lass uns reden",
      en: "Let's talk",
      it: "Parliamone",
    },
    subtitle: {
      es: "¿Tienes preguntas o quieres una demo? Escríbenos directamente.",
      de: "Hast du Fragen oder möchtest eine Demo? Schreib uns direkt.",
      en: "Have questions or want a demo? Write to us directly.",
      it: "Hai domande o vuoi una demo? Scrivici direttamente.",
    },
  },
  email: {
    label: {
      es: "Correo electrónico",
      de: "E-Mail",
      en: "Email",
      it: "E-mail",
    },
    description: {
      es: "Escríbenos un email y te respondemos lo antes posible.",
      de: "Schreib uns eine E-Mail und wir melden uns schnellstmöglich.",
      en: "Send us an email and we'll get back to you as soon as possible.",
      it: "Scrivici un'email e ti rispondiamo il prima possibile.",
    },
    cta: {
      es: "Enviar email",
      de: "E-Mail schreiben",
      en: "Send email",
      it: "Invia email",
    },
  },
  whatsapp: {
    label: "WhatsApp",
    description: {
      es: "Escríbenos por WhatsApp para una respuesta rápida.",
      de: "Schreib uns per WhatsApp für eine schnelle Antwort.",
      en: "Message us on WhatsApp for a quick response.",
      it: "Scrivici su WhatsApp per una risposta rapida.",
    },
    cta: {
      es: "Abrir WhatsApp",
      de: "WhatsApp öffnen",
      en: "Open WhatsApp",
      it: "Apri WhatsApp",
    },
  },
  demo: {
    title: {
      es: "Prueba la demo",
      de: "Demo testen",
      en: "Try the demo",
      it: "Prova la demo",
    },
    description: {
      es: "Explora Pulpo sin compromiso. Sin registro, sin instalación.",
      de: "Entdecke Pulpo unverbindlich. Ohne Registrierung, ohne Installation.",
      en: "Explore Pulpo with no strings attached. No sign-up, no installation.",
      it: "Esplora Pulpo senza impegno. Senza registrazione, senza installazione.",
    },
    cta: {
      es: "Abrir demo",
      de: "Demo öffnen",
      en: "Open demo",
      it: "Apri demo",
    },
  },
};

export type ContactTranslations = FlattenTranslation<typeof translations>;
