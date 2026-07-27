# RewindOS auf GitHub veröffentlichen

1. Projekt in ein neues Repository kopieren.
2. Prüfen, dass `node_modules`, `dist`, lokale Daten, Logs, Tresorobjekte, Schlüssel, Signaturdateien und Umgebungsdateien nicht enthalten sind.
3. `npm install`, `npm run verify`, `npm run audit` und den Plattform-Smoke-Test ausführen.
4. Eine geprüfte `package-lock.json` committen.
5. Änderungen auf `main` pushen und CI sowie CodeQL abwarten.
6. Tag `v0.4.0` erstellen und pushen.
7. Der Release-Workflow baut Windows und Linux getrennt, führt Audit und Smoke-Tests aus, erstellt SHA-256-Prüfsummen und hängt die Ergebnisse an den GitHub Release.
8. Jedes Artefakt vor Veröffentlichung auf einem sauberen Testsystem installieren und die Punkte aus `RELEASE_CHECKLIST.md` prüfen.

Die normalen GitHub-Actions-Jobs besitzen nur Leserechte. Nur der eigentliche Release-Job erhält gezielt `contents: write`.
