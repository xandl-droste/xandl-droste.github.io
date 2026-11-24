# Training – Trainingsplan abarbeiten und protokollieren

Leichtgewichtige Web-App (PWA) für das Krafttraining im Studio: Plan Einheit für Einheit abarbeiten, Sätze protokollieren, Verlauf ansehen. Optimiert für kleine iPhones (Referenz: iPhone 13 mini).

- Läuft komplett lokal im Browser, nach dem ersten Laden auch offline.
- Kein Konto, kein Backend, keine Cookies, kein Tracking, keine externen Requests.
- Die Daten liegen im Browserspeicher und in Dateien, die du selbst exportierst. **Die exportierte `.training.json` ist die Wahrheit.**

Adresse: `https://xandl-droste.github.io/training/`

## Auf dem iPhone installieren

1. Die Adresse in **Safari** öffnen.
2. Teilen-Symbol → **Zum Home-Bildschirm**.
3. Die App ab jetzt über das Symbol auf dem Home-Bildschirm starten. Nach dem ersten Start funktioniert sie auch im Flugmodus.

## Backup: so gehen keine Daten verloren

iOS kann Browserdaten löschen (z. B. bei Speichermangel oder wenn eine Web-App lange nicht benutzt wurde). Deshalb:

- Nach jedem Training **„Als Datei sichern“** tippen und im Teilen-Menü **„In Dateien sichern“** wählen. Bei der Rückfrage **„Ersetzen“** wählen, dann gibt es immer genau eine aktuelle Datei pro Durchgang (`<planname>-<JJJJ-MM-TT>.training.json`, Datum der Anlage).
- Ab Version 2.0 liegt pro Durchgang eine eigene Trainingsdatei vor. Ein neuer Durchgang („Plan erneut starten“ oder ein neuer Plan als „Nachfolger“) bekommt eine neue Datei mit Verweis auf die bisherige; die bisherige bleibt in Dateien. Vor dem Wechsel sichert die App den bisherigen Stand, im Browser liegt danach nur die aktive Trainingsdatei.
- Die App markiert Trainings, die noch nicht gesichert sind, und erinnert beim Start. Auch nach 7 Tagen ohne Export.
- Es gibt keine automatische Synchronisation. Gesichert ist nur, was du exportiert hast.

**Wiederherstellen:** App öffnen → „Plan öffnen“ → die `.training.json` aus der Dateien-App wählen → Vorschau prüfen → „Übernehmen“. Das funktioniert auch bei komplett leerem Browserspeicher.

## Neuer Plan

- **Mit KI:** „Neuen Plan erstellen“ (bzw. Plan → „Plan mit KI erstellen oder anpassen“) zeigt einen fertigen Prompt. In einen KI-Agenten kopieren, Fragen beantworten, die erzeugte `plan.json` speichern und in der App öffnen.
- **Neuer Plan bei vorhandener Trainingsdatei:** Beim Öffnen einer `plan.json` wählen: „Anpassen“ (gleiche Trainingsdatei, gleiche Woche), „Nachfolger“ (neue Trainingsdatei ab Woche 1, die letzten Gewichte werden übernommen) oder „Ganz neu“. Die Zuordnung läuft über die Übungs-IDs.
- **Hauptübungen:** Pläne können Übungen mit `"main": true` markieren. Nach deren letztem Satz fragt die App nach dem RIR (Wiederholungen im Tank). Das Feld setzt der KI-Agent, die App ändert den Plan nie.

## Andere Trainings

- **Heute oder Verlauf → „Anderes Training eintragen“:** z. B. Beachvolleyball, Laufen oder Mobility nachträglich mit Trainingsart, Datum, Dauer, RPE und Notiz festhalten (ab Version 3.0). Eingetippte Trainingsarten werden beim nächsten Mal vorgeschlagen.
- Andere Trainings stehen im Verlauf, im Archiv und im Export für Coach. Der Prompt „Mit Plan und letzten Ergebnissen“ fasst die letzten 4 Wochen zusammen, damit der KI-Agent die Belastung einplanen kann.
- Sie zählen nicht für die Woche und ändern keine Gewichte. Kein Timer, kein Garmin-Export: Das macht die Uhr.
- Dateien aus 3.0 lassen sich mit älteren App-Versionen nicht öffnen. Die App aktualisiert sich nach dem nächsten Start von selbst.

## Export für Coach und Archiv

- **Plan → „Export für Coach“:** schlanker Text mit Plan und allen Trainings der aktiven Trainingsdatei (inkl. RIR, RPE, Notizen und anderer Trainings) für einen KI-Coach, als `.md`-Datei teilen oder kopieren. Die Daten gehen an den Anbieter des KI-Dienstes.
- **Archiv:** eine ältere Trainingsdatei oder Plandatei nur ansehen (Trainings, Graphen, Plan), ohne den aktiven Plan zu ändern. Auch dort gibt es Export für Coach und Garmin-Export. Die Datei wird nicht im Browser gespeichert.
- Ungültige Dateien werden nie halb übernommen. Die Fehlermeldung nennt die Stelle, z. B. `plan.sessions[1].blocks[2].exercises[0]: repsMax fehlt`.

## Export für Garmin Connect (optional)

Verlauf → Training öffnen → **„Für Garmin exportieren“**. Die App erzeugt eine `.fit`-Datei (Krafttraining mit Sätzen, Wiederholungen, Gewicht und Pausen) und bietet sie über das Teilen-Menü bzw. als Download an. In Garmin Connect (Web) über den Import hochladen.

- Der FIT-Encoder ist eigenständig nach der öffentlichen FIT-Protokollbeschreibung geschrieben. Es ist kein Code aus dem Garmin FIT SDK enthalten, nur einzelne Nummern aus dem FIT-Profil (Übungskategorien).
- Die `.fit`-Datei ist nur eine Kopie. Die App liest sie nie wieder ein, die `.training.json` bleibt die Sicherung.
- Übungen ohne passenden Eintrag im Garmin-Profil erscheinen dort als unbekannte Übung. Im Plan können pro Übung `garminCategory` und `garminSubcategory` (Nummern aus dem FIT-Profil) gesetzt werden.
- Uhrzeiten der Sätze: Ab dieser Version speichert die App beim Abhaken die Uhrzeit. Bei älteren Trainings werden Satz- und Pausenzeiten aus dem Plan geschätzt.

## Hosting (GitHub Pages)

Die App besteht nur aus statischen Dateien, es gibt keinen Build. Ausgeliefert wird trotzdem per GitHub Actions, damit nur die App öffentlich wird: `index.html`, `root.css` und `training/`. `docs/`, `reviews/`, `tests/` und `scripts/` bleiben im Repo, sind aber nicht als Webseite abrufbar.

1. Im Repo: **Settings → Pages → Build and deployment → Source: „GitHub Actions“**.
2. Jeder Push auf `main` startet `.github/workflows/pages.yml`: Tests laufen, dann wird nur die App veröffentlicht. Schlagen die Tests fehl, wird nichts veröffentlicht.
3. Nach 1–2 Minuten ist die App unter `/training/` erreichbar.

Der Workflow nutzt nur offizielle Actions von GitHub, per Commit-SHA gepinnt. Schreibrechte (`pages: write`, `id-token: write`) hat nur der Deploy-Job.

Alle Pfade sind relativ. Die App läuft deshalb unter jeder Adresse (Unterpfad, eigene Domain oder localhost).

## Entwicklung

Voraussetzung: Node.js ab Version 20. Es werden keine Pakete installiert.

```sh
npm test            # Unit-Tests (node:test, offline)
npm run sw          # nach jeder Änderung unter training/: Service-Worker-Version und Precache-Liste aktualisieren
python3 -m http.server 8765 --bind 127.0.0.1    # lokal ausliefern, dann http://127.0.0.1:8765/training/
```

Über `http://<IP-des-Macs>` (z. B. vom iPhone im WLAN) läuft die App ohne sicheren Kontext: kein Offline-Modus, kein Bildschirm-an, kein Teilen-Menü (Export dann als Download). Plan öffnen, trainieren und sichern funktionieren trotzdem, die App zeigt beim Start einen Hinweis. Das vollständige Verhalten gibt es nur über `https` (GitHub Pages) oder `localhost`.

Browser-Prüfungen (optional, brauchen [Playwright](https://playwright.dev), geprüft mit 1.65 für Chromium und 1.49 für WebKit). Playwright am besten außerhalb des Repos installieren und mit `PLAYWRIGHT_MODULE=<pfad>/node_modules/playwright/index.mjs` angeben:

```sh
npm run e2e         # App muss auf Port 8765 laufen (siehe oben)
BROWSER=webkit npm run e2e    # mit WebKit statt Chromium
```

Sie prüfen u. a.: keine externen Requests, Fokus-Modus passt ohne Scrollen auf 375 × 630 pt, Autosave nach Neuladen, Import präparierter Dateien (XSS), Wiederherstellung aus leerem Speicher, Offline-Betrieb, Info-Seite. Screenshots landen in `test-results/shots/`.

### Branches

- Arbeit auf `feature/<name>` (von `develop`), Squash-Merge nach `develop`.
- Veröffentlichen: `develop` → `main` immer als Merge-Commit (`git merge --no-ff`).
- Details in `CLAUDE.md`. Die vollständige Spezifikation steht in `docs/spezifikation.md`, der Arbeitsstand in `docs/stand.md`.

## Aufbau

```
index.html, root.css      Startseite der Domain (Link zur App)
training/                 die App (wird so ausgeliefert)
  index.html              Einstieg, CSP und Referrer-Policy per Meta-Tag
  sw.js                   Service Worker (generiert: npm run sw)
  manifest.webmanifest    PWA-Manifest
  css/app.css             Stile (Hell, Dunkel, Fancy)
  src/model/              Logik ohne DOM (Validator, Merge, Progression, Startwerte, Wochen, Live-Training, Verlauf, Coach-Export)
  src/views/              Bildschirme
  src/garmin/             FIT-Encoder und Garmin-Export
  src/legal.js            Betreiberangaben (nur hier pflegen)
tests/                    Unit-Tests, tests/e2e/ Browser-Prüfungen, tests/fixtures/ Beispielplan (nur für Tests, wird nicht ausgeliefert)
docs/                     Spezifikation, Arbeitsstand, Wunschliste, Prototyp (nur visuelle Vorlage)
```

## Sicherheit beim Hosting

- Alle GitHub-Pages-Seiten dieses Kontos (`xandl-droste.github.io/…`) teilen sich eine Origin und damit Browserspeicher und Offline-Cache. Deshalb auf diesem Konto **keine weiteren Pages-Projekte mit JavaScript** veröffentlichen.
- Der Service Worker prüft jede App-Datei gegen ihren SHA-256 (`npm run sw` erzeugt die Liste). Veränderte Cache-Einträge werden verworfen und neu geladen.
- Die App verweigert die Anzeige, wenn sie in einer fremden Seite eingebettet ist (Clickjacking). Ein echter Header-Schutz (`frame-ancestors`) ist mit GitHub Pages nicht möglich.

## Schriftgröße

Die iOS-Einstellung „Größere Schrift“ wirkt auf die App nicht. Im Safari-Tab lässt sie sich über „aA“ in der Adressleiste → Zoom vergrößern. Bis ca. 125 % bleibt der Fokus-Modus bedienbar, der Pausentimer rutscht dann unter den Inhalt. Ab ca. 115 % steht das Gewichtsfeld über seinen vier Knöpfen, ab ca. 150 % stehen die beiden Übungen eines Supersets untereinander. **In der installierten Home-Bildschirm-App gibt es diesen Zoom nicht.** Dort hilft nur die Bedienungshilfe „Zoom“ von iOS.

## Hinweise

- Kein Ersatz für medizinische oder therapeutische Beratung.
- Markennamen wie Apple, iPhone, Garmin werden nur zur Beschreibung der Kompatibilität verwendet. Es besteht keine Verbindung zu diesen Unternehmen.
- Lizenz: MIT, siehe `LICENSE`. Gilt für Code, Beispielplan und Dokumentation.
