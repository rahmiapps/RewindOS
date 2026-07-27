# RewindOS – vollständige Funktionsübersicht

## Grundlage

- Windows und Linux aus einer gemeinsamen Codebasis
- erster Start mit Auswahl Deutsch oder English und vollständiger Einrichtung
- vollständige Übersetzung der Oberfläche einschließlich deutscher Umlaute
- modernes Pop-up-System, Dark/Light/System, Akzentfarbe und Barrierefreiheit
- kostenlos, werbefrei, ohne Pro-Version, Konto, Firebase-Zwang oder Telemetrie
- vollständig lokale und offline nutzbare Kernfunktionen
- optionaler manueller Update-Check; automatische Prüfung standardmäßig aus

## Ursprünglicher Funktionsumfang

- Übersicht mit Schutzstatus, heutigen Änderungen, geschützten Dateien, Speicher, Wiederherstellungen, Warnungen und Schnellaktionen
- Aktivitäts-Timeline mit Zeitraum-, Aktions-, Programm-, Laufwerks-, Dateityp-, Favoriten- und Wiederherstellbarkeitsfiltern
- Erkennung von Erstellen, Ändern, Kopieren, Verschieben, Umbenennen und Löschen
- Ein-Klick-Rückgängig mit Vorschau, Trockenlauf, Test-Wiederherstellung, Auswahl und Konfliktlösung
- manuelle Zeitpunkte und mehrteilige Wiederherstellungssammlungen
- verschlüsselte Dateiversionen und Zeilenvergleich für Text/Quellcode
- geschützte Löschablage mit Vorschau, Favoriten, Wiederherstellung, Regeln und endgültigem Löschen
- Massenaktionen, Undo-Ketten und selektive Wiederherstellung
- lokaler Zwischenablageverlauf für Text, Links, Bilder und Dateipfade
- Arbeitsbereichswiederherstellung mit Programmen, Fenstern, Monitoren, Screenshots, Zwischenablage und Projektordnern
- lokale Massenänderungs-/Ransomware-Früherkennung mit Warnung und Notfall-Sicherung
- Schutzprofile, Projekt-Schutzräume, Statistiken, Diagnose, Integritätsprüfung, Import/Export und lokale Spiegelung
- Datenschutz-Zonen, Ausschlusslisten, private Vorschau, PIN, Verschlüsselung, Hotkeys, Tray, Autostart und getrennte lokale Benutzer
- Explorer-/Nautilus-/Nemo-/Dolphin-Integration mit ausdrücklicher Bestätigung

## Alle 30 übernommenen Erweiterungen

1. **Rückgängig-Vorschau** – geplante Schritte, Ziele, Konflikte und Wiederherstellbarkeit vor Ausführung
2. **Sicherheits-Snapshot vor riskanten Aktionen** – Baseline, Notfall-Snapshot und Sicherheitsversion vor Ersetzung
3. **Undo-Ketten** – zusammengehörige Operationen und verschachtelte Dateiereignisse gemeinsam behandeln
4. **Selektive Wiederherstellung** – einzelne Ereignisse, Versionen und Bestandteile eines Zeitpunkts auswählen
5. **Intelligente Konfliktlösung** – umbenennen, ersetzen, neuere/ältere behalten oder überspringen
6. **„Was würde passieren?“-Modus** – Trockenlauf ohne Schreibzugriff
7. **Schutzprofile** – Regeln nach Dateityp, Priorität, Aufbewahrung und Versionszahl
8. **Projekt-Schutzräume** – strengere Regeln für ausgewählte Projektordner
9. **Anwendungs-Verlauf** – Best-Effort-Zuordnung des aktiven Programms, Pfads und Filters
10. **Verdächtige Aktion einfrieren** – Warnung, Pause, Snapshot und optional verifizierte manuelle Prozessreaktion
11. **Notfall-Taste** – globaler Hotkey und UI-Schaltfläche
12. **Wiederherstellungs-Assistent nach Absturz** – Clean-Exit-Markierung und Kandidatenanalyse
13. **Datei-Gesundheitsprüfung** – fehlende, leere, stark verkleinerte oder beschädigte Daten erkennen
14. **Speicherprognose** – Verbrauch, Reserve und geschätzte Restlaufzeit
15. **Adaptive Versionierung** – profil- und projektabhängige Versionsgrenzen
16. **Geschützte Favoriten** – automatische Bereinigung löscht markierte Versionen nicht
17. **Wiederherstellungs-Sammlungen** – Zeitpunkte mit mehreren Versionen und Zuständen
18. **Kommentierte Zeitpunkte** – Name, Notiz, Kategorie, Farbe und Favorit
19. **Offline-Rettungsmedium** – passwortgeschützter Rettungsordner für Neuinstallation
20. **Integritätsprüfung der Sicherungen** – AES-GCM-Prüfung und SHA-256-Abgleich
21. **Test-Wiederherstellung** – getrenntes Testverzeichnis ohne Änderung des Originals
22. **Ruhemodus** – reduzierte Hintergrundarbeit
23. **Akku- und Leistungsmodus** – Akku-Schwelle, Netzbetrieb und Gaming-Erkennung
24. **Externe Backup-Spiegelung** – passwortgeschütztes Rettungspaket auf zweitem lokalen Datenträger
25. **Tragbarer Modus** – portable Windows-Ausgabe und `--portable`-Datenspeicher
26. **Mehrbenutzer-Unterstützung** – getrennte App-Daten je Betriebssystemkonto
27. **Barrierefreiheit** – Tastatur, Screenreader-Texte, große Schrift, hoher Kontrast und reduzierte Bewegung
28. **Diagnosezentrum** – Fähigkeiten, Schlüsselstatus, Speicher, Watcher, Integrität und verständliche Hinweise
29. **App-eigener Papierkorb mit Regeln** – globale sowie ordner-/dateitypspezifische Aufbewahrung
30. **Lokale intelligente Suche** – deutsche und englische Zeit-, Aktions- und Dateitypabfragen

## Zusätzliche Sicherheits- und Qualitätsfunktionen aus der Komplettprüfung

- private Import-Quarantäne und transaktionales Recovery-Rollback
- strikte Wiederherstellungsziel-Autorisierung
- automatische Sicherheitsversion vor Dateiersetzung
- geschützte Ablage vor Ordnerersetzung
- Tresor-/Checkpoint-/Papierkorb-Metadaten-Normalisierung
- harte JSON-, Manifest-, Objektzahl-, Dateigrößen- und Entpackgrenzen
- symlink-sichere Cross-Device-Kopien
- einmalige Dateimanager-Bestätigungstokens
- kontrollierter Integrations-Installations-/Entfernungszyklus
- Renderer-Escaping zusätzlich zur Datenmodell-Normalisierung
- CI, CodeQL, Dependabot, Audit-/Smoke-Gates und SHA-256-Prüfsummen

## Plattformgrenzen

### Windows

- NSIS-Installer und portable EXE
- per-user Explorer-Kontextmenü mit Deinstallationsbereinigung
- rekursive Ordnerüberwachung, Tray, Benachrichtigungen und globale Hotkeys
- Fenster-/Programmzustand und ausgewählte benutzerspezifische Systemeinstellungen als Best Effort

### Linux

- AppImage, DEB und RPM
- Nautilus-, Nemo- und Dolphin-Integration
- X11-Unterstützung über verfügbare Desktop-Werkzeuge
- unter Wayland hängen globale Hotkeys, Fensterpositionen und Screenshots von Desktop und Portalen ab
- ausgewählte Systemzustände als Best Effort
