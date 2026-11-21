# Review: Code-Qualität, Gesamtprojekt (Runde 3)

Ich habe `develop` auf Commit `62ce59a` nur lesend geprüft: `training/` (App, Modell, Ansichten, Garmin, Service Worker), `scripts/update-sw.mjs`, `tests/`, `.github/workflows/pages.yml`, dazu `CLAUDE.md`, `docs/spezifikation.md` und die Testfixture. `npm test` lief mit 136/136 grün. Darin steckt auch die Prüfung, ob `training/sw.js` aktuell ist. Die App habe ich lokal ausgeliefert (`python3 -m http.server 8774`) und mit Playwright (Chromium) geprüft. Kleine Node-Skripte gegen die Modell-Module lagen außerhalb des Repos. Im Repo habe ich nur diese Berichtsdatei angelegt. Frühere Berichte habe ich erst gelesen, nachdem meine eigenen Findings feststanden.

## Geprüfte Punkte

| Bereich | Wie geprüft | Ergebnis |
|---|---|---|
| Laufendes Training: Autosave, Wiederherstellen, Abschluss (`app.js:165-185, 896-920, 1137-1140, 1144-1202`, `model/live.js:30-71`, `storage.js`) | Code gelesen. Reihenfolge der IndexedDB-Transaktionen nachvollzogen. Im Browser nachgestellt (Playwright, siehe H1). | Normalfall korrekt. Ein Wettlauf beim Beenden und eine fehlende Prüfung in `restoreLive` führen aber zu einem unlesbaren Stand, siehe **H1**. |
| Live-Zustand (`model/live.js`: `toggleSet`, `slotOrder`, „Später“, Halten, Pause, `finishLive`) | Code. Fälle: Superset, übersprungen, zurückgestellt, letzter Satz, Rückgängig, Halten-Ende im Hintergrund | Korrekt. `dropRestIfDone` gilt jetzt für Abhaken, Überspringen und Satz entfernen (M1 aus der Testfahrt ist behoben). Kleinigkeit zum Beenden-Dialog siehe N1. |
| Wochenlogik (`model/weeks.js`) | Code gegen Spezifikation 2: Durchgang, `repeatFrom`, Hälfte der Sätze (Nenner mit übersprungenen), nur vorwärts, „completed“ | Spezifikationsgemäß. Die Anzeige im Beenden-Dialog passt nicht zur Zählregel, siehe N1. |
| Progression, Deload, Vorbelegung (`model/progression.js`, `model/plan.js`) | Code gegen Spezifikation 3. Für die Testfixture alle Übungen und Wochen mit `resolvePrescription` aufgelöst und mit der Tabelle in Spezifikation 4 verglichen. | Spezifikationsgemäß. Keine Steigerung, wenn `repsMax` steigt (z. B. RDL W1→W2), Steigerung in W4 nach erreichten 8 Wdh. in W3. Haltezeit wird nach geänderter Vorgabe neu gesetzt. Deload: ein Satz weniger, 80 % auf 0,5 kg gerundet. Fixture entspricht der Tabelle. |
| Import und Abgleich (`model/import.js`, `model/training-file.js`, `app.js:355-475`) | Code. Merge-Fälle (höhere Revision, Gleichstand, Grabsteine, Ergänzen) durchgespielt. Mehrere Pläne in einer Auswahl per Node-Skript. | Abgleich spezifikationsgemäß, nichts wird halb gespeichert (`checkReimport` und eine Transaktion). Vorschau bei zwei Plänen in einer Auswahl ist falsch, siehe N5. |
| Validator (`model/validate.js`) | Code vollständig gelesen. Grenzwerte, verbotene Schlüssel, Tiefe, Pflichtfelder pro Woche. Gegen `SCHEMA_TEXT` und `EXAMPLE_PLAN` des Agent-Prompts verglichen und mit präparierten Plänen geprüft. | Validator in sich stimmig. Agent-Prompt weicht ab, siehe **M1**. Fehlplatzierter Kommentar siehe N4. |
| Agent-Prompt (`agent-prompt.js`) | Code. Ergebnisse (`resultLines`), Maskierung der Backticks, ID-Regeln gegen Spezifikation 5 | Inhaltlich wie gefordert. Schema-Text nicht „identisch mit dem Validator“, siehe M1. Doppelte Regel siehe N3. |
| Backup-Status und Verlauf (`model/backup.js`, `views/history.js`, `app.js:572-586, 1194-1201`) | Code. Fall „Training korrigiert nach dem letzten Export“ per Node-Skript | Korrekturen und Löschungen werden im Verlauf nicht als ungesichert markiert, der Start-Hinweis nennt dann die falsche Ursache, siehe **M2**. |
| Korrigieren und Löschen im Verlauf (`model/history.js:147-195`, `app.js:613-678`) | Code | Korrekt: gleiche Werte erzeugen keine Revision, Grabstein wird gesetzt, Woche bleibt. |
| Export JSON und CSV (`export.js`, `model/csv.js`) | Code | Korrekt. Abbruch im Teilen-Menü zählt nicht. CSV schützt vor Formel-Injektion, Dezimalkomma, BOM. |
| FIT-Export (`garmin/fit.js`, `garmin/session-fit.js`) | Code: Header, CRC, Wertebereiche (Gewicht × 16, uint16/uint32), Zeitachse mit und ohne `doneAt`, Begrenzung auf 15 Min vor/nach den Sätzen | Korrekt, Bereichsfehler werden als `RangeError` abgefangen. Abweichung der Kategorien zwischen Prompt und Validator siehe M1. |
| Service Worker und `update-sw.mjs` | Code. Precache-Liste, Hashes, Navigation, fremde Origins, Update-Ablauf | Stimmig. Test prüft die Aktualität. |
| Workflow `pages.yml` | Gelesen | Minimale Rechte, gepinnte SHAs, nur App ausgeliefert. Browser-Prüfungen laufen dort nicht, siehe M3. |
| Wake Lock, Ton (`wakelock.js`, `sound.js`) | Code | Ton: Fehler bleiben still, Freischalten nur im Tap. Wake Lock: Wettlauf siehe N2. |
| Tote und doppelte Stellen | Alle Exporte gegen ihre Verwendung gezählt (Skript). Konstanten und Formatierer verglichen. | Kein toter Export. Doppelte Grenzwerte und Formatierer siehe N3. |
| Repo-Regeln (CLAUDE.md) | `innerHTML`, `insertAdjacentHTML`, `eval`, `new Function`, externe URLs gesucht. `npm test`. | Nichts davon im App-Code (nur `h()`/`textContent`). `sw.js` aktuell. Einziger externer Link ist der Verweis auf die GitHub-Datenschutzerklärung (`views/info.js:6`), kein Request. |
| Tests | Alle Testdateien überflogen, wichtige Funktionen den Tests zugeordnet | Modell gut abgedeckt (136 Tests). Lücke bei der Ablauflogik in `app.js`, siehe M3. |

## Nicht geprüft (mit Grund)

- **Echtes iPhone/Safari:** Kein Gerät. Der Wettlauf in H1 ist in Chromium nachgestellt. Wie schnell iOS beim Wechsel in eine andere App `visibilitychange` feuert, konnte ich nicht messen.
- **Speicher voll (Quota):** Nicht im Browser erzeugt. Der zweite Auslöser in H1 ist nur aus dem Code nachvollzogen.
- **e2e-Suite (`npm run e2e`):** Nicht vollständig ausgeführt. Ich habe eigene, gezielte Playwright-Skripte genutzt.
- **Garmin Connect:** Kein Upload. Den FIT-Inhalt habe ich nur im Code geprüft, nicht gegen das FIT-SDK dekodiert.
- **CSS und Optik:** Gehört zur UX-Rolle. Nur nebenbei angesehen.

## Findings

### Kritisch

Keine.

### Hoch

#### H1: Beendetes Training kann als „laufend“ zurückkommen, zweites Beenden macht den ganzen Stand unlesbar

- **Fundstelle:** `training/src/app.js:905-916` (`finishLiveNow`: `await saveChain`, dann `store.saveFinished` an der Warteschlange vorbei, `S.live = null` erst danach), `app.js:1137-1138` (`visibilitychange` → `store.saveLive(S.live)` direkt), `app.js:1132` (Pausenende → `setLive` → `queueSave`), `training/src/model/live.js:30-37` (`restoreLive` prüft nicht, ob die Session-ID schon in der Historie steht), `app.js:900` (Abschluss hängt die Session ohne Prüfung auf doppelte ID an), `training/src/model/validate.js:537` (doppelte Session-ID ist ein Fehler), `app.js:1152-1161` (Start verwirft dann den ganzen Stand).
- **Beschreibung:** `saveFinished` speichert die Datei und löscht `live` in einer Transaktion. `S.live` bleibt aber gesetzt, bis diese Transaktion fertig ist. Wird in diesem Fenster `live` erneut geschrieben, legt die spätere Transaktion das gerade beendete Training wieder als laufend ab. Das passiert über `visibilitychange` (App wird verlassen) oder über das Pausenende im 250-ms-Takt. Beides läuft nicht über `queueSave`, oder die Kette ist schon leer. Ein zweiter Weg ohne Wettlauf: Schlägt `saveFinished` fehl (Speicher voll, `storageFailed`), bleibt `live` in IndexedDB. Die Session steht aber in `S.file`. Speichert danach irgendein `setFile` erfolgreich (Stil ändern, Woche setzen, Training löschen), liegen Datei und laufendes Training mit derselben ID im Speicher.
  Beim nächsten Start nimmt `restoreLive` den Stand an und zeigt das Training als laufend. Wer es (verständlicherweise) noch einmal beendet, erzeugt eine zweite Session mit derselben ID. Beim nächsten Start lehnt `validateTrainingFile` die Datei ab („ist doppelt“), die App zeigt „Der gespeicherte Trainingsstand ist beschädigt“ und startet im Onboarding.
  **Nachgestellt (Playwright, Chromium, Testfixture):** Training starten, einen Satz abhaken, „Beenden und speichern“, 0 bis 3 ms danach `visibilitychange` mit `hidden`. In allen Läufen mit 0, 1 und 3 ms stand danach `live` mit der ID der eben gespeicherten Session in IndexedDB. Nach dem Neuladen lief das Training wieder. Nach erneutem Beenden enthielt die Datei die ID zweimal. Nach dem nächsten Neuladen kam der Toast „beschädigt“, und der Bildschirm „Hast du schon einen Plan?“ erschien. Ab 5 ms trat der Fehler nicht mehr auf.
- **Auswirkung:** Alle Trainings seit dem letzten Datei-Export sind für die App weg. Die Daten liegen zwar noch in IndexedDB, die App lädt sie aber nicht und bietet keinen Export an. Der empfohlene Weg (letzte `.training.json` einlesen) überschreibt sie dann. Der Auslöser ist selten: ein Zeitfenster von wenigen Millisekunden oder ein vorheriger Speicherfehler. Die Folge ist aber der schwerste Datenverlust, den die App kennt.
- **Empfehlung:**
  1. `restoreLive`: `null` liefern, wenn `file.sessions.some((s) => s.id === stored.session.id)`. Dazu ein Unit-Test.
  2. `finishLiveNow`: vor dem Anhängen prüfen, ob die ID schon in der Historie steht. Wenn ja, ersetzen statt anhängen.
  3. Alle Schreibzugriffe über `queueSave` führen (auch `saveFinished`, `saveImported`, `clearLive` im Notfall-Bildschirm, `saveLive` bei `visibilitychange`). `S.live` vor dem Speichern auf `null` setzen bzw. in `saveLive` prüfen, ob `S.live` noch dasselbe Objekt ist.
  4. Optional: Beim Start doppelte Session-IDs reparieren (eine behalten, Hinweis zeigen), statt den ganzen Stand zu verwerfen. Ein einzelner Fehler sollte nicht alles unzugänglich machen.
- **Sicherheit der Einschätzung:** Hoch für den Ablauf (im Browser nachgestellt). Mittel für die Häufigkeit auf dem iPhone.

### Mittel

#### M1: Agent-Prompt und Validator laufen auseinander

- **Fundstelle:** `training/src/agent-prompt.js:104` (Varianten: „Liste { id, name, cue? }“), `:105` („Erlaubt sind nur diese“ Kategorien 0–31), `:94` (ID-Regeln), dazu `training/src/model/validate.js:347` (Varianten-ID nur `^[a-z0-9][a-z0-9-]{0,63}$`), `:338-339` (`garminCategory` 0–65534), `:307` (gleiche Übungs-ID in einer Einheit verboten), `:14-21` (Textlängen, Anzahl Varianten, Warm-up-Zeilen).
- **Beschreibung:** Die Spezifikation verlangt im Prompt „das vollständige Plan-Schema … identisch mit dem Validator“ und sagt: „App, Validator, Seed-Plan und Agent-Prompt dürfen nicht auseinanderlaufen“. Geprüft:
  - Eine Variante mit `id: "A"` (der Prompt nennt kein Format) lehnt der Validator ab: `plan.sessions[1].blocks[0].exercises[0].variants[0].id: nur Kleinbuchstaben, Ziffern und -`.
  - `garminCategory: 999` nimmt der Validator an, obwohl der Prompt nur 0–31 erlaubt. Die FIT-Datei enthält dann eine Kategorie, die Garmin nicht kennt.
  - Dass eine id in einer Einheit nur einmal vorkommen darf, steht nicht im Prompt. Ebenso fehlen die Grenzen für Namen und Hinweise (120 bzw. 500 Zeichen), Warm-up (20 Zeilen), Varianten (10) und `rirTargets` (Text bis 20 Zeichen, nur Wochen 1 bis `weeks`).
  Kein Test vergleicht den Schema-Text mit dem Validator. Geprüft wird nur, dass `EXAMPLE_PLAN` gültig ist.
- **Auswirkung:** KI-Pläne scheitern am Import, obwohl sie sich an den Prompt halten. Das kostet eine Runde mit dem Agenten. Andersherum kommen Werte durch, die der Prompt verbietet. Die Fehlermeldungen sind klar, daher kein Datenverlust.
- **Empfehlung:** Im Schema-Text ergänzen: Format der Varianten-ID, „jede id höchstens einmal pro Einheit“, die Längen- und Anzahlgrenzen aus `LIMITS`. Im Validator `garminCategory` auf die Nummern aus `GARMIN_CATEGORIES` (plus 65534 für „unbekannt“) begrenzen. Dazu ein Test, der für jede Regel im Schema-Text einen Plan baut, der sie verletzt, und die Ablehnung prüft (oder umgekehrt: jede Validator-Grenze kommt im Schema-Text vor).
- **Sicherheit der Einschätzung:** Hoch (per Node-Skript gegen den Validator geprüft).

#### M2: Korrekturen und Löschungen gelten im Verlauf als „gesichert“, Start-Hinweis nennt dann die falsche Ursache

- **Fundstelle:** `training/src/model/backup.js:18-20` (`unsavedSessionIds` nur nach `endedAt > exportedAt`), `training/src/views/history.js:65-67, 72-77` (Hinweis und Tag nur aus `unsavedSessionIds`), `training/src/app.js:1196-1199` (Start-Toast bei `n === 0`).
- **Beschreibung:** Nach dem Export einen Wert eines alten Trainings korrigieren (oder ein Training löschen, die Woche setzen). `backupStatus` liefert dann `unsavedChanges: true`, aber `unsavedSessionIds: []` (per Node-Skript bestätigt). Folgen: Im Verlauf steht kein Hinweis „noch nicht gesichert“, und das korrigierte Training trägt das Tag „gesichert“. Beim nächsten Start lautet der Hinweis „Letzte Sicherung vor 1 Tagen.“ bzw. am selben Tag „vor 0 Tagen.“ statt „Änderungen noch nicht gesichert“. Nur die Karte auf „Heute“ sagt es richtig (`app.js:579`). Die Spezifikation (2, Export) verlangt: „Nicht gesicherte Änderungen (`revision` größer als zuletzt exportiert) werden im Verlauf markiert“.
- **Auswirkung:** Wer nach dem Hinweis im Verlauf schaut, hält eine Korrektur für gesichert und exportiert nicht. Geht dann der Browserspeicher verloren, ist die Korrektur weg. Dazu kommt der sprachlich falsche Hinweis.
- **Empfehlung:** Im Verlauf einen allgemeinen Hinweis zeigen, wenn `unsavedChanges` gilt, auch ohne neue Sessions („Änderungen noch nicht als Datei gesichert“). Optional pro Session ein `editedAt` führen oder die IDs geänderter Sessions merken, damit das Tag stimmt. Den Start-Toast nach demselben Schema wie `backupCard` formulieren (ungesicherte Sessions, dann Änderungen, dann Tage), mit Einzahl/Mehrzahl und ohne „vor 0 Tagen“. Dazu ein Test für `backupStatus` mit Korrektur nach Export.
- **Sicherheit der Einschätzung:** Hoch.

#### M3: Ablauf- und Speicherlogik in `app.js` ist nicht automatisch getestet

- **Fundstelle:** `training/src/app.js` (1247 Zeilen): `finishLiveNow` (`:896-920`), `confirmImport` (`:443-475`), `boot` (`:1144-1202`), `queueSave`/`setLive`/`setFile` (`:165-185`), Timer (`:1117-1135`). `.github/workflows/pages.yml:25-26` führt nur `node --test` aus.
- **Beschreibung:** Das Modell ist rein und gut getestet. Die Teile mit dem größten Schadenspotenzial liegen aber in `app.js`: Reihenfolge der Speicherzugriffe, Wiederherstellen beim Start, Fortschritt nach dem Abschluss, Exportstand nach dem Import. Sie hängen an DOM, IndexedDB und dem globalen Zustand `S` und haben keine Unit-Tests. Die e2e-Prüfungen sind optional und laufen nicht in CI. H1 wäre mit einem Test „`restoreLive` lehnt eine schon beendete Session ab“ oder „Abschluss ist idempotent“ früh aufgefallen. Dazu kommt: Speicherzugriffe laufen teils über `queueSave`, teils direkt (`app.js:465, 906, 1025, 1138, 1244`). Die Reihenfolge ist deshalb schwer zu überblicken.
- **Auswirkung:** Regressionen in genau den Abläufen, die Daten verlieren können, fallen erst bei der Testfahrt auf.
- **Empfehlung:** Die reinen Teile herausziehen, z. B. `model/flow.js` mit `finishSession(file, live, now)` (Session anhängen bzw. ersetzen, Fortschritt ableiten, Revision) und `restoreState(stored)` (Datei und Live-Stand prüfen, Problemtext). Beides mit Unit-Tests abdecken. In `app.js` nur noch eine Schreibfunktion für IndexedDB, die immer über die Warteschlange läuft. Optional einen kleinen Playwright-Lauf in CI, wenn sich der Workflow dafür lockern lässt.
- **Sicherheit der Einschätzung:** Hoch für die Lücke. Beim Nutzen des Umbaus ist es eine Abwägung.

### Niedrig

#### N1: Beenden-Dialog zählt anders als die Wochenregel

- **Fundstelle:** `training/src/app.js:884-890` (`progress()` ohne übersprungene Übungen, `countsAsUnitDone()` mit), `training/src/model/live.js:164-167`, `training/src/model/weeks.js:17-25`.
- **Beschreibung:** Einheit E1, alle Übungen außer den ersten beiden übersprungen, diese komplett erledigt. Dann zeigt der Dialog „6 von 6 Sätzen erledigt.“ und direkt darunter „Weniger als die Hälfte der Sätze erledigt: … die Einheit bleibt in dieser Woche aber offen.“ (per Node-Skript: `progress = 6/6`, `countsAsUnitDone = false`). Die Regel selbst ist spezifikationsgemäß (Nenner mit übersprungenen Übungen), nur die beiden Zahlen widersprechen sich.
- **Empfehlung:** Im Hinweis die Zahl nennen, nach der gezählt wird, z. B. „6 von 21 geplanten Sätzen (inkl. übersprungener Übungen) erledigt: weniger als die Hälfte …“. `doneShare` liefert sie schon.
- **Sicherheit der Einschätzung:** Hoch.

#### N2: Wake Lock kann nach dem Training aktiv bleiben

- **Fundstelle:** `training/src/wakelock.js:6-16, 18-28`.
- **Beschreibung:** `acquire` setzt `sentinel` erst nach dem `await`. Kommt `keepAwake(false)` (Beenden, Verwerfen), während die Anfrage noch läuft, wird der Lock danach trotzdem gespeichert und nie freigegeben. Laufen zwei `acquire` gleichzeitig (z. B. `visibilitychange` und `keepAwake(true)`), gibt es zwei Locks, und einer verwaist.
- **Auswirkung:** Der Bildschirm bleibt nach dem Training an, bis die App in den Hintergrund geht. Kein Datenproblem.
- **Empfehlung:** Nach dem `await` prüfen: `if (!wanted) { lock.release(); return; }`. Eine laufende Anfrage als Promise merken und nicht doppelt starten.
- **Sicherheit der Einschätzung:** Mittel (nur aus dem Code, nicht nachgestellt).

#### N3: Doppelte Grenzwerte, Formatierer und Regeln

- **Fundstelle:**
  - `training/src/model/live.js:11-12, 203, 208-209`: `MAX_SETS = 30`, `MAX_NOTE = 2000`, `1000` kg, `1000` Wdh. und `36000` s als feste Zahlen statt `LIMITS.maxLoggedSets`, `maxNote`, `maxKg`, `maxLoggedReps`, `maxLoggedSec`. `history.js:179-181` nutzt dieselbe Funktion mit `LIMITS`.
  - `training/src/app.js:660, 863`: `maxlength: 2000` fest.
  - `training/src/app.js:10` und `:30`: zwei Importe aus `./format.js`.
  - `training/src/agent-prompt.js:200-203` wiederholt die Progressionsregel aus `model/progression.js:68-75` (mit kleiner Abweichung bei Körpergewicht ohne gespeicherte Vorgabe).
  - Drei Satz-Formatierer: `format.js:23-36` (`fmtSet`, `fmtSetShort`) und `views/history.js:84-89` (`fmtLoggedSet`).
  - Zwei Funktionen `summarize` (`model/training-file.js:114`, `model/live.js:390`) mit verschiedener Bedeutung.
- **Auswirkung:** Ändert sich ein Grenzwert in `LIMITS`, lässt das Training andere Werte zu, als der Import später annimmt. Das kann `checkReimport` beim Export auslösen („nicht wieder einlesbar“). Ansonsten Wartungsaufwand.
- **Empfehlung:** In `live.js` `LIMITS` aus `validate.js` nutzen (`progression.js` importiert es bereits, es gibt keinen Zyklus). `maxlength` aus `LIMITS.maxNote`. Importe zusammenfassen. In `resultLines` die Regel als gemeinsame Hilfsfunktion nutzen (z. B. `allSetsReachedMax(prev, doneSets)`). `live.summarize` in `sessionSummary` umbenennen.
- **Sicherheit der Einschätzung:** Hoch.

#### N4: Veraltete bzw. falsch platzierte Kommentare, undeklarierter Zustand

- **Fundstelle:** `training/src/agent-prompt.js:2` verweist auf `tests/agent-prompt.test.js`, die Datei gibt es nicht (die Tests stehen in `tests/import-csv-prompt.test.js` und `tests/rund-ums-training.test.js`). `training/src/model/validate.js:486-487`: Der JSDoc „Validiert eine komplette .training.json“ steht über `validateSession`, nicht über `validateTrainingFile`. `training/src/app.js:1160, 1173, 1189`: `S.loadProblem` ist nicht in `S` (`:38-58`) deklariert.
- **Empfehlung:** Verweis korrigieren, JSDoc vor `validateTrainingFile` verschieben, `loadProblem: null` mit Kommentar in `S` aufnehmen.
- **Sicherheit der Einschätzung:** Hoch.

#### N5: Vorschau bei mehreren Plänen in einer Auswahl zeigt den Stand vor dem ersten Plan

- **Fundstelle:** `training/src/model/import.js:101-111` (`active` wird nach einem Plan nur gesetzt, wenn vorher keiner da war).
- **Beschreibung:** Zwei Pläne auf einmal öffnen, beim ersten „Ganz neu“ wählen, beim zweiten bleibt „Anpassen“. Die Vorschau des zweiten sagt „Deine 1 Trainings bleiben“. Das Ergebnis von `applyImports` hat 0 Trainings und eine neue `fileId` (per Node-Skript bestätigt). Übrig bleibt ohnehin nur der zweite Plan.
- **Auswirkung:** Selten und ohne Datenverlust (der alte Stand bleibt im Browser), aber die Vorschau stimmt nicht.
- **Empfehlung:** Bei mehr als einem Plan in einer Auswahl abbrechen („bitte nur einen Plan auf einmal“). Oder die Vorschau über `applyImports` mit den aktuellen `choices` bei jeder Änderung neu berechnen.
- **Sicherheit der Einschätzung:** Hoch.

## Hinweise ohne Finding

- `toggleSet` (`model/live.js:180`): Wird ein älterer Satz wieder geöffnet, endet auch eine laufende Pause, die zu einem anderen Satz gehört. Das ist vertretbar, aber nicht kommentiert.
- `serve` im Service Worker (`sw.js:105-115`) reicht bei Hash-Fehler und Cache-Fehlschlag die Netzantwort ungeprüft durch. Das ist bewusst so (sonst gäbe es offline keinen Ausweg), kann aber kurz nach einem Deploy Dateien aus zwei Versionen mischen. Das betrifft nur einen fehlenden Cache-Eintrag.
- `extendRest` ohne laufende Pause setzt `afterItem: null`. Diesen Stand verwirft `restoreLive` (`live.js:45`). Das ist nur über einen veralteten Button erreichbar und folgenlos.
- Die Testfixture stimmt mit der Tabelle in Spezifikation 4 überein (alle Wochen aufgelöst), auch Hüftbeuger W1–2 Halten, W3–7 Wiederholungen und die Deload-Woche 7.
