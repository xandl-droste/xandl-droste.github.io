# Umsetzung der Reviews, Runde 5 (Version 3.0, andere Trainings)

Antworten auf `security-r5.md`, `legal-r5.md`, `ios-ux-r5.md` und `code-qualitaet-r5.md`. Die Berichte selbst bleiben unverändert. iOS/UX meldet ein hohes Finding (H-1), deshalb folgt laut Spezifikation (Abschnitt 9) eine weitere Runde mit frischen Reviewern.

Status: **behoben**, **teilweise** (mit Rest), **abgelehnt** (mit Grund), **kein Handlungsbedarf**, **später** oder **Entscheidung Betreiber**.

Geprüft nach den Fixes:
- `npm test`: 205/205 bestanden (neu in `tests/activities.test.js`: Trennung von Woche/Vorbelegung/Startwerten/„Zuletzt“, Import-Vorschau, Korrigieren ohne Änderung, ID-Kollision beim Zusammenführen, unsichtbare Zeichen, Sortierung im Validator).
- `npm run e2e` in Chromium: alle zehn Prüfungen ohne Probleme. Neu in `anderes-training.e2e.mjs`: Touch-Taps (`tap()`) nach dem Tippen eines Werts, im Sheet („Speichern“) und im Training („Satz fertig“). Gegenprobe: Mit der alten `renderAfterTap`-Logik schlägt der Test im Training fehl.
- WebKit war in dieser Umgebung nicht verfügbar. Was nur am iPhone prüfbar ist, steht in `ios-ux-r5.md`, Abschnitt „Checkliste“.

## iOS, Barrierefreiheit und Bedienbarkeit

| Finding | Status und Umsetzung |
|---|---|
| H-1: Erster Tap nach dem Tippen in ein Feld geht mit Touch verloren | **Behoben.** In Chromium mit `tap()` nachgestellt (Sheet und Training). `renderAfterTap` (`app.js`) behandelt einen Tap jetzt bis zu seinem `click` als laufend, höchstens 450 ms nach `pointerup`; ein `click`-Listener in der Capture-Phase holt das aufgeschobene Neuzeichnen direkt nach dem Handler des Buttons nach, eine Zeitsicherung greift, falls kein `click` kommt. Zusätzlich zeichnet das Dauer-Feld im Sheet beim Verlassen gar nicht mehr neu (der Wert gilt schon über `input`). Browser-Test mit Touch im Sheet und im Training. Ob iOS dieselbe Reihenfolge hat, bleibt Checkliste Punkt 1. |
| M-1: Sheet springt bei jedem Neuzeichnen nach oben | **Behoben.** `render()` hält die Scrollposition, wenn dasselbe Sheet neu gezeichnet wird. Die Fehlermeldung steht jetzt unten im festen Aktionsbereich (siehe M-2) direkt über „Speichern“ und wird zusätzlich per `scrollIntoView` geholt. |
| M-2: „Speichern“ immer unterhalb des sichtbaren Bereichs | **Behoben.** „Abbrechen“ und „Speichern“ stehen nebeneinander in einem festen Bereich am unteren Rand des Sheets (`.sheet-actions`, `position: sticky`), der Inhalt scrollt darüber. |
| N-1: −/+ der Dauer nur 40 px breit | **Behoben**: 44 px. Das Zahlenfeld dazwischen wird schmaler. |
| N-2: Tap auf den Hintergrund verwirft Eingaben | **Behoben.** Sobald im Sheet etwas geändert wurde, schließt ein Tap auf den Hintergrund nicht mehr. „Abbrechen“ und Escape schließen weiter. |
| N-3: Backup-Status rutscht unter die Tab-Leiste | **Behoben.** Ist etwas ungesichert (oder die Erinnerung fällig), steht die Backup-Karte vor der Karte „Anderes Training“. |
| N-4: Nach „Speichern“ kein Fokus | **Behoben.** Speichern schließt über `closeSheet()`, der Fokus kehrt zum auslösenden Button zurück („Anderes Training eintragen“ bzw. „Korrigieren“). |
| N-5: Dauer-Feld: Name weicht vom Label ab, −/+ sagt nichts an | **Behoben.** Das Feld hat keinen eigenen `aria-label` mehr, der Name kommt aus dem sichtbaren Label „Dauer (Minuten)“. −/+ sagt den neuen Wert über die Live-Region an („Dauer 65 Minuten“). |

## Code-Qualität

| Finding | Status und Umsetzung |
|---|---|
| M1: Import-Vorschau zählt andere Trainings nicht | **Behoben.** `summarize` liefert zusätzlich `history.activities`, der Zeitraum gilt über beide. Eine gemeinsame Hilfsfunktion `historyCountText` formuliert für Import-Vorschau und Archiv gleich („3 Trainings“, „2 Krafttrainings · 1 anderes Training“, „1 anderes Training“). `historyCount` bei „Anpassen“ zählt beide. Nebenbei: „1 Trainings“ heißt jetzt „1 Training“. Unit-Test. |
| M2: Trennung von der Fachlogik ohne Test | **Behoben.** Test: Datei mit und ohne andere Trainings (darunter eines mit der Trainingsart „E2“ bzw. „back-squat“) ergibt dieselbe Woche (`deriveProgress`), dasselbe laufende Training mit Vorbelegung (`startLive`), dieselben Startwerte und keinen Übertrag in den Nachfolger (`createSuccessorFile`) und dieselbe „Zuletzt“-Zeile (`lastTrained`). |
| N1: Korrigieren ohne Änderung erhöht die Revision | **Behoben.** `updateActivity` gibt bei gleichem Ergebnis dieselbe Datei zurück, die App meldet dann „Keine Änderung.“ statt „Änderung gespeichert.“. Unit-Test. |
| N2: Zusammenführen kann ID-Kollision erzeugen | **Behoben.** `mergeTrainingFiles` übernimmt kein anderes Training, dessen ID schon bei den Trainings vorkommt. Unit-Test: Ergebnis besteht den Validator (beide Richtungen). |
| N3: Validator sortiert nicht, leere Liste bleibt | **Behoben.** Der Validator sortiert andere Trainings wie die App und lässt `activities: []` weg. Unit-Test. |
| N4: Legende nimmt „E…“ an, Woche bei nachgetragenen Trainings | **Behoben.** Die Legende lautet jetzt „Zeile mit Trainingsart statt Einheiten-Schlüssel = anderes Training außerhalb des Plans: Trainingsart · W = Planwoche beim Eintragen · Dauer · RPE, zählt nicht für die Woche“. Die Woche bleibt die beim Eintragen (abgestimmt im Entwurf, F5/Abschnitt 3.1), die Legende sagt das jetzt ausdrücklich. |
| N5: Kleinigkeiten | **Behoben** (a) `closeSheet` leert `S.activityDraft`; (b) Satz in `docs/stand.md` korrigiert; (c) Leerzeile in `docs/begriffe.md` entfernt. (d) Branch-Name: **kein Handlungsbedarf** im privaten WIP-Repo (die Cloud-Sitzung darf nur unter `claude/…` pushen). Beim Übertrag ins öffentliche Repo entsteht ein `feature/*`-Branch, wie in `docs/stand.md` beschrieben. |

## Security

| Finding | Status und Umsetzung |
|---|---|
| N1: Import-Vorschau verschweigt andere Trainings | **Behoben**, siehe Code-Qualität M1. Dass eine ungültige Zusammenführung erst nach „Übernehmen“ gemeldet wird, entfällt mit N3 (die Kollision entsteht nicht mehr). |
| N2: Steuer- und unsichtbare Zeichen in der Trainingsart | **Behoben.** Das Modell ersetzt Steuer-, Bidi- und unsichtbare Zeichen (u. a. `U+202E`, `U+200B`, `U+FEFF`, `U+00AD`) beim Eintragen durch Leerzeichen; der Validator lehnt sie in importierten Dateien mit „enthält Steuer- oder unsichtbare Zeichen“ ab. Notizen bleiben Freitext (wie bisher bei Notizen zu Übungen). Unit-Test. |
| N3: ID-Kollision beim Zusammenführen | **Behoben**, siehe Code-Qualität N2. |
| N4: Session-Links und Verweise auf das WIP-Repo | **Kein Handlungsbedarf jetzt.** Wird beim Übertrag ins öffentliche Repo erledigt (Squash mit eigener Commit-Nachricht, Hinweis in `docs/stand.md` entfernen, danach `git log -p` prüfen), wie in `docs/stand.md` festgehalten. |
| N5: Zeitstempel ohne Bereichsgrenze, jetzt auch `activities[].createdAt` | **Später** (wie Runde 3 N5 / Runde 4 N4). Nur mit präparierter Datei, Folge ist ein dauerhaft „nicht gesichert“-Tag. |
| N6: „Export fehlgeschlagen“ bei vollem Speicher | **Später** (wie Runde 3 N3 / Runde 4 N5, steht in `docs/wishlist.md`). |
| N7: `main` ohne Pull-Request-Pflicht | **Entscheidung Betreiber** (unverändert). |
| N8: Gemeinsame Origin | **Kein Handlungsbedarf** (unverändert, Regel in `CLAUDE.md`). |

## Recht und Compliance

| Finding | Status und Umsetzung |
|---|---|
| N1: Zweckangabe auf der Info-Seite nennt nur Krafttraining | **Entscheidung Betreiber.** Der Text ist laut Spezifikation Abschnitt 6 vorgegeben. Vorschlag: „… zum persönlichen Protokollieren von Krafttraining und anderen Trainings“. |
| N2: Hinweis am Button nennt RIR nicht, „Daten“ mehrdeutig | **Behoben.** Neuer Text: „Die Ergebnisse (Gewichte, Wiederholungen, RIR und Datum, dazu die anderen Trainings der letzten 4 Wochen) gehen dann ebenfalls an den Anbieter des KI-Dienstes.“ (der Zusatz nur, wenn es andere Trainings gibt). |
| N3: `<noscript>`, Widerspruch | **Entscheidung Betreiber** (unverändert seit Runde 4). |
| N4: Reichweite der Garmin-FIT-Lizenz | **Kein Handlungsbedarf** (unverändert, „unklar, anwaltlich klären“). |
| N5: Session-Links und Hinweis auf das private Repo | **Kein Handlungsbedarf jetzt**, siehe Security N4. |

Punkte mit „unklar, anwaltlich klären“ (aus `legal-r5.md`): Rollenverteilung GitHub/Betreiber bei Zugriffsprotokollen (Art. 4 Nr. 7, 26, 28 DSGVO), Schutz von überwiegend KI-erzeugtem Code und Reichweite der MIT-Lizenz (§ 1 UrhG), Schutz einer Wort-Zuordnung zur RPE-Skala (§ 1 UrhG), Reichweite der Garmin-FIT-Lizenz (§ 1, §§ 76c ff. UrhG).
