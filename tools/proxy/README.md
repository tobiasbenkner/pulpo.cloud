# @pulpo/proxy — Production Simulator

Fühlt sich an wie Production — ein Binary, ein Port, Pfad-URLs wie
beim Kunden — aber mit Watch-Mode: sobald du eine Frontend-Datei
speicherst, wird die betroffene App neu gebaut und der Go-Server serviert
sie sofort (keine Go-Neukompilierung).

## Usage

```bash
pnpm sim                          # Build aller Apps + Go auf :8090 + Watch
pnpm sim --no-watch               # Einmal bauen, dann nur servieren
pnpm sim --skip-build              # pb_public so lassen, wie es ist
PULPO_SIM_PORT=9000 pnpm sim      # Port überschreiben
```

Offen → `http://localhost:8090/`.

## Layout auf `localhost:8090`

| Pfad        | Quelle                          |
| ----------- | ------------------------------- |
| `/`         | Launcher (`apps/launcher/dist`) |
| `/menu`     | Menu                            |
| `/shop`     | Shop                            |
| `/agenda`   | Agenda                          |
| `/admin`    | Admin                           |
| `/api/*`    | PocketBase REST API             |
| `/_/*`      | PocketBase Admin UI             |

## Entwicklungs-Workflow

1. `pnpm sim` starten.
2. Im Browser `http://localhost:8090/` öffnen.
3. Datei in `apps/<app>/src/...` ändern → Terminal zeigt `✓ <app> rebuilt in …s`.
4. Browser refreshen (Cmd-R). Kein HMR — dafür **exakt** der Production-Pfad.

Typischer Build-Zyklus pro App: 1–2 Sekunden.

## Wie das funktioniert

- **Astro-Builds**: `astro build` erzeugt `dist/` mit hart eingebackenen
  `base`-Prefixes (`/menu/_astro/...`). Deshalb gibt es die Vite-Dev-
  Kollisionen (`/src/…`, `/@vite/…`) nicht.
- **Go serviert von Disk**: Mit `PULPO_SIM_MODE=1` benutzt `main.go`
  `os.DirFS("pb_public")` statt `go:embed`. Änderungen werden ohne
  Go-Restart sichtbar.
- **Watcher**: `fs.watch` auf `apps/*/src` (rekursiv). Events werden pro
  App debounced (150 ms) und Rebuilds werden serialisiert, damit zwei
  schnelle Speichervorgänge sich nicht überholen.

## vs. `pnpm dev`

| Aspekt            | `pnpm dev`                      | `pnpm sim`                       |
| ----------------- | ------------------------------- | -------------------------------- |
| URLs              | pro App eigener Port            | **1 Port wie Production**        |
| Assets            | Vite-Dev                        | **Production-Build**             |
| Reload            | HMR (instant)                   | Full reload nach Rebuild (~2 s)  |
| Backend           | Go :8090                        | Go :8090 (Disk-Mode)             |
| Feedback-Loop     | ~100 ms                         | ~2 s                             |
| Verlässlichkeit   | Vite-Quirks                     | identisch zu Production          |

Für schnelles Iterieren auf einer Komponente → `pnpm dev`. Für
Production-Smoke-Tests, Routen-Sanity, Auth-Flows, QR-Rendering etc. →
`pnpm sim`.
