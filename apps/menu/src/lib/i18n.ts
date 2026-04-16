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
  // Allergens — keys match icon filenames in /allergens/*.svg
  gluten: { es: "Gluten", de: "Gluten", en: "Gluten", it: "Glutine", ca: "Gluten", fr: "Gluten" },
  crustaceans: { es: "Crustáceos", de: "Krebstiere", en: "Crustaceans", it: "Crostacei", ca: "Crustacis", fr: "Crustacés" },
  eggs: { es: "Huevos", de: "Eier", en: "Eggs", it: "Uova", ca: "Ous", fr: "Œufs" },
  fish: { es: "Pescado", de: "Fisch", en: "Fish", it: "Pesce", ca: "Peix", fr: "Poisson" },
  peanuts: { es: "Cacahuetes", de: "Erdnüsse", en: "Peanuts", it: "Arachidi", ca: "Cacauets", fr: "Arachides" },
  soybeans: { es: "Soja", de: "Soja", en: "Soybeans", it: "Soia", ca: "Soja", fr: "Soja" },
  milk: { es: "Lácteos", de: "Milch", en: "Milk", it: "Latte", ca: "Làctics", fr: "Lait" },
  nuts: { es: "Frutos secos", de: "Schalenfrüchte", en: "Nuts", it: "Frutta a guscio", ca: "Fruits secs", fr: "Fruits à coque" },
  celery: { es: "Apio", de: "Sellerie", en: "Celery", it: "Sedano", ca: "Api", fr: "Céleri" },
  mustard: { es: "Mostaza", de: "Senf", en: "Mustard", it: "Senape", ca: "Mostassa", fr: "Moutarde" },
  sesame: { es: "Sésamo", de: "Sesam", en: "Sesame", it: "Sesamo", ca: "Sèsam", fr: "Sésame" },
  sulphites: { es: "Sulfitos", de: "Sulfite", en: "Sulphites", it: "Solfiti", ca: "Sulfits", fr: "Sulfites" },
  lupin: { es: "Altramuces", de: "Lupinen", en: "Lupin", it: "Lupini", ca: "Tramussos", fr: "Lupin" },
  molluscs: { es: "Moluscos", de: "Weichtiere", en: "Molluscs", it: "Molluschi", ca: "Mol·luscs", fr: "Mollusques" },
};

export function t(key: string, lang: string): string {
  const entry = translations[key];
  if (!entry) return key;
  return entry[lang] || entry["es"] || key;
}

export function getLang(url: URL, defaultLang: string): string {
  return url.searchParams.get("lang") || defaultLang;
}
