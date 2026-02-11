# Shop

Funktioniert bereits

- Produkte aus CMS laden (ProductGrid/productStore)
- Warenkorb (hinzufuegen, entfernen, Menge aendern)
- Rabatte (Artikel-Level und Global, prozentual/fix)
- Steuerberechnung dynamisch aus CMS (taxStore)
- Parked Carts (speichern, wiederherstellen, loeschen -- UI existiert)
- Checkout-Flow mit Barzahlung (Numpad + Rueckgeld) und Kartenzahlung
- Freier Betrag (CustomAmountModal)
- Letzter Wechselgeld-Widget mit Methodentausch

Fehlt noch

1. Invoice-Persistierung (Backend-Integration)
   completeTransaction() speichert nur lokal in localStorage. Die createInvoice() API aus @pulpo/cms wird nirgends aufgerufen. D.h. Rechnungen/Tickets landen nie in Directus.

2. Rectificativa (Rechnungskorrektur)
   Kein Code fuer Stornos, Retouren oder Korrekturrechnungen vorhanden.

3. Caja cerrar (Tagesabschluss)
   Kein Kassenschluss, kein Schichtmanagement, keine Z-/X-Berichte, keine Tagesuebersicht.

4. .env-Datei fehlt
   PUBLIC_TENANT_POSTCODE ist nirgends gesetzt -- d.h. loadTaxRates() wird aktuell nie aufgerufen und alle Steuersaetze sind 0%.

5. Kundenverwaltung nur lokal
   CustomerModal hat Dummy-Kunden und ein Formular, aber nichts wird in Directus persistiert oder von dort geladen.

---

Das dringendste waere vermutlich Punkt 4 (.env anlegen damit Steuern funktionieren) und Punkt 1 (Invoices tatsaechlich ans Backend schicken). Womit willst du weitermachen?
