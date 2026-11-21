# Arbeitsstand

Übergabe-Notiz für die nächste Sitzung (z. B. Claude Code lokal). Spezifikation: `docs/spezifikation.md`. Regeln: `CLAUDE.md`.

## Erledigt (auf `develop`)

| Schritt | Inhalt |
|---|---|
| 1 | Datenmodell, Validator, Seed-Plan, Unit-Tests |
| 2 | Live-Training: Liste, Supersets, Fokus, Timer, Autosave, Wake Lock |
| 3 | Verlauf: Liste, Detail, SVG-Graph je Übung |
| 4 | Onboarding, Import (Mehrfachauswahl, Vorschau, Merge), Export, Backup-Hinweise, Plan-Tab, CSV |
| 5 | PWA: Service Worker, Manifest, Icons, Startseite der Domain |
| 6 | Info-Seite (Impressum & Datenschutz), README, diese Notiz |
| 7a | Garmin-Spike: eigener FIT-Encoder `training/src/garmin/fit.js`, Unit-Tests `tests/fit.test.js`. Die Spike-Datei (`spike/test.fit`, `scripts/garmin-spike.mjs`) ist nach dem erfolgreichen Import in Garmin Connect wieder entfernt |
| 8, Runde 2 | Frische Reviews (`reviews/*-r2.md`), Fixes und Antworten in `reviews/umsetzung-r2.md`. Zwei hohe Findings (iOS H-1, H-2) behoben, daher folgt Runde 3 (die letzte laut Spezifikation) |
| 8, Runde 1 | Drei Reviews (`reviews/security.md`, `legal.md`, `ios-ux.md`), Fixes und Antworten in `reviews/umsetzung-r1.md` |
| 9 | Nach einer Konzeptprüfung (2026-11-15), drei Pakete: (1) Durchgänge (`cycle`), Plan-Import mit „Anpassen / Von vorn / Ganz neu“, „Plan erneut starten“, „Woche wiederholen“, Vorbelegung nach Wochenvorgabe, Steigerung nur ohne Wiederholungs-Anhebung, Einheit zählt ab der Hälfte der Sätze, Verlauf korrigieren und löschen (`deletedSessionIds`). (2) Signalton (Aus/Leise/Laut), Halte-Countdown, Gewichtsschritte 0,5 und 2,5 kg, „Später“, Notiz vom letzten Mal. (3) Garmin-Export am Abschluss, „Zuletzt“-Zeile, Folgeplan per KI, Prompt mit letzten Ergebnissen und ID-Regeln, Import-Abgleich (mit Verlauf / neu / entfallen) |
| 7b | Rückmeldung zum Spike: Import in Garmin Connect sieht gut aus. Garmin-Export: `training/src/garmin/session-fit.js`, Button „Für Garmin exportieren“ in der Verlaufs-Detailansicht, Kategorien im Seed-Plan, `doneAt` pro Satz |

Veröffentlicht wird mit `develop` → `main` als Merge-Commit (README: GitHub Pages einrichten).

## Offen

### Wo wir stehen (2026-11-21, nach Review Runde 3)

- Schritt 9, die Rückmeldungen aus der ersten Testfahrt und Review Runde 3 (`reviews/*-r3.md`, Antworten in `reviews/umsetzung-r3.md`) sind auf `main` und live.
- Das Repo wurde danach mit neuer Historie angelegt (Legal N6, siehe „Bereits entschieden“).
- Tests zuletzt: `npm test` 144/144 (e2e-Stand siehe `reviews/umsetzung-r3.md`) (die CSP-Meldungen „Refused to apply a stylesheet“ in der WebKit-Konsole gab es schon vor Schritt 9).
- `page.waitForFunction` läuft in Playwright-WebKit unter der CSP der App nicht. Der Halten-Test fragt deshalb per `evaluate` ab. Andere `waitForFunction`-Stellen mit `.catch(() => {})` warten in WebKit nur ihre Zeit ab.

### Nächste Schritte

1. Rückmeldungen des Betreibers aus dem Test im Studio umsetzen. Erste Runde (nach der ersten Testfahrt): Warm-up bleibt offen, keine Pause nach dem letzten Satz, Liste scrollt zum aktuellen Satz, Auswahl im Verlauf öffnet sich unter iOS nicht neu, nur noch ein Abschluss-Knopf, Umschalter Liste/Fokus in der Pausenleiste. Reviews dazu: `reviews/testfahrt-*.md` (keine kritischen oder hohen Findings; mittlere behoben). Beim nächsten Training prüft der Betreiber: ob beim Hüftbeuger „Halten starten“ da ist, die iPhone-Checkliste in `reviews/testfahrt-ios-ux.md`. Zurückgestellt: Klimmzug unterstützt/frei als Variante im Plan (Garmin `bandAssistedPullUp`, ohne Gewicht).
2. Offene Punkte aus Runde 3 (in `reviews/umsetzung-r3.md` als „später“ oder „Entscheidung Betreiber“ markiert).

### Offen beim Betreiber

- **Querformat im Fokus-Modus:** Dort muss man weiter scrollen, um „Satz fertig“ und den Timer zu sehen. Ein zweispaltiges Layout ist möglich, bisher aber nicht beauftragt (die Spezifikation verlangt Hochformat).

### Später

- Alte Trainingsstände im Menü löschbar machen (Security N9).
- Auf dem echten iPhone prüfen (Schritt 9): Signalton nach einem Tap, nach Rückkehr aus dem Hintergrund und mit Stummschalter; Kopieren des Prompts mit Ergebnissen.
- Nach dem Deploy (https) auf dem iPhone prüfen: Teilen-Menü in Safari und Chrome für `.training.json` (Ersetzen statt „(1)“) und `.fit`. Erledigt laut Betreiber: Halte-Countdown mit Seitenwechsel, Gewichts-Buttons mit feuchten Fingern, Garmin-Export und Import in Connect.
- Checkliste für das echte iPhone: `reviews/ios-ux-r2.md`, Abschnitt „Checkliste“.

### Bereits entschieden

- Offenlegung mit echten Angaben in `legal.js` (PR #1 des Betreibers). Datenschutz nach Art. 13 DSGVO ergänzt. Lizenz MIT (Rechteinhaber: GitHub-Account, damit der Name nur in `legal.js` steht).
- Nur die App wird ausgeliefert (Pages-Workflow). `docs/`, `reviews/` und `tests/fixtures/beispielplan.plan.json` bleiben öffentlich im Repo, aber nicht auf der Webseite.
- In der App gibt es keinen „Beispielplan laden“ mehr.
- Merge nach `main` vor Runde 3 (Betreiber, 2026-11-15, ersetzt „erst nach Runde 3“): erst im Studio testen.
- Repo neu angelegt (Legal N6, Betreiber, 2026-11-21): Die alte Historie enthielt persönliche Angaben des Betreibers. Das alte Repo wurde gelöscht (Sicherung als `git bundle` beim Betreiber), das neue beginnt mit einem Commit mit dem Stand nach Runde 3. Commit-IDs in `reviews/` und hier (z. B. `7c00163`, `62ce59a`) beziehen sich auf die alte Historie und sind im neuen Repo nicht auffindbar.
- GitHub: Ruleset „Schutz main und develop“ (kein Löschen, kein Force-Push), SHA-Pinning für Actions erzwungen, erlaubt bleiben alle Actions, keine PR-Pflicht.

## Selbst getroffene Entscheidungen (bitte prüfen)

- **Pausen**, wo die Vorgabe keine nennt: 45–120 s je Übung, im Superset kürzer nach a.
- **Keine Gewichtssteigerung** (`incrementKg: 0`): Trap Bar Jump, Sprünge, Med-Ball, Klimmzug, Tibialis-Raise, Leg Curl, Hüftbeuger, Copenhagen Plank. Schulterdrücken, Pallof Press, Außenrotation +1 kg, sonst +2,5 kg.
- **Progressionsregel** misst an der oberen Grenze, die beim letzten Training ohne Deload galt (im Block gespeichert), und schlägt nur vor, wenn die aktuelle Woche die Wiederholungen nicht anhebt; Neustart am unteren Ende der aktuellen Woche. Die Schritte der −/+-Buttons sind fest (0,5 und 2,5 kg; bei Körpergewicht kein Gewichts-Stepper), `incrementKg` gilt nur für den Vorschlag.
- **Deload** gilt für jede Übung (ein Satz weniger), auch Hüftbeuger-Knieheben (Woche 7: 1 statt 2 Sätze, obwohl die Vorgabe „wie W5“ sagt). Rundung des Deload-Gewichts auf 0,5 kg, Basis ist das letzte Gewicht vor der Deload-Woche.
- **Dauer-Schätzung:** 10 Min Warm-up + Summe (Sätze × (Arbeitszeit + Pause)); Arbeitszeit = Haltezeit bzw. 3 s pro Wdh. + 20 s, pro Seite doppelt; auf 5 Min gerundet.
- **Grenzwerte beim Import** (`training/src/model/validate.js`, `LIMITS`): 5 MB, Tiefe 12, 52 Wochen, 14 Einheiten, 30 Blöcke, 20 Sätze, 100 Wdh., 1000 kg, 5000 Sessions u. a.
- **Info-Link** steht auf jedem Bildschirm unten, außer im laufenden Training. Dort ist die Info über das Menü erreichbar, damit der Fokus-Modus ohne Scrollen auf 375 × 630 passt.
- **Kein mitgelieferter Plan mehr** (Betreiber, nach Runde 2): „Beispielplan laden“ ist entfernt, der Seed-Plan liegt als `tests/fixtures/beispielplan.plan.json` nur noch im Repo. Unit-Tests und Browser-Tests nutzen ihn, die Browser-Tests laden ihn über „Plan öffnen“. Die App macht keine eigenen Netzwerkzugriffe mehr (`connect-src 'none'`).
- **Einstellungen** (Stil, Ansicht) erhöhen die `revision` nicht. Wochen-Änderung, Trainingsende, Import und Planwechsel schon.
- **FIT-Encoder selbst geschrieben** statt Garmin FIT SDK: keine fremde Lizenz, ca. 200 Zeilen. Nachrichten: file_id (manufacturer = development), event start/stop, je Satz eine `set`-Nachricht (Pausen als `set_type = rest`), lap, session (`sport = training`, `sub_sport = strength_training`, `total_cycles` = Summe der Wdh.), activity. Die Satzanzahl hat im FIT-Profil kein eigenes Session-Feld, sie ergibt sich aus den `set`-Nachrichten. Gewicht skaliert ×16, Dauer in ms.
- **Garmin-Kategorien im Seed-Plan** (Nummern aus dem FIT-Profil, SDK 21.221). Ohne Unterkategorie, weil im Profil nichts passt: Hüftbeuger-Knieheben (leg_raise), Pogo Jumps (plyo), Landmine-Drücken (shoulder_press), Pallof Press (core). Ganz ohne Kategorie (→ unknown): Tibialis-Raise. Näherungen: Trap Bar Jump = barbell_jump_squat, Approach Jump = jump_squat, Med-Ball-Wurf = medicine_ball_side_throw, Copenhagen Plank = side_plank, Schulterdrücken = seated_dumbbell_shoulder_press, Bulgarian Split Squat = dumbbell-Variante, Leg Curl (beide Varianten) = sliding_leg_curl, Außenrotation = cable_external_rotation.
- **Garmin-Kategorien im Agent-Prompt:** Tabelle der Hauptkategorien 0–31 (`training/src/garmin/categories.js`, FIT-Profil SDK 21.221) steht im Prompt, die KI soll `garminCategory` für jede Übung setzen, `garminSubcategory` nur wenn sicher. IDs möglichst nach dem englischen Übungsnamen (hilft auch dem Stichwort-Fallback). Das Beispiel im Prompt hat jetzt Kategorien. Neuere Kategorien ab 32 (Cardio-Geräte u. Ä.) bewusst weggelassen.
- **Fallback ohne `garminCategory`:** Stichwörter in ID und Name (deutsch/englisch) → nächstliegende Kategorie, sonst unknown (65534). Unterkategorie dann leer.
- **Neues optionales Feld `doneAt`** pro Satz (ISO-Zeitstempel beim Abhaken, beim Rückgängig entfernt). `schemaVersion` bleibt 1, weil das Feld optional ist. Achtung: Eine ältere App-Version würde Dateien mit `doneAt` als „unbekanntes Feld“ ablehnen; durch das Service-Worker-Update ist das nur kurz relevant.
- **Zeitachse im FIT:** Mit `doneAt` endet jeder Satz zum Abhak-Zeitpunkt, Arbeitszeit = 3 s pro Wdh. bzw. Haltezeit (pro Seite doppelt), Lücken = Pausen. Ohne `doneAt`: Sätze mit Plan-Pausen hintereinander, das letzte Satzende liegt auf `endedAt`, die freie Zeit davor gilt als Warm-up. Ist die Session kürzer als die Schätzung, werden die Pausen gekürzt.
- **FIT-Datei enthält keine Freitexte** (keine Übungsnamen, Notizen). Dateiname nur aus dem Datum: `training-JJJJ-MM-TT.fit`. MIME-Typ `application/vnd.ant.fit`; wenn das Teilen-Menü den Typ ablehnt (z. B. Chrome), wird heruntergeladen.
- **Pages-Workflow** (`.github/workflows/pages.yml`, seit Runde 1): liefert nur `index.html`, `root.css` und `training/` aus, vorher laufen die Unit-Tests. Actions per SHA gepinnt (checkout v7.0.1, upload-pages-artifact v5.0.0, deploy-pages v5.0.1). Kein `configure-pages`, weil kein Generator im Spiel ist.
- **Beispielplan ohne persönliche Tagesangaben:** `suggestedDay` beschreibt nur noch die Art der Einheit und den Abstand.
- **Doppeltipp-Sperre** 600 ms auf Satz abschließen und wieder öffnen. „Rückgängig“ steht 10 s lang im Timer statt „+30 s“, damit der Fokus-Modus nicht höher wird.
- **Gewicht weitergeben:** nur `kg`, nur an offene Folgesätze mit leerem oder altem Wert. Wiederholungen werden nicht weitergegeben.
- **Speicher voll beim Beenden:** Abschluss trotzdem, Datei-Export mit Warnung. Das laufende Training bleibt dann im Browser liegen und erscheint nach einem Neustart wieder.
- **Service Worker mit SHA-256 je Datei** (`HASHES` in `sw.js`, erzeugt von `npm run sw`). Eine Datei, deren Hash nicht passt, wird nie aus dem Cache ausgeliefert.
- **Neuzeichnen:** Werte gehen beim Tippen (`input`) in den Zustand. Zeitgesteuerte Aktualisierungen warten, solange ein Feld den Fokus hat (`softRender`). Nach einer Eingabe wird erst nach dem Loslassen des Fingers neu gezeichnet (`renderAfterTap`), damit der Tap seinen Button trifft.
- **Laufendes Training beim Start:** wird aus dem Plan neu aufgebaut (`restoreLive`), die Session wird validiert. Ist der Stand kaputt, wird er verworfen. Dazu eine Notfallansicht, falls ein Bildschirm nicht gezeichnet werden kann.
- **Unsicherer Kontext** (z. B. `http://<IP>` im WLAN): IDs über `model/id.js` mit Fallback auf `crypto.getRandomValues()`, weil `crypto.randomUUID()` dort fehlt (Bug: Plan öffnen tat nichts). Fehler beim Öffnen und Übernehmen einer Datei werden angezeigt. Hinweis beim Start. Browser-Prüfung `tests/e2e/insecure.e2e.mjs` (nur Chromium).
- **Training beenden unten:** In der Liste steht am Ende immer „Training beenden“ (nach dem letzten Satz als Haupt-Button mit „Alle Sätze erledigt“). Im Timer ersetzt dann „Abschließen“ den Button „Weiter“, „+30 s“ entfällt.
- **Querformat auf Touch-Geräten:** volle Bildschirmbreite (`orientation: landscape` und `pointer: coarse`), Sheets bis 640 px. Desktop-Browser behalten die 430-px-Spalte.
- **Neue Grenze `LIMITS.maxKeys` = 200** Schlüssel pro Objekt beim Import.
- **Wechsel auf einen anderen Trainingsstand** (Import mit anderer `fileId`) behält den bisherigen im Browserspeicher, macht ihn aber nicht mehr aktiv. Es gibt noch keine Auswahl zwischen mehreren gespeicherten Ständen.

## Bekannte Grenzen

- Browser-Prüfungen laufen jetzt in Chromium (Playwright 1.65) komplett und in WebKit (1.49) für Training und Info. Offline-Neuladen kann Playwright-WebKit nicht. Ein echtes iPhone ist weiter ungeprüft, die Checkliste steht in `reviews/ios-ux.md`.

- Clickjacking: `frame-ancestors` geht nicht per Meta-Tag, und GitHub Pages erlaubt keine eigenen Header. Gegenmaßnahme per JS: Eingebettet leert sich die App.

## Testen

```sh
npm test
npm run sw            # nach Änderungen unter training/
python3 -m http.server 8765 --bind 127.0.0.1
npm run e2e           # braucht Playwright, siehe README
```

Playwright lag in dieser Sitzung außerhalb des Repos unter `/private/tmp/claude-502/` (wird beim Neustart des Macs ggf. gelöscht, dann neu installieren). Aufruf wie zuletzt verwendet:

```sh
BASE_URL=http://127.0.0.1:8766/training/ \
PLAYWRIGHT_MODULE=/private/tmp/claude-502/security-review/node_modules/playwright/index.mjs \
PLAYWRIGHT_BROWSERS_PATH=/private/tmp/claude-502/security-review/browsers npm run e2e      # Chromium
BROWSER=webkit PLAYWRIGHT_MODULE=/private/tmp/claude-502/ios-review/node_modules/playwright/index.mjs \
PLAYWRIGHT_BROWSERS_PATH=/private/tmp/claude-502/ios-review/browsers node tests/e2e/training.e2e.mjs   # WebKit
```

Auf Port 8765 testet der Betreiber selbst, die Browser-Prüfungen liefen deshalb auf 8766.
