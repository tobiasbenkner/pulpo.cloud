Handle als erfahrener Senior Frontend Developer und Software-Architekt. Deine Aufgabe ist es, die Architektur und den Code für eine moderne, performante Unternehmens-Webseite zu erstellen.

**Technologie-Stack:**

- **Framework:** Astro (neueste Version).
- **Styling:** Tailwind CSS v4 (Nutze die neue CSS-first Konfiguration, keine veraltete tailwind.config.js, sofern möglich).
- **Sprache:** TypeScript (für Typensicherheit, besonders bei den JSON-Daten).

**Architektur & Design-Prinzipien:**

1.  **Atomic Design / Komponenten-basiert:**
    - Jede Sektion der Webseite (z.B. Hero, Services, About, FAQ, Footer) muss eine eigenständige `.astro` Komponente sein (z.B. `src/components/sections/Hero.astro`).
    - Die Seiten (z.B. `index.astro`) dürfen kaum HTML enthalten, sondern sollen nur diese Komponenten importieren und zusammensetzen.
    - Ziel: Maximale Lesbarkeit und keine Code-Duplizierung.

2.  **Single Source of Truth (Datenhaltung):**
    - Erstelle eine globale JSON-Datei (z.B. `src/data/siteData.json`), die alle Texte, Kontaktinfos, Navigationselemente, Social-Links und Farben/Konfigurationen enthält.
    - Die Komponenten dürfen keine Hardcoded-Strings enthalten, sondern müssen sich die Daten aus dieser JSON ziehen oder via Props erhalten.
    - Änderungen an Telefonnummern oder Texten sollen nur in der JSON erfolgen.

3.  **Kontakt-Strategie (Keine Formulare):**
    - Verzichte komplett auf Backend-Kontaktformulare.
    - Erstelle stattdessen eine "ContactCards"-Komponente. Diese soll modern designte Karten enthalten für:
      - E-Mail (`mailto:` Link)
      - Telefon (`tel:` Link)
      - WhatsApp (`wa.me` Link)
    - Das Design soll zum Klicken animieren (Hover-Effekte).

4.  **DSGVO / Privacy & Externe Dienste:**
    - Implementiere eine **"Privacy Map"** Komponente für Google Maps.
    - **Verhalten:** Standardmäßig wird nur ein statisches Bild oder ein Platzhalter mit einem Button ("Karte laden") angezeigt. Es darf keine Verbindung zu Google-Servern aufgebaut werden, bevor der User klickt.
    - **Zustimmungs-Management:**
      - Beim Klick auf "Karte laden" wird die Zustimmung im `localStorage` gespeichert (`maps_consent = true`).
      - Wenn der Consent vorhanden ist, wird die Karte (iFrame/API) sofort geladen.
    - **Widerruf:** Auf der Datenschutz-Seite (erstelle eine `privacy.astro` Page) muss ein Button oder eine Checkbox existieren, die den Eintrag aus dem `localStorage` löscht und den Status zurücksetzt.

**Deine Ausgabe:**
Bitte erstelle die Projektstruktur und den Code für die wichtigsten Dateien.

1.  Zeige die Struktur der `src/data/siteData.json`.
2.  Erstelle die `Hero.astro` Komponente, die Daten aus der JSON nutzt.
3.  Erstelle die `PrivacyMap.astro` Komponente mit dem erforderlichen Client-Side JavaScript (nutze `<script>` Tags innerhalb der Astro Komponente) für die DSGVO-Logik.
4.  Erstelle die `ContactSection.astro` mit den modernen Kontakt-Karten.
5.  Zeige, wie die `index.astro` diese Komponenten zusammensetzt.
6.  Zeige den Code-Schnipsel für die Datenschutz-Seite zum Widerrufen der Zustimmung.

Achte auf sauberen Code, Barrierefreiheit (Accessibility) und valides HTML.
