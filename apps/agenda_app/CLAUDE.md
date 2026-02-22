# Agenda App (Android)

Capacitor 7 Remote-Shell-App. Laedt `https://agenda.pulpo.cloud` im WebView -- kein eigener Web-Code. Web-Updates sind sofort fuer alle User sichtbar, ohne App-Update im Play Store.

## Voraussetzungen

- Node.js + pnpm (Monorepo-Root)
- Java 21 (`java -version` pruefen)
- Android Studio Ladybug (2024.2.1) oder neuer (wegen AGP 8.7.2)
- Android SDK mit API 35

## Scripts

| Script | Befehl | Beschreibung |
|---|---|---|
| `pnpm open` | `cap open android` | Android Studio oeffnen |
| `pnpm sync` | `cap sync android` | Config + Assets ins Android-Projekt kopieren |
| `pnpm build` | - | Kein Web-Build (Remote-Shell) |

## Build

```bash
# Debug-APK
cd android && ./gradlew assembleDebug
# -> android/app/build/outputs/apk/debug/app-debug.apk

# Release-AAB (fuer Play Store)
cd android && ./gradlew bundleRelease
```

## Konfiguration

- **App-ID:** `cloud.pulpo.agenda`
- **App-Name:** `Pulpo Agenda`
- **Remote-URL:** `https://agenda.pulpo.cloud` (in `capacitor.config.ts`)
- **Min SDK:** 23 (Android 6.0)
- **Target SDK:** 35

## Projektstruktur

```
apps/agenda_app/
├── capacitor.config.ts       # Capacitor-Konfiguration (App-ID, Remote-URL)
├── package.json
├── tsconfig.json
├── www/
│   └── index.html            # Minimaler Fallback (Capacitor erwartet ein webDir)
└── android/                  # Generiertes Android-Projekt
    ├── app/
    │   └── src/main/
    │       ├── AndroidManifest.xml
    │       └── res/mipmap-*/  # App-Icons (alle Aufloesungen)
    ├── build.gradle
    ├── gradle/                # Gradle Wrapper (gehoert ins Repo)
    └── variables.gradle       # SDK-Versionen und Dependency-Versionen
```

## Icons

Icons liegen in `android/app/src/main/res/mipmap-*` (mdpi bis xxxhdpi). Generiert ueber https://icon.kitchen. Adaptive Icons (foreground, background, monochrome) in `mipmap-anydpi-v26/`.

## Wichtig

- `capacitor.config.ts` ist die Quelle der Wahrheit -- nach Aenderungen `pnpm sync` ausfuehren
- `android/local.properties` enthaelt lokale SDK-Pfade und ist gitignored
- `android/app/src/main/assets/capacitor.config.json` wird bei `cap sync` generiert und ist gitignored
- Gradle Wrapper (`gradle/wrapper/gradle-wrapper.jar`) gehoert ins Repo
