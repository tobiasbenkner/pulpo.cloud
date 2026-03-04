# Migrationsplan: Directus → PocketBase

## Ziel-Architektur

```
Pro Kunde — ein Docker Container:
┌──────────────────────────────┐
│  pulpo-app (Go Binary)       │
│                              │
│  PocketBase                  │
│  ├── /shop      (Static)     │
│  ├── /agenda    (Static)     │
│  ├── /settings  (Static)     │
│  ├── /api/*     (Go Hooks)   │
│  ├── /_/        (PB Admin)   │
│  └── /pb_data/  (SQLite)     │
│                              │
│  Volume: /pb_data            │
│  Port: 8090                  │
│  Image: ~30MB                │
└──────────────────────────────┘
```

**Self-Deploy:** `docker run -v ./data:/pb_data -p 8090:8090 pulpo-app`
**SaaS:** Ein Container pro Kunde, Traefik davor (Auto-SSL + Docker-Labels), Platform-App verwaltet Instanzen.

---

## Voraussetzungen

- [ ] Go Grundlagen lernen (Syntax, Structs, Error Handling, Interfaces)
- [ ] PocketBase Dokumentation durcharbeiten (Collections, Hooks, Auth, API Rules)
- [ ] `shopspring/decimal` Bibliothek für Go verstehen (Ersatz für `big.js`)
- [ ] PocketBase lokal aufsetzen und Admin-UI kennenlernen

---

## Phase 1: PocketBase Projekt aufsetzen

**Ziel:** Go-Projekt mit PocketBase als Framework, das kompiliert und startet.

### 1.1 Go-Projekt initialisieren

- [ ] Neues Verzeichnis `apps/pulpo-app/` erstellen
- [ ] `go mod init github.com/pulpo-cloud/pulpo-app`
- [ ] PocketBase als Dependency: `go get github.com/pocketbase/pocketbase`
- [ ] Basis `main.go` erstellen:

```go
package main

import (
    "github.com/pocketbase/pocketbase"
    "github.com/pocketbase/pocketbase/core"
)

func main() {
    app := pocketbase.New()

    app.OnServe().BindFunc(func(se *core.ServeEvent) error {
        // Custom routes werden hier registriert
        return se.Next()
    })

    app.Bootstrap()
    if err := app.Start(); err != nil {
        panic(err)
    }
}
```

### 1.2 Auto-Migrations aktivieren

PocketBase kann Schema-Änderungen als Go-Migrations-Dateien speichern. Damit wird das Schema Teil des Codes und jede neue Instanz startet automatisch mit dem richtigen Schema.

```go
// main.go
package main

import (
    "github.com/pocketbase/pocketbase"
    _ "github.com/pulpo-cloud/pulpo-app/migrations" // Auto-Import
)

func main() {
    app := pocketbase.New()
    app.Start()
}
```

**Migrations generieren:**

```bash
# Schema-Änderungen im Admin-UI machen, dann:
./pulpo-app migrate collections

# Erzeugt automatisch:
# migrations/
# ├── 1709000000_create_users.go
# ├── 1709000001_create_settings.go
# ├── 1709000002_create_reservations.go
# ├── 1709000003_create_products.go
# ├── 1709000004_create_invoices.go
# └── ...
```

**Beispiel einer generierten Migration:**

```go
// migrations/1709000000_create_reservations.go
package migrations

import (
    "github.com/pocketbase/pocketbase/core"
    m "github.com/pocketbase/pocketbase/migrations"
)

func init() {
    m.Register(func(app core.App) error {
        collection := core.NewBaseCollection("reservations")

        collection.Fields.Add(
            &core.DateField{Name: "date", Required: true},
            &core.TextField{Name: "time", Required: true},
            &core.TextField{Name: "name", Required: true},
            &core.NumberField{Name: "person_count"},
            &core.TextField{Name: "contact"},
            &core.TextField{Name: "notes"},
            &core.BoolField{Name: "arrived"},
            &core.RelationField{Name: "user", CollectionId: "users"},
        )

        return app.Save(collection)
    }, func(app core.App) error { // down
        collection, _ := app.FindCollectionByNameOrId("reservations")
        return app.Delete(collection)
    })
}
```

**Warum das wichtig ist:**

| Ohne Migrations | Mit Migrations |
|---|---|
| Schema nur in der SQLite-DB | Schema im Code (Git-versioniert) |
| Neue Instanz = leere DB, Schema manuell anlegen | Neue Instanz = `app.Start()` → Schema automatisch da |
| Updates = manuell im Admin-UI | Updates = Binary starten, Migrations laufen automatisch |
| npx/Docker startet ohne Collections | npx/Docker startet mit allem fix und fertig |

Jede neue Kunden-Instanz bekommt beim ersten Start automatisch alle Collections, API Rules und Seed-Daten. Kein manuelles Setup nötig.

**Seed-Daten** (Tax-Klassen, Tax-Zonen etc.) können ebenfalls als Migration angelegt werden:

```go
// migrations/1709000010_seed_tax_classes.go
func init() {
    m.Register(func(app core.App) error {
        collection, _ := app.FindCollectionByNameOrId("tax_classes")

        classes := []struct{ Code, Name string }{
            {"STD", "Standard"},
            {"RED", "Reducido"},
            {"SUPER_RED", "Superreducido"},
            {"ZERO", "Cero"},
            {"NULL", "Exento"},
        }

        for _, c := range classes {
            record := core.NewRecord(collection)
            record.Set("code", c.Code)
            record.Set("name", c.Name)
            app.Save(record)
        }

        return nil
    }, nil)
}
```

### 1.3 Collections definieren (Schema)

Collections über Admin-UI anlegen, dann `./pulpo-app migrate collections` ausführen um die Migrations zu generieren.

**Gemeinsame Collections (Shop + Agenda):**

| Collection | Typ | Felder |
|---|---|---|
| `users` | Auth | email, password, name, role (admin/staff), avatar |
| `settings` | Base | name, nif, street, postcode, city, email, timezone, invoice_prefix, last_ticket_number, last_factura_number, last_rectificativa_number |

**Agenda Collections:**

| Collection | Typ | Felder |
|---|---|---|
| `reservations` | Base | date, time, name, person_count, contact, notes, arrived (bool), user (relation→users) |
| `reservation_turns` | Base | label, start (time), color |

**Shop Collections:**

| Collection | Typ | Felder |
|---|---|---|
| `categories` | Base | name, description, image, sort |
| `products` | Base | name, description, note, price_gross (text!), image, stock (number, nullable), sort, category (relation), tax_class (relation), cost_center (relation) |
| `tax_classes` | Base | code (STD/RED/INC/SUPER_RED/NULL/ZERO), name |
| `tax_zones` | Base | name, zone, regex, priority |
| `tax_rules` | Base | tax_zone (relation), tax_class (relation), rate (text!), surcharge (text, nullable) |
| `cost_centers` | Base | name |
| `customers` | Base | name, nif, street, zip, city, email, phone, notes |
| `invoices` | Base | invoice_number, invoice_type (ticket/factura/rectificativa), status (draft/paid/cancelled/rectificada), total_gross (text), total_net (text), total_tax (text), discount_type, discount_value, customer (relation), customer_name, customer_nif, customer_street, customer_zip, customer_city, tax_breakdown (json), original_invoice (relation, self), closure (relation→closures) |
| `invoice_items` | Base | invoice (relation), product (relation), product_name, quantity, price_gross_unit (text), row_total_gross (text), tax_rate_snapshot (text), discount_type, discount_value, cost_center |
| `invoice_payments` | Base | invoice (relation), method (cash/card), amount (text), tendered (text), change (text), tip (text) |
| `closures` | Base | status (open/closed), period_start, period_end, starting_cash (text), expected_cash (text), counted_cash (text), difference (text), total_gross (text), total_net (text), total_tax (text), total_cash (text), total_card (text), transaction_count, tax_breakdown (json), denomination_count (json), product_breakdown (json), invoice_type_counts (json) |

**Wichtig:** Alle monetären Werte als `text`-Felder, nicht `number`. Arithmetik ausschließlich über `shopspring/decimal` in Go.

### 1.3 API Rules konfigurieren

```
users:
  list/view:    @request.auth.id != ""
  create:       @request.auth.role = "admin"
  update/delete: @request.auth.role = "admin"

products:
  list/view:    @request.auth.id != ""
  create/update/delete: @request.auth.role = "admin"

invoices:
  list/view:    @request.auth.id != ""
  create:       NICHT direkt — nur über Custom Endpoint
  update/delete: GESPERRT

reservations:
  list/view:    @request.auth.id != ""
  create/update/delete: @request.auth.id != ""
```

### 1.4 Admin-Absicherung implementieren

Im `main.go` die Admin-UI und Superuser-API per Environment Variable absichern:

```go
app.OnServe().BindFunc(func(se *core.ServeEvent) error {
    // Superadmin beim ersten Start erstellen
    if pw := os.Getenv("PB_ADMIN_PASSWORD"); pw != "" {
        superadmin, _ := app.FindAuthRecordByEmail(
            core.CollectionNameSuperusers, "admin@pulpo.cloud",
        )
        if superadmin == nil {
            superadmin = core.NewRecord(
                core.MustFindCachedCollectionByNameOrId(app, core.CollectionNameSuperusers),
            )
            superadmin.SetEmail("admin@pulpo.cloud")
            superadmin.SetPassword(pw)
            app.Save(superadmin)
        }
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
```

| ENV Variable | Wert | Verhalten |
|---|---|---|
| `PB_ADMIN_PASSWORD` | leer | User erstellt Admin manuell via `/_/` (Self-Deploy) |
| `PB_ADMIN_PASSWORD` | gesetzt | Admin wird automatisch erstellt (SaaS) |
| `PB_ADMIN_ALLOWED_IP` | leer | Admin-UI offen (Self-Deploy) |
| `PB_ADMIN_ALLOWED_IP` | `"203.0.113.50"` | Nur diese IP + localhost (SaaS) |

### 1.5 Dockerfile erstellen

```dockerfile
FROM golang:1.23-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o pulpo-app .

FROM alpine:3.20
COPY --from=builder /app/pulpo-app /usr/local/bin/pulpo
EXPOSE 8090
VOLUME /pb_data
CMD ["pulpo", "serve", "--http=0.0.0.0:8090"]
```

---

## Phase 2: Agenda migrieren

**Aufwand:** ~2-3 Tage
**Warum zuerst:** Einfaches Datenmodell (2 Collections), idealer Go-Einstieg.

### 2.1 Go Backend — Agenda Endpoints

Es werden keine Custom-Endpoints benötigt. PocketBase CRUD-API reicht:

```
GET    /api/collections/reservations/records   → Liste (mit Filtern)
POST   /api/collections/reservations/records   → Erstellen
PATCH  /api/collections/reservations/records/:id → Bearbeiten
DELETE /api/collections/reservations/records/:id → Löschen
GET    /api/collections/reservation_turns/records → Turns laden
```

**Einziger Hook:** Toggle "arrived" könnte über die Standard-API gemacht werden (PATCH mit `{ "arrived": true/false }`).

**Realtime:** PocketBase Realtime-Subscriptions ersetzen das 3-Sekunden-Polling:

```javascript
// Vorher (Polling):
setInterval(() => fetch('/api/reservations'), 3000)

// Nachher (PocketBase Realtime):
pb.collection('reservations').subscribe('*', (e) => {
    // e.action: 'create' | 'update' | 'delete'
    // e.record: die geänderte Reservation
    updateUI(e)
})
```

### 2.2 Frontend — Agenda anpassen

**Zu ändern:**

| Datei | Änderung |
|---|---|
| `AgendaView.svelte` | Polling durch PB Realtime-Subscription ersetzen |
| `ReservationForm.svelte` | API-Calls auf PB SDK umstellen |
| Auth-Flows | `@pulpo/auth` Directus-Client → PocketBase SDK |
| `userStore.ts` | PocketBase Auth statt Directus Auth |

**PocketBase JS SDK installieren:**
```bash
pnpm add pocketbase
```

**Neuer Auth-Flow:**
```javascript
import PocketBase from 'pocketbase'
const pb = new PocketBase('/')  // Gleicher Origin!

// Login
await pb.collection('users').authWithPassword(email, password)

// Auth-State
pb.authStore.isValid  // statt isAuthenticated
pb.authStore.onChange((token, record) => { ... })
```

**Kein CORS nötig** — Frontend und Backend laufen auf demselben Origin.

### 2.3 Testen

- [ ] Reservierungen erstellen/bearbeiten/löschen
- [ ] Realtime: Änderung auf Device A erscheint auf Device B
- [ ] Arrived-Toggle funktioniert
- [ ] Turns werden geladen und gecached
- [ ] Login/Logout funktioniert
- [ ] Mobile-Ansicht (responsives Design)

---

## Phase 3: Shop migrieren — Invoice-Berechnung

**Aufwand:** ~3-5 Tage
**Fokus:** Die kritischste Logik zuerst: `calculateInvoice()` nach Go portieren.

### 3.1 Invoice-Berechnung in Go portieren

`packages/invoice/src/calculate.ts` (149 LOC) → Go mit `shopspring/decimal`

```go
package invoice

import "github.com/shopspring/decimal"

type LineInput struct {
    ProductID   string
    ProductName string
    PriceGross  decimal.Decimal
    TaxRate     decimal.Decimal  // z.B. 7.00 für 7%
    Quantity    int
    Discount    *DiscountInput
    CostCenter  string
}

type CalculationResult struct {
    Subtotal     decimal.Decimal
    DiscountTotal decimal.Decimal
    TotalGross   decimal.Decimal
    TotalNet     decimal.Decimal
    TotalTax     decimal.Decimal
    TaxBreakdown []TaxBreakdownEntry
    Items        []LineResult
}

func CalculateInvoice(items []LineInput, globalDiscount *DiscountInput) CalculationResult {
    // 1. Per-line discounts anwenden
    // 2. Subtotal berechnen
    // 3. Global discount anwenden
    // 4. Discount-Ratio berechnen (proportional auf Tax-Groups)
    // 5. Tax-Grouping nach Rate
    // 6. Rounding auf 2dp, Cent-Korrektur auf größte Gruppe
    // 7. Tax back-calculation: net = gross / (1 + rate), tax = gross - net
    // 8. Invariante: net + tax == gross
    return result
}
```

### 3.2 Tests portieren

`packages/invoice/src/calculate.test.ts` (445 LOC) → Go Tests

```go
func TestCalculateInvoice_SingleItem(t *testing.T) {
    items := []LineInput{{
        ProductID:  "1",
        PriceGross: decimal.RequireFromString("10.00"),
        TaxRate:    decimal.RequireFromString("7.00"),
        Quantity:   1,
    }}
    result := CalculateInvoice(items, nil)
    assert.Equal(t, "10.00", result.TotalGross.StringFixed(2))
    assert.Equal(t, "9.35", result.TotalNet.StringFixed(2))
    assert.Equal(t, "0.65", result.TotalTax.StringFixed(2))
}
```

**Alle bestehenden Tests 1:1 portieren.** Die Invoice-Berechnung MUSS identische Ergebnisse liefern. Bei Abweichungen → Bug.

---

## Phase 4: Shop migrieren — Backend Endpoints

**Aufwand:** ~5-7 Tage
**Fokus:** Die 6 Endpoints aus `pulpo-extension` (1.766 LOC) nach PocketBase Go-Hooks portieren.

### 4.1 Invoice-Erstellung

**Quelle:** `packages/directus-extension/src/routes/invoice-create.ts` (345 LOC)

```go
// routes/invoices.go
func registerInvoiceRoutes(app *pocketbase.PocketBase) {
    app.OnServe().BindFunc(func(se *core.ServeEvent) error {
        se.Router.POST("/api/custom/invoices", func(e *core.RequestEvent) error {
            authRecord := e.Auth  // PocketBase Auth User

            return app.RunInTransaction(func(txApp core.App) error {
                // 1. Request parsen (Product IDs + Quantities + Discounts)
                // 2. Produkte aus DB laden
                // 3. Tax-Rates über Postcode → Zone → Rules auflösen
                // 4. CalculateInvoice() aufrufen
                // 5. Invoice-Nummer generieren (Settings Counter)
                // 6. Invoice + Items + Payments in DB schreiben
                // 7. Stock decrementieren
                // 8. Customer-Daten snapshotten
                return e.JSON(200, invoice)
            })
        }).Bind(apis.RequireAuth())
        return se.Next()
    })
}
```

### 4.2 Invoice-Rektifikation

**Quelle:** `packages/directus-extension/src/routes/invoice-rectify.ts` (385 LOC)

- Negative Invoice erstellen (Mengen und Beträge negieren)
- Partial/Full Rectification validieren
- Stock zurückbuchen
- Separater Counter (`last_rectificativa_number`)
- Original-Invoice als "rectificada" markieren

### 4.3 Kassenabschluss

**Quelle:** `cash-register-open.ts` (89 LOC) + `cash-register-close.ts` (191 LOC)

```go
// POST /api/custom/cash-register/open
app.RunInTransaction(func(txApp core.App) error {
    // Prüfen ob schon eine offene Kasse existiert
    // Neue Closure erstellen mit status="open"
    return nil
})

// POST /api/custom/cash-register/close
app.RunInTransaction(func(txApp core.App) error {
    // Alle Invoices dieser Closure laden
    // Totals berechnen (gross, net, tax, cash, card)
    // Product-Breakdown aggregieren
    // Invoice-Type Counts
    // Kasse schließen
    return nil
})
```

### 4.4 Reports

**Quelle:** `reports.ts` (309 LOC) + `report-aggregator.ts`

```go
// GET /api/custom/reports/:period
// period: daily, weekly, monthly, quarterly, yearly
// Closures für den Zeitraum laden
// Über alle Closures aggregieren
// AggregatedReport zurückgeben
```

### 4.5 Tax-Resolution

**Quelle:** `@pulpo/cms` tax.ts (44 LOC) — in Go implementieren

```go
func ResolveTaxRates(app core.App, postcode string) (map[string]decimal.Decimal, error) {
    // 1. Alle TaxZones laden, nach Priority sortieren
    // 2. Postcode gegen Regex matchen
    // 3. Erste Match-Zone nehmen
    // 4. TaxRules für diese Zone laden
    // 5. Map zurückgeben: {"STD": 7.00, "RED": 3.00, ...}
}
```

---

## Phase 5: Shop migrieren — Frontend

**Aufwand:** ~3-5 Tage
**Fokus:** API-Calls und Auth auf PocketBase umstellen.

### 5.1 PocketBase SDK einbinden

```javascript
import PocketBase from 'pocketbase'
const pb = new PocketBase('/')
```

### 5.2 Stores anpassen

| Store | LOC | Änderung |
|---|---|---|
| `cartStore.ts` (367) | Checkout-Call auf `/api/custom/invoices` umstellen |
| `productStore.ts` (171) | Produkte über PB SDK laden statt Directus SDK |
| `taxStore.ts` (39) | Tax-Rules über PB SDK laden |
| `registerStore.ts` (346) | Cash-Register Calls auf `/api/custom/cash-register/*` |
| `printerStore.ts` (584) | Transport-Layer umstellen (siehe Phase 5.5) |

### 5.3 Auth umstellen

Wie bei Agenda: PocketBase Auth statt `@pulpo/auth` Directus-Client.

### 5.4 Reports-Komponenten

API-Calls von `/pulpo-extension/reports/*` auf `/api/custom/reports/*` umstellen. Die Svelte-Komponenten selbst bleiben weitgehend gleich.

### 5.5 Drucker-Integration umstellen

Der `printerStore.ts` (584 LOC) generiert bereits ESC/POS Commands in JavaScript. Nur der Transport-Layer muss geändert werden (~20 Zeilen).

**USB-Drucker → Web USB API (Browser-nativ):**

```javascript
// lib/printer.ts — neu
let device: USBDevice | null = null;

export async function connectPrinter() {
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

export async function printRaw(data: Uint8Array) {
  await device!.transferOut(1, data);
}

export async function openDrawer() {
  await device!.transferOut(1, new Uint8Array([0x1B, 0x70, 0x00, 0x19, 0xFA]));
}
```

**Netzwerk-Drucker → PocketBase TCP-Endpoint:**

```go
// routes/printer.go — im Go Backend
se.Router.POST("/api/custom/print", func(e *core.RequestEvent) error {
    var job struct {
        PrinterIP string `json:"printer_ip"`
        Data      []byte `json:"data"`
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

**Änderung im printerStore.ts:**

```javascript
// Vorher:
await fetch('http://localhost:8091/print', { method: 'POST', body: escPosData });

// Nachher (USB):
await printRaw(escPosData);

// Nachher (Netzwerk):
await pb.send('/api/custom/print', {
  method: 'POST',
  body: JSON.stringify({ printer_ip: printerIP, data: Array.from(escPosData) })
});
```

ESC/POS-Generierung (der Großteil des Codes) bleibt identisch.

**Ergebnis:** `apps/thermal-printer-service/` wird komplett überflüssig.

### 5.6 @pulpo/cms und @pulpo/auth Pakete

Diese Pakete werden **nicht mehr benötigt** nach der Migration:

- `@pulpo/cms` → ersetzt durch PocketBase SDK + Go Backend
- `@pulpo/auth` → ersetzt durch PocketBase Auth SDK
- `@pulpo/invoice` → ersetzt durch Go-Package im Backend

Das Frontend nutzt direkt das PocketBase JS SDK. Die Invoice-Berechnung für die Live-Vorschau im Cart könnte entweder:

- **Option A:** `@pulpo/invoice` (JS) weiterhin im Frontend behalten für die Cart-Vorschau, Go-Version für den Server
- **Option B:** Cart-Totals über einen leichtgewichtigen API-Call berechnen lassen

**Empfehlung:** Option A — die JS-Version für die Cart-Vorschau behalten. Bei Checkout berechnet der Server nochmal mit der Go-Version. Das ist das gleiche Pattern wie heute.

---

## Phase 6: Settings-View (User-Verwaltung)

**Aufwand:** ~1-2 Tage

### 6.1 Frontend-View erstellen

```
src/views/settings/
├── settings.page.astro
└── components/
    ├── UserList.svelte       (~100 LOC)
    ├── UserForm.svelte       (~80 LOC)
    └── TenantForm.svelte     (~80 LOC)
```

**Features:**
- Mitarbeiter auflisten (Name, Email, Rolle)
- Mitarbeiter hinzufügen/bearbeiten/löschen (nur für role=admin)
- Restaurant-Daten bearbeiten (Name, NIF, Adresse, PLZ)

### 6.2 PocketBase API nutzen

```javascript
// User-Management über PocketBase SDK
const users = await pb.collection('users').getList(1, 50)
await pb.collection('users').create({ email, password, name, role: 'staff' })
await pb.collection('users').update(id, { name, role })
await pb.collection('users').delete(id)

// Restaurant-Daten
const settings = await pb.collection('settings').getFirstListItem('')
await pb.collection('settings').update(settings.id, { name, nif, ... })
```

---

## Phase 7: Static Files, Docker Image & npm Distribution

**Aufwand:** ~1-2 Tage

### 7.1 Build-Pipeline

```bash
# 1. Frontends bauen (Astro SSG)
pnpm --filter @pulpo/shop build      # → apps/shop/dist/
pnpm --filter @pulpo/agenda build    # → apps/agenda/dist/

# 2. Go Binary bauen
cd apps/pulpo-app && go build -o pulpo-app .

# 3. Docker Image
docker build -t pulpo-app .
```

### 7.2 Multi-Stage Dockerfile

```dockerfile
# Stage 1: Frontend bauen
FROM node:22-alpine AS frontend
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/shop/package.json apps/shop/
COPY apps/agenda/package.json apps/agenda/
COPY packages/ packages/
RUN pnpm install --frozen-lockfile
COPY apps/shop/ apps/shop/
COPY apps/agenda/ apps/agenda/
RUN pnpm --filter @pulpo/shop build
RUN pnpm --filter @pulpo/agenda build

# Stage 2: Go Binary bauen
FROM golang:1.23-alpine AS backend
WORKDIR /app
COPY apps/pulpo-app/go.mod apps/pulpo-app/go.sum ./
RUN go mod download
COPY apps/pulpo-app/ .
RUN CGO_ENABLED=0 go build -o pulpo-app .

# Stage 3: Finales Image
FROM alpine:3.20
COPY --from=backend /app/pulpo-app /usr/local/bin/pulpo
COPY --from=frontend /app/apps/shop/dist /pb_public/shop
COPY --from=frontend /app/apps/agenda/dist /pb_public/agenda
EXPOSE 8090
VOLUME /pb_data
CMD ["pulpo", "serve", "--http=0.0.0.0:8090"]
```

**Ergebnis:** Ein Image, ~30-50MB, alles drin.

### 7.3 Docker Compose Dateien

**Self-Deploy (wird im Repo mitgeliefert):**

```yaml
# docker-compose.yml
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
# Fertig. Öffne http://localhost:8090/shop
```

**SaaS (auf dem Server):**

```yaml
# docker-compose.customers.yml (von Platform-App generiert/verwaltet)
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

networks:
  pulpo-net:
    external: true
```

```bash
# Alle Kunden starten
docker compose -f docker-compose.customers.yml up -d

# Einzelnen Kunden hinzufügen (Service in YAML ergänzen, dann):
docker compose -f docker-compose.customers.yml up -d neuer-kunde

# Update aller Kunden (neues Image):
docker compose -f docker-compose.customers.yml pull
docker compose -f docker-compose.customers.yml up -d
```

### 7.4 npm Distribution (npx pulpo-app)

Für lokale Installation ohne Docker und ohne Code-Signing-Probleme.

**Go-Binaries mit `go:embed` bauen (Frontend eingebettet):**

```bash
# Build-Script: alle Plattformen
GOOS=windows GOARCH=amd64 go build -o npm/win32-x64/pulpo-app.exe
GOOS=darwin  GOARCH=amd64 go build -o npm/darwin-x64/pulpo-app
GOOS=darwin  GOARCH=arm64 go build -o npm/darwin-arm64/pulpo-app
GOOS=linux   GOARCH=amd64 go build -o npm/linux-x64/pulpo-app
```

**npm Packages erstellen:**

```
packages/pulpo-app-npm/
├── package.json
│   {
│     "name": "pulpo-app",
│     "bin": { "pulpo-app": "bin/cli.js" },
│     "optionalDependencies": {
│       "@pulpo/app-win32-x64": "1.0.0",
│       "@pulpo/app-darwin-x64": "1.0.0",
│       "@pulpo/app-darwin-arm64": "1.0.0",
│       "@pulpo/app-linux-x64": "1.0.0"
│     }
│   }
└── bin/cli.js              ← Startet das richtige Binary

npm/win32-x64/
├── package.json
│   { "name": "@pulpo/app-win32-x64", "os": ["win32"], "cpu": ["x64"] }
└── pulpo-app.exe

npm/darwin-arm64/
├── package.json
│   { "name": "@pulpo/app-darwin-arm64", "os": ["darwin"], "cpu": ["arm64"] }
└── pulpo-app
```

**Publish-Script:**

```bash
# Platform-Packages veröffentlichen
cd npm/win32-x64   && npm publish --access public
cd npm/darwin-x64  && npm publish --access public
cd npm/darwin-arm64 && npm publish --access public
cd npm/linux-x64   && npm publish --access public

# Haupt-Package veröffentlichen
cd packages/pulpo-app-npm && npm publish --access public
```

**Ergebnis:**

```bash
npx pulpo-app  # Läuft auf Windows, macOS, Linux — kein SmartScreen
```

### 7.5 go:embed für Static Files

Damit das Go-Binary die Frontends enthält (für npx und .exe):

```go
package main

import "embed"

//go:embed all:pb_public
var publicFiles embed.FS

func main() {
    app := pocketbase.New()

    app.OnServe().BindFunc(func(se *core.ServeEvent) error {
        se.Router.GET("/shop/{path...}", apis.Static(publicFiles, false))
        se.Router.GET("/agenda/{path...}", apis.Static(publicFiles, false))
        return se.Next()
    })

    app.Start()
}
```

**Build-Reihenfolge:**

```bash
# 1. Frontends bauen → Static Files
pnpm --filter @pulpo/shop build    # → apps/pulpo-app/pb_public/shop/
pnpm --filter @pulpo/agenda build  # → apps/pulpo-app/pb_public/agenda/

# 2. Go Binary bauen (embeddet die Static Files)
cd apps/pulpo-app && go build -o pulpo-app .

# 3. Binary enthält jetzt alles — eine Datei, fertig
```

---

## Phase 8: Datenmigration

**Aufwand:** ~2-3 Tage (pro Kunde)

### 8.1 Migrations-Script erstellen

```go
// tools/migrate-to-pocketbase/main.go

// 1. Directus-Daten über REST API exportieren
// 2. In PocketBase-Format transformieren
// 3. Über PocketBase SDK importieren

// Reihenfolge wichtig (wegen Relations):
// 1. tax_classes, tax_zones, tax_rules
// 2. cost_centers, categories
// 3. products
// 4. customers
// 5. settings (aus tenant-Daten)
// 6. users
// 7. closures
// 8. invoices → invoice_items → invoice_payments
// 9. reservations, reservation_turns
```

### 8.2 Daten validieren

- [ ] Alle monetären Werte korrekt als Text migriert
- [ ] Invoice-Nummern beibehalten
- [ ] Counter-Stände korrekt (last_ticket_number etc.)
- [ ] Relationen intakt (invoice → items, product → category)
- [ ] Tax-Rules korrekt migriert (Regex-Patterns)

---

## Phase 9: Platform-App (SaaS, optional)

**Aufwand:** ~3-5 Tage
**Nur nötig wenn SaaS angeboten wird.**

### 9.1 Eigener PocketBase Container

```go
// apps/platform/main.go
// Collections: customers, instances, subscriptions
// Endpoints:
//   POST /api/custom/provision   → Docker Container starten
//   POST /api/custom/deprovision → Container stoppen + Daten exportieren
//   POST /api/custom/billing     → Stripe Webhook
//   GET  /api/custom/health      → Alle Instanzen checken
```

### 9.2 Traefik als Reverse Proxy

```yaml
# docker-compose.yml (Server-Infrastruktur)
services:
  traefik:
    image: traefik:v3
    command:
      - "--api.dashboard=true"
      - "--providers.docker=true"
      - "--providers.docker.exposedbydefault=false"
      - "--providers.docker.network=pulpo-net"
      - "--entrypoints.web.address=:80"
      - "--entrypoints.websecure.address=:443"
      - "--certificatesresolvers.letsencrypt.acme.tlschallenge=true"
      - "--certificatesresolvers.letsencrypt.acme.email=admin@pulpo.cloud"
      - "--certificatesresolvers.letsencrypt.acme.storage=/letsencrypt/acme.json"
      - "--entrypoints.web.http.redirections.entrypoint.to=websecure"
    ports:
      - "80:80"
      - "443:443"
      - "8080:8080"  # Dashboard (nur intern/VPN)
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - ./letsencrypt:/letsencrypt
    networks:
      - pulpo-net
    restart: unless-stopped

networks:
  pulpo-net:
    external: true
```

**Warum Traefik:**
- Auto-Discovery via Docker Labels — kein Config-Reload bei neuem Kunden
- Let's Encrypt Auto-SSL pro Subdomain
- Dashboard für Monitoring
- Bereits im Projekt vorhanden (tools/proxy)

### 9.3 Provisioning-Flow

```
1. Kunde registriert sich auf pulpo.cloud
2. Platform erstellt:
   a. Docker Container mit Traefik-Labels + neuem Volume
   b. Traefik erkennt Container automatisch (Docker Provider)
   c. Let's Encrypt stellt SSL-Zertifikat aus
   d. Admin-User wird automatisch erstellt (PB_ADMIN_PASSWORD)
3. Kunde bekommt Setup-Email
4. Stripe Subscription starten
```

```go
// Platform: Neuen Kunden provisionieren
func provision(customer Customer) error {
    slug := customer.Slug  // z.B. "bar-el-pulpo"
    domain := slug + ".pulpo.cloud"

    // 1. Service in docker-compose.customers.yml hinzufügen
    addServiceToCompose(slug, domain)

    // 2. Nur den neuen Service starten (bestehende bleiben unberührt)
    cmd := exec.Command("docker", "compose",
        "-f", "docker-compose.customers.yml",
        "up", "-d", slug,
    )
    return cmd.Run()
}

// Kunde entfernen
func deprovision(slug string) error {
    // 1. Container stoppen
    exec.Command("docker", "compose",
        "-f", "docker-compose.customers.yml",
        "stop", slug,
    ).Run()

    // 2. Daten exportieren
    exportData(slug)

    // 3. Service aus YAML entfernen + Container löschen
    removeServiceFromCompose(slug)
    return exec.Command("docker", "compose",
        "-f", "docker-compose.customers.yml",
        "rm", slug,
    ).Run()
}
```

**Kein manueller Config-Reload:** Traefik erkennt neue Container sofort über den Docker Socket und routet Traffic + SSL automatisch.

---

## Aufräumen nach Migration

- [ ] `packages/cms/` löschen (ersetzt durch PB SDK + Go Backend)
- [ ] `packages/auth/` löschen (ersetzt durch PB Auth)
- [ ] `packages/directus-extension/` löschen (ersetzt durch Go Hooks)
- [ ] `apps/directus/` löschen (Docker + Migrations nicht mehr nötig)
- [ ] `packages/invoice/` TS-Version behalten für Frontend Cart-Vorschau
- [ ] `apps/thermal-printer-service/` löschen (ersetzt durch Web USB + PocketBase TCP)
- [ ] `tools/migrate/` durch neues PB-Migrations-Tool ersetzen
- [ ] Dependencies aufräumen: `@directus/sdk` entfernen, `pocketbase` SDK hinzufügen
- [ ] CLAUDE.md aktualisieren

---

## Zusammenfassung Aufwand

| Phase | Beschreibung | Aufwand |
|---|---|---|
| 1 | PocketBase Projekt + Schema + Admin-Absicherung | 1-2 Tage |
| 2 | Agenda migrieren | 2-3 Tage |
| 3 | Invoice-Berechnung Go | 3-5 Tage |
| 4 | Shop Backend Endpoints | 5-7 Tage |
| 5 | Shop Frontend | 3-5 Tage |
| 6 | Settings-View | 1-2 Tage |
| 7 | Docker Image + npm Distribution + go:embed | 1-2 Tage |
| 8 | Datenmigration | 2-3 Tage |
| 9 | Platform + Traefik (optional) | 3-5 Tage |
| | **Gesamt (ohne Platform)** | **~19-29 Tage** |
| | **Gesamt (mit Platform)** | **~22-34 Tage** |

---

## Risiken & Mitigierung

| Risiko | Mitigierung |
|---|---|
| Invoice-Berechnung weicht ab | Tests 1:1 portieren, Ergebnisse vergleichen |
| SQLite Performance bei vielen Invoices | Indizes auf date, status, closure; SQLite schafft Millionen Rows |
| PocketBase Breaking Changes | Version pinnen, Changelog verfolgen |
| Datenmigration fehlerhaft | Pro Kunde testen, Checksummen vergleichen |
| Go-Lernkurve | Mit Agenda starten (simpel), dann Shop |

---

## Offene Entscheidungen

1. **Invoice-Berechnung im Frontend:** `@pulpo/invoice` (JS) behalten oder auch im Frontend die Go-Version über API aufrufen?
   → Empfehlung: JS-Version behalten für Live-Preview, Go-Version auf Server für finale Berechnung.

2. **PocketBase Version:** Aktuell v0.25+ — API ist stabil, aber noch pre-1.0. Breaking Changes möglich.
   → Version pinnen, bei Major-Updates testen.

3. **Thermal Printer Service:** Entfällt.
   → USB-Drucker über Web USB API (Browser), Netzwerk-Drucker über PocketBase TCP-Endpoint.

4. **Capacitor App (agenda_app):** Weiterhin pflegen oder durch PWA ersetzen?
   → PWA ist einfacher mit dem neuen Setup (ein Origin = alles funktioniert).
