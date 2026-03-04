# Ziel-Architektur: Pulpo App

## Übersicht

```
┌─────────────────────────────────────────────────────────┐
│                    pulpo-app                            │
│                  (Ein Go Binary)                        │
│                                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌────────────────┐   │
│  │   /shop     │  │  /agenda    │  │  /settings     │   │
│  │  (Static)   │  │  (Static)   │  │  (Static)      │   │
│  │             │  │             │  │                │   │
│  │  Astro +    │  │  Astro +    │  │  Astro +       │   │
│  │  Svelte 5   │  │  Svelte 5   │  │  Svelte 5      │   │
│  └──────┬──────┘  └──────┬──────┘  └───────┬────────┘   │
│         │                │                 │            │
│         └────────────────┼─────────────────┘            │
│                          │                              │
│                   PocketBase SDK                        │
│                  (JS, gleicher Origin)                  │
│                          │                              │
│  ┌───────────────────────┴───────────────────────────┐  │
│  │              PocketBase (Go)                      │  │
│  │                                                   │  │
│  │  ┌─────────┐  ┌──────────┐  ┌─────────────────┐   │  │
│  │  │  Auth   │  │ CRUD API │  │ Custom Endpoints│   │  │
│  │  │ built-in│  │ built-in │  │   (Go Hooks)    │   │  │
│  │  └─────────┘  └──────────┘  └─────────────────┘   │  │
│  │                                                   │  │
│  │  ┌─────────┐  ┌──────────┐  ┌─────────────────┐   │  │
│  │  │Realtime │  │ Admin UI │  │ File Storage    │   │  │
│  │  │  SSE    │  │  /_/     │  │ (Bilder etc.)   │   │  │
│  │  └─────────┘  └──────────┘  └─────────────────┘   │  │
│  │                                                   │  │
│  │  ┌─────────────────────────────────────────────┐  │  │
│  │  │ Netzwerkdrucker-Endpoint (optional, TCP)    │  │  │
│  │  │ POST /api/custom/print → TCP :9100          │  │  │
│  │  └─────────────────────────────────────────────┘  │  │
│  │                                                   │  │
│  └───────────────────────┬───────────────────────────┘  │
│                          │                              │
│                    ┌─────┴─────┐                        │
│                    │  SQLite   │                        │
│                    │ (WAL Mode)│                        │
│                    └───────────┘                        │
│                                                         │
│  Volume: /pb_data/                                      │
│  ├── data.db          (Hauptdatenbank)                  │
│  ├── data.db-wal      (Write-Ahead Log)                 │
│  ├── logs.db          (Request-Logs)                    │
│  └── storage/         (Uploads: Produktbilder etc.)     │
│                                                         │
│  Port: 8090                                             │
│  Image: ~30-50MB                                        │
└─────────────────────────────────────────────────────────┘
```

---

## Projekt-Struktur

```
pulpo-cloud/
│
├── apps/
│   ├── pulpo-app/                  # Go Backend (PocketBase)
│   │   ├── main.go                 # Einstiegspunkt
│   │   ├── go.mod
│   │   ├── go.sum
│   │   ├── Dockerfile
│   │   │
│   │   ├── migrations/             # Auto-Migrations (Schema als Code)
│   │   │   ├── 1709000000_create_users.go
│   │   │   ├── 1709000001_create_settings.go
│   │   │   ├── 1709000002_create_reservations.go
│   │   │   ├── 1709000003_create_products.go
│   │   │   ├── 1709000004_create_invoices.go
│   │   │   ├── 1709000010_seed_tax_classes.go
│   │   │   ├── 1709000011_seed_tax_zones.go
│   │   │   └── ...
│   │   │
│   │   ├── routes/                 # Custom API Endpoints
│   │   │   ├── invoices.go         # POST /api/custom/invoices
│   │   │   ├── rectify.go          # POST /api/custom/invoices/rectify
│   │   │   ├── cash_register.go    # POST /api/custom/cash-register/*
│   │   │   ├── reports.go          # GET  /api/custom/reports/:period
│   │   │   └── health.go           # GET  /api/custom/health
│   │   │
│   │   ├── invoice/                # Invoice-Berechnung (Pure Go)
│   │   │   ├── calculate.go        # CalculateInvoice()
│   │   │   ├── calculate_test.go   # Tests (1:1 portiert)
│   │   │   └── types.go            # LineInput, CalculationResult
│   │   │
│   │   ├── tax/                    # Steuer-Auflösung
│   │   │   ├── resolve.go          # ResolveTaxRates(postcode)
│   │   │   └── resolve_test.go
│   │   │
│   │   └── hooks/                  # PocketBase Event-Hooks
│   │       ├── on_invoice_create.go
│   │       └── on_user_create.go
│   │
│   ├── shop/                       # Frontend: POS
│   │   ├── src/
│   │   │   ├── views/
│   │   │   │   ├── pos/            # Hauptkasse
│   │   │   │   ├── reports/        # Berichte
│   │   │   │   └── settings/       # User + Restaurant-Daten
│   │   │   ├── stores/
│   │   │   │   ├── cartStore.ts
│   │   │   │   ├── productStore.ts
│   │   │   │   ├── registerStore.ts
│   │   │   │   ├── taxStore.ts
│   │   │   │   └── printerStore.ts
│   │   │   ├── lib/
│   │   │   │   └── pb.ts           # PocketBase SDK Client
│   │   │   └── pages/
│   │   ├── package.json
│   │   └── astro.config.mjs
│   │
│   ├── agenda/                     # Frontend: Reservierungen
│   │   ├── src/
│   │   │   ├── views/
│   │   │   │   ├── agenda/         # Reservierungsliste
│   │   │   │   ├── reservation/    # Erstellen/Bearbeiten
│   │   │   │   └── settings/       # User-Verwaltung
│   │   │   ├── stores/
│   │   │   │   └── userStore.ts
│   │   │   ├── lib/
│   │   │   │   └── pb.ts           # PocketBase SDK Client
│   │   │   └── pages/
│   │   ├── package.json
│   │   └── astro.config.mjs
│   │
│   └── thermal-printer-service/    # ENTFÄLLT nach Migration
│       └── ...                    # → Web USB API + PocketBase TCP
│
├── packages/
│   └── invoice/                    # JS Invoice-Berechnung (Frontend-only)
│       ├── src/
│       │   ├── calculate.ts        # Für Cart Live-Preview
│       │   └── types.ts
│       └── package.json
│
├── packages/
│   └── pulpo-app-npm/              # npm Distribution (Go-Binary Wrapper)
│       ├── package.json            # bin: cli.js, optionalDependencies
│       └── bin/
│           └── cli.js              # Launcher (~20 LOC)
│
├── npm/                            # Platform-spezifische npm Packages
│   ├── win32-x64/                  # @pulpo/app-win32-x64
│   │   ├── package.json
│   │   └── pulpo-app.exe
│   ├── darwin-x64/                 # @pulpo/app-darwin-x64
│   │   ├── package.json
│   │   └── pulpo-app
│   ├── darwin-arm64/               # @pulpo/app-darwin-arm64
│   │   ├── package.json
│   │   └── pulpo-app
│   └── linux-x64/                  # @pulpo/app-linux-x64
│       ├── package.json
│       └── pulpo-app
│
├── tools/
│   ├── migrate-to-pocketbase/      # Datenmigration Directus → PocketBase
│   │   └── main.go
│   └── platform/                   # SaaS Platform-App (optional)
│       └── main.go
│
├── MIGRATION_PLAN.md
├── ARCHITECTURE.md
└── CLAUDE.md
```

---

## Datenmodell

### Auth

```
┌──────────────────────────┐
│  users (Auth Collection) │
├──────────────────────────┤
│  id          string      │
│  email       string      │
│  password    string      │
│  name        string      │
│  role        "admin"     │
│              "staff"     │
│  avatar      file        │
│  created     datetime    │
│  updated     datetime    │
└──────────────────────────┘
```

### Settings (1 Record pro Instanz)

```
┌──────────────────────────────────────┐
│  settings                            │
├──────────────────────────────────────┤
│  id                     string       │
│  name                   string       │  ← Restaurant-Name
│  nif                    string       │  ← Steuernummer
│  street                 string       │
│  postcode               string       │  ← Für Tax-Zonen-Matching
│  city                   string       │
│  email                  string       │
│  timezone               string       │  ← z.B. "Atlantic/Canary"
│  invoice_prefix         string       │  ← z.B. "F-%year%%month%-%count%"
│  last_ticket_number     number       │
│  last_factura_number    number       │
│  last_rectificativa_number number    │
└──────────────────────────────────────┘
```

### Agenda

```
┌─────────────────────────┐       ┌─────────────────────────┐
│  reservations           │       │  reservation_turns      │
├─────────────────────────┤       ├─────────────────────────┤
│  id           string    │       │  id          string     │
│  date         date      │       │  label       string     │
│  time         string    │       │  start       string     │
│  name         string    │       │  color       string     │
│  person_count number    │       └─────────────────────────┘
│  contact      string    │
│  notes        string    │
│  arrived      bool      │
│  user         → users   │
│  created      datetime  │
│  updated      datetime  │
└─────────────────────────┘
```

### Produkte & Kategorien

```
┌─────────────────────────┐       ┌─────────────────────────┐
│  categories             │       │  cost_centers           │
├─────────────────────────┤       ├─────────────────────────┤
│  id           string    │       │  id          string     │
│  name         string    │       │  name        string     │
│  description  string    │       └─────────────────────────┘
│  image        file      │
│  sort         number    │
└──────────┬──────────────┘
           │ 1:N
┌──────────┴───────────────────┐      ┌─────────────────────────┐
│  products                    │      │  tax_classes            │
├──────────────────────────────┤      ├─────────────────────────┤
│  id           string         │  ┌──→│  id          string     │
│  name         string         │  │   │  code        string     │
│  description  string         │  │   │  name        string     │
│  note         string         │  │   └─────────────────────────┘
│  price_gross  text ⚠️        │  │
│  image        file           │  │   ⚠️ text, nicht number!
│  stock        number?        │  │      Arithmetik nur über
│  sort         number         │  │      shopspring/decimal (Go)
│  category     → categories   │  │   oder big.js (JS)
│  tax_class    → tax_classes  │  ┘
│  cost_center  → cost_centers │
└──────────────────────────────┘
```

### Steuersystem

```
┌─────────────────────────┐
│  tax_zones               │    Postcode-basiertes Matching:
├─────────────────────────┤
│  id          string      │    "^(35|38)[0-9]{3}$" → Kanaren (IGIC)
│  name        string      │    "^51[0-9]{3}$"      → Ceuta (IPSI)
│  zone        string      │    "^52[0-9]{3}$"      → Melilla (IPSI)
│  regex       string      │    ".*"                 → Rest Spanien (IVA)
│  priority    number      │
└──────────┬──────────────┘
           │ 1:N
┌──────────┴──────────────┐
│  tax_rules               │    Beispiel (Kanaren/IGIC):
├─────────────────────────┤
│  id          string      │    STD       → 7%
│  tax_zone    → tax_zones │    RED       → 3%
│  tax_class   → tax_classes│    SUPER_RED → 0%
│  rate        text ⚠️     │    ZERO      → 0%
│  surcharge   text?       │    NULL      → 0%
└─────────────────────────┘
```

### Rechnungswesen

```
┌──────────────────────────────┐
│  closures                     │
├──────────────────────────────┤
│  id                string     │
│  status            "open"     │
│                    "closed"   │
│  period_start      datetime   │
│  period_end        datetime   │
│  starting_cash     text       │
│  expected_cash     text       │
│  counted_cash      text       │
│  difference        text       │
│  total_gross       text       │
│  total_net         text       │
│  total_tax         text       │
│  total_cash        text       │
│  total_card        text       │
│  transaction_count number     │
│  tax_breakdown     json       │
│  denomination_count json      │
│  product_breakdown json       │
│  invoice_type_counts json     │
└──────────┬───────────────────┘
           │ 1:N
┌──────────┴───────────────────┐
│  invoices                     │
├──────────────────────────────┤
│  id                string     │
│  invoice_number    string     │  ← "F-2025/03/00001"
│  invoice_type      "ticket"   │
│                    "factura"  │
│                    "rectificativa"
│  status            "paid"     │
│                    "rectificada"
│  total_gross       text ⚠️    │
│  total_net         text       │
│  total_tax         text       │
│  discount_type     string?    │
│  discount_value    text?      │
│  customer          → customers│
│  customer_name     string     │  ← Snapshot
│  customer_nif      string     │  ← Snapshot
│  customer_street   string     │  ← Snapshot
│  customer_zip      string     │  ← Snapshot
│  customer_city     string     │  ← Snapshot
│  tax_breakdown     json       │
│  original_invoice  → invoices │  ← Bei Rectificativa
│  closure           → closures │
│  created           datetime   │
└──────────┬───────────────────┘
           │ 1:N
     ┌─────┴─────────────┐
     │                    │
┌────┴─────────────┐ ┌───┴──────────────────┐
│  invoice_items    │ │  invoice_payments     │
├──────────────────┤ ├──────────────────────┤
│  id       string  │ │  id        string     │
│  invoice  → inv.  │ │  invoice   → inv.     │
│  product  → prod. │ │  method    "cash"     │
│  product_name str │ │            "card"     │
│  quantity number  │ │  amount    text       │
│  price_gross_unit │ │  tendered  text       │
│           text    │ │  change    text       │
│  row_total_gross  │ │  tip       text       │
│           text    │ │  created   datetime   │
│  tax_rate_snapshot│ └──────────────────────┘
│           text    │
│  discount_type    │
│  discount_value   │
│  cost_center str  │
└──────────────────┘

┌─────────────────────────┐
│  customers               │
├─────────────────────────┤
│  id          string      │
│  name        string      │
│  nif         string      │
│  street      string      │
│  zip         string      │
│  city        string      │
│  email       string      │
│  phone       string      │
│  notes       string      │
└─────────────────────────┘
```

---

## API-Endpunkte

### PocketBase Built-in (CRUD + Auth)

```
Auth:
  POST   /api/collections/users/auth-with-password
  POST   /api/collections/users/auth-refresh
  POST   /api/collections/users/request-password-reset
  POST   /api/collections/users/confirm-password-reset

CRUD (automatisch für jede Collection):
  GET    /api/collections/{name}/records
  GET    /api/collections/{name}/records/:id
  POST   /api/collections/{name}/records
  PATCH  /api/collections/{name}/records/:id
  DELETE /api/collections/{name}/records/:id

Realtime:
  SSE    /api/realtime

Files:
  GET    /api/files/{collection}/{record}/{filename}
```

### Custom Endpoints (Go Hooks)

```
Invoices:
  POST   /api/custom/invoices              → Invoice erstellen
  POST   /api/custom/invoices/rectify      → Rectificativa erstellen

Cash Register:
  POST   /api/custom/cash-register/open    → Kasse öffnen
  POST   /api/custom/cash-register/close   → Kasse schließen

Reports:
  GET    /api/custom/reports/daily          → Tagesbericht
  GET    /api/custom/reports/weekly         → Wochenbericht
  GET    /api/custom/reports/monthly        → Monatsbericht
  GET    /api/custom/reports/quarterly      → Quartalsbericht
  GET    /api/custom/reports/yearly         → Jahresbericht

Health:
  GET    /api/custom/health                → Status + Version
```

---

## Berechnung: Client ↔ Server

```
┌─────────────────────┐          ┌─────────────────────┐
│  Frontend (Browser)  │          │  Backend (Go)        │
│                      │          │                      │
│  @pulpo/invoice (JS) │          │  invoice.Calculate() │
│  + big.js            │          │  + shopspring/decimal│
│                      │          │                      │
│  Zweck:              │          │  Zweck:              │
│  Live Cart-Vorschau  │          │  Finale Berechnung   │
│  (was sieht der      │          │  (was in die DB      │
│   Kellner?)          │          │   geschrieben wird)  │
│                      │          │                      │
│  Trigger:            │          │  Trigger:            │
│  Jede Warenkorb-     │          │  POST /invoices      │
│  änderung            │          │  (Checkout)          │
└──────────┬───────────┘          └──────────┬───────────┘
           │                                 │
           │    Identischer Algorithmus:      │
           │    1. Per-Line Discounts         │
           │    2. Subtotal                   │
           │    3. Global Discount            │
           │    4. Tax-Grouping               │
           │    5. Cent-Korrektur             │
           │    6. net = gross / (1+rate)     │
           │    7. tax = gross - net          │
           └─────────────┬───────────────────┘
                         │
                    Invariante:
                 net + tax == gross
              (0 Cent Differenz, immer)
```

---

## Auth & Rollen

```
┌─────────────────────────────────────────────┐
│  PocketBase Auth (built-in)                  │
│                                              │
│  ┌─────────┐         ┌─────────┐            │
│  │  Admin   │         │  Staff  │            │
│  │  (role)  │         │  (role) │            │
│  └────┬─────┘         └────┬────┘            │
│       │                    │                 │
│       ▼                    ▼                 │
│  ┌──────────────┐   ┌──────────────┐         │
│  │ /shop        │   │ /shop        │         │
│  │ /agenda      │   │ /agenda      │         │
│  │ /settings ✓  │   │ /settings ✗  │         │
│  │ User CRUD ✓  │   │ User CRUD ✗  │         │
│  │ Produkte ✓   │   │ Produkte 👁  │         │
│  │ Invoices ✓   │   │ Invoices ✓   │         │
│  └──────────────┘   └──────────────┘         │
│                                              │
│  API Rules (PocketBase):                     │
│  products  → list/view: authenticated        │
│            → create/update/delete: admin     │
│  invoices  → nur über Custom Endpoint        │
│  users     → list: authenticated             │
│            → create/update/delete: admin     │
│  settings  → view: authenticated             │
│            → update: admin                   │
└──────────────────────────────────────────────┘
```

---

## Realtime (Agenda)

```
Vorher (Polling):                    Nachher (PocketBase SSE):

Browser ──GET──► Server              Browser ──SSE──► Server
  3s warten                            (persistente Verbindung)
Browser ──GET──► Server
  3s warten                          Server pusht Events:
Browser ──GET──► Server                ├── create: neue Reservation
  ...                                  ├── update: arrived geändert
                                       └── delete: Reservation gelöscht
Nachteile:
- Unnötige Requests                  Vorteile:
- 3s Verzögerung                     - Sofortige Updates
- Bandwidth-Verschwendung            - Kein Polling
- Eigene Change-Detection            - Weniger Server-Last
                                     - Eingebaut in PocketBase
```

```javascript
// Frontend: Eine Zeile statt Polling-Loop
pb.collection('reservations').subscribe('*', (e) => {
    if (e.action === 'create')  addReservation(e.record)
    if (e.action === 'update')  updateReservation(e.record)
    if (e.action === 'delete')  removeReservation(e.record)
})
```

---

## Deployment

### Verteilungswege

```
┌─────────────────────────────────────────────────────────┐
│                                                          │
│  SaaS (du hostest):               ← Hauptzielgruppe     │
│  → Kunde bekommt URL: bar.pulpo.cloud                    │
│  → Docker Compose + Traefik auf deinem Server            │
│  → Kunde braucht: nur einen Browser                      │
│                                                          │
│  Docker Compose (Self-Host):      ← Tech-savvy User     │
│  → docker compose up -d                                  │
│  → Eigener Server / VPS                                  │
│  → Braucht: Docker                                       │
│                                                          │
│  npx (lokal):                     ← Entwickler / Tester  │
│  → npx pulpo-app                                         │
│  → Kein Signing nötig, kein SmartScreen                  │
│  → Braucht: Node.js                                      │
│                                                          │
│  .exe Installer (lokal):          ← Später, optional     │
│  → pulpo-setup.exe herunterladen                         │
│  → Code Signing empfohlen (~90€/Jahr)                    │
│  → Braucht: nichts                                       │
│                                                          │
└─────────────────────────────────────────────────────────┘

Alle Varianten nutzen dasselbe Go Binary.
Der Unterschied ist nur die Verpackung.
```

### npx (lokal, ohne Docker)

```bash
# Einzeiler — kein Docker, kein Signing, kein SmartScreen
npx pulpo-app

# Oder global installieren
npm install -g pulpo-app
pulpo-app

# Öffne http://localhost:8090/shop
```

**Wie es funktioniert:** npm-Package enthält das kompilierte Go-Binary für die jeweilige Plattform. Kein Node.js-Server — Node dient nur als Launcher.

```
pulpo-app (npm)
├── bin/cli.js                     ← Launcher (~20 Zeilen)
└── optionalDependencies:
    ├── @pulpo/app-win32-x64       ← pulpo-app.exe
    ├── @pulpo/app-darwin-x64      ← pulpo-app (Intel Mac)
    ├── @pulpo/app-darwin-arm64    ← pulpo-app (Apple Silicon)
    └── @pulpo/app-linux-x64       ← pulpo-app (Linux)
```

npm installiert nur das Binary für die aktuelle Plattform.

**Launcher (bin/cli.js):**

```js
#!/usr/bin/env node
const { execFileSync } = require("child_process");

const PLATFORMS = {
  "win32-x64":    "@pulpo/app-win32-x64/pulpo-app.exe",
  "darwin-x64":   "@pulpo/app-darwin-x64/pulpo-app",
  "darwin-arm64": "@pulpo/app-darwin-arm64/pulpo-app",
  "linux-x64":    "@pulpo/app-linux-x64/pulpo-app",
};

const bin = require.resolve(PLATFORMS[`${process.platform}-${process.arch}`]);
execFileSync(bin, ["serve", "--http=0.0.0.0:8090"], {
  cwd: process.cwd(),
  stdio: "inherit",
});
```

**Platform-Package (z.B. @pulpo/app-win32-x64/package.json):**

```json
{
  "name": "@pulpo/app-win32-x64",
  "version": "1.0.0",
  "os": ["win32"],
  "cpu": ["x64"],
  "files": ["pulpo-app.exe"]
}
```

### Docker Compose (Self-Host)

```yaml
# docker-compose.yml — das ist alles was ein User braucht
services:
  pulpo:
    image: ghcr.io/pulpo-cloud/pulpo-app
    ports:
      - "8090:8090"
    volumes:
      - ./data:/pb_data
    restart: unless-stopped
```

```bash
docker compose up -d
# Öffne http://localhost:8090/shop
# Admin: http://localhost:8090/_/
```

### SaaS (Pulpo hostet)

```
┌──────────────────────────────────────────────────────────┐
│  Server (Netcup RS 1000 G12)                              │
│                                                           │
│  ┌───────────────────────────────────────────────────┐    │
│  │  Traefik (Reverse Proxy + Auto-SSL via Let's Encrypt) │
│  │                                                    │    │
│  │  bar-el-pulpo.pulpo.cloud  ──► pulpo-kunde-a:8090  │    │
│  │  ristorante-roma.pulpo.cloud ──► pulpo-kunde-b:8090│    │
│  │  cafe-berlin.pulpo.cloud ──► pulpo-kunde-c:8090    │    │
│  │                                                    │    │
│  │  Dashboard: :8080 (intern)                         │    │
│  └───────────────────────────────────────────────────┘    │
│                                                           │
│  Docker Network: pulpo-net                                │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐      │
│  │ pulpo-kunde-a│ │ pulpo-kunde-b│ │ pulpo-kunde-c│      │
│  │              │ │              │ │              │      │
│  │ Labels:      │ │ Labels:      │ │ Labels:      │      │
│  │ traefik.http.│ │ traefik.http.│ │ traefik.http.│      │
│  │ routers.a.   │ │ routers.b.   │ │ routers.c.   │      │
│  │ rule=Host(.. │ │ rule=Host(.. │ │ rule=Host(.. │      │
│  │              │ │              │ │              │      │
│  │ /data/a/     │ │ /data/b/     │ │ /data/c/     │      │
│  └──────────────┘ └──────────────┘ └──────────────┘      │
│                                                           │
│  ┌───────────────────────────────────────────────────┐    │
│  │  Platform App (pulpo.cloud)                        │    │
│  │  Eigener PocketBase Container                      │    │
│  │                                                    │    │
│  │  ├── Kunden-Registrierung                          │    │
│  │  ├── Instanz-Provisioning (Docker API)             │    │
│  │  ├── Billing (Stripe)                              │    │
│  │  └── Monitoring + Health Checks                    │    │
│  └───────────────────────────────────────────────────┘    │
│                                                           │
│  Backup (Cronjob):                                        │
│  cp /data/*/data.db /backups/$(date +%F)/                 │
└──────────────────────────────────────────────────────────┘
```

### Traefik Konfiguration

```yaml
# docker-compose.yml (Server)
services:
  traefik:
    image: traefik:v3
    command:
      - "--api.dashboard=true"
      - "--providers.docker=true"
      - "--providers.docker.exposedbydefault=false"
      - "--entrypoints.web.address=:80"
      - "--entrypoints.websecure.address=:443"
      - "--certificatesresolvers.letsencrypt.acme.tlschallenge=true"
      - "--certificatesresolvers.letsencrypt.acme.email=admin@pulpo.cloud"
      - "--certificatesresolvers.letsencrypt.acme.storage=/letsencrypt/acme.json"
      - "--entrypoints.web.http.redirections.entrypoint.to=websecure"
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - ./letsencrypt:/letsencrypt
    networks:
      - pulpo-net

networks:
  pulpo-net:
    external: true
```

```yaml
# docker-compose.kunde-a.yml
services:
  pulpo-kunde-a:
    image: pulpo-app:latest
    volumes:
      - /data/kunde-a:/pb_data
    environment:
      - PB_ADMIN_PASSWORD=${ADMIN_PW}
      - PB_ADMIN_ALLOWED_IP=${SERVER_IP}
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.kunde-a.rule=Host(`bar-el-pulpo.pulpo.cloud`)"
      - "traefik.http.routers.kunde-a.tls=true"
      - "traefik.http.routers.kunde-a.tls.certresolver=letsencrypt"
      - "traefik.http.services.kunde-a.loadbalancer.server.port=8090"
    networks:
      - pulpo-net
    restart: unless-stopped

networks:
  pulpo-net:
    external: true
```

```bash
docker compose -f docker-compose.kunde-a.yml up -d
```

Traefik erkennt neue Container automatisch über Docker Labels — kein Config-Reload nötig.

**Alternativ: Alle Kunden in einer Datei** (Platform generiert diese dynamisch):

```yaml
# docker-compose.customers.yml (von Platform-App generiert)
services:
  bar-el-pulpo:
    image: pulpo-app:latest
    volumes:
      - /data/bar-el-pulpo:/pb_data
    environment:
      - PB_ADMIN_PASSWORD=${ADMIN_PW}
      - PB_ADMIN_ALLOWED_IP=${SERVER_IP}
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.bar-el-pulpo.rule=Host(`bar-el-pulpo.pulpo.cloud`)"
      - "traefik.http.routers.bar-el-pulpo.tls.certresolver=letsencrypt"
      - "traefik.http.services.bar-el-pulpo.loadbalancer.server.port=8090"
    networks:
      - pulpo-net
    restart: unless-stopped

  ristorante-roma:
    image: pulpo-app:latest
    volumes:
      - /data/ristorante-roma:/pb_data
    environment:
      - PB_ADMIN_PASSWORD=${ADMIN_PW}
      - PB_ADMIN_ALLOWED_IP=${SERVER_IP}
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.ristorante-roma.rule=Host(`ristorante-roma.pulpo.cloud`)"
      - "traefik.http.routers.ristorante-roma.tls.certresolver=letsencrypt"
      - "traefik.http.services.ristorante-roma.loadbalancer.server.port=8090"
    networks:
      - pulpo-net
    restart: unless-stopped

networks:
  pulpo-net:
    external: true
```

```bash
# Alle Kunden starten/updaten
docker compose -f docker-compose.customers.yml up -d

# Einzelnen Kunden neustarten
docker compose -f docker-compose.customers.yml restart bar-el-pulpo

# Neuen Kunden hinzufügen: Service in YAML ergänzen, dann:
docker compose -f docker-compose.customers.yml up -d ristorante-roma
```

### Backup & Offboarding

```
Backup pro Kunde:
  cp /data/kunde-a/data.db /backups/kunde-a-2026-03-04.db
  → Eine Datei. Fertig.

Kunde exportieren:
  tar -czf export.tar.gz /data/kunde-a/
  → Enthält: DB + Uploads (Produktbilder etc.)

Kunde löschen:
  docker compose -f docker-compose.customers.yml stop bar-el-pulpo
  docker compose -f docker-compose.customers.yml rm bar-el-pulpo
  # Service aus YAML entfernen
  rm -rf /data/bar-el-pulpo/

Restore:
  cp /backups/bar-el-pulpo-2026-03-04.db /data/bar-el-pulpo/data.db
  docker compose -f docker-compose.customers.yml restart bar-el-pulpo
```

---

## Auto-Migrations (Schema als Code)

Schema-Änderungen werden als Go-Migrations-Dateien versioniert. Jede neue Instanz bekommt beim ersten Start automatisch alle Collections, API Rules und Seed-Daten.

```
┌────────────────────────────────────────────────────────┐
│  Neue Instanz startet                                   │
│                                                         │
│  1. app.Start()                                         │
│  2. PocketBase prüft: welche Migrations schon gelaufen? │
│  3. Führt ausstehende Migrations aus:                   │
│     ✓ 1709000000_create_users.go                        │
│     ✓ 1709000001_create_settings.go                     │
│     ✓ 1709000002_create_reservations.go                 │
│     ✓ ...                                               │
│     ✓ 1709000010_seed_tax_classes.go                    │
│     ✓ 1709000011_seed_tax_zones.go                      │
│  4. Schema + Seed-Daten sind da                         │
│  5. App ist bereit                                      │
└────────────────────────────────────────────────────────┘
```

**Workflow bei Schema-Änderungen:**

```bash
# 1. Änderung im Admin-UI machen (z.B. neues Feld)
# 2. Migration generieren
./pulpo-app migrate collections

# 3. Neue Migration wird erstellt:
#    migrations/1709000020_updated_products.go

# 4. Committen → neues Binary bauen → deployen
# 5. Alle Instanzen führen beim Restart die Migration automatisch aus
```

**Updates ausrollen:**

```bash
# Neues Image mit Schema-Änderung deployen
docker compose -f docker-compose.customers.yml pull
docker compose -f docker-compose.customers.yml up -d
# → Jeder Container startet → Migrations laufen → Schema aktualisiert
```

**npx:**

```bash
npx pulpo-app@latest
# → Neues Binary mit eingebetteten Migrations → Schema automatisch aktuell
```

---

## Admin-Absicherung

### PocketBase Superadmin via Environment Variable

```go
// main.go
func main() {
    app := pocketbase.New()

    app.OnServe().BindFunc(func(se *core.ServeEvent) error {
        // Superadmin beim ersten Start erstellen
        superadmin, _ := app.FindAuthRecordByEmail(
            core.CollectionNameSuperusers, "admin@pulpo.cloud",
        )
        if superadmin == nil {
            superadmin = core.NewRecord(
                core.MustFindCachedCollectionByNameOrId(app, core.CollectionNameSuperusers),
            )
            superadmin.SetEmail("admin@pulpo.cloud")
            superadmin.SetPassword(os.Getenv("PB_ADMIN_PASSWORD"))
            app.Save(superadmin)
        }

        // Admin-UI + Superuser-API per IP einschränken
        allowedIP := os.Getenv("PB_ADMIN_ALLOWED_IP")
        if allowedIP != "" {
            se.Router.BindFunc(func(e *core.RequestEvent) error {
                if strings.HasPrefix(e.Request.URL.Path, "/_/") ||
                    strings.HasPrefix(e.Request.URL.Path, "/api/collections/_superusers") {
                    ip := e.RealIP()
                    if ip != "127.0.0.1" && ip != allowedIP {
                        return e.JSON(403, map[string]string{"error": "forbidden"})
                    }
                }
                return e.Next()
            })
        }

        return se.Next()
    })

    app.Bootstrap()
    if err := app.Start(); err != nil {
        panic(err)
    }
}
```

### Environment Variables

```
┌─────────────────────────────────────────────────────────┐
│  ENV                        │ Beschreibung              │
├─────────────────────────────┼───────────────────────────┤
│  PB_ADMIN_PASSWORD          │ Superadmin-Passwort       │
│  PB_ADMIN_ALLOWED_IP        │ IP-Whitelist für /_/      │
│                             │ leer = offen (Self-Deploy)│
│                             │ gesetzt = nur diese IP    │
└─────────────────────────────┴───────────────────────────┘

Self-Deploy:
  docker compose up -d
  → PB_ADMIN_ALLOWED_IP nicht gesetzt → Admin-UI offen
  → User erstellt Superadmin beim ersten Aufruf von /_/

SaaS:
  # In .env auf dem Server:
  ADMIN_PW=xxx
  SERVER_IP=1.2.3.4

  docker compose -f docker-compose.customers.yml up -d
  → Admin-UI nur von Server-IP erreichbar
  → Superadmin automatisch erstellt
```

---

## Technologie-Stack

| Schicht | Technologie | Ersetzt |
|---|---|---|
| **Backend** | PocketBase (Go) | Directus + PostgreSQL + Redis |
| **Datenbank** | SQLite (WAL) | PostgreSQL |
| **Auth** | PocketBase built-in | Directus Auth / @pulpo/auth |
| **Realtime** | PocketBase SSE | Custom Polling (3s) |
| **API** | PocketBase CRUD + Go Hooks | Directus SDK + pulpo-extension |
| **Dezimal-Arithmetik** | shopspring/decimal (Go) | big.js (Node.js) |
| **Frontend Shop** | Astro 5 + Svelte 5 | Gleich (API-Calls ändern sich) |
| **Frontend Agenda** | Astro 5 + Svelte 5 | Gleich (Polling → Realtime) |
| **Frontend SDK** | PocketBase JS SDK | @directus/sdk |
| **Cart-Vorschau** | @pulpo/invoice (JS + big.js) | Gleich (bleibt im Frontend) |
| **Container** | 1x Alpine + Go Binary | 4x (Directus + PG + Redis + nginx) |
| **Deployment** | `docker compose up -d` | `docker compose up` (4 Services) |
| **Drucker (USB)** | Web USB API (Browser) | thermal-printer-service (Node.js) |
| **Drucker (Netzwerk)** | PocketBase TCP-Endpoint (10 LOC Go) | thermal-printer-service (Node.js) |

---

## Drucken

### Architektur

```
┌─────────────────────────────────────────────────────┐
│  Browser (Chrome/Edge)                               │
│                                                      │
│  printerStore.ts                                     │
│  ├── ESC/POS Commands generieren (bereits vorhanden) │
│  │                                                   │
│  ├── USB-Drucker?                                    │
│  │   └── Web USB API ──► direkt an Drucker           │
│  │       navigator.usb.requestDevice()               │
│  │       device.transferOut(data)                     │
│  │                                                   │
│  └── Netzwerk-Drucker?                               │
│      └── POST /api/custom/print ──► PocketBase       │
│          PocketBase ──► TCP :9100 ──► Drucker        │
└─────────────────────────────────────────────────────┘

Kein separater Printer-Service. Kein extra Prozess.
```

### USB-Drucker (Web USB API)

```javascript
// lib/printer.ts
let device = null;

// Einmalig: User wählt Drucker im Browser-Dialog
async function connectPrinter() {
  device = await navigator.usb.requestDevice({
    filters: [
      { vendorId: 0x04b8 },  // Epson
      { vendorId: 0x0519 },  // Star Micronics
    ]
  });
  await device.open();
  await device.selectConfiguration(1);
  await device.claimInterface(0);
}

// ESC/POS Bytes direkt an den Drucker
async function printRaw(data: Uint8Array) {
  await device.transferOut(1, data);
}

// Kassenschublade öffnen
async function openDrawer() {
  await device.transferOut(1, new Uint8Array([0x1B, 0x70, 0x00, 0x19, 0xFA]));
}
```

Browser-Kompatibilität: Chrome ab v61, Edge ab v79 (Chromium). Für ein dediziertes POS-Terminal ausreichend.

### Netzwerk-Drucker (PocketBase TCP-Endpoint)

```go
// routes/printer.go
se.Router.POST("/api/custom/print", func(e *core.RequestEvent) error {
    var job struct {
        PrinterIP string `json:"printer_ip"`
        Data      []byte `json:"data"`     // ESC/POS Bytes vom Frontend
    }
    e.BindBody(&job)

    conn, err := net.DialTimeout("tcp", job.PrinterIP+":9100", 5*time.Second)
    if err != nil {
        return e.JSON(500, map[string]string{"error": "printer unreachable"})
    }
    defer conn.Close()
    conn.Write(job.Data)

    return e.JSON(200, map[string]string{"status": "ok"})
}).Bind(apis.RequireAuth())
```

Reines TCP — kein CGO, kein libusb, kein Problem. Funktioniert lokal und in der Cloud (wenn Drucker im Netzwerk erreichbar).

### Migration vom bestehenden printerStore.ts

```
Vorher (584 LOC):
  ESC/POS generieren → HTTP POST → printer-service → USB/TCP → Drucker

Nachher:
  ESC/POS generieren (gleicher Code) → Web USB oder PocketBase TCP → Drucker

Änderung: nur die letzten ~20 Zeilen (Transport-Layer)
ESC/POS-Generierung bleibt identisch
```

---

## Was wegfällt

```
Gelöscht nach Migration:

packages/cms/                  → PocketBase SDK ersetzt alles
packages/auth/                 → PocketBase Auth built-in
packages/directus-extension/   → Go Hooks in pulpo-app
apps/directus/                 → PocketBase ersetzt Directus
  ├── docker-compose.yml       → Kein PostgreSQL/Redis mehr
  ├── Dockerfile               → Neues simples Dockerfile
  ├── migrations/              → PocketBase Auto-Migrations
  └── snapshot.yaml            → PocketBase Schema im Code
apps/thermal-printer-service/  → Web USB API + PocketBase TCP-Endpoint

Abhängigkeiten entfernt:
  @directus/sdk
  PostgreSQL
  Redis
  nginx (für Frontends)
  thermal-printer-service (Node.js)
```

## Was bleibt

```
Beibehalten:

packages/invoice/              → JS-Version für Frontend Cart-Preview
apps/shop/                     → Frontend (API-Calls anpassen)
apps/agenda/                   → Frontend (Polling → Realtime)
pnpm + Turborepo               → Monorepo-Management
Astro + Svelte + Tailwind      → Frontend-Stack
```
