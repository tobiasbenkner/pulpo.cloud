# Dashboard Redesign — Plan

## Ziel

Die bestehende Report-View (`/reports`) wird durch ein vollwertiges Dashboard ersetzt. Das Dashboard bietet Auswertungen, Rechnungsübersicht, Charts und Produktverwaltung — alles in einer eigenen Oberfläche mit Sidebar-Navigation.

---

## Phasen

### Phase 0: Grundlagen

**shadcn-svelte Setup + Sidebar-Navigation**

- shadcn-svelte installieren und konfigurieren (Tailwind v4 kompatibel)
- Neue Dashboard-Layout-Komponente mit Sidebar-Navigation
- Navigationsstruktur:
  - **Übersicht** — Dashboard-Home mit KPIs
  - **Rechnungen** — Vollständige Rechnungsliste
  - **Auswertungen** — Reports (Tag/Monat/Quartal/Jahr)
  - **Produkte** — Produktverwaltung (CRUD)
- Neue Route `/dashboard` als Einstiegspunkt
- Bestehende `/reports` bleibt zunächst unberührt (kein Breaking Change)

### Phase 1: Dashboard-Übersicht

**KPI-Karten + Charts**

- KPI-Karten: Tagesumsatz, Transaktionen, Durchschnittsbon, Bar/Karte-Verhältnis
- Line-Chart: Umsatzverlauf der letzten 7/14/30 Tage
- Bar-Chart: Umsatz nach Kostenstelle
- Doughnut/Pie: Zahlungsarten-Verteilung (Bar vs. Karte)
- Trend-Indikatoren (Vergleich mit Vorperiode)
- Datenquelle: bestehende `getReport()` API
- Ggf. neuer Backend-Endpunkt für effiziente Zeitreihen-Abfrage

### Phase 2: Rechnungsliste

**Vollständige Rechnungsübersicht**

- API existiert bereits: `getInvoices(client, query)` mit Filtern
- Tabelle mit shadcn-svelte DataTable
- Filter: Datumsbereich, Rechnungstyp (Ticket/Factura/Rectificativa), Suche nach Nummer
- Detail-Ansicht einzelner Rechnungen (Dialog oder Drawer)
- Export-Funktionalität (Excel/CSV)

### Phase 3: Auswertungen (Reports Rewrite)

**Bestehende Reports visuell aufwerten**

- Migration der bestehenden Report-Komponenten ins neue Dashboard-Layout
- Charts ergänzen (Umsatzverlauf im Monat, Produktvergleiche)
- Vergleichsfunktion: aktuelle Periode vs. Vorperiode
- Excel-Export beibehalten

### Phase 4: Produktverwaltung

**CRUD für Produkte — zunächst als Mockup**

- Produktliste mit Suche und Filter
- Produkt erstellen / bearbeiten: Name, Preis, Steuerklasse, Kategorie, Kostenstelle, Bild, Bestand
- Kategorie-Management
- Kostenstellen-Management
- Performance-Daten pro Produkt (Bestseller, Umsatz)

---

## Technologie-Entscheidungen

| Thema | Entscheidung | Begründung |
|-------|-------------|------------|
| UI-Komponenten | shadcn-svelte | Kopiert in Projekt, volle Kontrolle, Tailwind-basiert |
| Charts | Chart.js (via shadcn-svelte) | Einfache API, leichtgewichtig |
| State Management | Svelte 5 Runes (`$state`, `$derived`, `$effect`) | Nativ, kein Extra-Paket, ausreichend für Dashboard (keine localStorage-Persistenz nötig) |
| Navigation | Sidebar (shadcn Sidebar) | Eigenständiges Dashboard-Layout |
| Tabellen | shadcn DataTable | Sortierung, Filter, Pagination |
| Icons | lucide-svelte | Bereits im Projekt etabliert |

## Bestehende APIs

Die folgenden CMS-APIs stehen bereits zur Verfügung und werden vom Dashboard genutzt:

| API | Funktion | Relevant für |
|-----|----------|-------------|
| `getReport(client, period, params)` | Aggregierte Reports (Tag/Woche/Monat/Quartal/Jahr) | Übersicht, Auswertungen |
| `getReportExcelUrl(period, params)` | Excel-Export URL | Auswertungen |
| `getInvoices(client, query)` | Rechnungsliste mit Filtern | Rechnungen |
| `getInvoice(client, id)` | Einzelne Rechnung mit Items & Payments | Rechnungsdetail |
| `getCategoriesWithProducts(client, opts)` | Kategorien mit Produkten | Produktverwaltung |
| `updateProductStock(client, id, stock)` | Bestand aktualisieren | Produktverwaltung |

Für die Produktverwaltung (Phase 4) werden zusätzliche CMS-API-Funktionen benötigt:
- Produkt erstellen / bearbeiten / löschen
- Kategorie erstellen / bearbeiten / löschen
- Kostenstelle erstellen / bearbeiten / löschen
- Bild-Upload

## Dateien (aktueller Stand)

Bestehende Report-Komponenten, die in Phase 3 migriert/ersetzt werden:

- `src/components/ReportsApp.svelte` — Haupt-Shell mit Tabs
- `src/components/DailyOverview.svelte` — Tagesbericht
- `src/components/MonthlyReport.svelte` — Monatsbericht
- `src/components/QuarterlyReport.svelte` — Quartalsbericht
- `src/components/YearlyReport.svelte` — Jahresbericht
- `src/components/PeriodReport.svelte` — Generische Perioden-Vorlage
