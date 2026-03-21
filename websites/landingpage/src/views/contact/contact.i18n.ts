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
      es: "¿Tienes preguntas o quieres una demo? Escríbenos y te respondemos lo antes posible.",
      de: "Hast du Fragen oder möchtest eine Demo? Schreib uns und wir melden uns schnellstmöglich.",
      en: "Have questions or want a demo? Write to us and we'll get back to you as soon as possible.",
      it: "Hai domande o vuoi una demo? Scrivici e ti rispondiamo il prima possibile.",
    },
  },
  email: {
    label: {
      es: "Correo electrónico",
      de: "E-Mail",
      en: "Email",
      it: "E-mail",
    },
  },
};

export type ContactTranslations = FlattenTranslation<typeof translations>;
