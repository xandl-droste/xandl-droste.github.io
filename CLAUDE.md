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
