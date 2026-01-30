import type { FlattenTranslation } from "../../lib/i18n";

const contentEs = `
<p>
  En cumplimiento con el deber de información recogido en artículo 10 de
  la Ley 34/2002, de 11 de julio, de Servicios de la Sociedad de la
  Información y del Comercio Electrónico, a continuación se reflejan los
  siguientes datos:
</p>

<h3>1. Datos Identificativos</h3>
<p>
  El titular de este sitio web es <strong
    >[Nombre de la Empresa S.L. o Autónomo]</strong
  > (en adelante, "El Búho Tuerto"), con domicilio en Calle de la Gastronomía
  12, 35001 Las Palmas de Gran Canaria, y con C.I.F. número [B-12345678].
  Correo electrónico de contacto: hola@elbuho.com.
</p>

<h3>2. Usuarios</h3>
<p>
  El acceso y/o uso de este portal de El Búho Tuerto atribuye la
  condición de USUARIO, que acepta, desde dicho acceso y/o uso, las
  Condiciones Generales de Uso aquí reflejadas.
</p>

<h3>3. Uso del Portal</h3>
<p>
  El sitio web proporciona el acceso a multitud de informaciones,
  servicios, programas o datos (en adelante, "los contenidos") en
  Internet pertenecientes a El Búho Tuerto. El USUARIO asume la
  responsabilidad del uso del portal. Dicha responsabilidad se extiende
  al registro que fuese necesario para acceder a determinados servicios
  o contenidos.
</p>

<h3>4. Propiedad Intelectual e Industrial</h3>
<p>
  El Búho Tuerto por sí o como cesionaria, es titular de todos los
  derechos de propiedad intelectual e industrial de su página web, así
  como de los elementos contenidos en la misma (a título enunciativo,
  imágenes, sonido, audio, vídeo, software o textos; marcas o logotipos,
  combinaciones de colores, estructura y diseño, etc.). Todos los
  derechos reservados.
</p>

<h3>5. Exclusión de Garantías y Responsabilidad</h3>
<p>
  El Búho Tuerto no se hace responsable, en ningún caso, de los daños y
  perjuicios de cualquier naturaleza que pudieran ocasionar, a título
  enunciativo: errores u omisiones en los contenidos, falta de
  disponibilidad del portal o la transmisión de virus o programas
  maliciosos o lesivos en los contenidos, a pesar de haber adoptado
  todas las medidas tecnológicas necesarias para evitarlo.
</p>

<h3>6. Legislación Aplicable y Jurisdicción</h3>
<p>
  La relación entre El Búho Tuerto y el USUARIO se regirá por la
  normativa española vigente y cualquier controversia se someterá a los
  Juzgados y tribunales de la ciudad de Las Palmas de Gran Canaria.
</p>
`;

export const translations = {
  navigationLabel: {
    es: "Aviso Legal",
    "es-ar": "Aviso Legal",
    en: "Legal Notice",
    de: "Impressum",
  },
  seo: {
    title: {
      es: "Aviso Legal | El Búho Tuerto",
      "es-ar": "Aviso Legal | El Búho Tuerto",
      en: "Legal Notice | El Búho Tuerto",
      de: "Impressum | El Búho Tuerto",
    },
    description: {
      es: "Aviso Legal e información corporativa.",
      "es-ar": "Aviso Legal e información corporativa.",
      en: "Legal Notice and corporate information.",
      de: "Impressum und Unternehmensinformationen.",
    },
  },
  title: {
    es: "Aviso Legal",
    "es-ar": "Aviso Legal",
    en: "Legal Notice",
    de: "Impressum",
  },
  subtitle: {
    es: "Información Corporativa",
    "es-ar": "Información Corporativa",
    en: "Corporate Information",
    de: "Unternehmensinformationen",
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
    en: contentEs, // TODO: Translate
    de: contentEs, // TODO: Translate
  },
};

export type LegalTranslations = FlattenTranslation<typeof translations>;
