import type { FlattenTranslation } from "@/lib/i18n";

export const translations = {
  navigationLabel: {
    es: "Privacidad",
    de: "Datenschutz",
    en: "Privacy",
  },
  seo: {
    title: {
      es: "Política de Privacidad | Becker & Associates",
      de: "Datenschutzerklärung | Becker & Associates",
      en: "Privacy Policy | Becker & Associates",
    },
    description: {
      es: "Información sobre cómo tratamos sus datos personales.",
      de: "Informationen darüber, wie wir Ihre persönlichen Daten verarbeiten.",
      en: "Information on how we treat your personal data.",
    },
  },
  header: {
    title: {
      es: "Política de Privacidad",
      de: "Datenschutzerklärung",
      en: "Privacy Policy",
    },
    subtitle: {
      es: "Protección de Datos",
      de: "Datenschutz",
      en: "Data Protection",
    },
  },
  content: {
    intro: {
      es: "Nos tomamos muy en serio la privacidad de nuestros clientes y visitantes. Esta Política de Privacidad describe cómo recopilamos, usamos y protegemos su información personal.",
      de: "Wir nehmen die Privatsphäre unserer Kunden und Besucher sehr ernst. Diese Datenschutzerklärung beschreibt, wie wir Ihre persönlichen Daten erfassen, verwenden und schützen.",
      en: "We take the privacy of our clients and visitors very seriously. This Privacy Policy describes how we collect, use, and protect your personal information.",
    },
    h1: { es: "1. Responsable del Tratamiento", de: "1. Verantwortlicher", en: "1. Data Controller" },
    h2: { es: "2. Finalidad del Tratamiento", de: "2. Zweck der Verarbeitung", en: "2. Purpose of Processing" },
    p2_intro: {
      es: "Tratamos la información que nos facilitan las personas interesadas con el fin de:",
      de: "Wir verarbeiten die uns von interessierten Personen zur Verfügung gestellten Informationen zu folgenden Zwecken:",
      en: "We process the information provided by interested persons in order to:",
    },
    p2_list: {
      l1: { es: "Gestionar los servicios solicitados.", de: "Verwaltung der angeforderten Dienstleistungen.", en: "Manage requested services." },
      l2: { es: "Responder a consultas realizadas a través del formulario de contacto.", de: "Beantwortung von Anfragen über das Kontaktformular.", en: "Respond to inquiries made through the contact form." },
    },
    h3: { es: "3. Derechos", de: "3. Rechte", en: "3. Rights" },
    p3: {
      es: "Cualquier persona tiene derecho a obtener confirmación sobre si estamos tratando datos personales que les conciernan. Puede acceder, rectificar o solicitar la supresión de sus datos enviando un email.",
      de: "Jede Person hat das Recht, eine Bestätigung darüber zu erhalten, ob wir personenbezogene Daten verarbeiten, die sie betreffen. Sie können auf Ihre Daten zugreifen, sie berichtigen oder deren Löschung per E-Mail beantragen.",
      en: "Anyone has the right to obtain confirmation as to whether we are processing personal data concerning them. You can access, rectify or request the deletion of your data by sending an email.",
    },
  },
};

export type PrivacyTranslations = FlattenTranslation<typeof translations>;