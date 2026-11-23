# Arbeitsregeln für dieses Repo

Dieses Repo ist die GitHub-Pages-Seite `https://xandl-droste.github.io/`.
Die Trainings-PWA liegt im Unterordner `training/` und läuft unter `https://xandl-droste.github.io/training/`.

## Branches und Merges

- `main`: ausgelieferter Stand. Nie direkt committen.
- `develop`: Integrationsstand. Nie direkt committen.
- Gearbeitet wird immer auf Feature-Branches (`feature/<kurzer-name>`), abgezweigt von `develop`.
- Feature → `develop`: **Squash-Merge** (ein Commit pro Feature).
- `develop` → `main`: **immer Merge-Commit** (`git merge --no-ff`), nie Squash, nie Fast-Forward.
- Kein Force-Push auf `main` oder `develop`.

## Versionen

- Die Version steht nur in `package.json` (`MAJOR.MINOR.PATCH`). `npm run sw` schreibt sie nach `training/src/version.js`, die Info-Seite zeigt sie an.
- **Major:** Bestehende Daten oder ältere App-Stände sind nicht mehr kompatibel (`SCHEMA_VERSION` steigt, alte Backups oder Pläne brauchen eine Migration, neue Exporte sind für alte Versionen unlesbar, das Planformat für den KI-Prompt ändert sich inkompatibel). Ein Test prüft: Major-Version = `SCHEMA_VERSION`.
- **Minor:** neue Funktionen, alle bestehenden Daten funktionieren weiter (z. B. neue optionale Felder).
- **Patch:** Fehlerbehebungen und Textkorrekturen ohne neues Verhalten.
- Version erhöhen auf dem Feature-Branch, zusammen mit einem Eintrag in `CHANGELOG.md`, danach `npm run sw`.
- Jeder Merge `develop` → `main`, der die App ändert, bekommt eine neue Version und einen Tag: `git tag vX.Y.Z` auf dem Merge-Commit, dann `git push origin main vX.Y.Z`. Merges, die nur `docs/` oder `reviews/` betreffen, bekommen keine Version und keinen Tag.
- Tags `v*` sind per Ruleset geschützt (nicht verschieben, nicht löschen).

## Persönliche Daten

- Das Repo ist öffentlich. Keine Klarnamen, Wohnorte oder privaten Mailadressen in Code, README, Manifest, Metadaten oder Commits. Einzige Ausnahme sind die Betreiberangaben (siehe nächster Punkt).
- Commits nur mit der GitHub-`noreply`-Adresse oder einer neutralen Identität.
- Die Betreiberangaben (Name, Wohnort, Kontakt) stehen ausschließlich in `training/src/legal.js`. Sie sind für die Offenlegung nach § 25 MedienG nötig und werden nur vom Betreiber geändert. Nicht an andere Stellen kopieren (auch nicht in Tests, LICENSE oder Doku).

## GitHub Pages

- Alle Pages-Seiten dieses Kontos teilen sich die Origin `xandl-droste.github.io` und damit Browserspeicher und Offline-Cache der App. Auf diesem Konto keine weiteren Pages-Projekte mit JavaScript veröffentlichen.

## Technik

- Vanilla JS (ES Modules), keine Laufzeit-Abhängigkeiten, kein Build.
- Tests: `npm test` (nutzt `node:test`, keine Pakete nötig, läuft offline).
- Nach jeder Änderung unter `training/`: `npm run sw` (aktualisiert Precache-Liste und Version im Service Worker; ein Test prüft das).
- Browser-Prüfungen (optional, Playwright nötig): `npm run e2e`, App muss lokal laufen (siehe README).
- Importierte Daten und Nutzereingaben nie mit `innerHTML`, `insertAdjacentHTML`, `eval` oder `new Function` rendern bzw. ausführen.
- Keine externen Requests, keine CDNs.
- Die vollständige Spezifikation steht in `docs/spezifikation.md`.

## Arbeitsstand

- Sitzungen laufen oft in der Cloud und können jederzeit neu starten. Nichts Wichtiges nur im Gespräch oder in der Arbeitskopie lassen.
- Nach jedem Teilschritt committen und pushen. Den Arbeitsstand (was erledigt ist, was als Nächstes kommt, offene Fragen, selbst getroffene Entscheidungen) in `docs/stand.md` nachführen.
- Zu Beginn einer Sitzung zuerst `docs/stand.md` lesen.

## Begriffe

- Verbindliche Begriffe stehen in `docs/begriffe.md` (z. B. Plan, Einheit, Training, Trainingsdatei, Durchgang). In Doku, UI-Texten, Code-Kommentaren und Gesprächen nur diese Begriffe verwenden. Neue Begriffe dort eintragen, bevor sie verwendet werden.
