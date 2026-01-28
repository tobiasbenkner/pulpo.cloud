import type { FlattenTranslation } from "@/lib/i18n";

export const translations = {
  navigationLabel: {
    es: "Aviso Legal",
    en: "Legal Notice",
  },
  seo: {
    title: {
      es: "Aviso Legal",
      en: "Legal Notice",
    },
    description: {
      es: "Información legal y condiciones de uso.",
      en: "Legal information and terms of use.",
    },
  },
  header: {
    title: {
      es: "Aviso Legal",
      en: "Legal Notice",
    },
    subtitle: {
      es: "Información Corporativa",
      en: "Corporate Information",
    },
  },
  content: {
    intro: {
      es: "En cumplimiento con el deber de información recogido en la normativa vigente de Servicios de la Sociedad de la Información y del Comercio Electrónico, a continuación se reflejan los siguientes datos:",
      en: "In compliance with the duty of information contained in current regulations on Information Society Services and Electronic Commerce, the following data is reflected below:",
    },
    h1: { es: "1. Datos Identificativos", en: "1. Identification Data" },
    p1: {
      es: "El titular de este sitio web es:",
      en: "The owner of this website is:",
    },
    h2: { es: "2. Usuarios", en: "2. Users" },
    p2: {
      es: "El acceso y/o uso de este portal atribuye la condición de USUARIO, que acepta, desde dicho acceso y/o uso, las Condiciones Generales de Uso aquí reflejadas.",
      en: "Access and/or use of this portal attributes the condition of USER, who accepts, from said access and/or use, the General Conditions of Use reflected herein.",
    },
    h3: { es: "3. Propiedad Intelectual", en: "3. Intellectual Property" },
    p3: {
      es: "Todos los contenidos del sitio web (textos, fotografías, gráficos, imágenes, tecnología, software, así como su diseño gráfico y códigos fuente) constituyen una obra cuya propiedad pertenece a la empresa, sin que puedan entenderse cedidos al usuario ninguno de los derechos de explotación sobre los mismos.",
      en: "All contents of the website (texts, photographs, graphics, images, technology, software, as well as its graphic design and source codes) constitute a work whose ownership belongs to the company, without any of the exploitation rights over them being understood to be assigned to the user.",
    },
    h4: { es: "4. Exclusión de Garantías", en: "4. Exclusion of Guarantees" },
    p4: {
      es: "La empresa no se hace responsable, en ningún caso, de los daños y perjuicios de cualquier naturaleza que pudieran ocasionar, a título enunciativo: errores u omisiones en los contenidos, falta de disponibilidad del portal o la transmisión de virus o programas maliciosos.",
      en: "The company is not responsible, in any case, for damages of any nature that could cause, by way of example: errors or omissions in the contents, lack of availability of the portal or the transmission of viruses or malicious programs.",
    }
  }
};

export type LegalTranslations = FlattenTranslation<typeof translations>;
