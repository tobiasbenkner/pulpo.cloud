---
title: Rechnungsprozess
description: Vollständiger Ablauf der Rechnungserstellung in Pulpo POS
---

Vollständige Beschreibung des Rechnungserstellungsprozesses in Pulpo POS, von der Kundenanfrage bis zur endgültigen Speicherung.

## Ablaufübersicht

| Phase | Beschreibung | DB-Zugriff |
|-------|-------------|------------|
| 1 | Authentifizierung und Tenant-Auflösung | Lesen |
| 2 | Laden der Referenzdaten (Produkte, Steuern) | Lesen |
| 3 | Reine Berechnung mit `calculateInvoice()` | Keiner |
| 4 | Kunden-Snapshot | Lesen |
| 5 | Bestimmung der Serie (Ticket oder Rechnung) | Keiner |
| 6 | **Transaktion**: Sperre, Erstellung, Zähler, Bestand | **Lesen + Schreiben** |
| 7 | Antwort mit vollständiger Rechnung | Lesen |

---

## Phasen im Detail

### 1. Authentifizierung und Tenant-Auflösung

Jede Anfrage erreicht den Endpoint `POST /invoices`. Das System extrahiert die `user_id` aus dem Authentifizierungstoken und sucht den zugehörigen Tenant in der Tabelle `directus_users`.

**Mögliche Fehler:**

- `401` — Benutzer nicht authentifiziert
- `401` — Benutzer ohne zugewiesenen Tenant

### 2. Laden der Referenzdaten

Vor jeder Berechnung werden drei schreibgeschützte Datensätze geladen:

#### a) Postleitzahl des Tenants

Das Feld `postcode` wird aus der Tabelle `tenants` gelesen. Diese Postleitzahl bestimmt die anwendbare Steuerzone.

#### b) Produkte

Alle angeforderten Produkte werden mit ihren Feldern geladen: `id`, `name`, `price_gross`, `tax_class.code` und `cost_center.name`. Wenn ein Produkt nicht existiert, wird Fehler `400` zurückgegeben.

#### c) Steuersätze

Das System sucht die Steuerzone, deren Regex-Muster mit der Postleitzahl des Tenants übereinstimmt. Die Zonen werden nach Priorität geordnet ausgewertet. Sobald die Zone gefunden ist, werden die zugehörigen `tax_rules` geladen, wobei die Prozentsätze (z. B. `7.0`) in Dezimalwerte (z. B. `0.07`) umgerechnet werden.

> **Beispiel:** Ein Tenant auf den Kanarischen Inseln (PLZ `35XXX`) wird einer Steuerzone zugeordnet, die IGIC (7%) statt der spanischen Festland-IVA (21%) anwendet.

### 3. Rechnungsberechnung

Die Funktion `calculateInvoice()` aus dem Paket `@pulpo/invoice` führt alle Berechnungen als reine Funktion ohne Datenbankzugriff durch. Dieselbe Funktion wird sowohl auf dem Server als auch in der TPV-App verwendet, um identische Ergebnisse zu garantieren.

**Berechnungsschritte:**

1. **Zeilenrabatte** — Für jedes Produkt: `Bruttopreis × Menge`, dann wird der individuelle Rabatt (Prozent oder Festbetrag) angewendet. Das Minimum ist 0.
2. **Zwischensumme** — Summe aller Brutto-Zeilenbeträge (nach Zeilenrabatten).
3. **Gesamtrabatt** — Falls ein Gesamtrabatt existiert, wird er auf die Zwischensumme angewendet (Prozent oder Festbetrag). Ein `Rabattverhältnis` wird berechnet, um ihn proportional auf die Zeilen zu verteilen.
4. **Steuer-Rückrechnung** — Die Preise sind brutto (inkl. Steuern). Der Nettobetrag wird durch Division durch `(1 + Steuersatz)` ermittelt. Rundung auf 8 Dezimalstellen für maximale Genauigkeit.
5. **Steueraufschlüsselung** — Die Zeilen werden nach Steuersatz gruppiert, und Netto- sowie Steuerbetrag werden pro Gruppe berechnet. Das Ergebnis wird aufsteigend nach Steuersatz sortiert.

#### Dezimalarithmetik

Alle Geldbeträge werden als `string` behandelt, und die interne Arithmetik verwendet `big.js`, um Gleitkommafehler zu vermeiden.

| Werttyp | Genauigkeit | Beispiel |
|---------|-------------|---------|
| Geldbeträge (Summen) | 2 Dezimalstellen | `"12.50"` |
| Einzelpreise | 4 Dezimalstellen | `"3.5000"` |
| Präziser Nettobetrag | 8 Dezimalstellen | `"3.27102804"` |
| Steuersatz (Snapshot) | 2 Dezimalstellen (%) | `"7.00"` |

### 4. Kunden-Snapshot

Wenn eine `customer_id` angegeben wird, werden die aktuellen Kundendaten (Name, Steuernummer, Adresse, E-Mail, Telefon) direkt in die Rechnung kopiert. Damit bleiben die Kundendaten zum Zeitpunkt des Verkaufs erhalten, auch wenn der Kunde seine Daten später ändert.

Wenn der Kunde nicht in der Datenbank gefunden wird, wird ohne Snapshot fortgefahren, aber die Referenz auf die ID beibehalten.

### 5. Bestimmung der Serie

Der Dokumenttyp wird automatisch anhand des vorhandenen Kunden bestimmt:

| Bedingung | Serie | Präfix | Zähler |
|-----------|-------|--------|--------|
| Ohne `customer_id` | **Ticket** | *(keiner)* | `last_ticket_number` |
| Mit `customer_id` | **Rechnung** | `F-` | `last_factura_number` |

### 6. Transaktion mit Sperre (atomares Schreiben)

Alle Schreiboperationen werden innerhalb einer Datenbanktransaktion ausgeführt. Wenn ein Schritt fehlschlägt, werden keine Teiländerungen gespeichert.

#### a) Tenant-Sperre (`FOR UPDATE`)

Die Tenant-Zeile wird mit `SELECT ... FOR UPDATE` gesperrt. Dies serialisiert alle gleichzeitigen Anfragen desselben Tenants und verhindert doppelte Rechnungsnummern.

#### b) Generierung der Rechnungsnummer

Der Tenant-Datensatz wird (innerhalb der Sperre) gelesen und die Nummer mit der Funktion `generateInvoiceNumber()` generiert.

**Nummernformat:** `[Serie]-[Präfix mit Variablen]`

Verfügbare Variablen im Präfix:

| Variable | Beispiel |
|----------|---------|
| `%date%` | `20260227` |
| `%year%` | `2026` |
| `%month%` | `02` |
| `%day%` | `27` |
| `%count%` | `00042` (5 Stellen, mit Nullen) |

Vollständiges Beispiel: `F-2026-00042`

#### c) Prüfung der offenen Kasse

Es wird ein Datensatz in `cash_register_closures` mit Status `"open"` für den Tenant gesucht. Ohne offene Kasse kann keine Rechnung erstellt werden (Fehler `NO_OPEN_CLOSURE`).

#### d) Erstellung des Rechnungsdatensatzes

Die Rechnung wird mit allen Beziehungen in einer einzigen Directus-Operation erstellt:

- **Hauptdaten:** Nummer, Serie, Summen, Steueraufschlüsselung
- **Aussteller-Snapshot:** Name, Steuernummer, Adresse des Tenants
- **Kunden-Snapshot** (falls vorhanden)
- **Rechnungspositionen** — verschachtelte Erstellung mit `items: { create: [...] }`
- **Zahlungen** — verschachtelte Erstellung mit `payments: { create: [...] }`

#### e) Aktualisierung des Zählers

Der entsprechende Zähler im Tenant wird inkrementiert: `last_ticket_number` oder `last_factura_number`, je nach Serie.

#### f) Bestandsreduzierung

Für jedes verkaufte Produkt mit Bestandskontrolle (`stock IS NOT NULL`) wird die Menge reduziert. Es wird `GREATEST(stock - Menge, 0)` verwendet, um negative Werte zu vermeiden.

### 7. Antwort

Nach Abschluss der Transaktion wird die vollständige Rechnung mit allen Beziehungen (`items` und `payments`) gelesen und an den Client zurückgegeben.

```json
{
  "success": true,
  "invoice": {
    "id": "uuid",
    "invoice_number": "F-2026-00042",
    "invoice_type": "factura",
    "status": "paid",
    "total_net": "10.28",
    "total_tax": "0.72",
    "total_gross": "11.00",
    "tax_breakdown": [
      { "rate": "7.00", "net": "10.28", "tax": "0.72" }
    ],
    "items": ["..."],
    "payments": ["..."]
  }
}
```

---

## Datenstruktur

### Anfragekörper (Request Body)

| Feld | Typ | Beschreibung |
|------|-----|-------------|
| `status` | `"paid"` | Status der Rechnung |
| `items` | `RequestItem[]` | Produktpositionen |
| `items[].product_id` | `string` | Produkt-ID |
| `items[].quantity` | `number` | Menge |
| `items[].discount` | `Discount?` | Zeilenrabatt (optional) |
| `discount` | `Discount?` | Gesamtrabatt (optional) |
| `customer_id` | `string?` | Kunden-ID (bestimmt ob Rechnung oder Ticket) |
| `payments` | `Payment[]` | Verwendete Zahlungsmethoden |
| `payments[].method` | `"cash" \| "card"` | Zahlungsmethode |
| `payments[].amount` | `string` | Zahlungsbetrag |
| `payments[].tendered` | `string?` | Gegebener Betrag (nur Bargeld) |
| `payments[].change` | `string?` | Rückgeld (nur Bargeld) |
| `payments[].tip` | `string?` | Trinkgeld |

### Rabatttyp (Discount)

| Feld | Typ | Beschreibung |
|------|-----|-------------|
| `type` | `"percent" \| "fixed"` | Prozent oder Festbetrag |
| `value` | `number` | Rabattwert (z. B. 10 für 10% oder 10 EUR) |

---

## Datenbanktabellen

Am Rechnungsprozess beteiligte Tabellen und ihre Rolle:

| Tabelle | Zugriff | Zweck |
|---------|---------|-------|
| `directus_users` | Lesen | Tenant des Benutzers auflösen |
| `tenants` | Lesen + Sperre | Postleitzahl, Zähler, Ausstellerdaten |
| `products` | Lesen + Schreiben (Bestand) | Produktdaten, Bestandsreduzierung |
| `tax_zones` | Lesen | Steuerzonen mit PLZ-Regex |
| `tax_rules` | Lesen | Steuersätze nach Zone und Klasse |
| `customers` | Lesen | Kundendaten für Snapshot |
| `cash_register_closures` | Lesen | Prüfen ob Kasse geöffnet ist |
| `invoices` | Schreiben | Hauptdatensatz der Rechnung |
| `invoice_items` | Schreiben | Rechnungspositionen (verschachtelte Erstellung) |
| `invoice_payments` | Schreiben | Zahlungen der Rechnung (verschachtelte Erstellung) |

---

## Fehlerbehandlung

| Code | Fehler | Ursache |
|------|--------|--------|
| `401` | Nicht authentifiziert | Kein Authentifizierungstoken angegeben oder ungültig |
| `401` | Kein Tenant zugewiesen | Der Benutzer hat keinen zugewiesenen Tenant |
| `400` | Produkt nicht gefunden | Ein oder mehrere Produkte existieren nicht in der Datenbank |
| `500` | NO_OPEN_CLOSURE | Keine offene Kasse für den Tenant |
| `500` | Tenant nicht gefunden | Der Tenant wurde während der Transaktion gelöscht |
