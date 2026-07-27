# RewindOS – Umsetzungs- und Prüfbericht

Version: **0.4.0**  
Stand: **25. Juli 2026**  
Zielplattformen: **Windows 10/11 x64 und moderne x64-Linux-Distributionen**

## Ergebnis der erneuten Komplettprüfung

Der ausgelieferte Ordner wurde als vollständiger Quellbaum neu zusammengestellt. Nicht nur sichtbare Menüpunkte, sondern die ausführbaren Dienste, IPC-Grenzen, Speicherung, Plattformadapter, Installer und Tests wurden gegen die zugesagten Funktionen abgeglichen.

Wesentliche Korrekturen und Ergänzungen bis einschließlich 0.4.0:

- korrekte, veröffentlichte und fest gepinnte Builder-Version
- strikte Normalisierung importierter Tresor-, Papierkorb- und Checkpoint-Metadaten
- feste Größen-, Anzahl-, JSON-, Manifest- und Entpackgrenzen gegen Ressourcenerschöpfung
- private Quarantäne für Rettungspakete, vollständige Prüfung vor Übernahme und transaktionales Rollback
- Wiederherstellungen nur in aktuellen Schutz-/Projektwurzeln oder an ausdrücklich ausgewählte Ziele
- App-Daten, Symlinks und besondere Dateitypen als Wiederherstellungsziel gesperrt
- Sicherheitsversion beziehungsweise geschützte Löschablage vor dem Ersetzen vorhandener Dateien oder Ordner
- sichere Cross-Device-Kopien ohne rekursives Folgen von Symlinks
- einmalige, zeitlich begrenzte Bestätigungstokens für Explorer- und Linux-Dateimanager-Anfragen
- kontrollierte Installation, Statusprüfung und Entfernung der Explorer-, Nautilus-, Nemo- und Dolphin-Integration
- per-user Windows-Explorer-Integration mit Entfernung bei Deinstallation
- verpflichtender grafischer Linux-Smoke-Test und Prüfsummen nur für reguläre Artefakte
- doppelte Renderer-Absicherung durch Datenmodell-Normalisierung und HTML-/Attribut-/CSS-Escaping
- erweiterte Tests für Scheduler, Spiegelung, Akku, Gaming, Recovery-Rollback und Restore-Autorisierung
- vollständige UI-Korrekturen für skalierte Schrift, Scrollleisten, dunkle Auswahlfelder und lange Speicherpfade
- bearbeitbare globale Tastenkürzel mit sicherer Eingabeprüfung und Duplikatschutz
- echte Wiederherstellung als Hauptaktion; getrennte Test-Wiederherstellung ohne Änderung des Originals
- natürliche Suche und Wiederherstellung gelöschter Bilder aus zuvor geschützten Ordnern
- verständliche Hinweise, wenn keine Ausgangsversion existiert, weil der Quellordner nicht geschützt war

## Automatisierte Prüfung

Der vollständige lokale Prüflauf besteht mit:

- JavaScript-/CommonJS-Syntaxprüfung aller Quellen, Skripte und Tests
- **177** übereinstimmenden deutschen/englischen Renderer-Schlüsseln
- **127** übereinstimmenden gemeinsamen Übersetzungsschlüsseln
- HTML-Struktur- und Duplicate-ID-Prüfung
- zwingender Kontrolle von Electron-Sandbox, Content Security Policy und gesperrten Berechtigungen
- Kontrolle der Audit- und Smoke-Test-Skripte
- Abgleich aller 30 Erweiterungen an ausführbarem Quellcode
- Kontrolle der Installerziele NSIS, portable EXE, AppImage, DEB und RPM
- Kontrolle des Windows-Explorer-Installations-/Entfernungszyklus
- Kontrolle des strikten Linux-Smoke-Test-Gates
- **49 von 49 Funktionsnachweisen bestanden**
- **77 Tests bestanden, 0 fehlgeschlagen, 0 übersprungen**

Die Tests decken unter anderem Verschlüsselung, Komprimierung, Deduplizierung, Metadaten-Normalisierung, Wiederherstellung, Sicherheitsversionen, Undo-Regeln, Gruppenaktionen, komplette Ordnerrettung, Test-Wiederherstellung, Timeline-Filter, Checkpoints, Arbeitsbereiche, Zwischenablage, PIN-Brute-Force-Schutz, Symlink-Angriffe, Pfadfreigaben, Import-Quarantäne, Recovery-Rollback, manipulierte Manifeste, Spiegelung, Zeitplanung, Akku-/Gamingmodus, Prozessschutz und Dateimanager-Bestätigungstokens ab.

## Abhängigkeits- und Buildstatus dieser Umgebung

Der reine Quell-, Funktions- und Testlauf wurde vollständig ausgeführt. Die Electron-Abhängigkeiten konnten in dieser Umgebung wegen wiederholter Fehler der vorgeschalteten Paketquelle beziehungsweise DNS-Verfügbarkeit nicht installiert werden. Deshalb konnten hier nicht ausgeführt werden:

- `npm audit`
- echter Electron-Smoke-Test
- reale NSIS-/portable-Windows-Pakete
- reale AppImage-/DEB-/RPM-Pakete
- Signierung und Installer-Upgradeprüfung

Die lokalen Build-Skripte und GitHub Actions führen nach erfolgreicher Abhängigkeitsinstallation Tests, Audit, Smoke-Test, Paketbau und SHA-256-Prüfsummen aus. Eine geprüfte `package-lock.json` muss vor dem öffentlichen Release auf einem System mit funktionierendem npm-Zugriff erzeugt und committed werden.

## Zwingend auf realen Systemen zu testen

- Windows 10 und 11: Installation, Upgrade, Deinstallation, portable EXE, Tray, Autostart, Hotkeys, Explorer-Menü und Prozessidentität
- Ubuntu/Debian und eine RPM-/KDE-Distribution: AppImage, DEB, RPM, Tray sowie Nautilus/Nemo/Dolphin
- X11 und Wayland: Fensterpositionen, globale Hotkeys, Screenshots und Desktop-Portale
- große Dateien, sehr viele kleine Dateien, volle Datenträger, getrennte Laufwerke und externe Datenträger
- Stromausfall/Prozessabbruch während Sicherung, Kopie, Recovery-Import und Wiederherstellung
- Suspend/Resume, Neustart, Absturz und Rettungspaket auf einem zweiten Benutzerkonto
- Signierung, SmartScreen-/Antivirus-Reaktion und Installer-Upgradepfad

## Ehrliche Sicherheitsbewertung

Die statische Prüfung, 49 Funktionsnachweise und 77 Tests reduzieren erkennbare Fehler und typische Angriffsflächen deutlich. Kein Testumfang kann garantieren, dass eine Anwendung vollständig fehlerfrei ist oder keine unbekannte Sicherheitslücke enthält. Vor einer breiten öffentlichen Veröffentlichung sind reale Plattformtests, `npm audit`, signierte Pakete und idealerweise eine unabhängige Code-/Penetrationsprüfung erforderlich.
