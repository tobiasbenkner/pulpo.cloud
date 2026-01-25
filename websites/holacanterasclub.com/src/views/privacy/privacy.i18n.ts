import type { FlattenTranslation } from "@/lib/i18n";

export const translations = {
  navigationLabel: {
    es: "Privacidad",
    en: "Privacy",
  },
  seo: {
    title: {
      es: "Política de Privacidad",
      en: "Privacy Policy",
    },
    description: {
      es: "Información sobre cómo tratamos sus datos personales.",
      en: "Information on how we treat your personal data.",
    },
  },
  header: {
    title: {
      es: "Política de Privacidad",
      en: "Privacy Policy",
    },
    subtitle: {
      es: "Protección de Datos",
      en: "Data Protection",
    },
  },
  content: {
    intro: {
      es: "Nos tomamos muy en serio la privacidad de nuestros clientes y visitantes. Esta Política de Privacidad describe cómo recopilamos, usamos y protegemos su información personal.",
      en: "We take the privacy of our clients and visitors very seriously. This Privacy Policy describes how we collect, use, and protect your personal information.",
    },
    h1: { es: "1. Responsable del Tratamiento", en: "1. Data Controller" },
    h2: { es: "2. Finalidad del Tratamiento", en: "2. Purpose of Processing" },
    p2_intro: {
      es: "Tratamos la información que nos facilitan las personas interesadas con el fin de:",
      en: "We process the information provided by interested persons in order to:",
    },
    p2_list: {
      l1: { es: "Gestionar los servicios solicitados.", en: "Manage requested services." },
      l2: { es: "Responder a consultas realizadas a través del formulario de contacto.", en: "Respond to inquiries made through the contact form." },
    },
    h3: { es: "3. Derechos", en: "3. Rights" },
    p3: {
      es: "Cualquier persona tiene derecho a obtener confirmación sobre si estamos tratando datos personales que les conciernan. Puede acceder, rectificar o solicitar la supresión de sus datos enviando un email.",
      en: "Anyone has the right to obtain confirmation as to whether we are processing personal data concerning them. You can access, rectify or request the deletion of your data by sending an email.",
    },
  },
};

export type PrivacyTranslations = FlattenTranslation<typeof translations>;
