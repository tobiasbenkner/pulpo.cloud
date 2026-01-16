ich möchte eine webanwendung für eine agenda bauen. 

der technologie stack soll directus, astro, tailwind v4, svlete und svlete shadcn sein.

handle als full stack experte.

auf der hauptseite soll eine tabelle mit allen reservieren angezeigt werden. die anwendung wird von mehreren anwendern gleichzeitig verwendet. wenn ein benutzer eine änderung macht, sollen die anderen benutzer ein live-update direkt bekommen. verwende daher bitte die realtime api von directus, um die daten zu aktualisieren.

die anwendung soll auf der sprache spanisch sein.

die tabelle soll die spalten:
- Hora
- Nombre
- Contacto
- Observación
- avatar, wer die reseriverung angelegt hat.

haben. wenn man einen doppelklick auf eine zeile macht, dann soll ein api aufruf passieren und in der reservierung soll hinterlegt werden, dass die person, die reserviert hat bereits da ist.

die tabelle soll nach uhrzeit und danach nach name sortiert sein.

die tabelle zeigt nur einen tag an.

im seitenkopf soll es eine navigation geben. dort es zwei button geben, womit man ein tag zurück und ein tag vor gehen kann. des weiteren soll es einen button hoy geben, so das der anwender automatisch auf den heuten tag springt. dann soll auch das datum in der navigation angezeigt werden. wenn man auf das datum klickt, soll ein kalender geöffnet werden, wo der anwendung ein datum auswählen kann und dann direkt zu dem datum weitergeleitet wird. zuletzt soll es einen button geben, womit man eine neue reservieren anlegen kann. das ausgewählte datum soll in der url gespeichert sein, so das bei einem reload oder wenn man den link teilt, auf die richtige seite kommt. in dem fall keinen local storage oder cookie oder der gleichen nutzen. ich möchte auch noch einen button haben, der mir die reservierungen, die bereits da sind ausblendet.


dann soll es noch möglich sein reservierungen anzulegen und zu bearbeiten.


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

Agiere als Senior Fullstack Developer und Experte für Astro, Svelte v5 und das Directus SDK.

Ich entwickle eine Webplattform namens **"Pulpo"**, die aus mehreren Anwendungen besteht (Agenda, Shop, Sites).
Die Architektur basiert auf **Astro** (als Framework) mit **Svelte v5** Komponenten für die Interaktivität.
Das Backend ist Directus (`admin.pulpo.cloud`).
Die Apps laufen auf Subdomains (z.B. `agenda.pulpo.cloud`), daher nutzen wir **SSO über HttpOnly Cookies** (Domain `.pulpo.cloud`).

Bitte erstelle mir den vollständigen Authentifizierungs-Code für das Frontend. **Wir nutzen KEINE View Transitions**, die Seiten laden also bei Navigation neu.

**Tech Stack:**
- **Main Framework:** Astro
- **Component Framework:** Svelte v5
- **State Management:** Nano Stores (Standard für Astro/Svelte Kommunikation)
- **Styling:** Tailwind CSS
- **Library:** `@directus/sdk`

**Ich benötige folgende 5 Dateien/Code-Blöcke:**

### 1. Directus Client (`src/lib/directus.ts`)
- Initialisiere den Client mit `authentication`, `rest` und `realtime`.
- **WICHTIG:** Konfiguriere `authentication('cookie', { autoRefresh: true })`.
- Da die Seite neu lädt, muss der Client so konfiguriert sein, dass er sofort beim Initialisieren bereit ist, den Cookie zu lesen.

### 2. Global State mit Nano Stores (`src/stores/userStore.ts`)
- Erstelle einen Nano Store.
- Er soll `user` (Object), `isAuthenticated` (Boolean) und `loading` (Boolean) speichern.

### 3. Der "Auth Guard" (Svelte Komponente: `src/components/AuthGuard.svelte`)
Dies ist die wichtigste Komponente. Sie umschließt den Inhalt im Layout.
- Nutze `onMount` (Svelte Lifecycle).
- Logik beim Mounten:
  1. Setze `loading = true`.
  2. Rufe `client.request(readMe())` auf.
  3. **Bei Erfolg:** Schreibe User in den Store UND führe **`client.connect()`** aus (für WebSocket Realtime).
  4. **Bei Fehler (401):** Wenn der Prop `protect` true ist, leite via `window.location.href` zu `/login` weiter.
  5. Setze `loading = false`.
- Rendere einen `<slot />`, wenn geladen (oder wenn nicht protected). Zeige einen Spinner, solange `loading` true ist.

### 4. Die Login-Form (`src/components/LoginForm.svelte`)
- Modernes UI mit Tailwind.
- `client.login(email, password)`.
- Bei Erfolg: Redirect auf `/`.

### 5. Integration in Astro (`src/layouts/Layout.astro` & `src/pages/login.astro`)
Hier ist der Fokus auf die **Hydration**:
- Zeige, wie ich den `<AuthGuard>` im Layout einbinde.
- **WICHTIG:** Füge explizit die **`client:only="svelte"`** Direktive hinzu. Da wir Cookies und `window` Zugriff benötigen, darf diese Komponente NICHT auf dem Server (SSR) rendern, sondern muss rein im Browser laufen.
- Zeige, wie ich die `<LoginForm>` auf der Login-Page einbinde (ebenfalls mit `client:only="svelte"` oder `client:load`).

**Ziel:**
Der Code muss sicherstellen, dass beim Laden jeder Unterseite der Auth-Status aus dem Cookie wiederhergestellt wird und die Realtime-Verbindung sofort wieder aufgebaut wird.