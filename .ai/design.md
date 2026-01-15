Handle als **Senior Frontend Architect** und **Lead UI/UX Designer**, spezialisiert auf High-End Corporate Webseiten.

Erstelle den Code für eine Landingpage mit **Astro** und **Tailwind CSS v4**.

**DESIGN-VISION ("Quiet Luxury"):**

- **Stil:** Elegant, seriös, zeitlos, vertrauenswürdig.
- **Look:** Solide Farben, feine Linien (1px Borders), subtile Schatten.
- **Verbot:** **KEIN Glassmorphismus**, keine bunten Verläufe, keine Standard-Browser-Farben.
- **Layout:** "Airy" (viel Whitespace), strukturierte Raster.

---

### TECHNISCHE SPEZIFIKATIONEN (Strikt befolgen)

**1. Setup & Tailwind v4 (CSS-First Architektur):**

- Nutze die neue Tailwind v4 Engine.
- Konfiguration findet **ausschließlich** in `src/styles/global.css` statt.
- Import: `@import "tailwindcss";`.
- Theme-Konfiguration: Nutze die `@theme` Direktive im CSS.

**2. Assets & Performance:**

- **Fonts:** Binde Google Fonts **LOKAL** über NPM-Pakete (`@fontsource/...`) ein. Kein CDN!
  - Headings: Elegante Serif-Schrift (z.B. "Playfair Display", "Libre Baskerville").
  - Body: Moderne Sans-Serif (z.B. "Inter", "Plus Jakarta Sans").
- **Icons:** Nutze das Paket `astro-icon`.
  - Icon Set: `lucide` oder `heroicons`.
  - Syntax: `<Icon name="lucide:shield-check" class="..." />`.
- **Bilder:** Nutze zwingend die Astro `<Image />` Komponente (`import { Image } from 'astro:assets';`) für automatische Optimierung (WebP/AVIF).

**3. Farbsystem (Zentral & Harmonisch):**

- Definiere alle Farben als CSS Custom Properties in `:root` und `.dark` in der `global.css`.
- Die Farben müssen zentral änderbar sein.
- **Palette (Deep & Harmonised):**
  - `--color-primary`: Ein tiefes Navy-Blau, Anthrazit oder Dunkelgrün (Seriös).
  - `--color-secondary`: Ein passender Akzentton (Gold, Beige, Kupfer).
  - `--color-surface`: Ein warmes Grau (`#F9FAFB`) für Hintergründe, kein hartes Reinweiß.
  - **Funktionale Farben:** Success, Error, Warning müssen **tonal abgestimmt** sein (gleiche "Schwere" wie die Primary Color).
    - _Beispiel Error:_ Dunkles Weinrot/Crimson (statt Standard-Rot).
    - _Beispiel Success:_ Dunkles Smaragdgrün (statt Neon-Grün).
- Referenziere diese im Tailwind `@theme`.

**4. Typografie (Global Reset & Responsive):**

- Setze globale Styles in `@layer base` (Tailwind v4), um HTML-Tags direkt zu stylen.
- **H1:** Mobile `text-4xl`, Desktop `text-6xl`. `font-serif`, `tracking-tight`, `leading-[1.1]`.
- **H2/H3:** Entsprechende Abstufungen, ebenfalls Serif.
- **P (Body):** `text-base` (Mobile) bis `text-lg` (Desktop). **Zwingend:** `leading-relaxed` für Lesbarkeit. Textfarbe: Nicht #000, sondern dunkles Grau (`text-slate-700`).

**5. Mobile Excellence (Mobile First):**

- **Touch Targets:** Interaktive Elemente (Buttons, Links) müssen mind. 44px hoch sein.
- **Spacing Strategie:**
  - Mobile: `py-12`, `gap-6`, `px-4`.
  - Desktop: `py-24`, `gap-12`, `px-8` (für den Luxus-Look).
- **Grid/Flex:**
  - Hero: Mobile `flex-col` (Text oben, Bild unten), Desktop `flex-row`.
  - Grids: Mobile 1 Spalte, Tablet 2, Desktop 3.

**6. UI-Details:**

- **Focus Rings:** Ersetze Standard-Outline durch `focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2`.
- **Container:** Globaler Wrapper `max-w-7xl mx-auto`.
- **Radius:** Nutze `rounded-md` oder `rounded-sm` (klassisch), keine Pill-Shapes (`rounded-full`) für Buttons.

---

### GEWÜNSCHTER CODE-OUTPUT

Generiere bitte folgende Dateien:

1.  **Terminal Befehle:** `npm install` für Astro, Tailwind, Fonts, Icons.
2.  **`astro.config.mjs`**: Minimales Setup für Tailwind.
3.  **`src/styles/global.css`**:
    - Das Herzstück. Beinhaltet `@import`, `@theme` Config, CSS Variablen (:root/.dark) und `@layer base` Typo-Reset.
4.  **`src/components/ui/Button.astro`**:
    - Props: `variant` ('primary', 'secondary', 'outline'), `size`, `href` (optional).
    - Wiederverwendbar, mit Hover-Effekten (z.B. subtiles `translate-y`).
5.  **`src/components/ThemeToggle.astro`**:
    - Button zum Umschalten von Dark/Light Mode (mit JS Logic im Script Tag).
6.  **`src/layouts/Layout.astro`**:
    - Importiert Fonts und CSS.
    - Beinhaltet das Script zum Lesen des `localStorage` für Dark Mode (gegen FOUC).
7.  **`src/pages/index.astro`**:
    - **Hero Section:** Headline (Serif), Subline, 2 Buttons, Platzhalter-Bild via `<Image />`.
    - **Harmony Showcase:** Eine Sektion mit "Success", "Error" und "Info" Cards/Alerts, um die Farbharmonie zu beweisen.
    - **Features Grid:** Zeigt 3 Services mit Icons (`<Icon />`). Solide Cards, `border-gray-200`, leichter `shadow-sm`.
    - Alles responsive optimiert.
