# Pulpo Agenda – Android App

Native Android-App fuer [Pulpo Agenda](https://agenda.pulpo.cloud). Die App ist ein reiner WebView-Wrapper, der die gehostete Web-App laedt. Dadurch sind Web-Updates sofort fuer alle User verfuegbar, ohne ein App-Update im Play Store zu veroeffentlichen.

Technisch basiert die App auf [Capacitor 7](https://capacitorjs.com/) und ist Teil des [pulpo.cloud](https://pulpo.cloud) pnpm-Monorepos.

## Voraussetzungen

| Tool | Version | Pruefung |
|---|---|---|
| Node.js | 18+ | `node -v` |
| pnpm | 10+ | `pnpm -v` |
| Java (JDK) | 21 | `java -version` |
| Android Studio | Ladybug 2024.2.1+ | About-Dialog |
| Android SDK | API 35 | SDK Manager in Android Studio |

### Java 21 installieren

**macOS (Homebrew):**
```bash
brew install openjdk@21
sudo ln -sfn /opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk /Library/Java/JavaVirtualMachines/openjdk-21.jdk
```

In `~/.zshrc`:
```bash
export JAVA_HOME=$(/usr/libexec/java_home -v 21)
export PATH=$JAVA_HOME/bin:$PATH
```

**Linux (apt):**
```bash
sudo apt install openjdk-21-jdk
sudo update-alternatives --set java /usr/lib/jvm/java-21-openjdk-amd64/bin/java
```

**Windows:**
JDK 21 von [Adoptium](https://adoptium.net/) installieren und `JAVA_HOME` in den Systemumgebungsvariablen setzen.

## Setup

```bash
# 1. Dependencies installieren (im Monorepo-Root)
pnpm install

# 2. Android-Projekt synchronisieren
cd apps/agenda_app
pnpm sync
```

## Entwicklung

```bash
# Android Studio oeffnen
pnpm open
```

In Android Studio:
1. Oben in der Toolbar einen Emulator auswaehlen (oder ueber **Device Manager** einen neuen anlegen)
2. Gruener **Run**-Button klicken
3. Die App startet im Emulator und laedt `https://agenda.pulpo.cloud`

## Build

### Debug-APK

```bash
cd android && ./gradlew assembleDebug
```

Die APK liegt unter:
```
android/app/build/outputs/apk/debug/app-debug.apk
```

### Release-AAB (Play Store)

```bash
cd android && ./gradlew bundleRelease
```

Oder ueber Android Studio: **Build > Generate Signed Bundle / APK** (empfohlen fuer den ersten Release, da dort der Keystore erstellt wird).

## Play Store Release

### Erstmaliger Release

1. In Android Studio: **Build > Generate Signed Bundle / APK**
2. **Android App Bundle** waehlen
3. Neuen Keystore erstellen und **sicher aufbewahren** (ohne den Keystore sind keine Updates moeglich)
4. AAB-Datei wird generiert unter `android/app/release/`
5. In der [Google Play Console](https://play.google.com/console) eine neue App anlegen
6. Die AAB-Datei unter **Release > Production** hochladen
7. Store-Listing ausfuellen (Screenshots, Beschreibung, etc.)
8. Die Datei `play_store_512.png` aus dem Icon-Kit als App-Icon verwenden

### Updates

Da die App nur ein WebView-Wrapper ist, sind Web-Updates sofort live. Ein neues App-Release ist nur noetig bei:
- Aenderungen an `capacitor.config.ts` (z.B. neue URL)
- Capacitor-Version-Updates
- Aenderungen an nativen Android-Einstellungen (Icons, Permissions, etc.)

## Projektstruktur

```
apps/agenda_app/
├── capacitor.config.ts       # App-ID, Remote-URL, WebView-Einstellungen
├── package.json              # Scripts: open, sync, build
├── tsconfig.json
├── www/
│   └── index.html            # Fallback-Seite (Capacitor-Anforderung)
└── android/                  # Android-Projekt
    ├── app/
    │   └── src/main/
    │       ├── AndroidManifest.xml
    │       ├── java/.../MainActivity.java
    │       └── res/
    │           └── mipmap-*/  # App-Icons (mdpi bis xxxhdpi)
    ├── build.gradle
    ├── gradle/                # Gradle Wrapper
    ├── gradlew                # Gradle Wrapper Script (Linux/macOS)
    ├── gradlew.bat            # Gradle Wrapper Script (Windows)
    └── variables.gradle       # SDK- und Dependency-Versionen
```

## Konfiguration

Die zentrale Konfiguration liegt in `capacitor.config.ts`:

```ts
const config: CapacitorConfig = {
  appId: 'cloud.pulpo.agenda',
  appName: 'Pulpo Agenda',
  webDir: 'www',
  server: {
    url: 'https://agenda.pulpo.cloud',
    cleartext: false,
  },
};
```

Nach jeder Aenderung an dieser Datei muss `pnpm sync` ausgefuehrt werden, damit die Aenderungen ins Android-Projekt uebernommen werden.

## Icons anpassen

1. Neues Icon auf [icon.kitchen](https://icon.kitchen) erstellen
2. ZIP herunterladen und die Dateien aus `android/res/mipmap-*` nach `android/app/src/main/res/mipmap-*` kopieren
3. `play_store_512.png` fuer das Play Store Listing aufheben

## Scripts

| Script | Beschreibung |
|---|---|
| `pnpm open` | Android Studio oeffnen |
| `pnpm sync` | Capacitor-Config und Assets ins Android-Projekt synchronisieren |
| `pnpm build` | Kein Web-Build noetig (Remote-Shell-App) |
