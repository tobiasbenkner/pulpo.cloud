# Agenda App (Android)

Capacitor-basierter Android-Wrapper fuer `https://agenda.pulpo.cloud`. Die App hat keinen eigenen Web-Code -- sie laedt die gehostete URL im WebView. Web-Updates sind sofort fuer alle User sichtbar, ohne App-Update im Play Store.

## Voraussetzungen

- Node.js + pnpm (Monorepo-Root)
- Java 21 (`java -version` pruefen)
- Android SDK (via Android Studio)

## Setup

```bash
# Im Monorepo-Root
pnpm install

# Android-Projekt synchronisieren (nach Aenderungen an capacitor.config.ts)
npx cap sync android
```

## Build

```bash
# Debug-APK
cd android && ./gradlew assembleDebug

# APK liegt unter: android/app/build/outputs/apk/debug/app-debug.apk
```

Oder in Android Studio: **Build > Build Bundle(s) / APK(s) > Build APK(s)**

## Entwicklung

```bash
# Android Studio oeffnen
npx cap open android
```

Dort mit dem Run-Button auf Emulator oder angeschlossenem Geraet testen.

## Release (Play Store)

1. In Android Studio: **Build > Generate Signed Bundle / APK**
2. AAB-Format waehlen (Play Store erwartet App Bundles)
3. Keystore sicher aufbewahren -- ohne den sind keine Updates moeglich

## Projektstruktur

| Datei/Ordner | Beschreibung |
|---|---|
| `capacitor.config.ts` | Capacitor-Konfiguration (App-ID, Remote-URL) |
| `www/index.html` | Minimaler Fallback (Capacitor erwartet ein webDir) |
| `android/` | Generiertes Android-Projekt |

## Wichtige Befehle

| Befehl | Beschreibung |
|---|---|
| `npx cap sync android` | Web-Assets und Config ins Android-Projekt kopieren |
| `npx cap open android` | Projekt in Android Studio oeffnen |
| `npx cap update android` | Capacitor-Plugins im Android-Projekt aktualisieren |

## Konfiguration

- **App-ID:** `cloud.pulpo.agenda`
- **Remote-URL:** `https://agenda.pulpo.cloud` (in `capacitor.config.ts`)
- **App-Icons:** `android/app/src/main/res/mipmap-*` (Platzhalter ersetzen)
