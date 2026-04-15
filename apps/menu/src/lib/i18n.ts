const translations: Record<string, Record<string, string>> = {
  menu: {
    es: "Carta",
    de: "Speisekarte",
    en: "Menu",
    it: "Menu",
    ca: "Carta",
    fr: "Menu",
  },
  contact: {
    es: "Contacto",
    de: "Kontakt",
    en: "Contact",
    it: "Contatto",
    ca: "Contacte",
    fr: "Contact",
  },
  openingHours: {
    es: "Horario",
    de: "Öffnungszeiten",
    en: "Opening Hours",
    it: "Orario",
    ca: "Horari",
    fr: "Horaires",
  },
  phone: {
    es: "Teléfono",
    de: "Telefon",
    en: "Phone",
    it: "Telefono",
    ca: "Telèfon",
    fr: "Téléphone",
  },
  email: {
    es: "Correo",
    de: "E-Mail",
    en: "Email",
    it: "Email",
    ca: "Correu",
    fr: "Email",
  },
  address: {
    es: "Dirección",
    de: "Adresse",
    en: "Address",
    it: "Indirizzo",
    ca: "Adreça",
    fr: "Adresse",
  },
  followUs: {
    es: "Síguenos",
    de: "Folge uns",
    en: "Follow us",
    it: "Seguici",
    ca: "Segueix-nos",
    fr: "Suivez-nous",
  },
  allCategories: {
    es: "Todo",
    de: "Alles",
    en: "All",
    it: "Tutto",
    ca: "Tot",
    fr: "Tout",
  },
  loading: {
    es: "Cargando...",
    de: "Laden...",
    en: "Loading...",
    it: "Caricamento...",
    ca: "Carregant...",
    fr: "Chargement...",
  },
  imprint: {
    es: "Aviso legal",
    de: "Impressum",
    en: "Legal Notice",
    it: "Note legali",
    ca: "Avís legal",
    fr: "Mentions légales",
  },
  privacy: {
    es: "Privacidad",
    de: "Datenschutz",
    en: "Privacy",
    it: "Privacy",
    ca: "Privadesa",
    fr: "Confidentialité",
  },
  monday: { es: "Lunes", de: "Montag", en: "Monday", it: "Lunedì", ca: "Dilluns", fr: "Lundi" },
  tuesday: { es: "Martes", de: "Dienstag", en: "Tuesday", it: "Martedì", ca: "Dimarts", fr: "Mardi" },
  wednesday: { es: "Miércoles", de: "Mittwoch", en: "Wednesday", it: "Mercoledì", ca: "Dimecres", fr: "Mercredi" },
  thursday: { es: "Jueves", de: "Donnerstag", en: "Thursday", it: "Giovedì", ca: "Dijous", fr: "Jeudi" },
  friday: { es: "Viernes", de: "Freitag", en: "Friday", it: "Venerdì", ca: "Divendres", fr: "Vendredi" },
  saturday: { es: "Sábado", de: "Samstag", en: "Saturday", it: "Sabato", ca: "Dissabte", fr: "Samedi" },
  sunday: { es: "Domingo", de: "Sonntag", en: "Sunday", it: "Domenica", ca: "Diumenge", fr: "Dimanche" },
  closed: { es: "Cerrado", de: "Geschlossen", en: "Closed", it: "Chiuso", ca: "Tancat", fr: "Fermé" },
};

export function t(key: string, lang: string): string {
  const entry = translations[key];
  if (!entry) return key;
  return entry[lang] || entry["es"] || key;
}

export function getLang(url: URL, defaultLang: string): string {
  return url.searchParams.get("lang") || defaultLang;
}
