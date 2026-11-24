# Review Runde 6: Code-Qualität

Rolle: Reviewer 4 (Code-Qualität) nach `docs/spezifikation.md`, Abschnitt 9.
Geprüfter Stand: Commit `32a6680` (Code unverändert bis `8fb63f7`, dazwischen nur Berichte anderer Reviewer), Version 3.0.0 („in Arbeit“). Schwerpunkt: die Fixes aus Runde 5 (`git diff bb417ef 32a6680`), dazu die 3.0-Funktionen (andere Trainings) und die Repo-Regeln.
Gearbeitet nur lesend. Hilfsskripte lagen außerhalb des Repos (`/tmp/rv6p/`). Zum Vergleich wurde der Stand vor den Fixes (`bb417ef`, per `git archive` nach `/tmp/rv6old/`) auf Port 8775 ausgeliefert.

## Geprüfte Punkte

- **Tests:** `npm test`: 205 von 205 grün. `BASE_URL=http://127.0.0.1:8774/training/ npm run e2e` (Chromium): alle zehn Prüfungen grün, jeweils „externe Requests: keine“, „Probleme: keine“.
- **Repo-Regeln aus `CLAUDE.md`:** Kein `innerHTML`, `insertAdjacentHTML`, `outerHTML`, `document.write`, `eval` oder `new Function` unter `training/` (Suche). Externe Adressen nur als Link-Text auf der Info-Seite (GitHub-Datenschutz) und in Kommentaren. `npm run sw` ist aktuell (in einer Kopie neu erzeugt, keine Abweichung). Version 3.0.0 in `package.json` und `training/src/version.js`, `SCHEMA_VERSION` 3.
- **Fixes aus Runde 5, Code gelesen:** `renderAfterTap` mit `TAP_SETTLE_MS` und `click`-Listener (`app.js:126-165`), Scrollposition im Sheet (`render`), `closeSheet` leert `activityDraft`, Hintergrund-Tap mit `dirty`, Backup-Karte vor „Anderes Training“, `AA.save` (Fokus zurück, „Keine Änderung.“), `showActivityError`, `.sheet-actions`; `summarize`/`historyCountText` (Import-Vorschau und Archiv), `historyCount`; `updateActivity` ohne Änderung; `mergeTrainingFiles` mit ID-Kollision; `INVISIBLE_RE`/`ACTIVITY_TYPE_RE`; Sortierung und leere Liste im Validator; neue Legende im Coach-Export.
- **Fixes aus Runde 5, nachgestellt:** per Node-Skript (Validator, `updateActivity`, `previewImport`, `mergeTrainingFiles`) und per Playwright mit Touch (`tap()`) im Sheet „Anderes Training“, im Fokus und im Menü-Sheet, jeweils auch gegen den Stand `bb417ef`.
- **Fachlogik, gelesen:** `model/import.js`, `model/activities.js`, `model/training-file.js`, `model/backup.js`, Abschnitte von `model/validate.js` (andere Trainings, Trainingsdatei), Coach-Export (`cleanText`, `activityLines`, Legende), Agent-Prompt (`activitySummaryLines`, `planAsData`), Import-Ablauf in `app.js` (`openFiles`, `importPreviewSheet`, `confirmImport`, `switchToFile`).
- **Konsistenz:** Spezifikation (vollständig), `docs/begriffe.md`, `docs/stand.md`, `CHANGELOG.md`, `reviews/umsetzung-r5.md`, `reviews/code-qualitaet-r5.md`.
- **Tests gelesen:** neuer Abschnitt „Review Runde 5“ in `tests/activities.test.js`, Touch-Teil von `tests/e2e/anderes-training.e2e.mjs`.

## Nicht geprüft (mit Grund)

- **WebKit / echtes iPhone:** kein Gerät; Playwright nur mit Chromium. Ob iOS dieselbe Ereignisreihenfolge (pointerup → mousedown/blur/change → click) hat, auf der `renderAfterTap` beruht, ist nicht geprüft. Das Finding H1 wurde in Chromium mit Touch und mit Maus nachgestellt.
- **FIT-Encoder, Live-Modell (`model/live.js`), Progression, Wochen-Ableitung, Startwerte:** seit Runde 4 bzw. 5 ohne Änderung am Code, nicht erneut im Detail gelesen. Die Trennung von anderen Trainings ist durch den neuen Test abgedeckt (gelesen).
- **CSS, Layout, Kontraste:** Rolle UX.
- **Speicher voll, mehrere Fenster:** nicht erzeugt.

## Findings

### Kritisch

Keine.

### Hoch

#### H1: −/+ direkt nach dem Tippen eines Werts rechnet mit dem alten Wert und überschreibt die Eingabe (Folge des Fixes für iOS H-1)

- **Fundstelle:** `training/src/views/live.js:383` (`const bump = (d) => () => A.setValue(i, s, field, stepValue(value, d))`, `value` stammt aus dem letzten Zeichnen), `training/src/views/activity.js:79-81` (Dauer −/+, ebenso `value` aus dem Zeichnen), `training/src/app.js:126-165` (`renderAfterTap` mit `TAP_SETTLE_MS`), `app.js:838-848` (Verlauf: `HE.typeValue` tut nichts, `HE.setValue` nutzt dieselben Stepper).
- **Beschreibung:** Bis Runde 5 wurde beim Verlassen des Felds (`change`) mit Touch sofort neu gezeichnet, der folgende Tap traf einen ersetzten Button und ging verloren (iOS H-1). Jetzt wird das Neuzeichnen bis nach dem `click` aufgeschoben. Der Tap landet also auf dem alten −/+-Button, dessen Handler den Wert aus dem letzten Zeichnen als Basis nimmt, nicht den gerade getippten. Der getippte Wert wird damit überschrieben.
  Nachgestellt in Chromium mit Touch (`tap()`):
  - Fokus, Gewicht 40, dann „77“ getippt und „+0,5“ getippt: Ergebnis **40,5** (erwartet 77,5). Stand `bb417ef`: 77 (Tap verloren, Eingabe blieb).
  - Sheet „Anderes Training“, Dauer 60, dann „45“ getippt und „+“ getippt: Ergebnis **65** (erwartet 50). Stand `bb417ef`: 45.
  - Mit Maus (`click()`, Desktop) gilt dasselbe schon vor Runde 5, weil dort `change` während des gedrückten Zeigers kommt (Fokus: „60“ getippt, „+0,5“ → 1).
  Dieselbe Bauart haben die Stepper im Bearbeiten-Sheet der Liste und beim Korrigieren im Verlauf (gleiche `stepper()`-Funktion; im Verlauf übernimmt `HE.commitValue` den getippten Wert erst bei `change`, `HE.setValue` überschreibt ihn danach mit dem alten Wert plus Schritt).
- **Auswirkung:** Kernablauf im Training: Gewicht eintippen und mit ±0,5 feinjustieren ergibt einen ganz anderen Wert (z. B. 0,5 kg statt 77,5 kg). Der Fehler ist sichtbar, aber zwischen den Sätzen leicht zu übersehen, und „Satz fertig“ protokolliert dann den falschen Wert; Vorbelegung und Steigerungsvorschlag rechnen später damit weiter. Gegenüber Runde 5 verschiebt der Fix das Problem von „Tap geht verloren“ zu „Eingabe wird ersetzt“, das ist für die Daten schlechter. Kein Test deckt „tippen, dann −/+“ ab.
- **Empfehlung:** Die −/+-Handler lesen den aktuellen Wert zur Laufzeit statt aus der Closure: im Training aus `S.live` (`S.live.session.blocks[i].sets[s][field]`, `typeValue` hat ihn schon gesetzt), im Sheet aus `S.activityDraft.durationMin`, im Verlauf aus dem Feld selbst oder nach `commitValue` aus `S.file`. Am einfachsten bekommt `A.setValue` statt eines fertigen Werts das Delta (`A.stepValue(i, s, field, d)`), und das Modell rechnet `stepValue(aktueller Wert, d)`. Browser-Test mit Touch und Maus: Wert tippen, dann „+0,5“ (Fokus, Liste/Bearbeiten-Sheet, Verlauf) und „+“ bei der Dauer; erwartet getippter Wert plus Schritt.
- **Sicherheit:** hoch (in Chromium mit Touch und Maus nachgestellt, Vergleich mit `bb417ef`). Ob Safari auf dem iPhone genauso reagiert, hängt an der Ereignisreihenfolge, die der Fix für iOS H-1 voraussetzt; trifft sie zu, tritt H1 dort genauso auf.

### Mittel

Keine.

### Niedrig

#### N1: Entwurf „Anderes Training“ bleibt nach Verlassen des Sheets ohne `closeSheet` stehen, danach schließt kein Sheet mehr per Hintergrund-Tap

- **Fundstelle:** `training/src/app.js:239-246` (`go()` setzt `S.sheet = null`, aber nicht `S.activityDraft`), `app.js:263` (`!S.activityDraft?.dirty` gilt für alle Sheets), weitere Stellen mit `S.sheet = null` (z. B. `app.js:393`, `871`, `914`, `988`, `1326`).
- **Beschreibung:** Die Sperre gegen Schließen per Hintergrund-Tap prüft nur, ob ein geänderter Entwurf existiert, nicht, ob das offene Sheet das Sheet „Anderes Training“ ist. Wird das Sheet anders als über `closeSheet`/„Abbrechen“/„Speichern“ verlassen, bleibt der Entwurf mit `dirty: true` stehen. Nachgestellt: Sheet öffnen, Trainingsart tippen, `location.hash = '#info'` (ruft `go('info')`), zurück, Menü öffnen, Tap auf den Hintergrund: Menü bleibt offen (Gegenprobe ohne Entwurf: schließt). Erst Escape oder „Schließen“ räumt auf.
- **Auswirkung:** gering; im normalen Ablauf überdeckt das Sheet die Navigation. Erreichbar über Hash-Wechsel, künftige Aufrufe von `go()` aus Toasts (z. B. Update-Hinweis) oder neue Stellen mit `S.sheet = null`.
- **Empfehlung:** Bedingung an das Sheet binden (`S.sheet === activitySheet && S.activityDraft?.dirty`) oder den Entwurf in `go()` und an allen Stellen mit `S.sheet = null` mit leeren (besser: eine Funktion `dropSheet()` ohne Fokus-Rückgabe, die beides tut).
- **Sicherheit:** hoch (nachgestellt).

#### N2: Trainingsart aus importierten Dateien wird nicht wie in der App normalisiert

- **Fundstelle:** `training/src/model/validate.js:581` (Trainingsart: Länge und unsichtbare Zeichen, kein Trimmen, keine Leerraum-Zusammenfassung), `training/src/model/activities.js:22-28` (`cleanInput` trimmt und fasst Leerraum zusammen), `activities.js:70` (Vergleich per `JSON.stringify`), `activities.js:84` und `agent-prompt.js:251` (Gruppierung nur über `toLocaleLowerCase`).
- **Beschreibung:** Per Skript: Eine importierte Trainingsart `" Laufen "`, `"Lau  fen"`, `"a b"` oder `"x　"` wird angenommen. „Korrigieren“ ohne Änderung ergibt dann trotzdem eine neue Revision („Änderung gespeichert.“, Stand „nicht gesichert“), weil `cleanInput` den Text verändert. Ebenso bei einer Notiz mit Leerzeichen am Ende. „Laufen “ und „Laufen“ erscheinen als zwei Vorschläge und zwei Zeilen in der Zusammenfassung des Agent-Prompts. Der Fix für Runde 5 N1 greift damit nur für Einträge aus der App.
- **Auswirkung:** gering, nur bei Dateien, die nicht von der App stammen.
- **Empfehlung:** Den Validator die Trainingsart genauso normalisieren lassen wie `cleanInput` (trimmen, `\s+` → ein Leerzeichen, Notiz trimmen), am besten über eine gemeinsame Funktion, und für Vorschläge und Zusammenfassung denselben Schlüssel nutzen. Test: Import mit `" Laufen "`, danach `updateActivity(file, id, {})` gibt dieselbe Datei zurück.
- **Sicherheit:** hoch (per Skript).

#### N3: Doppelte Definitionen nach den Fixes (Zeichenmenge, Sortierung)

- **Fundstelle:** `training/src/model/activities.js:19` (`INVISIBLE_RE`) und `training/src/model/validate.js:432` (`ACTIVITY_TYPE_RE`, laut Kommentar „gleiche Menge“); `training/src/model/training-file.js:100-101` (`byActivityDate`) und `validate.js:681` (gleicher Vergleich inline).
- **Beschreibung:** Zeichenmenge und Sortierung stehen je zweimal im Code; nur Kommentare halten sie gleich. Kein Test prüft, dass beide Mengen übereinstimmen (der Test prüft je ein Beispiel). `activities.js` importiert bereits aus `validate.js`, die Menge könnte also dort einmal stehen; die Sortierung ließe sich ebenfalls nach `validate.js` verschieben und von `training-file.js` importieren (kein Kreis).
- **Auswirkung:** Wartbarkeit; eine spätere Änderung an nur einer Stelle ließe App und Validator auseinanderlaufen (App erlaubt, Import lehnt ab, oder umgekehrt).
- **Empfehlung:** Je eine Definition in `validate.js` exportieren und an beiden Stellen nutzen.
- **Sicherheit:** hoch.

#### N4: Texte in der Import-Vorschau in Randfällen

- **Fundstelle:** `training/src/app.js:507` („Anpassen“), `app.js:500` und `model/training-file.js:138-140,155-160` (Zusammenführen).
- **Beschreibung:** (a) Ohne Trainings sagt „Anpassen“ „Deine 0 Trainings bleiben unverändert.“ (b) Fällt beim Zusammenführen ein anderes Training wegen einer ID-Kollision weg (Fix Runde 5 N2), zählt es in `removedSessions`; Vorschau und Hinweis melden „1 gelöschte(s) Training(s) werden entfernt“, obwohl nichts gelöscht wurde (nur mit präparierten Dateien).
- **Auswirkung:** gering, nur Wortlaut.
- **Empfehlung:** (a) Satz bei 0 weglassen. (b) Kollisionen getrennt zählen oder still verwerfen, ohne sie als „gelöscht“ zu melden.
- **Sicherheit:** hoch (Code gelesen, (b) mit dem Test aus Runde 5 nachvollzogen).

#### N5: CHANGELOG nennt die sichtbaren Änderungen aus Runde 5 nicht

- **Fundstelle:** `CHANGELOG.md`, Abschnitt 3.0.0 (in Commit `32a6680` nicht geändert).
- **Beschreibung:** Bei 2.0.0 steht eine Zeile zu Review Runde 4. Für 3.0.0 fehlen die in Runde 5 geänderten Verhalten: Tap nach dem Tippen eines Werts (betrifft auch „Satz fertig“ im Training), „Abbrechen“/„Speichern“ fest unten im Sheet, Hintergrund-Tap schließt ein geändertes Sheet nicht mehr, Import-Vorschau zählt andere Trainings, Validator lehnt Steuerzeichen in der Trainingsart ab (neue Ablehnung beim Import).
- **Auswirkung:** gering; die Version ist noch „in Arbeit“, `docs/stand.md` nennt den Abschluss des CHANGELOG als nächsten Schritt.
- **Empfehlung:** Beim Abschluss von 3.0.0 eine Zeile ergänzen (Verweis auf `reviews/umsetzung-r5.md` und r6).
- **Sicherheit:** hoch.

## Testlücken mit konkreten Testfällen

1. **Tippen, dann −/+** (siehe H1), Browser mit Touch und Maus: Fokus (Gewicht 40 → „77“ tippen → „+0,5“ → 77,5), Bearbeiten-Sheet der Liste, Korrigieren im Verlauf, Dauer im Sheet „Anderes Training“ (60 → „45“ → „+“ → 50). Dazu der gespeicherte Wert im Browserspeicher.
2. **Tippen, dann „Satz fertig“ in der Liste** (Haken der Zeile nach Eingabe im Bearbeiten-Sheet): heute nur im Fokus mit Touch geprüft.
3. **Hintergrund-Tap** (siehe N1): nach Verlassen des geänderten Sheets über Navigation schließt das Menü per Hintergrund-Tap.
4. **Import mit nicht normalisierter Trainingsart** (siehe N2): `updateActivity(file, id, {})` gibt dieselbe Datei zurück; Vorschläge fassen „Laufen “ und „Laufen“ zusammen.
5. **Zeichenmenge App = Validator** (siehe N3): für jeden Bereich der Menge ein Zeichen: `addActivity` entfernt es, `validateTrainingFile` lehnt es ab.
6. **`renderAfterTap` ohne `click`:** Tap neben jeden Button nach einer Eingabe; nach höchstens `TAP_SETTLE_MS` wird neu gezeichnet (heute ungetestet, nur die Zeitsicherung im Code).

## Zusammenfassung

| Schwere | Anzahl |
|---|---|
| Kritisch | 0 |
| Hoch | 1 (H1 −/+ nach dem Tippen rechnet mit dem alten Wert) |
| Mittel | 0 |
| Niedrig | 5 (N1–N5) |

Die Fixes aus Runde 5 sind sauber umgesetzt und getestet (Import-Vorschau, Trennung von der Fachlogik, Korrigieren ohne Änderung, ID-Kollision, Sortierung, Steuerzeichen). `npm test` (205) und alle zehn Browser-Prüfungen sind grün, `npm run sw` ist aktuell, keine verbotenen DOM-APIs, keine externen Requests. Der Fix für iOS H-1 (aufgeschobenes Neuzeichnen bis nach dem `click`) legt aber eine alte Schwäche frei: Die −/+-Buttons rechnen mit dem Wert aus dem letzten Zeichnen. Mit Touch überschreibt „+0,5“ nach dem Tippen jetzt den getippten Wert (H1). Das betrifft den Kernablauf im Training und sollte vor dem Abschluss von 3.0.0 behoben und mit einem Browser-Test abgesichert werden.
