Agiere als Senior Fullstack Developer und Experte für Astro, Svelte und das Directus SDK.

Ich entwickle eine Webplattform namens **"Pulpo"**, die aus mehreren Anwendungen besteht (Agenda, Shop, Sites).
Die Architektur basiert auf **Astro** (als Framework) mit **Svelte** Komponenten für die Interaktivität.
Das Backend ist Directus (`admin.pulpo.cloud`).
Die Apps laufen auf Subdomains (z.B. `agenda.pulpo.cloud`), daher nutzen wir **SSO über HttpOnly Cookies** (Domain `.pulpo.cloud`).

Bitte erstelle mir den vollständigen Authentifizierungs-Code für das Frontend. **Wir nutzen KEINE View Transitions**, die Seiten laden also bei Navigation neu.

**Tech Stack:**
- **Main Framework:** Astro
- **Component Framework:** Svelte
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