# Projektstruktur

- `src/main/main.cjs` – Electron-Lebenszyklus, Fensterhärtung, Tray, Hotkeys, Single-Instance- und Dateimanager-Anfragen
- `src/main/preload.cjs` – eingefrorene, erlaubte Renderer-API
- `src/main/ipc/registerIpc.cjs` – validierte IPC-Grenze, Pfadfreigaben und Wiederherstellungsautorisierung
- `src/main/services/` – Tresor, Watcher, Undo, Checkpoints, Clipboard, Workspaces, Recovery, Spiegelung, Sicherheit, Diagnose und Plattformadapter
- `src/renderer/` – deutsch/englische Oberfläche, Ersteinrichtung und Pop-up-System
- `src/shared/` – Standardeinstellungen, Übersetzungen sowie Sicherheits-/Dateihilfen
- `tests/` – Kern-, Service-, Sicherheits- und Regressionstests
- `scripts/` – Entwicklung, Quell-/Anforderungsprüfung, Windows-/Linux-Build und Dateimanagerintegration
- `build/installer.nsh` – per-user Windows-Explorer-Integration und Deinstallationsbereinigung
- `build/icons/` – Paket- und Desktop-Icons
- `.github/workflows/` – CI, CodeQL und Release
- `.github/dependabot.yml` – Abhängigkeitsüberwachung
- `docs/` – Architektur, Funktionen, Sicherheitsprüfung, Testbericht und Anforderungsmatrix
- `electron-builder.yml` – NSIS, portable EXE, AppImage, DEB und RPM
