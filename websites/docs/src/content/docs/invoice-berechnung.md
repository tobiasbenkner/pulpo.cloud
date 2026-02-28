---
title: Invoice-Berechnung
description: Wie die Rechnungsberechnung in @pulpo/invoice funktioniert
---

# Invoice-Berechnung (`@pulpo/invoice`)

Das Paket `@pulpo/invoice` enthält eine **reine Funktion** `calculateInvoice()`, die aus Positionen und einem optionalen Gesamtrabatt alle Rechnungswerte berechnet. Dieselbe Funktion wird sowohl im Frontend (Shop) als auch im Backend (Directus Extension) verwendet, um identische Ergebnisse zu garantieren.

Alle Geldbeträge werden intern mit **big.js** verarbeitet – niemals mit nativen JavaScript-`number`-Floats – um Rundungsfehler zu vermeiden.

## Signatur

```ts
calculateInvoice(
  items: InvoiceLineInput[],
  globalDiscount?: InvoiceDiscountInput | null
): InvoiceCalculationResult
```

## Übersicht

![Rechnungsberechnung — Schritt für Schritt](/diagrams/invoice-berechnung.svg)

## Berechnungsablauf

Die Berechnung erfolgt in **drei Schritten**:

### Schritt 1 – Positionsbeträge (Zeilenebene)

Für jede Position wird der Brutto-Zeilenbetrag berechnet:

```
zeileBrutto = priceGross × quantity
```

Falls die Position einen **Positionsrabatt** hat, wird dieser abgezogen:

| Rabatttyp | Formel |
|-----------|--------|
| `fixed` | `zeileBrutto = zeileBrutto − discount.value` |
| `percent` | `zeileBrutto = zeileBrutto − (zeileBrutto × discount.value / 100)` |

Der Zeilenbetrag wird auf **mindestens 0** begrenzt (kein negativer Wert möglich).

Anschließend werden alle Zeilenbeträge zur **Zwischensumme** (`subtotal`) aufsummiert.

### Schritt 2 – Gesamtrabatt

Wenn ein globaler Rabatt übergeben wird, wird er auf die Zwischensumme angewendet:

| Rabatttyp | Formel |
|-----------|--------|
| `fixed` | `endBrutto = subtotal − discount.value` |
| `percent` | `endBrutto = subtotal − (subtotal × discount.value / 100)` |

Auch hier wird der Endbetrag auf **mindestens 0** begrenzt. Der tatsächliche Rabattbetrag wird ebenfalls auf maximal die Zwischensumme gedeckelt.

### Schritt 3 – Steuer-Rückrechnung

Die Steuer wird **aus dem Brutto herausgerechnet** (nicht aufgeschlagen). Dazu wird ein **Rabattverhältnis** berechnet, das den Gesamtrabatt proportional auf alle Positionen verteilt:

```
rabattVerhältnis = endBrutto / subtotal
```

Für jede Position ergibt sich der anteilige Bruttobetrag nach Rabatt:

```
zeileBruttoNachRabatt = zeileBrutto × rabattVerhältnis
```

#### Steuer-Gruppierung

Die Steuerbeträge werden nach **Steuersatz gruppiert** (z. B. 7 % und 21 % getrennt). Für jede Gruppe wird das **Gruppen-Brutto** auf 2 Stellen gerundet, eine **Cent-Korrektur** durchgeführt (Differenz auf die größte Gruppe), und dann berechnet:

```
netto  = round2(gruppeBrutto / (1 + steuerSatz))
steuer = gruppeBrutto − netto
```

Die Netto-Berechnung erfolgt **nur auf Gruppenebene**, nicht pro Einzelposition. Die Gruppen werden aufsteigend nach Steuersatz sortiert.

## Ergebnis

Die Funktion gibt ein `InvoiceCalculationResult` zurück:

| Feld | Beschreibung | Präzision |
|------|-------------|-----------|
| `subtotal` | Zwischensumme (nach Positionsrabatten, vor Gesamtrabatt) | 2 Stellen |
| `discountTotal` | Gesamtrabatt-Betrag | 2 Stellen |
| `gross` | Endbetrag brutto | 2 Stellen |
| `net` | Endbetrag netto | 2 Stellen |
| `tax` | Steuerbetrag gesamt (`gross − net`) | 2 Stellen |
| `taxBreakdown` | Steuer aufgeschlüsselt nach Satz | 2 Stellen |
| `items` | Berechnete Positionen | siehe unten |
| `count` | Gesamtanzahl Artikel | – |
| `discountType` | Art des Gesamtrabatts (`"percent"`, `"fixed"` oder `null`) | – |
| `discountValue` | Wert des Gesamtrabatts (oder `null`) | 4 Stellen |

### Berechnete Position (`InvoiceLineResult`)

| Feld | Beschreibung | Präzision |
|------|-------------|-----------|
| `productId` | Produkt-ID | – |
| `productName` | Produktname | – |
| `quantity` | Menge | – |
| `priceGrossUnit` | Brutto-Einzelpreis | 4 Stellen |
| `taxRateSnapshot` | Steuersatz in Prozent (z. B. `"7.00"`) | 2 Stellen |
| `rowTotalGross` | Zeilen-Brutto (nach allen Rabatten) | 2 Stellen |
| `discountType` | Art des Positionsrabatts (`"percent"`, `"fixed"` oder `null`) | – |
| `discountValue` | Wert des Positionsrabatts (oder `null`) | 4 Stellen |
| `costCenter` | Kostenstelle (oder `null`) | – |

## Beispiel

```ts
import { calculateInvoice } from "@pulpo/invoice";

const result = calculateInvoice(
  [
    {
      productId: "1",
      productName: "Café con leche",
      priceGross: "2.50",
      taxRate: "7",
      quantity: 2,
    },
    {
      productId: "2",
      productName: "Cerveza",
      priceGross: "3.00",
      taxRate: "21",
      quantity: 1,
      discount: { type: "percent", value: 10 },
    },
  ],
  { type: "percent", value: 5 }
);

// result.subtotal   → "7.70"  (2×2.50 + 3.00−10%)
// result.discountTotal → "0.39"  (5% von 7.70, gerundet)
// result.gross      → "7.32"  (7.70 − 0.39, gerundet)
// result.taxBreakdown → aufgeschlüsselt nach 7% und 21%
```

## Dezimal-Strategie

| Kontext | Präzision | Grund |
|---------|-----------|-------|
| Geldbeträge (Summen) | `.toFixed(2)` | Centgenau für Zahlungen |
| Einzelpreise | `.toFixed(4)` | Mehr Genauigkeit bei kleinen Beträgen |

Alle Werte werden als **Strings** zurückgegeben, niemals als `number`, um unbeabsichtigte Gleitkomma-Ungenauigkeiten zu verhindern.
