# Review Runde 5: Code-Qualität

Rolle: Reviewer 4 (Code-Qualität) nach `docs/spezifikation.md`, Abschnitt 9.
Geprüfter Stand: Commit `f2cbaf7`, Version 3.0.0 (`CHANGELOG.md`: „in Arbeit“). Schwerpunkt: Änderungen für 3.0 (andere Trainings), verglichen mit `e85f936` (Stand nach 2.0.0).
Gearbeitet nur lesend. Hilfsskripte lagen außerhalb des Repos (`/tmp/rv5/`).

## Geprüfte Punkte

- **Tests:** `npm test`: 199 von 199 grün. `BASE_URL=http://127.0.0.1:8774/training/ npm run e2e` (Chromium, Playwright): alle zehn Prüfungen grün, auch die neue `anderes-training`, jeweils „externe Requests: keine“, „Probleme: keine“.
- **Repo-Regeln aus `CLAUDE.md`:** Kein `innerHTML`, `insertAdjacentHTML`, `eval` oder `new Function` unter `training/` (Suche). Die neuen Ansichten (`views/activity.js`, `activityListItem`/`activityDetail` in `views/history.js`, Archiv-Kopf, Löschdialog) rendern Trainingsart und Notiz nur über `h()`. `npm run sw` ist aktuell (in einer Kopie neu erzeugt, keine Abweichung; `activities.js` und `activity.js` stehen in der Precache-Liste). Version 3.0.0 in `package.json` und `training/src/version.js`, `SCHEMA_VERSION` 3, Test Major = Schema läuft, CHANGELOG-Eintrag vorhanden.
- **Datenmodell und Validator:** `validateActivity`, `validateActivityEntry`, Grenzen `maxActivities`/`maxActivityType`/`maxActivityMin`, Eindeutigkeit der IDs über `sessions` und `activities`, Lesen von Schema 1 und 2 (Hebung auf 3), Ablehnen von Schema > 3. Per Skript: ungültige Kalenderdaten (`2026-02-31`) werden abgelehnt, Datum in der Zukunft wird beim Import angenommen (so dokumentiert).
- **Modul `model/activities.js`:** Eintragen, Korrigieren, Löschen (mit `deletedSessionIds`), Vorschläge. Gegen Spezifikation 2 (Regel „Andere Trainings“) und Entwurf `docs/entwurf-andere-trainingsarten.md` abgeglichen.
- **Abgleich beim Import:** `mergeTrainingFiles` mit `activities`, Zählung in `addedSessions`/`removedSessions`, Vorschau und Anwenden (`model/import.js`, `importPreviewSheet`).
- **Kein Einfluss auf Woche, Vorbelegung, Startwerte, „Zuletzt“:** Code gelesen (`weeks.js`, `progression.js`, `carry-over.js`, `lastTrained`, `finish.js` arbeiten nur auf `sessions`). Per Skript: Nachfolger über `applyImports` übernimmt keine `activities` und keine Startwerte daraus.
- **Backup-Status:** `backupStatus` mit anderen Trainings, `backupCard`, `sessionSaveState` für andere Trainings; Schutz vor Wechsel der Trainingsdatei (`withBackupFirst` nutzt `unsavedChanges`, das andere Trainings mitzählt).
- **UI-Ablauf Sheet:** `openActivitySheet`, `AA` (Entwurf im Zustand, Lesen von Datum/Trainingsart aus dem DOM beim Speichern, Fehlermeldungen), Button im Heute-Tab und im Verlauf nur ohne laufendes Training.
- **Verlauf und Archiv:** `historyEntries` (Sortierung), Listeneintrag, Detailansicht, Archiv nur lesend, Archiv-Kopf mit Zählung.
- **Exporte:** Coach-Export (`activityLines`, Legende, Entschärfung über `cleanText`), Agent-Prompt (`activitySummaryLines`, 4-Wochen-Fenster, `JSON.stringify` der Trainingsart, Backticks ersetzt, Button auch nur mit anderen Trainings). Per Skript mit Zeilenumbruch und „E1 W3“ in der Trainingsart geprüft.
- **Konsistenz und Begriffe:** Spezifikation (Abschnitte 0, 2, 5, 9), `docs/begriffe.md`, Entwurf, `docs/stand.md`, CHANGELOG. Suche nach „Aktivität“ in UI-Texten: keine (nur in FIT-Kommentaren, dort FIT-Fachbegriff).
- **Tests:** `tests/activities.test.js` (16 Tests) und `tests/e2e/anderes-training.e2e.mjs` gelesen.

## Nicht geprüft (mit Grund)

- **Echtes iPhone, WebKit:** kein Gerät, Browser-Prüfungen nur in Chromium. Datumsfeld (`type="date"`) und dessen `change`-Ereignis unter iOS nicht geprüft; `AA.save` liest das Feld deshalb zusätzlich aus dem DOM.
- **FIT:** keine Änderung in 3.0, nicht erneut geprüft.
- **CSS, Layout, Kontraste:** Rolle UX.
- **Speicher voll (Quota):** nicht erzeugt.
- **Offene Punkte aus Runde 4 (M1–M4):** nicht erneut nachgestellt, Schwerpunkt dieser Runde ist 3.0.

## Findings

### Kritisch

Keine.

### Hoch

Keine.

### Mittel

#### M1: Import-Vorschau zählt andere Trainings nicht: „Noch keine Trainings“ bei einer Datei voller anderer Trainings

- **Fundstelle:** `training/src/model/training-file.js:166-178` (`summarize` zählt nur `sessions`), `training/src/app.js:502` (Vorschauzeile), `training/src/app.js:489` („Deine N Trainings bleiben unverändert“), `training/src/model/import.js:106` (`historyCount` nur aus `sessions`).
- **Beschreibung:** Die Vorschau vor dem Übernehmen nennt Anzahl und Zeitraum der Trainings nur aus `sessions`. Eine `.training.json`, die nur andere Trainings enthält, wird als „Noch keine Trainings“ angezeigt; bei gemischten Dateien fehlen die anderen Trainings in Zahl und Zeitraum. Ebenso sagt „Anpassen“ „Deine 0 Trainings bleiben unverändert“. Per Skript nachgestellt: Datei mit einem anderen Training → `summary.history = {count: 0, from: null, to: null}`, `historyCount = 0`. Das Archiv zählt dagegen richtig (`views/archive.js:65-77`), die beiden Stellen laufen auseinander.
- **Auswirkung:** Laut `docs/begriffe.md` ist „Training“ der Oberbegriff. Die Vorschau ist die Absicherung gegen stummes Überschreiben (Spezifikation 2, Import). Wer bei „Andere Trainingsdatei“ (`switch`) prüfen will, was er gerade öffnet, sieht falsche Zahlen.
- **Empfehlung:** `summarize` um `activities` erweitern (Anzahl getrennt, z. B. „5 Krafttrainings · 3 andere Trainings (… bis …)“, Zeitraum über beide) und dieselbe Formulierung wie im Archiv-Kopf verwenden, am besten aus einer gemeinsamen Hilfsfunktion. `historyCount` ebenso. Test: `previewImport(null, [Datei nur mit activities])` liefert eine Zahl > 0.
- **Sicherheit:** hoch (Code und Skript).

#### M2: Fachregel „andere Trainings ändern Woche, Vorbelegung, Startwerte und ‚Zuletzt‘ nicht“ ist nicht durch Tests abgesichert

- **Fundstelle:** `tests/activities.test.js` (keiner der 16 Tests ruft `deriveProgress`, `prefill`/Steigerungsvorschlag, `buildCarryOver`/`createSuccessorFile` oder `lastTrained` mit einer Datei mit `activities` auf).
- **Beschreibung:** Die Trennung beruht heute darauf, dass alle diese Funktionen nur `file.sessions` lesen. Das stimmt (gelesen), ist aber genau die Stelle, an der der Entwurf (F4) vor „einem vergessenen Filter“ warnt, nur andersherum: Eine spätere Änderung, die z. B. `historyEntries` statt `endedSessions` verwendet, bricht die Regel unbemerkt.
- **Auswirkung:** Regression in Wochen-Ableitung oder Progression bliebe von `npm test` unentdeckt.
- **Empfehlung:** Ein Test, der für eine Datei mit Trainings und anderen Trainings prüft: `deriveProgress` gleich wie ohne `activities`; Vorbelegung und Vorschlag gleich; `createSuccessorFile` ohne `activities` und mit unveränderten `carryOver`; `lastTrained` ignoriert ein jüngeres anderes Training.
- **Sicherheit:** hoch.

### Niedrig

#### N1: Korrigieren ohne Änderung erhöht die Revision und meldet „nicht gesichert“

- **Fundstelle:** `training/src/model/activities.js:53-65` (`updateActivity` ruft immer `bumpRevision`), `training/src/app.js` `AA.save` (Toast „Änderung gespeichert.“).
- **Beschreibung:** „Korrigieren“ öffnen und unverändert „Speichern“ tippen ergibt eine neue Revision (per Skript: Revision 1 → 2). Die übrigen Korrekturfunktionen (`editSession` in `model/history.js:184-192`) geben bei gleichem Wert die Datei unverändert zurück. Findet `updateActivity` die ID nicht (z. B. in einem anderen Fenster gelöscht), kommt trotzdem „Änderung gespeichert.“.
- **Auswirkung:** Unnötiger Hinweis „Änderungen noch nicht gesichert“ und unnötige Sicherung; irreführender Toast im Randfall.
- **Empfehlung:** In `updateActivity` das bereinigte Ergebnis mit dem alten Eintrag vergleichen und bei Gleichheit `file` zurückgeben; in `AA.save` bei `next === S.file` nur das Sheet schließen (ohne bzw. mit passendem Toast). Test ergänzen.
- **Sicherheit:** hoch.

#### N2: Zusammenführen kann eine Datei erzeugen, die der eigene Validator ablehnt (ID-Kollision über beide Listen)

- **Fundstelle:** `training/src/model/training-file.js:118-152` (`mergeTrainingFiles` prüft IDs je Liste, nicht über `sessions` und `activities` zusammen), `training/src/model/validate.js:665-677`.
- **Beschreibung:** Der Validator verlangt eindeutige IDs über beide Listen. Beim Zusammenführen wird das nicht geprüft. Nachgestellt: lokales anderes Training mit ID X, importierte Datei (gleiche `fileId`, höhere Revision) mit einem Training mit derselben ID X. Beide Dateien sind einzeln gültig, das Ergebnis nicht („activities[0].id … ist doppelt“). Es wird gespeichert; beim nächsten Start lädt die App den Stand nicht („beschädigt … bitte die letzte .training.json einlesen“), und `checkReimport` verhindert die Sicherung.
- **Auswirkung:** Mit echten UUIDs praktisch ausgeschlossen, nur mit präparierten oder von Hand bearbeiteten Dateien. Verletzt aber den Grundsatz, dass ein Import nie einen unlesbaren Stand hinterlässt.
- **Empfehlung:** In `mergeTrainingFiles` ergänzte andere Trainings verwerfen, deren ID schon unter den Trainings des Ergebnisses steht (und umgekehrt), oder das Ergebnis vor dem Übernehmen in `confirmImport` durch `validateTrainingFile` schicken und bei Fehler abbrechen. Test mit kollidierender ID.
- **Sicherheit:** hoch (nachgestellt), Eintrittswahrscheinlichkeit sehr gering.

#### N3: Gelesene Dateien werden nicht normalisiert (Reihenfolge, leere Liste, Grabsteine)

- **Fundstelle:** `training/src/model/validate.js:665-677`; Folgen in `activities.js:79-92` (`activityTypeSuggestions` nutzt den Listenindex als „zuletzt“) und `agent-prompt.js:250` (Kommentar „Liste ist nach Datum sortiert“).
- **Beschreibung:** Per Skript: (a) `activities` in umgekehrter Reihenfolge bleibt nach dem Validator unsortiert; Vorschläge und die „zuletzt verwendete Schreibweise“ im Agent-Prompt hängen dann von der Dateireihenfolge ab. (b) `activities: []` bleibt als leere Liste erhalten, obwohl die App das Feld sonst weglässt (`docs/stand.md`, Entscheidung Schritt 1). (c) Ein anderes Training, dessen ID in `deletedSessionIds` derselben Datei steht, bleibt sichtbar (gilt auch für Trainings, also kein neues Verhalten).
- **Auswirkung:** gering, nur bei Dateien, die nicht von der App stammen.
- **Empfehlung:** Im Validator (oder beim Übernehmen) `activities` mit `byActivityDate` sortieren und eine leere Liste weglassen. (c) bewusst so lassen oder für beide Listen gleich behandeln.
- **Sicherheit:** hoch.

#### N4: Coach-Export: Legende „Zeile ohne Einheit (E…)“ und Woche des Eintrags können den Coach fehlleiten

- **Fundstelle:** `training/src/model/coach-export.js:16`, `:138-147`; `training/src/model/activities.js:41` (`week: file.progress.currentWeek`).
- **Beschreibung:** (a) Die Legende setzt voraus, dass Einheiten mit „E“ beginnen; der Validator erlaubt beliebige Schlüssel (`KEY_RE`, z. B. „A“, „Mo“). (b) Ein nachgetragenes anderes Training erhält die aktuelle Woche, nicht die Woche seines Datums; im Log steht dann z. B. „2026-11-10 Beachvolleyball · W3“ neben Krafttrainings mit „W2“ aus derselben Kalenderwoche. Das entspricht dem Entwurf („Planwoche beim Eintragen“), die Legende erklärt es aber nicht. (c) Eine Trainingsart wie „E1 W3“ sieht im Log aus wie ein Krafttraining (Daten sind als Daten gekennzeichnet, nur Lesbarkeit).
- **Auswirkung:** Ein KI-Coach kann andere Trainings falsch zuordnen.
- **Empfehlung:** Legende ohne „E…“ formulieren, z. B. „Zeile mit Trainingsart statt Einheit und Woche“; andere Trainings mit einem festen Präfix kennzeichnen (z. B. „2026-11-18 [anderes] Beachvolleyball · …“) und die Woche als „eingetragen in W3“ beschreiben, oder beim Nachtragen keine Woche setzen, wenn das Datum vor dem Beginn der aktuellen Woche liegt.
- **Sicherheit:** mittel (Wirkung auf den Coach ist eine Einschätzung).

#### N5: Kleinigkeiten in Zustand und Doku

- **Fundstelle:** `training/src/app.js:243-250` und `AA`; `docs/stand.md:55`; `docs/begriffe.md` (Abschnitt „Nicht verwenden“).
- **Beschreibung:** (a) Schließen des Sheets über Hintergrund oder Escape läuft über `closeSheet` und lässt `S.activityDraft` stehen (harmlos, weil `openActivitySheet` ihn neu setzt, aber undeklarierter Restzustand). (b) `docs/stand.md` Schritt 2: „Das Sheet hat schon ‚Löschen‘ für den Korrektur-Modus vorbereitet“, Schritt 3 und der Code: Löschen nur in der Detailansicht. (c) Leerzeile mitten in der Liste „Nicht verwenden“. (d) Gearbeitet wird auf einem Branch des privaten Repos, nicht auf `feature/<name>` wie in `CLAUDE.md` verlangt (im privaten WIP-Repo; vor dem Übertrag ins öffentliche Repo beachten).
- **Empfehlung:** Entwurf in `closeSheet` bzw. über einen eigenen Schließen-Handler zurücksetzen; Satz in `docs/stand.md` korrigieren; Leerzeile entfernen; Branch-Namen beim Übertrag nach `CLAUDE.md` wählen.
- **Sicherheit:** hoch.

## Testlücken mit konkreten Testfällen

1. **Trennung von der Fachlogik** (siehe M2): `deriveProgress`, Vorbelegung/Steigerungsvorschlag, `createSuccessorFile`/`carryOver`, `lastTrained` jeweils mit und ohne `activities` gleich.
2. **Import-Vorschau** (siehe M1): `previewImport` mit Datei nur mit anderen Trainings, mit gemischter Datei, und `historyCount` bei Plan-Import.
3. **Korrigieren ohne Änderung** (siehe N1): `updateActivity` mit gleichem Inhalt gibt dieselbe Datei zurück; unbekannte ID gibt dieselbe Datei zurück.
4. **ID-Kollision beim Zusammenführen** (siehe N2): Ergebnis besteht `validateTrainingFile`.
5. **Zusammenführen bei gleicher ID mit unterschiedlichem Inhalt:** Gewinner-Stand bleibt (heute nur indirekt abgedeckt).
6. **Backup-Status nach Korrektur eines anderen Trainings:** `unsavedChanges` true, Eintrag nicht in `unsavedSessionIds` (heutiges Verhalten festschreiben).
7. **Agent-Prompt-Grenzen:** Eintrag genau am ersten Tag des 4-Wochen-Fensters und einen Tag davor; Eintrag mit Datum nach `today` (aus Import) wird ignoriert.
8. **Browser:** Korrigieren und Löschen eines anderen Trainings während eines laufenden Trainings (Verlauf ist erreichbar, „Korrigieren“ ist dort nicht gesperrt), danach Training normal beenden.

## Zusammenfassung

| Schwere | Anzahl |
|---|---|
| Kritisch | 0 |
| Hoch | 0 |
| Mittel | 2 (M1 Import-Vorschau zählt andere Trainings nicht, M2 Trennung von Woche/Progression ungetestet) |
| Niedrig | 5 (N1–N5) |

Die Umsetzung von 3.0 hält sich eng an Spezifikation und Entwurf: eigenes Feld `activities`, keine Berührung der Fachlogik für Krafttrainings, saubere Validierung und Entschärfung in beiden Exporten, Rendering ausschließlich über `h()`. `npm test` (199) und alle zehn Browser-Prüfungen sind grün, `npm run sw` ist aktuell.
