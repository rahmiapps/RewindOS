# RewindOS – Sicherheitsprüfung

Stand: **25. Juli 2026** · Version **0.4.0**

## Bedrohungsmodell

RewindOS verarbeitet sensible lokale Dateiinhalte, Metadaten, Screenshots, Zwischenablagedaten, Wiederherstellungsziele und optionale Prozessinformationen. Wesentliche Risiken sind:

- manipulierte Renderer-/IPC-Aufrufe
- Pfad-Traversal, Symlinks, Junctions und ungewollter Zugriff auf fremde Ordner
- manipulierte Tresor-, Checkpoint-, Papierkorb- oder Rettungspaket-Metadaten
- beschädigte oder ausgetauschte Dateien während Import und Wiederherstellung
- Kompressionsbomben, übergroße Steuerdateien und Massenereignisse
- ungeschützte Schlüssel oder exportierte Rettungsdaten
- missbräuchliche Prozess- und Dateimanagersteuerung
- unkontrollierter Netzwerkzugriff oder Remote-Inhalt
- unsichere Installer-Registrierung und unvollständige Deinstallation

## Umgesetzte Kontrollen

### Electron und Renderer

- `contextIsolation: true`
- Renderer-Sandbox aktiv
- `nodeIntegration: false`
- keine Remote-Inhalte im App-Fenster
- Webviews, unsichere Inhalte, neue Fenster, Navigation, Downloads, Frames und Worker blockiert
- Berechtigungsanfragen werden abgelehnt
- CSP blockiert Netzwerkverbindungen, Objekte, Frames, Worker, Medien und Formulare
- schmale, eingefrorene Preload-API
- dynamische Texte, Attribute und CSS-Klassen werden normalisiert beziehungsweise escaped

### IPC und Pfade

- nur das Hauptframe des aktuellen lokalen App-Fensters darf IPC aufrufen
- maximale IPC-Nutzlast: 2 MiB
- gefährliche Objekt-Schlüssel werden entfernt
- Eingaben werden nach Typ, Länge, Anzahl und erlaubten Werten geprüft
- Datei-/Ordnerzugriffe benötigen eine Nutzerfreigabe oder eine konfigurierte Schutzwurzel
- sensible und ausgeschlossene Ordner werden nicht automatisch freigegeben
- importierte Einstellungen dürfen keine fremden Schutzpfade aktivieren
- destruktive Wiederherstellungen sind auf Schutz-/Projektwurzeln oder ausdrücklich gewählte Ziele begrenzt
- RewindOS-App-Daten dürfen niemals Wiederherstellungsziel sein
- Symlink-Quellen, Symlink-Ziele und besondere Dateitypen werden abgewiesen

### Tresor und Wiederherstellung

- Dateiinhalte und optional Metadaten: AES-256-GCM
- eindeutige zufällige Nonces pro Objekt
- SHA-256 für Inhaltsadressierung und Integritätsabgleich
- optionale Gzip-Komprimierung vor Verschlüsselung
- feste maximale Entpackgröße
- Tresorobjekte verwenden ausschließlich validierte 64-stellige Hex-Hashes
- importierte Indizes werden neu normalisiert; Objektpfade und Referenzzähler werden aus vertrauenswürdigen Versionseinträgen neu aufgebaut
- temporäre Dateien werden exklusiv angelegt und vor atomarer Übernahme erneut geprüft
- Identität des Zielverzeichnisses wird während der Wiederherstellung kontrolliert
- vorhandene Dateien erhalten vor `replace` eine Sicherheitsversion
- vorhandene Ordner werden vor `replace` in die geschützte Löschablage verschoben
- Cross-Device-Operationen verwenden eine eigene symlink-sichere Kopierlogik

### Rettungspakete und Import

- begrenzte JSON-Leser lehnen zu große Steuerdateien vor dem Parsen ab
- Manifestpfade müssen eindeutig, relativ und traversal-frei sein
- das Paket wird zuerst vollständig in eine private Quarantäne kopiert
- Manifest und Inhalte werden dort erneut geprüft
- die Datenübernahme erfolgt als Transaktion mit Zustandsmarkern
- Fehler nach dem Austausch entfernen unvollständige neue Daten und stellen Tresor, Schlüssel und Einstellungen wieder her
- der Original-Rettungsordner bleibt unverändert
- der Master-Key wird mit einem passwortbasierten Schlüssel umschlüsselt

### Schlüssel, PIN und lokale Geheimnisse

- Master-Key über Electron Safe Storage, wenn ein starker OS-Backend verfügbar ist
- andernfalls restriktive Dateirechte und sichtbare Diagnosewarnung
- App-PIN über Scrypt, Fehlversuchslimit und temporäre Sperre
- sensible Spiegelungszugangsdaten werden verschlüsselt lokal gespeichert
- `.gitignore` schließt lokale Schlüssel, Tresorobjekte, portable Nutzerdaten, Logs, Umgebungs- und Signaturdateien aus

### Prozesse und Massenänderungen

- keine Shell-Ausführung mit `shell: true`
- feste Programme und Argumentlisten über `execFile`/`spawn`
- Prozess-ID, Name, ausführbare Datei und Besitzer werden vor einer Aktion erneut geprüft
- kritische Systemprozesse und fremde Benutzerprozesse sind blockiert
- Prozessbeendigung ist standardmäßig deaktiviert und nur manuell möglich
- verdächtige Aktivität besitzt Cooldown, Warnung, Pause und Notfall-Snapshot
- RewindOS behauptet bewusst keinen Kernel- oder Antivirus-Schutz

### Explorer- und Linux-Dateimanager-Integration

- feste, mitgelieferte Installations-/Entfernungswerkzeuge
- keine frei übergebbaren Skriptpfade
- per-user Windows-Registrierung statt systemweiter Administratoränderungen
- Deinstallation entfernt die Registry-Einträge
- Linux-Integration ohne ausgewertete Heredocs oder `eval`
- Eingabepfade werden kanonisiert und auf Steuerzeichen geprüft
- ein Kontextmenüaufruf erzeugt nur eine einmalige, zeitlich begrenzte Bestätigungsanforderung
- ein Ordner wird erst nach ausdrücklicher Bestätigung in RewindOS geschützt

### Lieferkette

- fest gepinnte Electron- und electron-builder-Versionen
- GitHub CI mit Tests und Dependency-Audit
- CodeQL-Analyse
- Dependabot für npm und GitHub Actions
- Release-Workflow mit Leserechten; Schreibrecht nur im Release-Job
- Linux-Paketbau verlangt grafischen Smoke-Test
- SHA-256-Prüfsummen nur für reguläre erzeugte Dateien

## Automatisierte Sicherheitsfälle

Die 77 Tests prüfen unter anderem:

- Prototype Pollution, unbekannte Felder und untrusted Renderer-Daten
- willkürliche Pfade und eingeschleuste Importpfade
- Symlink-Quellen und nicht abschaltbaren Symlink-Schutz
- komprimierte Datenbomben und übergroße JSON-Steuerdateien
- Traversal, doppelte Manifestpfade und manipulierte Tresor-/Checkpoint-Indizes
- verschlüsselte Zwischenablagebilder, Screenshots, Timeline und Tresormetadaten
- Rettungspaket-Tampering, falsche Passwörter, Quarantäne und transaktionales Rollback
- Sicherheitsversion vor Dateiersetzung und geschützte Ablage vor Ordnerersetzung
- PIN-Lockout gegen schnelle Brute-Force-Versuche
- kritische, fremde und zwischenzeitlich veränderte Prozesse
- Renderer-Sandbox, CSP, Webview-/Worker-/Frame-/Download-Sperren
- autorisierte Wiederherstellungsziele und Sperre von App-Daten
- einmalige Dateimanager-Bestätigungstokens und Installations-/Entfernungszyklus

## Restrisiken

- Ohne Code-Signing können Betriebssysteme Warnungen anzeigen.
- Ein Angreifer mit vollständiger Kontrolle über das angemeldete Betriebssystemkonto kann lokale App-Daten und Prozesse grundsätzlich angreifen.
- Auf Linux hängt starke Schlüsselspeicherung vom verfügbaren Desktop-Keyring ab.
- Junctions, Mountpoints, Netzlaufwerke, Dateisystemsemantik und Desktopverhalten unterscheiden sich zwischen Plattformen.
- Windows-, X11- und Wayland-Integrationen benötigen reale Systemtests.
- Abhängigkeits-Audit und echter Electron-Runtime-Test waren in dieser Umgebung ohne funktionierenden Paketdownload nicht möglich.
- Unbekannte zukünftige Schwachstellen in Electron, Node.js oder Abhängigkeiten können nicht ausgeschlossen werden.

## Freigabeempfehlung

Vor öffentlicher Veröffentlichung: geprüfte Lockdatei, `npm ci`, `npm run verify`, `npm run audit`, Smoke-Test, reale Wiederherstellungs- und Installerfälle, Signierung sowie unabhängige Sicherheitsprüfung.
