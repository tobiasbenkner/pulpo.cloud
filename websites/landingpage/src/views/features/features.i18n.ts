import { siteData } from "@/data/site";
import type { FlattenTranslation } from "@/lib/i18n";

export const translations = {
  navigationLabel: {
    es: "Funciones",
    de: "Funktionen",
    en: "Features",
    it: "Funzionalità",
  },
  seo: {
    title: {
      es: `Funciones – ${siteData.meta.name}`,
      de: `Funktionen – ${siteData.meta.name}`,
      en: `Features – ${siteData.meta.name}`,
      it: `Funzionalità – ${siteData.meta.name}`,
    },
    description: {
      es: "Descubre todas las funciones de Pulpo: punto de venta, facturación, inventario, informes y tienda online.",
      de: "Entdecke alle Funktionen von Pulpo: Kassensystem, Rechnungsstellung, Inventar, Berichte und Online-Shop.",
      en: "Discover all Pulpo features: point of sale, invoicing, inventory, reports and online store.",
      it: "Scopri tutte le funzionalità di Pulpo: punto vendita, fatturazione, inventario, report e negozio online.",
    },
  },
  hero: {
    title: {
      es: "Todo lo que necesitas para tu negocio",
      de: "Alles was dein Geschäft braucht",
      en: "Everything your business needs",
      it: "Tutto ciò di cui la tua attività ha bisogno",
    },
    subtitle: {
      es: "Un sistema completo que crece contigo.",
      de: "Ein komplettes System, das mit dir wächst.",
      en: "A complete system that grows with you.",
      it: "Un sistema completo che cresce con te.",
    },
  },
  items: [
    {
      icon: "lucide:monitor",
      title: {
        es: "Punto de venta",
        de: "Kassensystem",
        en: "Point of sale",
        it: "Punto vendita",
      },
      description: {
        es: "Cobra rápido con una interfaz intuitiva. Compatible con lectores de código de barras, impresoras de tickets y cajones de efectivo. Gestiona múltiples métodos de pago y aplica descuentos fácilmente.",
        de: "Schnell kassieren mit einer intuitiven Oberfläche. Kompatibel mit Barcode-Scannern, Bondrucker und Kassenschubladen. Verwalte verschiedene Zahlungsmethoden und wende Rabatte einfach an.",
        en: "Check out quickly with an intuitive interface. Compatible with barcode scanners, receipt printers and cash drawers. Manage multiple payment methods and apply discounts easily.",
        it: "Incassa velocemente con un'interfaccia intuitiva. Compatibile con lettori di codici a barre, stampanti di scontrini e cassetti portasoldi. Gestisci diversi metodi di pagamento e applica sconti facilmente.",
      },
    },
    {
      icon: "lucide:file-text",
      title: {
        es: "Facturación",
        de: "Rechnungsstellung",
        en: "Invoicing",
        it: "Fatturazione",
      },
      description: {
        es: "Genera facturas y tickets automáticamente. Compatible con VeriFactu y conforme a la normativa fiscal vigente. Envía facturas por correo electrónico directamente desde el sistema.",
        de: "Erstelle Rechnungen und Belege automatisch. VeriFactu-kompatibel und konform mit den geltenden steuerlichen Vorschriften. Versende Rechnungen per E-Mail direkt aus dem System.",
        en: "Generate invoices and receipts automatically. VeriFactu-compatible and compliant with current tax regulations. Send invoices by email directly from the system.",
        it: "Genera fatture e scontrini automaticamente. Compatibile con VeriFactu e conforme alla normativa fiscale vigente. Invia fatture via e-mail direttamente dal sistema.",
      },
    },
    {
      icon: "lucide:package",
      title: {
        es: "Inventario",
        de: "Inventar",
        en: "Inventory",
        it: "Inventario",
      },
      description: {
        es: "Controla tu stock en tiempo real. Recibe alertas cuando un producto esté por agotarse. Gestiona variantes, categorías y proveedores desde un solo lugar.",
        de: "Kontrolliere deinen Bestand in Echtzeit. Erhalte Benachrichtigungen, wenn ein Produkt knapp wird. Verwalte Varianten, Kategorien und Lieferanten an einem Ort.",
        en: "Track your stock in real time. Get alerts when a product is running low. Manage variants, categories and suppliers from one place.",
        it: "Controlla il tuo magazzino in tempo reale. Ricevi avvisi quando un prodotto sta per esaurirsi. Gestisci varianti, categorie e fornitori da un unico posto.",
      },
    },
    {
      icon: "lucide:bar-chart-3",
      title: {
        es: "Informes",
        de: "Berichte",
        en: "Reports",
        it: "Report",
      },
      description: {
        es: "Visualiza ventas, beneficios y tendencias. Toma decisiones basadas en datos reales. Exporta informes en PDF o CSV para tu contabilidad.",
        de: "Visualisiere Verkäufe, Gewinne und Trends. Triff Entscheidungen auf Basis realer Daten. Exportiere Berichte als PDF oder CSV für deine Buchhaltung.",
        en: "Visualise sales, profits and trends. Make decisions based on real data. Export reports as PDF or CSV for your accounting.",
        it: "Visualizza vendite, profitti e tendenze. Prendi decisioni basate su dati reali. Esporta report in PDF o CSV per la tua contabilità.",
      },
    },
    {
      icon: "lucide:tablet-smartphone",
      title: {
        es: "Multi-dispositivo",
        de: "Multi-Gerät",
        en: "Multi-device",
        it: "Multi-dispositivo",
      },
      description: {
        es: "Funciona en tablet, móvil y ordenador. Accede desde cualquier lugar con conexión a internet. Tus datos siempre sincronizados en la nube.",
        de: "Funktioniert auf Tablet, Smartphone und Computer. Zugriff von überall mit Internetverbindung. Deine Daten sind immer in der Cloud synchronisiert.",
        en: "Works on tablet, phone and desktop. Access from anywhere with an internet connection. Your data is always synced in the cloud.",
        it: "Funziona su tablet, smartphone e computer. Accedi da qualsiasi luogo con connessione internet. I tuoi dati sono sempre sincronizzati nel cloud.",
      },
    },
    {
      icon: "lucide:shopping-cart",
      title: {
        es: "Tienda online",
        de: "Online-Shop",
        en: "Online store",
        it: "Negozio online",
      },
      description: {
        es: "Crea tu tienda online integrada con tu inventario y punto de venta físico. Un solo sistema para vender en tienda y en internet.",
        de: "Erstelle deinen Online-Shop, integriert mit deinem Inventar und der stationären Kasse. Ein System für den Verkauf im Laden und im Internet.",
        en: "Create your online store integrated with your inventory and physical point of sale. One system to sell in-store and online.",
        it: "Crea il tuo negozio online integrato con il tuo inventario e punto vendita fisico. Un unico sistema per vendere in negozio e online.",
      },
    },
  ],
  cta: {
    text: {
      es: "Ver precios",
      de: "Preise ansehen",
      en: "See pricing",
      it: "Vedi prezzi",
    },
  },
};

export type FeaturesTranslations = FlattenTranslation<typeof translations>;
