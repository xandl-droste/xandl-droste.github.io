# Umsetzung der Reviews, Runde 2

Antworten auf `security-r2.md`, `legal-r2.md` und `ios-ux-r2.md`. Die Berichte selbst bleiben unverändert.

Status: **behoben**, **teilweise** (mit Rest), **abgelehnt** (mit Grund), **kein Handlungsbedarf** oder **Entscheidung Betreiber**.

Geprüft nach den Fixes:
- `npm test`: 97/97 bestanden.
- `npm run e2e` in Chromium: 4/4 ohne Probleme.
- Training und Info in WebKit: ohne App-Fehler. Die einzigen Meldungen kommen vom Screenshot-Stylesheet von Playwright.
- Neue e2e-Prüfungen für H-1, H-2 und M-1, alle ohne Enter, wie auf der iPhone-Zahlentastatur.
- Zoom-Stufen in WebKit nachgemessen (siehe M-2).

## Hoch

| Finding | Status | Umsetzung |
|---|---|---|
| iOS H-1: Neurendern löscht getippte Werte | behoben | Werte gehen bei jedem Tastendruck in den Zustand (`input`, ohne Neuzeichnen). Zeitgesteuerte Aktualisierungen (Rückgängig-Fenster, Toast, Pausenende, Rückkehr in die App) laufen über `softRender()`. Das wartet, solange ein Eingabefeld den Fokus hat. Falls doch neu gezeichnet wird, übernimmt `render()` Text und Cursor ins neue Feld. e2e: „77,5“ tippen, 11 s warten, Wert steht noch. |
| iOS H-2: erster Tap nach dem Tippen geht verloren | behoben | Der Wert ist durch `input` schon gültig, bevor der Tap ankommt. Das Neuzeichnen nach `change` wartet, bis der Finger losgelassen ist (`renderAfterTap()`), damit der `click` den ursprünglichen Button trifft. e2e in Chromium und WebKit: tippen, dann einmal „Satz fertig“ bzw. „Fertig“, der Satz zählt mit dem neuen Wert. |

## Mittel

| Finding | Status | Umsetzung |
|---|---|---|
| Security M1: laufendes Training wird nicht geprüft | behoben | `restoreLive()` prüft Version und `fileId` und schickt die Session durch `validateSession()` (gleicher Validator wie beim Import). Die Anzeige-Daten (`items`) werden aus dem Plan neu berechnet statt übernommen. Passt der Stand nicht, wird er verworfen und ein Hinweis erscheint, der Trainingsstand bleibt unberührt. Zusätzlich fängt `render()` Fehler ab und zeigt eine Notfallansicht mit „Trainingsstand als Datei sichern“, „Laufendes Training verwerfen“ und „Neu laden“. Unit-Test mit kaputten, fremden und veralteten Ständen. |
| iOS M-1: Zahlenfeld nicht markiert | behoben | Markieren beim Fokus und erneut beim `click` (nach dem Loslassen), sofort und verzögert. e2e prüft die Markierung und dass „3“ den alten Wert ersetzt. |
| iOS M-2: größere Schrift in der Home-Bildschirm-App | teilweise | Ab 280 px Breite (ca. 150 % Zoom) stehen Superset-Zellen untereinander, der Timer ist einspaltig. Gemessen in WebKit: Superset-Werte bei 250 px 132 px breit, bei 188 px 70 px breit, beide ungekürzt. Kein horizontales Scrollen bei 300, 250, 188 und 320 px. README korrigiert: Der „aA“-Zoom gibt es nur im Safari-Tab, nicht in der Home-Bildschirm-App. Dynamic Type (`rem` und `-apple-system-body`) bleibt abgelehnt: Das würde alle Größen umstellen und die geprüften Layouts für 375 × 630 neu aufrollen. |
| Legal M1: Live-Seite mit altem Jekyll-Stand | Entscheidung Betreiber | Erledigt sich mit dem ersten Merge `develop` → `main`. Danach liefert der Workflow nur die App aus. Die Live-Seite danach prüfen. |

## Niedrig

| Finding | Status | Umsetzung |
|---|---|---|
| Security N1: gemeinsame Origin, IndexedDB lesbar | kein Handlungsbedarf | Die Regel steht seit Runde 1 in `CLAUDE.md` und README. M1 ist jetzt behoben, ein manipulierter Live-Stand sperrt die App also nicht mehr. Der Rest ist technisch nur über eine eigene Origin lösbar. |
| Security N2: lange Wochen-Schlüssel | behoben | `short()` auch in `weekKeys` und in Pfaden der Strukturprüfung. Unit-Test. |
| Security N3: Garmin-Export bei über 49 Tagen | behoben | Die Aktivität wird auf die Trainingszeit begrenzt (höchstens 15 Min vor dem ersten und nach dem letzten Satz). Liegen die Sätze selbst über 49 Tage auseinander, kommt eine klare Meldung statt „fehlgeschlagen“. Unit-Test mit 59 Tage offenem Training. |
| Security N4: Revision an der Obergrenze | behoben | Bei gleicher Revision zählt zusätzlich `updatedAt` nach dem letzten Export als ungesichert. Unit-Test. |
| Security N5: `CLAUDE.md` sagt Platzhalter | kein Handlungsbedarf | `CLAUDE.md` ist seit dem Commit „Entscheidungen Runde 1“ angepasst („Betreiberangaben … stehen ausschließlich in `legal.js`“). Der Bericht von Legal R2 bestätigt das. Die Schema-Zeile in `docs/spezifikation.md` zeigt nur das Muster. |
| Security N6: Ruleset ohne PR-Pflicht, alle Actions erlaubt | Entscheidung Betreiber | PR-Pflicht würde den lokalen Ablauf (Squash, Merge, Push) ändern. „Nur Actions von GitHub erlauben“ und „SHA-Pinning erzwingen“ sind Einstellungen auf GitHub. Beides ist vorgeschlagen, nicht umgesetzt. |
| Legal N1: Speicherdauer, Rolle von GitHub | behoben | Text: GitHub verarbeitet die Daten auch als eigener Verantwortlicher und nennt keine feste Speicherdauer, dazu der Verweis auf das Privacy Statement. Die Rollenfrage bleibt laut Bericht anwaltlich offen. |
| Legal N2: Offenlegung nur mit JS | abgelehnt | Eine statische Seite bräuchte Name und Wohnort ein zweites Mal. Das widerspricht der Regel „nur in `legal.js`“ aus `CLAUDE.md`. Die App selbst ist ohne JS nicht nutzbar, die Seite mit Offenlegung ist auf jedem Bildschirm verlinkt. |
| Legal N3: Mail-Anbieter als Empfänger | behoben | Satz ergänzt: Die Nachrichten liegen beim Anbieter des Postfachs der Kontaktadresse. |
| Legal N4: Gesundheitshinweis | behoben | Kurzer Hinweis im Onboarding unter „Beispielplan laden“ und im Plan-Tab. |
| Legal N5: FIT-Lizenz | teilweise | Unverändert: eigener Encoder, kein SDK-Code (README). Den Lizenztext konnte auch dieser Reviewer nicht abrufen (404). Die Frage bleibt offen. |
| Legal N6: Persönliche Angaben in der Git-Historie | Entscheidung Betreiber | Bestätigung angefragt. |
| iOS N-1: „Weiter“ neben „Rückgängig“ | teilweise | Abstand im Timer von 8 auf 16 px. „Weiter“ selbst rückgängig machen ist nicht umgesetzt. |
| iOS N-2: Querformat | abgelehnt | Wie in Runde 1: Die Spezifikation verlangt Hochformat. Bei geringer Höhe liegt der Timer unter dem Inhalt. |
| iOS N-3: Toasts oben im Training | teilweise | „Neue Version verfügbar“ erscheint nicht mehr während eines Trainings, sondern nach dem Beenden bzw. Verwerfen. Der kurze Toast „+X kg übernommen“ bleibt, ihn löst man selbst aus. |
| iOS N-4: VoiceOver-Details | behoben | Häkchen ohne `aria-pressed` (der Zustand steckt in der Beschriftung, keine doppelte Ansage), CSS über `.chk.done`. Wert-Beschriftung ohne doppelten Punkt, „– kg“ als „Gewicht offen“. Fokusrahmen im Zustand „Los!“ in `--acText`. `inert` für den Hintergrund von Sheets ist nicht umgesetzt (Escape und der Klick daneben schließen). |
| iOS N-5: Footer-Link anders als die Spezifikation | behoben | Die Spezifikation wurde angepasst: „Impressum & Datenschutz“ war eine Empfehlung aus dem Legal-Review Runde 1. |
| iOS N-6: 320 × 568, Timer 2 px über „Satz fertig“ | behoben | Der Timer liegt auch bei Breite ≤ 330 px unter dem Inhalt. |
| iOS N-7: „Los!“ nach Rückkehr, obwohl die Pause längst vorbei ist | behoben | `readyUntil` = Pausenende + 60 s. Ist das schon vorbei, gibt es kein „Los!“ und keine Ansage. |
