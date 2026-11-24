# Review Runde 7: Code-Qualität

Rolle: Reviewer 4 (Code-Qualität) nach `docs/spezifikation.md`, Abschnitt 9.
Geprüfter Stand: Commit `6ad6a6a` (Code), Version 3.0.0 („in Arbeit“). Während der Prüfung kam `5dfd97f` dazu (nur Zweck-Text auf der Info-Seite, Spezifikation, CHANGELOG, `sw.js`). Dieser Stand wurde mit `npm test` und `npm run sw` nachgeprüft.
Gearbeitet nur lesend. Hilfsskripte lagen außerhalb des Repos (Scratchpad der Sitzung). Server: `python3 -m http.server 8774 --bind 127.0.0.1`, am Ende beendet.

## Geprüfte Punkte

- **Tests:** `npm test`: 207 von 207 grün (auf `6ad6a6a` und auf `5dfd97f`). `BASE_URL=http://127.0.0.1:8774/training/ npm run e2e` (Chromium): alle zehn Prüfungen grün, jeweils „externe Requests: keine“, „Probleme: keine“.
- **Repo-Regeln aus `CLAUDE.md`:** Suche unter `training/` nach `innerHTML`, `insertAdjacentHTML`, `outerHTML`, `document.write`, `eval`, `new Function`: keine Treffer. Externe Adressen nur als Link-Text zur GitHub-Datenschutzerklärung (`views/info.js:7`) und in Kommentaren. `npm run sw` in einer frischen Kopie (`git archive`) neu erzeugt: keine Abweichung, auch nach `5dfd97f`. Version 3.0.0 in `package.json` und `training/src/version.js`, `SCHEMA_VERSION` 3. CHANGELOG nennt die Änderungen aus Runde 5 und 6.
- **Fixes aus Runde 6, Code gelesen** (`git show 0d489db`): Stepper liest den Ausgangswert aus dem Feld (`views/live.js:385`, `views/activity.js:80-87`), `renderAfterTap` ohne Tap mit `setTimeout` (`app.js:153-166`), `go()` leert den Entwurf, Hintergrund-Sperre nur beim Sheet „Anderes Training“ (`app.js:264-267`), Texte der Import-Vorschau, `.sheet-actions` im Abschluss-Sheet, `mergeTrainingFiles` mit Vorrang des Gewinners, `INVISIBLE_RE`/`cleanActivityType`/`byActivityDate` an einer Stelle in `validate.js`, Validator bereinigt die Trainingsart.
- **Fixes aus Runde 6, nachgestellt:** Zusammenführen bei ID-Kollision und bei gleicher Revision per Node-Skript; Stepper „Wert tippen, dann ±“ per Playwright mit Touch (auch mit Werten ab 1000, siehe N1).
- **Fachlogik, vollständig gelesen:** `model/validate.js`, `model/training-file.js`, `model/activities.js`, `model/weeks.js`, `model/progression.js`, `model/plan.js`, `model/carry-over.js`, `model/switch.js`, `model/finish.js`, `model/backup.js`, `model/history.js`, `model/import.js`, `model/live.js`, `model/coach-export.js`, `agent-prompt.js`, `garmin/session-fit.js`, `storage.js`, `export.js`, `wakelock.js`, `sw.js`, `app.js` (ganz), `views/activity.js`, `views/history.js`, `views/archive.js`, Stepper in `views/live.js`, `format.js`, `dom.js`.
  - Wochen-Ableitung (Durchgang, `repeatFrom`, Hälfte der Sätze inkl. übersprungener im Nenner, nur vorwärts), Progression (gespeicherte Vorgabe, keine Steigerung bei angehobenem `repsMax`, Deload ohne Steigerung, 80 %), Vorbelegung (Spanne der Woche, Haltezeit bei geänderter Vorgabe), Startwerte als Pseudo-Trainings vor allen echten, Nachfolger ohne andere Trainings: spezifikationsgemäß.
  - Andere Trainings: zählen nicht für die Woche, nicht für Vorbelegung, Steigerung, „Zuletzt“ und Startwerte, kein Garmin-Export, IDs über beide Listen eindeutig, Sortierung nach Datum und `createdAt`, Grenzen 1–60 Zeichen, 1–600 min, 2000 pro Datei, Datum nicht in der Zukunft (nur in der App, im Validator bewusst nicht): spezifikationsgemäß.
  - Abgleich: höhere Revision gewinnt, Ergänzen per ID für beide Listen, Grabsteine vereinigt, danach Fortschritt abgeleitet; `checkReimport` vor dem Speichern; Wechsel der aktiven Trainingsdatei in einer Transaktion mit Schutz gegen veraltete Fenster (`saveImported`), Abschluss mit `saveFinished` (Datei und laufendes Training in einer Transaktion).
  - Coach-Export (neuestes zuerst, andere Trainings im gewünschten Format, Legende nur mit anderen Trainings, Backticks und Zeilenumbrüche entschärft), Agent-Prompt (Zusammenfassung der letzten 4 Wochen, Trainingsart als JSON-Text, ohne Notizen).
- **Konsistenz:** Spezifikation (vollständig, auch die Änderung in `5dfd97f`), `docs/begriffe.md`, `docs/stand.md`, `CHANGELOG.md`, `reviews/umsetzung-r6.md`, `reviews/code-qualitaet-r6.md` (zum Abgleich der behobenen Punkte). Schema-Text des Agent-Prompts gegen Validator stichprobenartig (Grenzen über `LIMITS` eingesetzt).
- **Tests gelesen:** Abschnitte zu Runde 6 in `tests/activities.test.js`, Touch-Teil von `tests/e2e/anderes-training.e2e.mjs`, `tests/e2e/helpers.mjs`.

## Nicht geprüft (mit Grund)

- **WebKit / echtes iPhone:** kein Gerät; Playwright nur mit Chromium. Insbesondere die Ereignisreihenfolge bei Touch, auf der `renderAfterTap` beruht, und das Zahlenformat von `Intl.NumberFormat('de-AT')` in Safari (siehe N1) sind dort nicht geprüft.
- **FIT-Encoder (`garmin/fit.js`):** seit Runde 4 unverändert, nicht erneut gelesen. `session-fit.js` gelesen.
- **Ansicht im Training außer Stepper (`views/live.js` Fokus, Pausenleiste, RIR-Chips), `views/plan.js`, `views/rpe.js`, `sound.js`:** seit Runde 5/6 im Kern unverändert, nicht im Detail gelesen; durch die Browser-Prüfungen abgedeckt.
- **CSS, Layout, Kontraste:** Rolle UX.
- **Speicher voll, mehrere Fenster gleichzeitig:** nicht erzeugt, nur Code gelesen.

## Findings

### Kritisch

Keine.

### Hoch

Keine.

### Mittel

Keine.

### Niedrig

#### N1: −/+ setzt Werte ab 1000 auf 0 (Tausendertrenner im Feld), Folge des Fixes für Runde 6 H1

- **Fundstelle:** `training/src/views/live.js:385` (`stepValue(input.isConnected ? parseNum(input.value) : value, d)`), `training/src/views/live.js:371` (`value: fmtNum(value)`), `training/src/format.js:3-5` (`Intl.NumberFormat('de-AT')` mit Gruppierung), `training/src/format.js:71-76` (`parseNum` entfernt keine Leerzeichen innerhalb der Zahl).
- **Beschreibung:** Seit Runde 6 liest der Stepper den Ausgangswert aus dem Textfeld. Das Feld zeigt den Wert aber über `fmtNum`, und `de-AT` gruppiert ab 1000 mit einem geschützten Leerzeichen (`"1 000"`, U+00A0, in Node und Chromium geprüft). `parseNum("1 000")` ergibt `null`, `stepValue(null, d)` rechnet von 0. Nachgestellt in Chromium mit Touch (Fokus, Gewicht „1000“ eingetippt, Enter, dann „−0,5“): Feld zeigt danach **0** statt 999,5. Dasselbe gilt für Haltezeiten ab 1000 s und Wiederholungen ab 1000, im Training (Liste, Fokus, Bearbeiten-Sheet) und beim Korrigieren im Verlauf (gleiche `stepper()`-Funktion). Verwandt: Wer im Feld „1 000“ nur eine Ziffer ändert, schickt über `change` ebenfalls `null`. Die Dauer im Sheet „Anderes Training“ ist nicht betroffen (`String(value)`, höchstens 600).
- **Auswirkung:** gering, weil solche Werte im Krafttraining selten sind (Gewicht höchstens 1000 kg, Haltezeit ab 16:40 min). Wo sie vorkommen, wird ein Wert still durch 0 ersetzt und mit „Satz fertig“ protokolliert. Kein Test deckt den Rundweg „anzeigen, lesen“ ab.
- **Empfehlung:** Im Eingabefeld ohne Gruppierung formatieren (eigener Formatierer mit `useGrouping: false` für `value` der Zahlenfelder) und `parseNum` zusätzlich tolerant machen (`replace(/[\s  ]/g, '')` vor der Umwandlung). Unit-Test `parseNum(fmtNum(x)) === x` für 1000, 1200, 36000; im Browser-Test einmal „1000, dann −0,5“.
- **Sicherheit:** hoch für Chromium (nachgestellt). In Safari hängt es am dortigen Gruppierungszeichen von `de-AT`; jedes Trennzeichen außer Komma bricht `parseNum`, ein Punkt („1.000“) ergäbe sogar 1.

#### N2: Import-Vorschau meldet „Entspricht dem gespeicherten Stand“, obwohl die Datei bei gleicher Revision anderen Inhalt hat

- **Fundstelle:** `training/src/model/import.js:97` (`action = merge.changed ? 'merge' : 'unchanged'`), `training/src/model/training-file.js:117` (Gleichstand: lokal gewinnt) und `:152` (`changed` nur bei ergänzten oder entfernten Einträgen), `training/src/app.js:490` (Text „Entspricht dem gespeicherten Stand. Nichts zu tun.“).
- **Beschreibung:** Haben Datei und Browser dieselbe `revision`, aber auseinandergelaufenen Inhalt, gewinnt der Browser-Stand. Fehlen dem Gewinner keine Einträge, ist `changed` false und die Vorschau sagt, die Datei entspreche dem gespeicherten Stand. Nachgestellt per Node-Skript: Stand rev 1 (ein anderes Training, 60 min) auf zwei Geräte verteilt; Gerät 1 trägt ein zweites ein (rev 2), Gerät 2 korrigiert die Dauer auf 90 min (rev 2). Import der Datei von Gerät 2 auf Gerät 1: `winner: local`, `changed: false`, Vorschau `unchanged`; die Korrektur auf 90 min fällt ohne Hinweis weg.
- **Auswirkung:** gering. Tritt nur auf, wenn eine Trainingsdatei auf zwei Geräten parallel weitergeführt wird (die Spezifikation sieht das nicht vor, verhindert es aber nicht). Die Regel „höhere Revision gewinnt“ legt den Gleichstand nicht fest; falsch ist vor allem die Aussage der Vorschau.
- **Empfehlung:** „unchanged“ nur, wenn die Inhalte gleich sind (z. B. `serialize` beider Stände ohne `settings` vergleichen). Sonst eigener Fall mit Text wie „Gleicher Stand-Zähler, aber anderer Inhalt. Der Browser-Stand bleibt, Änderungen aus der Datei werden nicht übernommen.“ Unit-Test mit dem Fall oben.
- **Sicherheit:** hoch (nachgestellt); Gewicht des Falls in der Praxis: mittel bis gering.

#### N3: Trainingsart nur aus unsichtbaren Zeichen ergibt eine unspezifische Meldung

- **Fundstelle:** `training/src/views/activity.js:22-23` (`activityDraftError` prüft `String(d.type).trim()`), `training/src/app.js:748-755`.
- **Beschreibung:** `trim()` entfernt z. B. U+200B (Nullbreite) nicht, die Vorprüfung lässt die Eingabe durch. Das Modell bereinigt sie zu einem leeren Text, der Validator wirft einen `ValidationError`, und das Sheet zeigt „Die Eingaben passen nicht. Bitte prüfen.“ statt „Bitte eine Trainingsart eintragen …“.
- **Auswirkung:** gering (nur bei eingefügtem Text mit unsichtbaren Zeichen); die Meldung nennt das betroffene Feld nicht.
- **Empfehlung:** In `activityDraftError` `cleanActivityType(d.type)` statt `trim()` prüfen.
- **Sicherheit:** hoch (Code gelesen, Ablauf über Modell und Validator nachvollzogen).

#### N4: Kleinere Wartbarkeitsreste

- **Fundstelle und Beschreibung:**
  - `training/src/model/live.js:211`, `:216`, `:217`: Grenzen 1000 / 1000 / 36000 als Zahlen statt `LIMITS.maxKg`, `LIMITS.maxLoggedReps`, `LIMITS.maxLoggedSec` (in `model/history.js:203-205` korrekt über `LIMITS`).
  - `training/src/app.js:880`, `:923`, `:1153`, `:1187`: `maxlength: 2000` statt `LIMITS.maxNote` (in `views/activity.js:64` über `LIMITS`).
  - `training/src/app.js:732` und `training/src/views/activity.js:34`: Option `render: 'afterTap'` von `AA.update` wird nirgends genutzt (toter Zweig).
  - `training/src/app.js:761`: Der Toast nach dem Eintragen bereinigt die Trainingsart selbst (`trim().replace(/\s+/g, ' ')`) statt `cleanActivityType` bzw. die gespeicherte `activity.type` zu nutzen; bei unsichtbaren Zeichen weicht der Toast vom gespeicherten Namen ab.
  - `training/src/storage.js:203-209`: Kommentar „die aktive nie“, die Funktion prüft das aber nicht (Aufrufer übergeben nur andere Dateien; die Zusicherung steht nur im Kommentar).
  - Begriffe in Code-Kommentaren: „Plan-Einheit“ (`model/live.js:76`, `model/plan.js:29`, `model/weeks.js:105`, `:1`) steht in `docs/begriffe.md` unter „Nicht verwenden“; `CLAUDE.md` verlangt die Begriffe auch in Code-Kommentaren. „Session“ in Kommentaren für Trainings ist häufig (z. B. `model/weeks.js:7-27`, `model/history.js:105`); bei Feldnamen ist das gedeckt, im Fließtext nicht.
- **Auswirkung:** keine Fehlfunktion; Grenzen können bei einer Änderung von `LIMITS` auseinanderlaufen, Kommentare widersprechen der Begriffsliste.
- **Empfehlung:** `LIMITS` einsetzen, toten Zweig entfernen, Toast aus dem Rückgabewert von `addActivity` (`activity.type`), Kommentar in `storage.js` korrigieren oder Prüfung ergänzen, „Plan-Einheit“ → „Einheit“ in Kommentaren.
- **Sicherheit:** hoch.

#### N5: Testlücken

- **Fundstelle:** `tests/` (keine Tests zu den genannten Fällen).
- **Beschreibung und konkrete Testfälle:**
  1. Rundweg Anzeige/Eingabe: `parseNum(fmtNum(1000)) === 1000` (schlägt heute fehl, siehe N1); Browser: Gewicht 1000, dann „−0,5“ → 999,5.
  2. Abgleich bei gleicher Revision mit anderem Inhalt (siehe N2): Erwartung festlegen und testen (Vorschau nicht „unchanged“).
  3. Sheet „Anderes Training“ mit Trainingsart `"​"`: Meldung „Bitte eine Trainingsart eintragen …“ (siehe N3).
  4. `storage.saveImported` mit `dropFileId` und veraltetem `stamp` bzw. höherer gespeicherter Revision: nur indirekt über Browser-Tests abgedeckt; ein Test mit einer IndexedDB-Attrappe (z. B. `fake-indexeddb` ist wegen „keine Pakete“ ausgeschlossen, daher eher ein eigener Browser-Test mit zwei Seiten im selben Kontext) würde die Zusage „nichts wird halb gespeichert“ beim Wechsel absichern.
- **Auswirkung:** Die Fälle N1 bis N3 wären mit diesen Tests aufgefallen.
- **Empfehlung:** Tests 1 bis 3 als Unit- bzw. Browser-Test ergänzen, 4 als Browser-Test mit zwei Seiten.
- **Sicherheit:** hoch.

## Zusammenfassung

Keine kritischen, hohen oder mittleren Findings. Die Fixes aus Runde 6 sind umgesetzt und wirken (Stepper rechnet vom getippten Wert, Zusammenführen ohne Verdrängen lokaler Einträge, Bereinigung der Trainingsart an einer Stelle). Neu ist eine kleine Randfolge des Stepper-Fixes bei Werten ab 1000 (N1). Übrige Punkte betreffen einen seltenen Abgleichsfall, eine Meldung und Wartbarkeit. `npm test` 207/207, `npm run e2e` (Chromium) grün, `npm run sw` aktuell.

| Schwere | Anzahl |
|---|---|
| kritisch | 0 |
| hoch | 0 |
| mittel | 0 |
| niedrig | 5 |
