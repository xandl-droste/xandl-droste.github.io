# Umsetzung der Reviews, Runde 6 (Version 3.0, andere Trainings)

Antworten auf `security-r6.md`, `legal-r6.md`, `ios-ux-r6.md` und `code-qualitaet-r6.md`. Die Berichte selbst bleiben unverändert. Code-Qualität (H1) und iOS/UX (H-1) melden dasselbe hohe Finding, ausgelöst durch den Fix für Runde 5 H-1. Deshalb folgt laut Spezifikation (Abschnitt 9) eine weitere Runde; für 3.0 ist das die dritte und damit letzte.

Der iOS-Reviewer hat seinen Bericht vollständig geschrieben und wurde danach durch ein Nutzungslimit beendet (der Bericht enthält Zusammenfassung und Checkliste).

Status: **behoben**, **teilweise** (mit Rest), **abgelehnt** (mit Grund), **kein Handlungsbedarf**, **später** oder **Entscheidung Betreiber**.

Geprüft nach den Fixes:
- `npm test`: 207/207 bestanden (neu: Zusammenführen mit Vorrang des Gewinners, weitere unsichtbare Zeichen, Bereinigung im Validator).
- `npm run e2e` in Chromium: alle zehn Prüfungen ohne Probleme. Neu in `anderes-training.e2e.mjs`: „Wert tippen, dann ±“ mit Touch an vier Stellen (Gewicht und Wiederholungen im Training, Gewicht beim Korrigieren im Verlauf inkl. gespeichertem Wert, Dauer im Sheet). Gegenprobe: Mit der alten Logik schlagen alle vier fehl (z. B. „getippt 82,5, dann +0,5, ist 12,5“).
- `speichern.e2e.mjs` klickte „das erste `.btn` im Sheet“; seit „Beenden und speichern“ unten fest steht, ist das „Training verwerfen“. Der Test wählt den Button jetzt über `data-fid="finish-save"`.
- WebKit war in dieser Umgebung nicht verfügbar.

## Code-Qualität und iOS: das hohe Finding

| Finding | Status und Umsetzung |
|---|---|
| Code-Qualität H1 / iOS H-1: Nach dem Tippen eines Werts rechnet −/+ mit dem alten Wert | **Behoben.** Die −/+-Handler lesen den Ausgangswert zum Zeitpunkt des Taps aus dem zugehörigen Eingabefeld (`stepper` in `views/live.js`, `durationField` in `views/activity.js`), nicht aus dem Wert des letzten Zeichnens. Das gilt für alle Stepper: Training (Liste, Fokus, Bearbeiten-Sheet), Korrigieren im Verlauf und Dauer im Sheet „Anderes Training“. Browser-Test mit Gegenprobe (siehe oben). |

## Code-Qualität

| Finding | Status und Umsetzung |
|---|---|
| N1: Entwurf bleibt nach `go()` stehen, danach schließt kein Sheet mehr per Hintergrund | **Behoben.** `go()` leert den Entwurf, und die Sperre gegen das Schließen per Hintergrund gilt nur, solange das Sheet „Anderes Training“ offen ist. |
| N2: Importierte Trainingsart nicht wie in der App bereinigt | **Behoben.** Der Validator bereinigt die Trainingsart mit derselben Funktion wie die App (`cleanActivityType`). Unit-Test. |
| N3: Zeichenmenge und Sortierung doppelt | **Behoben.** Beides steht nur noch in `model/validate.js` (`INVISIBLE_RE`, `cleanActivityType`, `byActivityDate`), Modell und `training-file.js` nutzen es von dort. |
| N4: Texte in der Import-Vorschau („Deine 0 Trainings“, Kollision als „gelöscht“) | **Behoben.** Ohne Trainings: „Es gibt noch keine Trainings.“, bei einem: „Dein Training bleibt unverändert.“ Die Kollision verdrängt keinen Eintrag des Gewinners mehr (siehe Security N1), es wird also nichts als gelöscht gemeldet. |
| N5: CHANGELOG nennt die Änderungen aus Runde 5 nicht | **Behoben.** |

## iOS, Barrierefreiheit und Bedienbarkeit

| Finding | Status und Umsetzung |
|---|---|
| N-1: „Beenden und speichern“ bei vorzeitigem Ende unter dem Rand | **Behoben.** „Beenden und speichern“ und „Weiter trainieren“ stehen im festen Bereich unten im Sheet (`.sheet-actions`), „Training verwerfen“ bleibt im scrollenden Teil. |
| N-2: Tab nach dem Ändern eines Werts verliert den Fokus | **Behoben.** Ohne Tap zeichnet `renderAfterTap` erst nach dem Fokuswechsel (`setTimeout(…, 0)`), `render()` stellt dann das neue aktive Element wieder her. |
| N-3: RPE-Regler ohne Wert kaum sichtbar | **Behoben.** Ohne Wert haben Griff und Spur einen Rand in `--mut`. |
| N-4: Überschriften in Listen-Buttons | **Behoben.** Im Button steht `<span class="list-title">` statt `<h3>`, gleiche Darstellung. |
| Weiter offen: `inert` bei offenen Sheets, `overscroll-behavior` | **Später** (wie Runde 3 N-8, `docs/wishlist.md`). |

## Security

| Finding | Status und Umsetzung |
|---|---|
| N1: Regression durch Runde 5 N3, ältere präparierte Datei verdrängt ein lokales anderes Training | **Behoben.** Die Einträge des Gewinners gehen vor: Aus dem Verlierer kommt nur dazu, was im Gewinner in keiner der beiden Listen steht. Unit-Test mit genau diesem Fall (anderes Training bleibt, nichts als „gelöscht“ gemeldet, Ergebnis besteht den Validator). |
| N2: Handliste unsichtbarer Zeichen unvollständig | **Behoben.** Unicode-Eigenschaften statt Liste: `\p{Cc}`, `\p{Cf}`, `\p{Zl}`, `\p{Zp}`, `\p{Default_Ignorable_Code_Point}` und U+2800. Erfasst u. a. Tag-Zeichen U+E00xx, Variantenwähler, U+3164 und U+2028. Folge: Emoji-Sequenzen mit Nullbreiten-Verbinder werden in der Trainingsart in Einzelzeichen zerlegt; das ist für eine Trainingsart hinnehmbar. Unit-Test. |
| N3: Zeitstempel ohne Bereichsgrenze | **Später** (unverändert). |
| N4: Session-Links in Commits | **Kein Handlungsbedarf jetzt**, wird beim Übertrag ins öffentliche Repo erledigt. |
| N5: „Export fehlgeschlagen“ bei vollem Speicher | **Später** (unverändert). |
| N6: `main` ohne Pull-Request-Pflicht | **Entscheidung Betreiber** (unverändert). |
| N7: Gemeinsame Origin | **Kein Handlungsbedarf** (unverändert). |

## Recht und Compliance

| Finding | Status und Umsetzung |
|---|---|
| N1: Zweckangabe auf der Info-Seite | **Entscheidung Betreiber** (offen, Vorschlag siehe `umsetzung-r5.md`). |
| N2: `<noscript>`, Widerspruch | **Entscheidung Betreiber** (unverändert seit Runde 4). |
| N3: Reichweite der Garmin-FIT-Lizenz | **Kein Handlungsbedarf** („unklar, anwaltlich klären“). |
| N5: Branchnamen des privaten Repos in Berichten aus Runde 5; Widerspruch „Branchnamen vor der Übergabe aus `reviews/` entfernen“ (`docs/stand.md`) gegen „Berichte nicht umschreiben“ (Spezifikation Abschnitt 9) | **Entscheidung Betreiber** vor der Übergabe ins öffentliche Repo. Session-Links: wie Security N4. |

Punkte mit „unklar, anwaltlich klären“ (aus `legal-r6.md`): Rollenverteilung GitHub/Betreiber bei Zugriffsprotokollen (Art. 4 Nr. 7, 26, 28 DSGVO), Schutz von überwiegend KI-erzeugtem Code und Reichweite der MIT-Lizenz (§ 1 UrhG), Schutz einer Wort-Zuordnung zur RPE-Skala (§ 1 UrhG), Reichweite der Garmin-FIT-Lizenz (§ 1, §§ 76c ff. UrhG).
