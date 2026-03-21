# Pulpo – Das Cloud-Kassensystem für dein Geschäft

> Verkaufen, abrechnen, wachsen – alles aus einer Hand, von jedem Gerät.

---

## Elevator Pitch

Pulpo ist das moderne Cloud-Kassensystem, das Gastronomen und Einzelhändlern den Rücken freihält. Kein Server im Hinterzimmer, keine veraltete Software, keine Kompromisse. Einfach Tablet aufstellen, einloggen und loslegen. Verkäufe erfassen, Rechnungen erstellen, Lager im Blick behalten und am Ende des Tages wissen, was wirklich verdient wurde – in Echtzeit, von überall.

---

## Kernfunktionen

### Kassensystem (TPV / POS)

Das Herzstück von Pulpo. Eine schnelle, intuitive Verkaufsoberfläche, die für den Alltag gemacht ist.

- **Produktraster mit Kategorien** – Alle Produkte auf einen Blick, gefiltert nach Kategorien. Kein Scrollen, kein Suchen.
- **Stückware und Gewichtsware** – Egal ob Kaffee nach Stück oder Käse nach Gewicht: Pulpo rechnet beides korrekt ab.
- **Warenkorb mit Echtzeit-Berechnung** – Positionen hinzufügen, entfernen, Mengen anpassen. Rabatte auf einzelne Artikel oder den gesamten Warenkorb. Alles sofort kalkuliert.
- **Parkende Warenkörbe** – Warenkorb zwischenspeichern und später fortsetzen. Perfekt für Gastronomie mit offenen Tischen.
- **Barcode-Scanner-Kompatibel** – Anschließen und lostippen. Funktioniert mit gängigen USB- und Bluetooth-Scannern.
- **Bondrucker-Integration** – Direkte Anbindung an ESC/POS-Thermodrucker. Bons drucken auf Knopfdruck, auch nachdrucken.

### Facturación / Rechnungsstellung

Drei Dokumenttypen, die alle gesetzlichen Anforderungen erfüllen – automatisch und lückenlos.

- **Ticket (Factura Simplificada)** – Schnellbeleg ohne Kundendaten. Fortlaufende Nummerierung, sofort ausgedruckt.
- **Factura (Factura Completa)** – Vollständige Rechnung mit Kundendaten und NIF. Eigene Nummernreihe, eigene Serie.
- **Rectificativa (Gutschrift/Korrektur)** – Für Retouren, Fehler, Stornos. Teilmengen-Korrekturen möglich. System verhindert automatisch Über-Korrekturen. Lagerbestand wird bei Rückgabe automatisch zurückgebucht.
- **VeriFactu-Ready** – Vorbereitet für die spanische Steuer-Audit-Kette. Alle Pflichtfelder werden erfasst.
- **Rechnungsverlauf** – Letzte Transaktionen durchsuchen, nachdrucken, Zahlungsart nachträglich ändern (Bar ↔ Karte).

### Zahlungsarten

- **Bar** – Mit automatischer Wechselgeldberechnung
- **Karte** – Kartenzahlung erfassen
- **Nachträgliche Änderung** – Zahlungsart einer bestehenden Rechnung umbuchen

### Kundenverwaltung

- Kunden anlegen, bearbeiten, löschen
- Name, NIF, Adresse, E-Mail, Telefon, Notizen
- Kunden-Suche nach Name oder NIF
- Kundendaten werden auf Rechnungen als Snapshot gespeichert – historisch korrekt, auch wenn sich Daten später ändern

### Lagerverwaltung / Inventar

- **Optionaler Lagerbestand pro Produkt** – Aktivierbar per Produkt, kein Zwang
- **Automatische Bestandsführung** – Verkauf reduziert den Bestand serverseitig. Gutschriften buchen zurück.
- **Echtzeit-Anzeige** – Aktuelle Bestände im Produktraster sichtbar. Visuelle Warnung bei niedrigem Bestand, „Agotado"-Label bei Null.
- **Hintergrund-Synchronisation** – Automatische Aktualisierung alle 15 Minuten und bei Tab-Wechsel

### Kassenschluss / Schichtabschluss

Der Moment der Wahrheit – strukturiert und transparent.

- **Kasse öffnen** – Anfangsbestand eingeben, Schicht starten
- **Kasse schließen** – Geführter Wizard:
  - Münzen und Scheine einzeln zählen (Stückelungseingabe)
  - Gezählten Betrag eingeben
  - System berechnet automatisch: Soll-Bestand vs. Ist-Bestand
  - Differenz wird protokolliert
- **Schichtbericht** – Zusammenfassung aller Transaktionen der Schicht:
  - Anzahl und Summe pro Belegart (Tickets, Facturas, Rectificativas)
  - Aufschlüsselung nach Zahlungsart (Bar / Karte)
  - Steueraufschlüsselung nach Steuersatz
  - Produktaufschlüsselung mit Kostenstellen
- **E-Mail-Versand** – Schichtbericht automatisch per E-Mail mit Excel-Anhang

### Berichte & Analysen

Wissen, was läuft – nicht raten, sondern sehen.

- **Fünf Berichtszeiträume**: Täglich, Wöchentlich, Monatlich, Quartalsweise, Jährlich
- **Zusammenfassung pro Zeitraum**:
  - Brutto, Netto, Steuern
  - Bar- und Kartenumsatz
  - Transaktionsanzahl pro Belegart
  - Kassendifferenzen
- **Produktaufschlüsselung**: Welches Produkt hat wie viel gebracht? Aufgeschlüsselt nach Kostenstelle und Zahlungsart.
- **Steuerübersicht**: Aufschlüsselung nach Steuersatz – fertig für die Buchhaltung
- **Excel-Export**: Jeder Bericht als mehrseitiges Excel-Workbook mit Zusammenfassung, Produktliste und Schichtdetails
- **Backfill**: Historische Daten nachträglich aggregieren

### Steuersystem (Spanien)

Pulpo kennt die spanischen Steuerregionen und wendet automatisch den richtigen Steuersatz an.

- **IVA** – Festland-Spanien (Standard)
- **IGIC** – Kanarische Inseln (automatisch erkannt anhand PLZ 35xxx, 38xxx)
- **IPSI** – Ceuta (51xxx) und Melilla (52xxx)
- **Sechs Steuerklassen**: Standard, Reduziert, Erhöht, Super-Reduziert, Null, Zero
- **Dynamische Erkennung** – Steuersätze werden anhand der Postleitzahl des Geschäfts geladen. Kein manuelles Konfigurieren.

### Reservierungssystem (Agenda)

Für Gastronomen, die Reservierungen im Griff haben wollen.

- **Reservierungen verwalten** – Datum, Uhrzeit, Name, Kontakt, Personenanzahl, Notizen
- **Schichten / Turns** – Konfigurierbare Zeitslots mit Farbcodierung (z.B. Mittagsschicht, Abendschicht)
- **Ansichtsmodi** – Alle Reservierungen als Liste oder gefiltert nach Schicht
- **Ankunftsstatus** – Doppeltippen markiert Gäste als „angekommen". No-Shows werden visuell hervorgehoben (rotes X).
- **Echtzeit-Polling** – Hintergrund-Aktualisierung alle 3 Sekunden. Änderungen erscheinen sofort auf allen Geräten.
- **Responsive** – Optimiert für Tablet am Empfang und Smartphone in der Tasche

### Tienda Online / Online-Shop

Ein integrierter Online-Shop, der direkt mit Kassensystem und Lager verbunden ist.

- **Geteiltes Inventar** – Gleicher Lagerbestand für Online und stationär. Kein doppeltes Pflegen.
- **Produktkatalog** – Kategorien, Bilder, Beschreibungen, Preise
- **Mehrsprachig** – Produktnamen und -beschreibungen in mehreren Sprachen

---

## Technische Stärken

### Cloud-Native

- **Kein lokaler Server** – Alles läuft in der Cloud. Kein Setup, keine Wartung.
- **Multi-Device** – Funktioniert auf Tablet, Smartphone und Desktop-Browser. Responsive Design.
- **Immer aktuell** – Updates werden automatisch ausgerollt, ohne Unterbrechung.

### Multi-Tenancy

- **Mandantenfähig** – Jeder Betrieb arbeitet in seiner eigenen, isolierten Umgebung.
- **Eigene Rechnungspräfixe und -serien** – Individuelle Nummerierung pro Betrieb.
- **Eigene Steuerregion** – Automatisch anhand der Postleitzahl.

### Robuste Berechnung

- **Cent-genaue Arithmetik** – Alle Berechnungen mit `big.js` auf 20 Stellen Präzision. Kein Rundungsfehler.
- **Steuerinvariante** – Brutto = Netto + Steuer. Immer. Auf den Cent.
- **Serverseitige Validierung** – Rechnungen werden serverseitig berechnet und validiert. Die Kasse zeigt an, der Server entscheidet.
- **Transaktionssicherheit** – Mandanten-Level Locking bei Rechnungserstellung. Keine doppelten Nummern, kein Race Condition.

### Datensicherheit

- **Denormalisierte Snapshots** – Kundendaten, Steuersätze und Preise werden zum Zeitpunkt der Rechnung festgehalten. Nachträgliche Änderungen verfälschen keine historischen Belege.
- **Benutzer-Authentifizierung** – Login-basierter Zugang mit Token-basierter API-Sicherheit.
- **Mandantenisolierung** – Strikte Datentrennung zwischen Betrieben.

---

## Zielgruppen

### Gastronomie
Restaurants, Bars, Cafés, Imbisse. Offene Tische mit parkenden Warenkörben, Kostenstellen für Bar/Küche/Terrasse, Reservierungssystem, Bondrucker am Tresen.

### Einzelhandel
Bäckereien, Feinkostläden, Boutiquen. Gewichtsware, Barcode-Scanner, Lagerbestand, Kundenrechnungen mit NIF.

### Multi-Standort
Mehrere Filialen, ein System. Jeder Standort als eigener Mandant mit eigener Steuerregion, eigenen Serien, eigenem Team.

---

## Preise

| | Básico | Profesional |
|---|---|---|
| **Preis** | 29€/Monat | 59€/Monat |
| Kassensystem (TPV) | ✓ | ✓ |
| Facturación | ✓ | ✓ |
| Inventar (Basis) | ✓ | ✓ |
| Benutzer | 1 | Unbegrenzt |
| Tienda Online | – | ✓ |
| Erweiterte Berichte | – | ✓ |
| Reservierungssystem | – | ✓ |
| Excel-Export | – | ✓ |
| E-Mail-Schichtberichte | – | ✓ |

Keine Vertragsbindung. Jederzeit kündbar. Keine versteckten Kosten.

---

## Kontakt

**E-Mail:** info@pulpo.cloud
**Web:** https://pulpo.cloud
