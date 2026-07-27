# RewindOS – Release-Checkliste

Version: **0.4.0**

## 1. Voraussetzungen

- Node.js 22 oder neuer
- Git
- unter Linux zusätzlich `rpm` und `xvfb`
- Windows-Code-Signing-Zertifikat und Linux-Signaturverfahren für öffentliche Releases empfohlen

## 2. Reproduzierbare Installation

Das Repository soll vor dem öffentlichen Release eine geprüfte `package-lock.json` enthalten.

```bash
npm install
npm run verify
npm run audit
```

Danach die erzeugte Lockdatei prüfen, committen und in CI auf `npm ci` wechseln beziehungsweise den vorhandenen Fallback entfernen.

## 3. Smoke-Test

Windows:

```powershell
npm run smoke
```

Linux:

```bash
xvfb-run -a npm run smoke
```

Der Linux-Build bricht ohne erfolgreichen Smoke-Test ab. Nur für lokale Diagnose kann ausdrücklich `REWINDOS_SKIP_SMOKE=1` gesetzt werden; damit erzeugte Pakete nicht veröffentlichen.

## 4. Windows-Pakete

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\scripts\build-windows.ps1
```

Prüfen:

- NSIS-Installation, Upgrade und Deinstallation mit Standardbenutzer
- portable EXE ohne Installation
- Explorer-Kontextmenü installieren, bestätigen, verwenden und entfernen
- Entfernen aller per-user Registry-Einträge bei Deinstallation
- Autostart, Tray, Hotkeys, Benachrichtigungen und Neustartverhalten

## 5. Linux-Pakete

```bash
./scripts/build-linux.sh
```

Prüfen:

- AppImage auf mindestens einer aktuellen Distribution
- DEB auf Ubuntu/Debian
- RPM auf Fedora/openSUSE-kompatibler Umgebung
- X11 und Wayland
- Nautilus, Nemo und Dolphin: Installation, Bestätigung, Verwendung und Entfernung
- Tray, globale Hotkeys, Desktop-Benachrichtigungen und Autostart

## 6. Funktionsprüfung mit Wegwerfdaten

- Erstellen, Bearbeiten, Kopieren, Umbenennen, Verschieben und Löschen
- Einzel-, Auswahl- und Gruppen-Undo
- Vorschau, Trockenlauf, Test-Wiederherstellung und alle Konfliktregeln
- Datei- und vollständige Ordnerrettung einschließlich leerer Unterordner
- Ersetzen einer vorhandenen Datei und Nachweis der automatisch erzeugten Sicherheitsversion
- Checkpoint mit Einstellungen, Struktur, Clipboard, Workspace und Systemzustand
- Zwischenablage mit Text, Link, Bild und Dateipfad
- Arbeitsbereich inklusive Projektordner
- Integritätsprüfung, Bereinigung, Spiegelung und Recovery-Bundle auf zweitem Konto
- Recovery-Import mit absichtlichem Fehler und Nachweis des vollständigen Rollbacks
- Akku-, Gaming-, Ruhemodus und Massenänderungswarnung
- volle Datenträger, getrennte Laufwerke, externe Laufwerke und Unterbrechung während Kopieren/Wiederherstellen

## 7. Sicherheitsprüfung

- keine High-/Critical-Ergebnisse aus `npm run audit`
- CI und CodeQL grün
- SHA-256-Prüfsummen unabhängig nachrechnen
- keine Schlüssel, Logs, Tresorobjekte, Umgebungsdateien oder Nutzerdaten im Repository
- Installer signieren und SmartScreen-/Antivirus-Reaktion prüfen
- Wiederherstellungen außerhalb geschützter Wurzeln müssen ohne explizite Dateiauswahl scheitern
- manipulierte Rettungspakete, Traversal-Pfade, Symlinks und übergroße Steuerdateien müssen abgewiesen werden
- unabhängige Sicherheitsprüfung vor breiter öffentlicher Freigabe empfohlen

## 8. GitHub-Release

```bash
git tag v0.4.0
git push origin v0.4.0
```

Der Workflow baut Windows und Linux getrennt, führt Tests, Audit und Smoke-Test aus und veröffentlicht Pakete plus SHA-256-Dateien. Vor Freigabe jedes Artefakt herunterladen, Prüfsumme kontrollieren und auf einem sauberen Testsystem installieren.
