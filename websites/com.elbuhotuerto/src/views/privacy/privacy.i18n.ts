import type { FlattenTranslation } from "../../lib/i18n";

const contentEs = `
<p>
  En {{tenant_name}} nos tomamos muy en serio la privacidad de nuestros
  clientes y visitantes. Esta Política de Privacidad describe cómo
  recopilamos, usamos y protegemos su información personal.
</p>

<h3>1. Responsable del Tratamiento</h3>
<p>
  <strong>Identidad:</strong> {{tenant_name}}<br />
  <strong>Dirección:</strong> {{tenant_address}}<br />
  <strong>Email:</strong> {{tenant_email}}
</p>

<h3>2. Finalidad del Tratamiento</h3>
<p>
  tratamos la información que nos facilitan las personas interesadas con
  el fin de:
</p>
<ul>
  <li>Gestionar las reservas de mesas solicitadas.</li>
  <li>
    Responder a consultas realizadas a través del formulario de
    contacto.
  </li>
  <li>
    Enviar comunicaciones comerciales sobre nuestros menús o eventos
    (solo si ha dado su consentimiento explícito).
  </li>
</ul>

<h3>3. Legitimación</h3>
<p>
  La base legal para el tratamiento de sus datos es la ejecución de la
  solicitud de reserva o el consentimiento del interesado al contactar
  con nosotros.
</p>

<h3>4. Conservación de los Datos</h3>
<p>
  Los datos personales proporcionados se conservarán mientras se
  mantenga la relación comercial o no se solicite su supresión por el
  interesado.
</p>

<h3>5. Derechos</h3>
<p>
  Cualquier persona tiene derecho a obtener confirmación sobre si en {{tenant_name}}
  estamos tratando datos personales que les conciernan. Las
  personas interesadas tienen derecho a:
</p>
<ul>
  <li>Acceder a sus datos personales.</li>
  <li>Solicitar la rectificación de los datos inexactos.</li>
  <li>
    Solicitar su supresión cuando, entre otros motivos, los datos ya no
    sean necesarios.
  </li>
  <li>Oponerse al tratamiento.</li>
</ul>
<p>
  Para ejercer estos derechos, puede enviar un correo electrónico a
  {{tenant_email}}.
</p>
`;

export const translations = {
  navigationLabel: {
    es: "Privacidad",
    "es-ar": "Privacidad",
    en: "Privacy",
    de: "Datenschutz",
  },
  seo: {
    title: {
      es: "Política de Privacidad | El Búho Tuerto",
      "es-ar": "Política de Privacidad | El Búho Tuerto",
      en: "Privacy Policy | El Búho Tuerto",
      de: "Datenschutzerklärung | El Búho Tuerto",
    },
    description: {
      es: "Política de privacidad y protección de datos.",
      "es-ar": "Política de privacidad y protección de datos.",
      en: "Privacy policy and data protection.",
      de: "Datenschutzerklärung und Datenschutz.",
    },
  },
  title: {
    es: "Privacidad",
    "es-ar": "Privacidad",
    en: "Privacy",
    de: "Datenschutz",
  },
  subtitle: {
    es: "Protección de Datos",
    "es-ar": "Protección de Datos",
    en: "Data Protection",
    de: "Datenschutz",
  },
  lastUpdate: {
    es: "Última actualización: Enero 2025",
    "es-ar": "Última actualización: Enero 2025",
    en: "Last update: January 2025",
    de: "Letzte Aktualisierung: Januar 2025",
  },
  content: {
    es: contentEs,
    "es-ar": contentEs,
    en: contentEs, // TODO: Translate and keep placeholders
    de: contentEs, // TODO: Translate and keep placeholders
  },
};

export type PrivacidadTranslations = FlattenTranslation<typeof translations>;
