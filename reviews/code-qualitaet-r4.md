# Review Runde 4: Code-Qualität

Rolle: Reviewer 4 (Code-Qualität) nach `docs/spezifikation.md`, Abschnitt 9.
Geprüfter Stand: Commit `f0fb7c1` (Zwischenstand vor den Fixes aus Runde 4, im öffentlichen Repo nicht auffindbar), Version 2.0.0. Vergleich mit 1.0.1 (`62b944b`), Schwerpunkt auf den Änderungen für 2.0.
Gearbeitet nur lesend. Hilfsskripte lagen außerhalb des Repos (`/tmp/review-code/`).

## Geprüfte Punkte

- **Tests:** `npm test` ausgeführt: 178 von 178 grün. Alle neun Browser-Prüfungen aus `npm run e2e` einzeln gegen `http://127.0.0.1:8784/training/` ausgeführt (Chromium, Playwright): `training`, `import`, `offline`, `info`, `insecure`, `speichern`, `rir`, `durchgang`, `archiv`. Alle melden „externe Requests: keine“ und „Probleme: keine“.
- **Repo-Regeln aus `CLAUDE.md`:** Kein `innerHTML`, `insertAdjacentHTML`, `eval`, `new Function`, `outerHTML` oder `document.write` unter `training/`, `scripts/` und in `index.html` (Suche). Alle Texte aus Dateien laufen über `h()` bzw. `textContent` (`training/src/dom.js`, neue Ansichten `views/archive.js`, `views/rpe.js`, RIR-Chips in `views/live.js`, Verlauf). Externe URLs im Code nur als Text (Link zur GitHub-Datenschutzerklärung) bzw. SVG-Namensraum. CSP unverändert streng. `npm run sw` ist aktuell: In einer Kopie des Repos neu erzeugt, `training/sw.js` und `training/src/version.js` sind identisch. Version 2.0.0 in `package.json`, `SCHEMA_VERSION` 2 (Test Major = Schema läuft), CHANGELOG-Eintrag vorhanden (noch „in Arbeit“, siehe N5).
- **Datenmodell und Validator:** `model/validate.js` komplett gelesen: neue Felder `createdAt`, `previous`, `carryOver`, `main`, `rirLast`, `rpe`, `note` (Training), `name`/`variantName` (Block), Grenzen in `LIMITS`, Lesen von Schema 1 und Heben auf 2, Ablehnen neuerer Schemaversionen.
- **Wochen-Ableitung, Progression, Deload, Vorbelegung:** `model/weeks.js`, `model/progression.js`, `model/plan.js` gelesen, mit Spezifikation 2 und 3 abgeglichen, auch für die Pseudo-Trainings aus den Startwerten (`performanceSessions`: Durchgang 1, kein Deload, vor allen echten Trainings einsortiert).
- **Startwerte und Nachfolger:** `model/carry-over.js` gelesen. Per Skript geprüft: Kette über mehrere Pläne, Dateinamen von Vorgänger und Nachfolger.
- **Import und Abgleich:** `model/import.js`, `mergeTrainingFiles`, `replacePlan`, `withBlockNames`, Vorschau und Anwenden in `app.js` (`confirmImport`, `withBackupFirst`, `switchToFile`).
- **Backup-Status, Korrigieren und Löschen:** `model/backup.js`, `model/history.js`, `views/history.js`, Korrektur-Sheets in `app.js`.
- **Exporte:** `.training.json` (`export.js`, `checkReimport`), Coach-Export (`model/coach-export.js`, Abgleich mit Entwurf 2.2), Agent-Prompt (`agent-prompt.js`, Ergebniszeilen mit RIR und Startwerten). FIT nur bis zur Übergabe an `sessionToFit` (keine Änderung seit 1.0.1).
- **Laufendes Training:** `model/live.js` komplett (RIR-Regeln, Wiederherstellen, Abschluss), `views/live.js` (Diff zu 1.0.1), `finishLiveNow`, Autosave über `queueSave`.
- **Speicher:** `storage.js` komplett (Transaktionen, `stamp`-Schutz, `saveImported` mit `dropFileId`, `listOtherFiles`, `deleteFile`), Aufräumen beim Start (`cleanUpOtherFiles`, `otherFilesSheet`).
- **Wechsel der aktiven Trainingsdatei mit zwei Fenstern:** im Browser nachgestellt (siehe M1).
- **Archiv:** `views/archive.js`, `AR` in `app.js`: nur Arbeitsspeicher, nie gespeichert, Coach- und Garmin-Export aus der Archivdatei.
- **Konsistenz:** Schema-Text des Agent-Prompts gegen Validator für das neue Feld `main`; Begriffe aus `docs/begriffe.md` in UI-Texten (Suche nach „Session“, „Zyklus“, „Durchgang“, „Gesamtstand“); Spezifikation, Entwurf 2.0, `docs/stand.md`, README (Suche nach „CSV“, „Von vorn“).
- **Frühere Berichte:** erst nach Abschluss der eigenen Findings gelesen (`reviews/code-qualitaet-r3.md`, `reviews/umsetzung-r3.md`), um offene Punkte zuzuordnen.

## Nicht geprüft (mit Grund)

- **Echtes iPhone, WebKit:** Kein Gerät. Die Browser-Prüfungen liefen nur in Chromium (`BROWSER` nicht gesetzt).
- **Teilen-Menü und „Ersetzen“ in der Dateien-App:** lässt sich ohne iPhone nicht ausführen. Die Folgen in M2 sind aus Code und Dateinamen abgeleitet.
- **FIT-Inhalt:** nicht gegen das FIT-SDK dekodiert, kein Upload. Der Encoder hat sich seit 1.0.1 nicht geändert.
- **CSS, Layout, Kontraste:** gehören zur UX-Rolle. Nicht geprüft.
- **Speicher voll (Quota):** nicht im Browser erzeugt.

## Findings

### Kritisch

Keine.

### Hoch

Keine.

### Mittel

#### M1: Wechsel der Trainingsdatei aus einem veralteten Fenster löscht die bisherige samt ungesicherter Änderungen

- **Fundstelle:** `training/src/storage.js:163-173` (`saveImported` mit `force = true` als Standard, löscht `dropFileId` in derselben Transaktion), `training/src/app.js:514-540` (`withBackupFirst` prüft den Sicherungsstand aus dem eigenen, möglicherweise veralteten `S.file`/`S.lastExport`; `switchToFile` ruft `saveImported` ohne `force: false`), `app.js:575-578` („Plan erneut starten“).
- **Beschreibung:** Der `stamp`-Schutz in `storage.js` soll verhindern, dass ein veraltetes Fenster neuere Daten überschreibt. Für Importe ist er seit 1.x bewusst abgeschaltet (`force`). In 1.x blieb die bisherige Datei dabei im Browser. Ab 2.0 entfernt derselbe Schreibvorgang die bisherige Trainingsdatei aus dem Browser. Ein veraltetes Fenster sieht seinen alten Stand als gesichert, zeigt kein „Erst sichern“ und löscht die Datei, obwohl ein anderes Fenster inzwischen Neues gespeichert hat.
  Nachgestellt (Chromium, zwei Seiten im selben Kontext, `/tmp/review-code/scripts/stale-switch.mjs`): Fenster A und B öffnen dieselbe, eben eingelesene Trainingsdatei (Revision 30). A löscht ein Training (Revision 31, nicht gesichert, im Browser gespeichert). B tippt „Plan erneut starten“: kein „Erst sichern“, danach liegt im Browser nur noch die neue Datei mit Revision 0. Die Änderung aus A ist weg. Mit einem in A beendeten, noch nicht exportierten Training geht genauso das Training verloren.
- **Auswirkung:** Stiller Verlust aller Änderungen seit der letzten Sicherung, die ein anderes Fenster gemacht hat. Betroffen sind „Plan erneut starten“, „Nachfolger“, „Ganz neu“ und das Öffnen einer anderen `.training.json`. Der Auslöser ist selten (zwei offene Instanzen, eine davon veraltet).
- **Empfehlung:** Für den Wechsel `force: false` verwenden und eine `StaleError` wie sonst mit „Neu laden“ melden. Mindestens den Teil mit `dropFileId` nur ausführen, wenn der `stamp` noch stimmt, oder in der Transaktion prüfen, ob die zu löschende Datei noch die Revision hat, die das Fenster kennt. Die Speicherprüfung in `e2e/speichern.e2e.mjs` um diesen Fall ergänzen.
- **Sicherheit der Einschätzung:** Hoch für den Ablauf (im Browser nachgestellt). Bei der Häufigkeit auf dem iPhone ist die Einschätzung mittel.

#### M2: Dateinamen sind nicht eindeutig: „Ersetzen“ kann die Sicherung einer anderen Trainingsdatei überschreiben

- **Fundstelle:** `training/src/model/training-file.js:176-192` (`trainingFileName`, `fileNameOf`: Name nur aus Planname und Tag von `createdAt`, ohne `createdAt` nur Planname), `training/src/app.js:1443-1473` (`otherFilesSheet`: ältere Datei aus dem Browser sichern), `app.js:1074` (Hinweis „bei Rückfrage ‚Ersetzen‘“).
- **Beschreibung:** Per Skript (`/tmp/review-code/scripts/check1.mjs`) bestätigt:
  1. Zwei Dateien aus 1.x haben keinen `createdAt` und heißen beide `<planname>.training.json`, wenn sie denselben Plan haben. Das ist genau die Lage nach „Ganz neu“ mit derselben `plan.json` in 1.x. Beim ersten Start von 2.0 bietet die App die ältere, ungesicherte Datei zum Sichern an, unter demselben Namen wie die Sicherung der aktiven Datei.
  2. Vorgänger und Nachfolger, die am selben Tag angelegt werden, heißen ebenfalls gleich (`…-2026-11-23.training.json` zweimal), z. B. bei „Ganz neu“ und danach „Nachfolger“ oder zweimal „Plan erneut starten“ am selben Tag.
  Die App sagt bei jeder Sicherung „bei Rückfrage ‚Ersetzen‘ wählen“. Wer das tut, überschreibt die Sicherung der anderen Datei in Dateien.
- **Auswirkung:** Fall 1: Die Sicherung der aktiven Datei wird durch die ältere ersetzt. Die App zeigt für die aktive Datei weiter „gesichert“, weil `lastExport` pro `fileId` gespeichert ist. Gehen danach die Browserdaten verloren, fehlen alle Trainings seit der letzten echten Sicherung. Fall 2: Die Sicherung des Vorgängers wird überschrieben, nachdem er den Browser schon verlassen hat. Damit ist er weg, und `previous.fileName` verweist auf eine Datei mit anderem Inhalt. Beide Fälle sind selten, Fall 1 trifft aber genau die Umsteiger von 1.x.
- **Empfehlung:** Dateinamen eindeutig machen, z. B. mit einem kurzen Teil der `fileId` (`<planname>-<JJJJ-MM-TT>-<4 Zeichen>.training.json`) oder mit Uhrzeit bei Kollision. Für Dateien ohne `createdAt` im Sichern-Angebot beim Start einen abweichenden Namen verwenden und dort ausdrücklich „nicht ersetzen“ sagen. Ein Test, dass Vorgänger und Nachfolger nie denselben Dateinamen haben.
- **Sicherheit der Einschätzung:** Hoch für die Namensgleichheit (Skript). Das Verhalten des Teilen-Menüs ist aus der bestehenden Anleitung abgeleitet und nicht auf dem iPhone geprüft.

#### M3: Öffnen einer Trainingsdatei, die als ältere Datei im Browser liegt, überschreibt diese ohne Abgleich

- **Fundstelle:** `training/src/model/import.js:282-297` (`previewImport` vergleicht nur mit der aktiven Datei: andere `fileId` heißt `switch`), `training/src/app.js:503-506` (`exportRec`: die eingelesene Datei gilt als gesichert), `training/src/storage.js:165` (`put` ohne Blick auf einen vorhandenen Eintrag mit derselben `fileId`).
- **Beschreibung:** Bleibt eine ungesicherte ältere Trainingsdatei aus 1.x im Browser („Später“ beim Start), und öffnet man über „Plan öffnen“ eine ältere Sicherung genau dieser Datei, dann erkennt die Vorschau einen „Wechsel“ statt eines Abgleichs. Beim Übernehmen ersetzt die Sicherung den neueren Stand im Browser. Der Stand gilt danach als gesichert, also bietet die App die verlorenen Trainings auch nicht mehr an. Der Ablauf ist nur aus dem Code nachvollzogen.
- **Auswirkung:** Stiller Verlust der Trainings, die nur im Browser standen. Das ist selten: Es braucht eine liegengelassene ungesicherte ältere Datei und das Öffnen ihrer älteren Sicherung.
- **Empfehlung:** In `confirmImport` bzw. in der Vorschau auch die übrigen Dateien im Browser berücksichtigen (`listOtherFiles`). Bei gleicher `fileId` wie beim aktiven Stand zusammenführen (`mergeTrainingFiles`) und das in der Vorschau sagen. Dazu ein Unit-Test für die Vorschau und ein e2e-Schritt in `durchgang.e2e.mjs`.
- **Sicherheit der Einschätzung:** Hoch für den Ablauf im Code, nicht im Browser nachgestellt.

#### M4: Neue Wechsel- und Aufräumlogik liegt ungetestet in `app.js`, teils an der Speicher-Warteschlange vorbei

- **Fundstelle:** `training/src/app.js:485-540` (`confirmImport`, `withBackupFirst`, `switchToFile`), `:570-580` (`askRestartPlan`), `:1421-1481` (`cleanUpOtherFiles`, `otherFilesSheet`). `app.js` hat jetzt 1526 Zeilen (1.0.1: rund 1250).
- **Beschreibung:** Mit 2.0 hängen die Abläufe mit dem größten Schadenspotenzial in `app.js` an DOM, IndexedDB und dem globalen `S`:
  - **Entscheidungen:** wann „Erst sichern“ nötig ist, welche ältere Datei still gelöscht und welche angeboten wird, wann eine eingelesene Datei als gesichert gilt. Dafür gibt es nur e2e-Prüfungen, keine Unit-Tests, und die e2e-Prüfungen laufen nicht in CI.
  - **Warteschlange:** `switchToFile` wartet auf `saveChain` und schreibt dann direkt mit `store.saveImported`. Was in dieser Zeit noch in die Warteschlange kommt, kann danach den alten Stand zurückschreiben, auch `activeFileId` (`saveFile`). Die Antwort auf R3 M3 (`reviews/umsetzung-r3.md`: „Alle Schreibzugriffe laufen über die Warteschlange“) stimmt dafür nicht mehr.
  - **Prüfung vor dem Speichern:** „Plan erneut starten“ speichert den Nachfolger ohne `checkReimport`. `confirmImport` prüft das vorher. Ein Nachfolger mit mehr als `LIMITS.maxCarryOver` (500) Startwerten würde gespeichert, ließe sich aber nicht exportieren. Beim nächsten Start wäre er „beschädigt“, und der Vorgänger ist dann schon aus dem Browser entfernt. Der Plan erlaubt bis zu 14 × 30 × 2 = 840 verschiedene Übungen. Praktisch ist das kaum erreichbar, zeigt aber die Lücke.
- **Auswirkung:** Fehler wie M1 und M3 fallen in den Tests nicht auf. Die Reihenfolge der Schreibzugriffe ist schwer zu überblicken.
- **Empfehlung:** Die Entscheidungen als reine Funktionen in ein Modul ziehen (z. B. `model/switch.js`: `needsBackupFirst(file, lastExport, next)`, `classifyOtherFiles(others)`) und mit Unit-Tests abdecken. `switchToFile` über `queueSave` schreiben. `checkReimport` in `switchToFile` aufrufen, damit jeder Wechsel geprüft wird. Konkrete Testfälle siehe Abschnitt „Testlücken“.
- **Sicherheit der Einschätzung:** Hoch für die Lücke. Wie viel der Umbau nützt, ist eine Abwägung.

### Niedrig

#### N1: Mehrere Pläne in einer Auswahl: Nachfolger verweist auf eine nie gespeicherte Zwischendatei

- **Fundstelle:** `training/src/model/import.js:320-348` (`applyImports`), `:282-311` (`previewImport` ändert `active` nach einem Plan nicht).
- **Beschreibung:** Per Skript: Bei zwei Plänen in einer Auswahl mit zweimal „Nachfolger“ zeigt `previous` der Ergebnisdatei auf die Zwischendatei. Die wurde nie gespeichert oder exportiert. Die Vorschau rechnet beim zweiten Plan weiter mit dem Stand vor dem ersten (wie R3 N5). Damals hieß die Begründung für „später“: „kein Datenverlust, der alte Stand bleibt im Browser“. Ab 2.0 verlässt der alte Stand den Browser, nach „Erst sichern“ allerdings gesichert.
- **Empfehlung:** Mehrere Pläne in einer Auswahl ablehnen oder nur den letzten anwenden. Alternativ in der Vorschau den Stand nach jeder Wahl fortschreiben.
- **Sicherheit der Einschätzung:** Hoch.

#### N2: RIR im Fokus: Hauptübung ohne Pause in der Mitte wird nicht gefragt, am Ende nur die zuletzt beendete

- **Fundstelle:** `training/src/views/live.js:156-165` (`lastRirItem`), `:398-407` (`focusBody`), `training/src/model/live.js:189-191` (ohne `restSec` keine neue Pause).
- **Beschreibung:** Im Fokus erscheint die RIR-Frage nur in der Pausenleiste oder nach dem letzten Satz des ganzen Trainings. Eine Hauptübung mit `restSec: 0` mitten in der Einheit bekommt deshalb keine Frage. Am Ende erscheint nur die zuletzt beendete Hauptübung, die womöglich schon in der Leiste gefragt wurde. In der Liste steht die Frage dagegen in jeder Karte. Das passt zu „Nicht antippen heißt keine Angabe“, verhält sich aber in den beiden Ansichten unterschiedlich.
- **Empfehlung:** Im Fokus nach dem letzten Satz einer Hauptübung ohne folgende Pause die Frage einmal zeigen. Alternativ das Verhalten in der Spezifikation festhalten.
- **Sicherheit der Einschätzung:** Mittel (aus dem Code, nicht im Browser nachgestellt).

#### N3: Namen und Einheiten im Verlauf teils aus dem aktuellen Plan statt aus dem Training

- **Fundstelle:** `training/src/views/history.js:57-66` (`exerciseLabel`: zuerst der Plan, dann der Name aus dem Training), `training/src/model/coach-export.js:122-124` (Einheit und `/S` nur aus dem aktuellen Plan).
- **Beschreibung:** Die Spezifikation (5, Verlauf ab 2.0) sagt: „Namen von Übung und Variante kommen aus dem Training, sonst aus dem Plan.“ Die Detailansicht hält sich daran (`blockExercise`). Die Auswahl und Beschriftung des Graphen nehmen den Plannamen zuerst. Nach „Anpassen“ mit umbenannter Übung stehen dann im Graphen und in der Detailansicht verschiedene Namen. Im Coach-Export fehlen `/S` und `BW` für Übungen, die nicht mehr im Plan sind.
- **Empfehlung:** In `exerciseLabel` den zuletzt gespeicherten Namen zuerst nehmen, so wie in `nameIndex.blockExercise`. Für `/S` und `BW` reicht das Verhalten, solange die Übung im Plan steht. Den Rest als bekannte Grenze dokumentieren.
- **Sicherheit der Einschätzung:** Hoch.

#### N4: Coach-Export kennzeichnet Deload nur über das Feld `deload`

- **Fundstelle:** `training/src/model/coach-export.js:106` gegenüber `training/src/model/progression.js:17-21` (`isDeloadSession`).
- **Beschreibung:** Ältere Trainings ohne `cycle` und `deload` gelten in der Progression als Deload, wenn ihre Woche im Plan eine Deload-Woche ist. Der Coach-Export kennzeichnet sie nicht als Deload.
- **Empfehlung:** `isDeloadSession(file.plan, s)` verwenden und dazu einen Test mit einer Session ohne `cycle`.
- **Sicherheit der Einschätzung:** Hoch.

#### N5: Veraltete Kommentare und Doku, undeklarierter Zustand

- **Fundstelle:**
  - `training/src/agent-prompt.js:2`: Verweis auf `tests/agent-prompt.test.js`, die Datei gibt es nicht. Die Tests stehen in `tests/import-prompt.test.js` und `tests/rund-ums-training.test.js`. Schon R3 N4, damals als „später“ markiert.
  - `training/src/app.js:48`: Der Kommentar zu `screen` nennt `info` und `arch` nicht. `S.loadProblem` (`:1359`, `:1366`) ist nicht in `S` deklariert (R3 N4).
  - `training/src/storage.js:161`: „force: … ausdrückliche Übernahme eines Imports“. Tatsächlich gilt `force` auch für „Plan erneut starten“ und löscht dabei (siehe M1).
  - `docs/stand.md:115` (Abschnitt „Selbst getroffene Entscheidungen“): „Wechsel auf einen anderen Trainingsstand … behält den bisherigen im Browserspeicher“. Das widerspricht 2.0.
  - `docs/spezifikation.md:211`: Die UI-Texte „Alle Sessions gesichert“ und „1 Session noch nicht gesichert“ widersprechen `docs/begriffe.md` („Session“ in UI und Doku → „Training“). Die App sagt richtig „Training“. Auch die Abschnitte 2 und 5 nutzen noch „Session“ für Trainings.
  - `CHANGELOG.md`: 2.0.0 steht noch als „in Arbeit“. Das ist laut `docs/stand.md` bekannt und vor dem Merge zu entfernen.
- **Empfehlung:** Die Punkte korrigieren. In der Spezifikation „Session“ in Fließtext und UI-Zitaten durch „Training“ ersetzen. Bei Feldnamen bleibt `sessions`.
- **Sicherheit der Einschätzung:** Hoch.

#### N6: Doppelte Hilfsfunktionen

- **Fundstelle:** `rirText` und `rirTargetText` in `training/src/views/live.js:115-117` und noch einmal in `training/src/views/history.js:68-69`. Die Umwandlung der RIR-Spanne dreimal verschieden: `views/live.js:117` ersetzt jeden Bindestrich, `model/coach-export.js:25` und `agent-prompt.js:222` nur zwischen Ziffern. `localDay` in `model/training-file.js:166-170` wiederholt `localDate` aus `model/live.js:22-25`. `MAX_SETS` und `MAX_NOTE` in `model/live.js:13-14` wiederholen `LIMITS` (R3 N3).
- **Auswirkung:** RIR-Ziele wie „3-4 (leicht)“ oder „Woche-7“ sehen im Training, im Verlauf und im Coach-Export unterschiedlich aus. Sonst Wartungsaufwand.
- **Empfehlung:** Eine gemeinsame Formatierung, z. B. in `format.js`: `fmtRir`, `fmtRirTarget`, `localDate`. `live.js` nimmt `LIMITS`.
- **Sicherheit der Einschätzung:** Hoch.

#### N7: Beschädigte ältere Trainingsdateien bleiben dauerhaft und unangekündigt im Browser

- **Fundstelle:** `training/src/app.js:1430-1436` (`cleanUpOtherFiles`: Bei einem Validierungsfehler wird die Datei übersprungen).
- **Beschreibung:** Spezifikation 2 sagt: „Dort liegt nur die aktive Trainingsdatei.“ Eine ältere Datei, die der Validator ablehnt, wird weder entfernt noch angeboten. Doppelte Session-IDs (`dropDuplicateSessions`) werden dort, anders als bei der aktiven Datei, nicht repariert.
- **Empfehlung:** Vor der Prüfung `dropDuplicateSessions` anwenden. Was dann noch scheitert, im Sheet als „nicht lesbar“ zeigen, mit „Roh sichern“ (JSON wie gespeichert) und „Verwerfen“.
- **Sicherheit der Einschätzung:** Hoch (aus dem Code).

## Testlücken mit konkreten Testfällen

Die Fachlogik für 2.0 ist gut abgedeckt (`schema2`, `coach-export`, `cycle`, `rund-ums-training`, dazu e2e `rir`, `durchgang`, `archiv`). Es fehlen:

1. **Zwei Fenster und Wechsel (M1):** e2e: Fenster A löscht ein Training, das veraltete Fenster B tippt „Plan erneut starten“. Erwartet: Meldung „in einem anderen Fenster geändert“, die Datei bleibt.
2. **Öffnen einer älteren Datei mit derselben `fileId` (M3):** Unit-Test für Vorschau und Anwenden, wenn die eingelesene Datei die `fileId` einer nicht aktiven Datei im Browser hat.
3. **Dateinamen (M2):** Unit-Test: Nachfolger, der am selben Tag angelegt wird, hat einen anderen Dateinamen als der Vorgänger. Zwei Dateien ohne `createdAt` mit gleichem Plan dürfen beim Sichern nicht gleich heißen.
4. **Prüfung vor dem Speichern (M4):** Unit-Test: Jede Nachfolger-Datei aus `createSuccessorFile` besteht `validateTrainingFile`, auch mit 500 und mehr Übungen. Ein Test, dass `askRestartPlan` bzw. `switchToFile` `checkReimport` durchläuft.
5. **Entscheidungen beim Aufräumen:** Unit-Tests für eine ausgelagerte Funktion: gesichert → löschen, ungesichert → anbieten, beschädigt → anbieten bzw. reparieren (N7), Revision 0 ohne Trainings → löschen.
6. **Coach-Export mit älteren Trainings (N4):** Session ohne `cycle` in einer Deload-Woche erscheint mit „Deload“.
7. **RIR im Fokus (N2):** Hauptübung mit `restSec: 0` mitten in der Einheit, danach weitere Übungen. Festlegen und prüfen, ob und wo die Frage erscheint.
8. **Testplan ohne `main`:** `tests/fixtures/beispielplan.plan.json` hat keine Hauptübung. RIR wird deshalb nur mit eigens gebauten Plänen geprüft (`rir.e2e.mjs`, `schema2.test.js`). Das ist in Ordnung, solange die Fixture nicht als Vorlage für den Agent-Prompt dient. Optional: im Testplan `back-squat` als Hauptübung markieren, damit `training.e2e.mjs` den RIR-Ablauf mit abdeckt.

## Zusammenfassung

| Schwere | Anzahl |
|---|---|
| Kritisch | 0 |
| Hoch | 0 |
| Mittel | 4 (M1 bis M4) |
| Niedrig | 7 (N1 bis N7) |

Das Datenmodell für 2.0 ist sauber umgesetzt und gut getestet. Der Validator liest 1.x und schreibt 2. Startwerte gehen in Vorbelegung und Steigerung ein, erscheinen aber nicht im Verlauf und nicht im Coach-Export. Die RIR-Regeln sind im Modell durchgehend: nur nach dem letzten Satz, Rückgängig und „Satz hinzufügen“ entfernen den Wert, er übersteht einen Neustart. Coach-Export und Agent-Prompt entschärfen Backticks und Zeilenumbrüche. Unit-Tests und Browser-Prüfungen sind grün.

Die Schwächen liegen fast alle im neuen Wechsel der aktiven Trainingsdatei. Das Löschen aus dem Browser ist jetzt Teil des Wechsels. Dadurch werden drei seltene Randfälle zu stillem Datenverlust: ein veraltetes Fenster (M1), gleiche Dateinamen beim „Ersetzen“ (M2) und eine ältere Datei mit derselben `fileId` (M3). Dazu kommt, dass genau diese Logik ohne Unit-Tests in `app.js` liegt (M4).
