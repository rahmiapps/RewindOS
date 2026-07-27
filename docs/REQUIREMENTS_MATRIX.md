# RewindOS – Anforderungsmatrix

Stand: **25. Juli 2026** · Version **0.4.0**

Die Matrix verweist auf ausführbaren Quellcode. Betriebssystemfunktionen, die technisch von Desktopumgebung, Dateisystem oder Berechtigungen abhängen, sind ausdrücklich als „Best Effort“ gekennzeichnet.

| Nr. | Anforderung | Umsetzung | Zentrale Dateien / Grenze |
|---:|---|---|---|
| K1 | vollständig lokal/offline | lokale Standardeinstellungen, Renderer-Netzwerk gesperrt, Updateprüfung aus | `defaults.cjs`, `main.cjs` |
| K2 | Deutsch/Englisch beim ersten Start | mehrstufiger Assistent, Sprache global gespeichert | `renderer/app.js`, `settingsStore.cjs` |
| K3 | vollständige deutsche Umlaute | UTF-8, automatisch abgeglichene Übersetzungsschlüssel | Renderer und `translations.cjs` |
| K4 | kostenlos, werbefrei, kein Pro/Konto/Firebase | keine Billing-, Login-, Werbe- oder Telemetriemodule | gesamter Quellbaum |
| K5 | Pop-up-System | modale Dialoge, Fokusfalle, Escape und kontrolliertes Outside-Click | `renderer/app.js`, `styles.css` |
| K6 | Windows und Linux | gemeinsame Fachlogik, getrennte Plattformadapter | `platform/windowsAdapter.cjs`, `platform/linuxAdapter.cjs` |
| K7 | verschlüsselte Dateiversionen | inhaltsadressierter, deduplizierter Tresor; AES-256-GCM | `vaultService.cjs`, `cryptoService.cjs` |
| K8 | Aktivitäts-Timeline | verschlüsselte Ereignisse und vollständige Filter | `auditStore.cjs`, `renderer/app.js` |
| K9 | Dateiaktionen erkennen | Erstellen, Ändern, Kopieren, Verschieben, Umbenennen, Löschen | `watcherService.cjs` |
| K10 | geschützte Löschablage | Dateien und vollständige Ordner inklusive leerer Unterordner | `vaultService.cjs` |
| K11 | Zwischenablage | Text, Links, Bilder, Dateipfade, Favoriten und Schutz | `clipboardService.cjs` |
| K12 | Arbeitsbereiche | Programme, Fenster, Monitore, Screenshot, Clipboard, Projektordner | `workspaceService.cjs`; Fenster Best Effort |
| K13 | Einstellungen/Import/Export/Statistik | sichere Einstellungen, JSON/CSV, Rettungspaket und Kennzahlen | `exportService.cjs`, `appService.cjs` |
| K14 | Datenschutz/PIN/Metadaten | Scrypt-PIN, Lockout, verschlüsselte Metadaten, Ausschlüsse | `authService.cjs`, `secureJson.cjs` |
| K15 | Hotkeys/Tray/Autostart | globale Shortcuts, Tray und Login-Item | `main.cjs`, `autoStartService.cjs`; real testen |
| K16 | Windows-/Linux-Installer | NSIS, portable EXE, AppImage, DEB und RPM | `electron-builder.yml`, Build-Skripte |
| 1 | Rückgängig-Vorschau | Schritte, Konflikte, Ziele und Wiederherstellbarkeit | `undoService.cjs`, IPC/UI |
| 2 | Sicherheits-Snapshot vor Risiko | Baseline, Notfall-Snapshot und Sicherheitsversion vor Ersetzung | `watcherService.cjs`, `vaultService.cjs` |
| 3 | Undo-Ketten | gruppierte Vorgänge und verschachtelte Ereignisse | `undoService.cjs`, `auditStore.cjs` |
| 4 | selektive Wiederherstellung | Ereignis-/Versionsauswahl und Teilwiederherstellung eines Checkpoints | `undoService.cjs`, `checkpointService.cjs` |
| 5 | intelligente Konfliktlösung | rename, replace, keep-newer, keep-older, skip | `vaultService.cjs`, `undoService.cjs` |
| 6 | „Was würde passieren?“ | Trockenlauf ohne Schreibzugriff | `undoService.cjs` |
| 7 | Schutzprofile | speicherbare Regeln nach Dateityp, Priorität und Aufbewahrung | `appService.cjs`, `defaults.cjs` |
| 8 | Projekt-Schutzräume | eigene Versions- und Aufbewahrungsregeln | `appService.cjs`, `vaultService.cjs`, `retentionService.cjs` |
| 9 | Anwendungs-Verlauf | Best-Effort-Zuordnung des aktiven Programms und Programmfilter | `watcherService.cjs`, Plattformadapter |
| 10 | verdächtige Aktion einfrieren | Cooldown, Alarm, Pause, Snapshot, verifizierte manuelle Prozessreaktion | `watcherService.cjs`; kein Kernelblocker |
| 11 | Notfall-Taste | globaler Hotkey und UI-Schaltfläche | `main.cjs`, `renderer/app.js` |
| 12 | Absturz-Wiederherstellungsassistent | Start-/Clean-Exit-Markierung und Kandidatenanalyse | `rescueService.cjs` |
| 13 | Datei-Gesundheitsprüfung | fehlende, leere, stark verkleinerte oder beschädigte Objekte | `integrityService.cjs` |
| 14 | Speicherprognose | Verbrauch, Reserve und geschätzte Reichweite | `retentionService.cjs` |
| 15 | adaptive Versionierung | profil-/projektabhängige Versionsgrenzen | `vaultService.cjs`, `defaults.cjs` |
| 16 | geschützte Favoriten | Favoriten werden bei automatischer Bereinigung bewahrt | `vaultService.cjs`, `retentionService.cjs` |
| 17 | Wiederherstellungssammlungen | Versionen, Struktur, Einstellungen, Clipboard, Workspace, Systemzustand | `checkpointService.cjs` |
| 18 | kommentierte Zeitpunkte | Name, Notiz, Kategorie, Farbe und Favorit | `checkpointService.cjs` |
| 19 | Offline-Rettungsmedium | passwortgeschützter Rettungsordner | `exportService.cjs`, IPC/UI |
| 20 | Integritätsprüfung | Entschlüsselung, Auth-Tag und SHA-256-Abgleich | `integrityService.cjs` |
| 21 | Test-Wiederherstellung | getrenntes Testziel ohne Änderung des Originals | `vaultService.cjs` |
| 22 | Ruhemodus | reduzierte Hintergrundarbeit | `performanceService.cjs`, UI |
| 23 | Akku-/Leistungsmodus | Akkuschwelle, Netzbetrieb und Gaming-Erkennung | `performanceService.cjs` |
| 24 | externe Spiegelung | passwortgeschütztes Rettungspaket auf zweitem lokalen Ziel | `backupMirrorService.cjs`, `exportService.cjs` |
| 25 | tragbarer Modus | portable Windows-Ausgabe und separater Datenordner | `main.cjs`, `electron-builder.yml` |
| 26 | Mehrbenutzer-Unterstützung | getrennte Daten je Betriebssystemkonto | Electron-`userData`, `defaults.cjs` |
| 27 | Barrierefreiheit | Tastatur, ARIA, Screenreader, große Schrift, Kontrast, reduzierte Bewegung | Renderer/CSS |
| 28 | Diagnosezentrum | Fähigkeiten, Schlüssel, Speicher, Watcher, Integrität und Hinweise | `diagnosticsService.cjs`, Renderer |
| 29 | App-Papierkorb mit Regeln | globale und ordner-/dateitypspezifische Aufbewahrung | `retentionService.cjs`, Renderer |
| 30 | lokale intelligente Suche | deutsche/englische Zeit-, Aktions- und Dateitypabfragen | `searchService.cjs` |
| S1 | sichere Recovery-Transaktion | private Quarantäne, Manifestprüfung, atomarer Swap und Rollback | `exportService.cjs` |
| S2 | einmalige Dateimanager-Bestätigung | UUID-Token, Ablaufzeit und genau eine Bestätigung | `main.cjs`, IPC/UI |
| S3 | Dateimanagerintegration verwalten | Status, Installation und Entfernung über feste Werkzeuge | `fileManagerIntegrationService.cjs` |
| S4 | Renderer-/IPC-Härtung | Sandbox, CSP, Senderprüfung, 2-MiB-Limit, Dangerous-Key-Filter | `main.cjs`, `registerIpc.cjs` |
| S5 | Symlink-/Entpackschutz | Symlink-Komponenten blockiert, feste maximale Entpackgröße | `exportService.cjs`, `cryptoService.cjs` |

## Automatischer Nachweis

`scripts/verify-requirements.cjs` kontrolliert alle **49 von 49** oben zusammengefassten Kern-, Erweiterungs- und Sicherheitsmerkmale direkt am ausführbaren Quellcode. Ergänzend bestehen **77 von 77** Service-, Sicherheits- und Regressionstests.

## Sicherheitsbewusst nicht versprochen

- Rückgängig für Remote-Dienste, versendete Nachrichten oder Cloud-Datenbanken
- vollständige Wiederherstellung des internen Zustands jeder Drittanbieter-App
- garantierte Prozessblockierung ohne privilegierten Kernel-/Dateisystemtreiber
- identisches Fenster-, Hotkey- und Screenshot-Verhalten auf allen Linux-Desktopumgebungen und unter Wayland
- absolute Fehlerfreiheit oder Ausschluss unbekannter zukünftiger Schwachstellen
