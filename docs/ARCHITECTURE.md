# RewindOS – Architektur

## Prozesse und Vertrauensgrenzen

1. **Main Process** – besitzt Betriebssystem-, Datei- und Electron-Rechte.
2. **Sandboxed Renderer** – zeigt ausschließlich lokale UI und besitzt keinen Node-Zugriff.
3. **Preload Bridge** – stellt nur eine kleine, eingefrorene Methodenliste bereit.
4. **IPC Layer** – prüft Sender, Frame, Größe, Objektstruktur, Authentifizierung, erlaubte Werte und Pfadfreigaben.
5. **Services** – kapseln Tresor, Überwachung, Undo, Checkpoints, Clipboard, Workspaces, Export, Wartung und Plattformunterschiede.
6. **Platform Adapters** – enthalten ausschließlich die Windows-/Linux-spezifischen Best-Effort-Operationen.

## Speicherfluss

1. Der Nutzer wählt einen Schutzordner über einen nativen Dialog oder bestätigt eine einmalige Dateimanager-Anfrage.
2. Der Watcher erstellt eine stabile Dateilesung und verwirft Symlinks, ausgeschlossene Pfade und nicht erlaubte Laufwerkstypen.
3. Inhalte werden SHA-256-gehasht, optional komprimiert und mit AES-256-GCM verschlüsselt.
4. Identische Inhalte werden nur einmal gespeichert.
5. Verschlüsselte, normalisierte Metadaten verweisen auf Objekt, Pfad, Zeitpunkt und Ereignisgruppe.
6. Wiederherstellung beginnt mit Vorschau, Trockenlauf oder getrenntem Testziel.
7. Vor einem Ersetzen wird der vorhandene Zustand als Sicherheitsversion oder geschützter Papierkorb-Eintrag erhalten.
8. Finale Schreibvorgänge verwenden Konfliktregeln, exklusive temporäre Dateien, Zielverzeichnis-Identitätsprüfung und Integritätskontrolle.

## Import-/Recovery-Transaktion

1. Das fremde Rettungspaket wird in ein privates Staging-Verzeichnis kopiert.
2. Steuerdateigröße, JSON-Struktur, Manifestpfade, Duplikate, Hashes und Dateitypen werden geprüft.
3. Metadaten werden normalisiert; fremde Objektpfade und Referenzzähler werden nicht vertraut.
4. Alte Daten, Schlüssel und Einstellungen werden als Rollback-Zustand gesichert.
5. Die neuen Daten werden übernommen.
6. Bei jedem Fehler werden unvollständige neue Daten entfernt und der alte Zustand vollständig wiederhergestellt.
7. Das Originalpaket wird nie verbraucht oder verändert.

## Plattformadapter

Windows und Linux teilen die gesamte Fachlogik. Nur Fenster-/Prozesszugriff, Stromstatus, Pfadklassifizierung, Systemzustand, Ordneröffnung und Dateimanagerintegration sind getrennt implementiert. Nicht verfügbare Desktopfunktionen werden als Einschränkung gemeldet, nicht simuliert.
