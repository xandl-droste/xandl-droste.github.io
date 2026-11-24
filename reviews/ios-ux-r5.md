# Review 3: iOS-Safari, Barrierefreiheit und Bedienbarkeit auf kleinen Displays (Runde 5, Version 3.0)

Prüfumfang laut Spezifikation Abschnitt 9, Schwerpunkt dieser Runde: andere Trainings (Sheet „Anderes Training eintragen“ bzw. „… korrigieren“, Karte im Heute-Tab, Verlauf mit Detailansicht, Korrigieren und Löschen, Archiv). Die Punkte aus 2.0 wurden in Runde 4 geprüft. Hier sind sie nur nachgeprüft, wo 3.0 sie berührt.

## Wichtige Einschränkung dieser Runde

In dieser Umgebung steht nur **Chromium** zur Verfügung, kein WebKit. Alle Browser-Messungen liefen in Chromium mit Mobil-Emulation (`isMobile`, `hasTouch`, `deviceScaleFactor` 2, `locale` de-AT). Getippt wurde mit Touch-Ereignissen (`locator.tap()` bzw. `page.touchscreen.tap()`), nicht mit Mausklicks. **Nichts in diesem Bericht ist in WebKit oder auf einem iPhone geprüft.** Was davon abhängt, steht in der Checkliste am Ende.

## Geprüfte Punkte

- **Unit-Tests**: `npm test` hat 199 von 199 Tests bestanden.
- **Browser-Prüfungen des Repos** (Chromium, `BASE_URL=http://127.0.0.1:8773/training/`): `anderes-training`, `archiv`, `training` und `rir` laufen ohne Probleme und ohne externe Requests. Die übrigen Prüfungen (import, offline, info, insecure, speichern, durchgang) habe ich in dieser Runde nicht laufen lassen.
- **Eigener Durchlauf** (Skript außerhalb des Repos): Testplan öffnen, Heute-Tab mit der Karte „Anderes Training“, Sheet leer, Sheet mit Fehlermeldung, sieben andere Trainings eintragen (eines mit 50 Zeichen langem Namen), Sheet mit sechs Vorschlägen, Verlauf mit gemischter Liste, Detailansicht, Sheet „korrigieren“, Rückfrage „Training löschen?“, Plan-Tab, Archiv mit der eben erzeugten Trainingsdatei und Archiv-Detail eines anderen Trainings.
  - Pro Bildschirm gemessen: horizontaler Überlauf, Höhe, Höhe des Sheets und seines Inhalts, Lage von „Speichern“, alle sichtbaren Bedienelemente unter 44 px, Eingabefelder unter 16 px, Textkontrast nach WCAG 1.4.3 (Alpha-Mischung, bei Fancy der ungünstigste Verlaufsstopp).
  - Größen: 375 × 630 in **Hell, Dunkel und Fancy**. Dazu Dunkel in 320 × 568, in 250 × 420 (entspricht etwa 150 % Seitenzoom am 13 mini) und in 812 × 340 (Querformat).
  - Ergebnis: Auf keinem Bildschirm gibt es horizontalen Überlauf. Kein Eingabefeld ist kleiner als 16 px (Trainingsart, Datum und Notiz haben 16 px, Dauer hat 17 px). Kontraste sind in allen drei Stilen in Ordnung. Das Messskript meldete nur bei Fancy dunkle Schrift auf dem Verlaufs-Knopf („Speichern“, „Training starten“). Das ist ein Messfehler: Das Skript kann den Verlauf als Hintergrund nicht auswerten. Von Hand geprüft: #1b1038 auf #ffd166 bzw. #ff7ad9 liegt weit über 4,5. Bedienelemente unter 44 px gibt es nur bei −/+ der Dauer (siehe N-1).
- **Gezielte Proben** (Skripte außerhalb des Repos):
  - Ein Tap direkt nach dem Tippen in ein Feld, mit Protokoll der Ereignisse (H-1).
  - Lage des Sheets nach dem Neuzeichnen: +/−, Vorschlag und Fehlermeldung (M-1).
  - Tap auf den Hintergrund des Sheets (N-2).
  - Dauer-Werte 0, 700, 90,5, leer und „abc“: Jede Eingabe erzeugt die Meldung „Bitte die Dauer in ganzen Minuten eintragen (1 bis 600).“ −/+ bleibt zwischen 5 und 600 und rundet auf 5er-Schritte.
  - Enter im Feld Trainingsart schließt die Eingabe.
- **Code gelesen**: `views/activity.js`, `views/rpe.js`, `views/history.js` (Liste, Detail), `views/archive.js` (Kopf), `app.js` (`openActivitySheet`, `AA`, `activityCard`, `backupCard`, `deleteActivitySheet`, `openSheet`/`closeSheet`/`sheetFrame`, `render`, `renderAfterTap`, `softRender`, Agent-Sheet mit Datenschutz-Hinweis), `css/app.css` (Felder, `.field-pair`, `.num-row`, `.act-chips`, Sheet, Medienabfragen), `dom.js`.
- **Barrierefreiheit im Code**:
  - Alle Felder haben ein Label.
  - Vorschläge stehen in einer Gruppe mit Namen und haben `aria-pressed`.
  - −/+ tragen `aria-label` mit der Schrittweite.
  - Die Fehlermeldung hat `role="alert"`.
  - Der Dialog hat `role="dialog"`, `aria-modal` und einen Namen. Beim Öffnen bekommt die Überschrift den Fokus.
  - Lange Vorschläge werden sichtbar gekürzt, VoiceOver liest den vollen Text.
  - In der Liste unterscheiden sich andere Trainings durch Text („Anderes Training · 60 Min“), nicht nur durch Farbe.
  - Neue Animationen gibt es nicht.

## Nicht prüfbar (mit Grund)

- **Alles, was echtes iOS braucht.** Dazu gehören:
  - die Datumsauswahl (`input type="date"`) mit Darstellung in der schmalen Spalte, dem Knopf „Zurücksetzen“ und dem Verhalten von `max`
  - die Zifferntastatur des Dauer-Felds und die Frage, ob sie Eingaben verdeckt
  - die Reihenfolge `blur`/`change`/`click` beim Tippen auf einen Button unter iOS (entscheidend für H-1)
  - der RPE-Regler im neuen Sheet
  - VoiceOver und Sprachsteuerung
  - Safe Area am Sheet-Rand

  Die Punkte stehen in der Checkliste.
- **WebKit-Emulation**: in dieser Umgebung nicht vorhanden.
- **Dynamic Type**: Die App nutzt feste px-Größen. Ob die Systemschrift „Größerer Text“ in Safari bzw. in der Home-Bildschirm-App irgendetwas vergrößert, lässt sich nur am Gerät sehen. Ersatzweise habe ich 250 × 420 gemessen (Seitenzoom).
- **Teilen-Menü, Dateien-App, Offline, Update des Service Workers**: In 3.0 hat sich hier nichts geändert. Ich habe es nicht erneut geprüft (siehe Runde 4 und Checkliste Punkt 13).
- **Coach-Export und Agent-Prompt mit anderen Trainings**: Ich habe nur den Code für Sheet-Text und Hinweis gelesen und nicht vermessen. Der Text selbst ist Sache der Reviewer 2 und 4.

## Findings

### Kritisch

Keine.

### Hoch

#### H-1: Der erste Tap nach dem Tippen in ein Feld geht mit Touch verloren („Speichern“, −/+ und auch „Satz fertig“)

- **Fundstelle**:
  - `training/src/app.js:129–146` (`pointerDown`, `releasePointer`, `renderAfterTap`)
  - `training/src/views/activity.js:88` (`onchange` des Dauer-Felds mit `render: 'afterTap'`)
  - `training/src/app.js:1031–1034` (`commitValue`) und `training/src/views/live.js:375` (Stepper im Training)
- **Nachstellen** (Chromium, 375 × 630, Touch):
  - Sheet „Anderes Training eintragen“: Trainingsart eintragen, dann eine Zahl ins Feld „Dauer“ tippen (Feld bleibt aktiv). „Speichern“ antippen. Das Sheet bleibt offen, nichts ist gespeichert, und der Inhalt springt nach oben. Erst der zweite Tap speichert.
  - Protokoll der Ereignisse: `pointerdown → touchstart → pointerup → touchend → mousedown(act-save) → change(act-duration) → mouseup(act-note)`. Das `click` fehlt.
  - Gegenprobe: Ist das Feld „Notiz“ oder „Trainingsart“ aktiv, kommt der Tap an, weil diese Felder beim Verlassen nichts neu zeichnen.
  - Dasselbe im Training (Fokus): einen Wert ins Gewichtsfeld tippen, dann „Satz fertig“ antippen. Der Zähler bleibt bei „0 von 26 Sätzen“, erst der zweite Tap zählt. Wer vorher Enter drückt, hat das Problem nicht.
- **Beschreibung**: Seit Runde 2 (H-2) soll `renderAfterTap()` das Neuzeichnen nach `change` aufschieben, solange ein Finger auf dem Display liegt. Bei Touch kommen die Kompatibilitäts-Mausereignisse aber erst **nach** `pointerup`/`touchend`. Dazu gehören `mousedown`, die Fokusänderung mit `blur` und `change`, `mouseup` und `click`. Zum Zeitpunkt von `change` ist `pointerDown` also schon `false`. `render()` ersetzt sofort alle Knöpfe, und `click` hat kein Ziel mehr. Die Browser-Prüfung des Repos (`training.e2e.mjs:98–100`) übersieht das, weil sie mit `click()` arbeitet, also mit der Maus. Dort kommt `pointerup` erst nach `mousedown`.
- **Auswirkung**:
  - Im Training: Der wichtigste Knopf reagiert nach dem Tippen eines Gewichts nicht. Mit müden Händen tippt man dann ein zweites Mal. Das ist kein Datenverlust, weil der Wert durch `input` schon gilt, aber ein Fehltap in der Kernschleife.
  - Im neuen Sheet: „Speichern“ scheint nicht zu funktionieren, und das Sheet springt nach oben (M-1). Wer dann „Abbrechen“ oder den Hintergrund antippt, verliert die Eingaben.
  - Dasselbe gilt für −/+ direkt nach dem Tippen in das Dauer-Feld.
- **Empfehlung**:
  1. Neuzeichnen nach `change` erst nach dem zugehörigen `click`. Zum Beispiel merkt sich `releasePointer` die Zeit von `pointerup`, und `renderAfterTap` wartet, solange seit `pointerup` weniger als etwa 400 ms vergangen sind und noch kein `click` kam. Oder: Ein `click`-Listener in der Capture-Phase löst ein ausstehendes Neuzeichnen per `setTimeout(…, 0)` aus, mit einer Sicherung per Zeitablauf, falls kein `click` kommt.
  2. Im Sheet das Neuzeichnen beim Verlassen des Dauer-Felds ganz weglassen. `save()` nimmt den Wert ohnehin aus dem Entwurf, den `input` aktuell hält.
  3. Browser-Tests für „tippen, dann einmal tippen“ mit `locator.tap()` bzw. `page.touchscreen.tap()` statt `click()`, im Training und im Sheet.
- **Sicherheit**: Hoch für Chromium mit Touch-Emulation (dreimal reproduziert, Ereignisprotokoll oben). Für das iPhone mittel. Die Reihenfolge `pointerup` vor den Kompatibilitäts-Mausereignissen ist so spezifiziert (Pointer Events, Touch Events). Offen ist, ob iOS das Feld beim Tippen auf einen Button wirklich verlässt, bevor `click` kommt. Prüfung: Checkliste Punkt 1.

### Mittel

#### M-1: Das Sheet springt bei jedem Neuzeichnen nach oben: nach −/+, nach einem Vorschlag und nach der Fehlermeldung

- **Fundstelle**: `training/src/app.js:1373ff.` (`render()` ersetzt das ganze Sheet, die Scrollposition der Sheet-Karte geht verloren). Ausgelöst durch `activity.js:49` (Vorschlag, `render: true`), `activity.js:78` (−/+, `render: true`) und `app.js:721–725` (Fehlermeldung beim Speichern).
- **Nachstellen**:
  - 375 × 630, vier frühere Trainingsarten als Vorschläge. Sheet um 120 px nach unten scrollen, bis −/+ der Dauer gut erreichbar ist, und „+“ antippen. Danach ist `scrollTop` = 0. Ein zweiter Tap an derselben Stelle trifft die Lücke zwischen den Vorschlag-Chips. Bei leicht verschobenem Finger trifft er einen Vorschlag, der die eingetippte Trainingsart überschreibt. Bei 320 × 568 genauso.
  - Fehlermeldung: Sheet bis „Speichern“ scrollen und ohne Trainingsart speichern. Das Sheet springt auf `scrollTop` 0. Die Meldung steht bei 593–638 px, also bei 630 px Höhe nur halb sichtbar. Bei 320 × 568 und mit Vorschlägen liegt sie ganz außerhalb. Man sieht nur, dass der Inhalt springt.
- **Beschreibung**: Fokus und Eingabetext werden beim Neuzeichnen übernommen, die Scrollposition des Sheets nicht. Im Sheet „Anderes Training“ ist das neu spürbar, weil es höher ist als der Bildschirm (M-2) und mehrere Bedienelemente neu zeichnen. Unter iOS beachtet die Datumsauswahl `max` nicht (WebKit-Bug 225639). Ein Datum in der Zukunft lässt sich dort also wählen, und dann kommt genau diese Fehlermeldung. Dieser Fall wird in der Praxis vorkommen.
- **Auswirkung**: Fehltaps auf Vorschläge (Trainingsart wird überschrieben), mehrfaches Scrollen pro Eintrag, und eine Fehlermeldung, die man nicht sieht. Für VoiceOver wird die Meldung über `role="alert"` angesagt.
- **Empfehlung**:
  - In `render()` die `scrollTop` von `.sheet > .card` vor dem Ersetzen merken und danach wiederherstellen, sofern dasselbe Sheet offen bleibt.
  - Alternativ −/+ und Vorschlag ohne Neuzeichnen umsetzen: Wert direkt im Feld setzen bzw. `aria-pressed` umschalten.
  - Bei einer Fehlermeldung das betroffene Feld mit `aria-invalid` markieren und in den sichtbaren Bereich holen (`scrollIntoView({block: 'center'})`). Die Meldung zusätzlich direkt über „Speichern“ oder am Feld zeigen.
- **Sicherheit**: Hoch (gemessen in Chromium). Ob das Scrollverhalten in iOS gleich ist, prüft Checkliste Punkt 2.

#### M-2: „Speichern“ liegt immer unterhalb des sichtbaren Bereichs, mit Vorschlägen 350 px tief

- **Fundstelle**: `training/src/views/activity.js:36–71` (Reihenfolge und Höhe der Teile), `css/app.css:300–308` (Sheet höchstens `88dvh`), `css/app.css:305–308` (Notiz mindestens 96 px).
- **Nachstellen**:
  - 375 × 630, leeres Sheet: Inhalt 692 px bei 552 px sichtbarer Höhe, „Speichern“ endet bei 694 px.
  - Mit sechs Vorschlägen (der Normalfall ab dem zweiten Eintrag): Inhalt 900 px, „Speichern“ bei 902 px.
  - 320 × 568: 976 px. Querformat 812 × 340: Sheet 299 px hoch, „Speichern“ bei 760 px.
- **Beschreibung**: Ein Eintrag braucht immer ein Scrollen bis „Speichern“. Wegen M-1 oft mehrmals, weil jede Änderung an Dauer oder Vorschlag das Sheet wieder nach oben setzt. Ist die Tastatur offen (Trainingsart oder Notiz), bleibt unter iOS noch weniger Platz.
- **Auswirkung**: Mehr Gesten pro Eintrag. Die Hauptaktion liegt nicht im unteren Drittel, sondern außerhalb des Bildschirms (Spezifikation Abschnitt 5, „Kleine Handys“: wichtige Aktionen im unteren Drittel).
- **Empfehlung**:
  - „Speichern“ und „Abbrechen“ in eine Fußzeile des Sheets mit `position: sticky; bottom: 0` und Hintergrund in Sheet-Farbe legen.
  - Zusätzlich das Sheet kompakter machen: Vorschläge auf eine waagrecht scrollende Zeile begrenzen oder auf vier kürzen, Notiz mit `min-height` etwa 64 px, Hinweis „Zählt nicht …“ ans Ende unter die Knöpfe.
- **Sicherheit**: Hoch (gemessen).

### Niedrig

#### N-1: −/+ der Dauer nur 40 px breit

- **Fundstelle**: `css/app.css:321` (`.field-pair .num-btn { width: 40px; }`)
- **Beschreibung**: Gemessen sind die Knöpfe bei allen Größen 40 × 44 px. Die Spezifikation verlangt mindestens 44 px. Unter 340 px stehen Datum und Dauer untereinander, und die 40 px bleiben, obwohl dann Platz genug wäre.
- **Auswirkung**: Etwas schwerer zu treffen. WCAG 2.5.8 (24 px) ist eingehalten.
- **Empfehlung**: 44 px Breite und dafür etwas weniger Polster im Zahlenfeld. Mindestens in der Medienabfrage unter 340 px auf 56 px zurückgehen.
- **Sicherheit**: Hoch.

#### N-2: Ein Tap auf den Hintergrund verwirft alle Eingaben im Sheet ohne Rückfrage

- **Fundstelle**: `app.js:245` (Tap auf `.sheet` schließt), `app.js:694–699` (`openActivitySheet` legt immer einen neuen Entwurf an).
- **Nachstellen**: Trainingsart „Tennis“ und Notiz eintragen, über dem Sheet auf den abgedunkelten Bereich tippen (bei 375 × 630 die oberen 76 px), das Sheet wieder öffnen: alle Felder leer.
- **Auswirkung**: Getippte Notiz und Werte sind weg. Der Bereich liegt oben, also selten unter dem Daumen. Im Querformat ist er größer. Für den Abschluss-Dialog wurde dasselbe in Runde 4 (N-1) behoben.
- **Empfehlung**: Den Entwurf beim Schließen über den Hintergrund behalten. Nur „Abbrechen“ und „Speichern“ verwerfen ihn. Beim erneuten Öffnen ohne `id` den vorhandenen Entwurf weiterverwenden, wenn er nicht leer ist.
- **Sicherheit**: Hoch.

#### N-3: Der Backup-Status auf „Heute“ rutscht unter die Tab-Leiste

- **Fundstelle**: `app.js:664–665` (Karte „Anderes Training“ zwischen nächster Einheit und Backup).
- **Beschreibung**: Bei 375 × 630 ist „Heute“ jetzt 700 px hoch (320 × 568: 740 px). Von der Backup-Karte sieht man ohne Scrollen nur die Überschrift und die erste Zeile. „Als Datei sichern“ liegt hinter der Tab-Leiste.
- **Auswirkung**: Der Hinweis „1 Training noch nicht gesichert“ samt Knopf ist weniger sichtbar. Er ist die Absicherung gegen gelöschte Browserdaten.
- **Empfehlung**: Die Backup-Karte vor die Karte „Anderes Training“ stellen, wenn etwas ungesichert ist. Oder die Karte „Anderes Training“ zu einem Knopf ohne eigene Karte und Erklärzeile verkleinern.
- **Sicherheit**: Hoch (gemessen). Ob das stört, entscheidet der Betreiber.

#### N-4: Nach „Speichern“ hat nichts mehr den Fokus (VoiceOver)

- **Fundstelle**: `app.js:736–739` (`S.sheet = null` statt `closeSheet()`, der Rücksprung über `S.sheetReturn` entfällt).
- **Beschreibung**: Nach dem Speichern liegt der Fokus auf `body` (gemessen). Bei „Abbrechen“ kehrt er zu „Anderes Training eintragen“ zurück. Die Ansage „… eingetragen.“ kommt über die Live-Region.
- **Auswirkung**: VoiceOver-Nutzer müssen ihre Stelle neu suchen.
- **Empfehlung**: Nach dem Speichern den Fokus wie bei `closeSheet()` auf den auslösenden Knopf zurücksetzen. Nach dem Korrigieren auf „Korrigieren“.
- **Sicherheit**: Mittel (Chromium gemessen, VoiceOver nicht geprüft).

#### N-5: Dauer-Feld: Name weicht vom sichtbaren Label ab, −/+ ohne Ansage des neuen Werts

- **Fundstelle**: `activity.js:81–91`.
- **Beschreibung**: Sichtbar steht „Dauer (Minuten)“, der Name ist „Dauer in Minuten“ (`aria-label` überschreibt das Label). Nach −/+ wird neu gezeichnet und der Fokus zurück auf den Knopf gesetzt. Der neue Wert wird nicht angesagt.
- **Auswirkung**: Gering. Für die Sprachsteuerung genügt meist „Dauer“ (WCAG 2.5.3). VoiceOver-Nutzer müssen nach −/+ zum Feld wischen, um den Wert zu hören.
- **Empfehlung**: `aria-label` weglassen, das `<label for>` genügt. Nach −/+ `announce('Dauer 65 Minuten')`.
- **Sicherheit**: Mittel.

## Bedienfluss (gezählt in Chromium)

- **Anderes Training mit bekannter Trainingsart eintragen**: „Anderes Training eintragen“ → Vorschlag → (Dauer −/+, Ziehen am RPE-Regler) → im Sheet scrollen → „Speichern“. Das sind 3 Taps plus mindestens ein Scrollen. Neue Trainingsart: Tippen statt Vorschlag.
- **Korrigieren**: Verlauf → Eintrag → „Korrigieren“ → Änderung → scrollen → „Speichern“ (4 Taps plus Scrollen). Danach bleibt die Detailansicht offen, der Toast meldet „Änderung gespeichert.“
- **Löschen**: Verlauf → Eintrag → „Training löschen“ → „Ja, löschen“ (4 Taps), danach zurück in der Liste. Die Rückfrage nennt Datum und Trainingsart.
- **Archiv**: Andere Trainings stehen in der Liste. Die Detailansicht zeigt nur und bietet den Rückweg „‹ Archiv“. Keine Sackgasse gefunden.
- **Während eines laufenden Trainings**: Karte und Verlauf-Knopf fehlen, wie in der Spezifikation vorgesehen. Ein Hinweis, warum, fehlt. Das ist kein Finding, weil das Training sichtbar läuft.
- **Texte**: Durchgängig Deutsch und mit den Begriffen aus `docs/begriffe.md` (anderes Training, Trainingsart). Fehlermeldungen nennen, was zu tun ist („Bitte eine Trainingsart eintragen, z. B. ‚Beachvolleyball‘“, „Bitte die Dauer in ganzen Minuten eintragen (1 bis 600)“, „Das Datum liegt in der Zukunft.“). Bei der letzten Meldung könnte stehen, was zu tun ist, z. B. „Bitte ein Datum bis heute wählen.“

## Checkliste: nur auf einem echten iPhone prüfbar

Am iPhone 13 mini, App über „Zum Home-Bildschirm“ installiert, falls nicht anders angegeben.

1. **H-1, Tap nach dem Tippen**:
   - (a) Training im Fokus: ins Gewichtsfeld tippen, Wert eintippen, **ohne „Fertig“** direkt „Satz fertig“ antippen. Zählt der Satz beim ersten Tap? Zehnmal wiederholen.
   - (b) Sheet „Anderes Training“: Dauer eintippen, direkt „+“ antippen, dann direkt „Speichern“. Reagiert jeweils der erste Tap?
   - (c) Gleiches mit dem Bearbeiten-Sheet im Verlauf („Fertig“).
2. **M-1, Springen des Sheets**: Mit mehreren Vorschlägen das Sheet etwas nach unten scrollen, „+“ dreimal antippen. Springt der Inhalt nach oben? Trifft man versehentlich einen Vorschlag? Ohne Trainingsart „Speichern“: Ist die Fehlermeldung zu sehen?
3. **Datumsauswahl**:
   - Darstellung in der halben Breite (Text abgeschnitten?), Höhe gleich wie das Dauer-Feld?
   - Lässt sich ein Datum in der Zukunft wählen (WebKit-Bug 225639)? Kommt dann beim Speichern die Meldung, und ist sie sichtbar?
   - Was macht „Zurücksetzen“ in der Auswahl (leeres Feld → „Bitte ein Datum wählen.“)?
4. **Tastatur im Sheet**: Ins Feld Trainingsart tippen. Bleibt das Feld über der Tastatur? Notiz antippen: Ist das Feld sichtbar, lässt sich danach „Speichern“ erreichen, ohne die Tastatur zu schließen? Zifferntastatur der Dauer: Gibt es „Fertig“ in der Leiste über der Tastatur?
5. **RPE-Regler im Sheet** (wie Runde 4, Punkt 4): Tipp auf die Spur, Ziehen, zweites Ziehen, senkrechtes Wischen scrollt das Sheet und ändert den Wert nicht, VoiceOver-Wischen nach oben.
6. **VoiceOver im Sheet**: Reihenfolge Überschrift → Trainingsart → Vorschläge (Ansage „gewählt“) → Datum → Dauer (Name, −/+) → RPE → Notiz → „Speichern“. Wird die Fehlermeldung angesagt? Wo steht der VoiceOver-Cursor nach „Speichern“ (N-4)?
7. **Verlauf und Archiv**: Gemischte Liste flüssig scrollbar? Detailansicht mit langem Namen der Trainingsart? „Training löschen“ mit Rückfrage. Im Archiv kein „Korrigieren“.
8. **Hintergrund-Tap** (N-2): Bei offenem Sheet oben ins Dunkle tippen. Gehen die Eingaben verloren? Ist das im Alltag passiert?
9. **Safe Area**: Sheet unten über dem Home-Indikator, „Abbrechen“ voll antippbar? Im Querformat: Sheet nicht unter der Notch?
10. **Zoom und größerer Text**: Safari „aA“ 125 % und 150 %: Datum und Dauer untereinander, −/+ treffbar, Vorschläge ohne waagrechtes Scrollen? Anzeigezoom „Größerer Text“.
11. **Fancy-Stil im Sheet**: Glas-Hintergrund hinter Datum, Dauer und Vorschlägen gut lesbar (Blur am Gerät)?
12. **Datenfluss**: Anderes Training eintragen, „Als Datei sichern“ → In Dateien sichern („Ersetzen“). Datei im Archiv öffnen: Ist das andere Training da? Coach-Export „Teilen“: Erscheint es im Text?
13. **Weiter offen aus Runde 4**: Punkte 1 bis 13 der Checkliste in `reviews/ios-ux-r4.md`. Sie gelten unverändert, darunter Ton mit Stummschalter, Wake Lock, Timer im Hintergrund, App-Beenden, Offline, Update, gelöschte Daten, Dateien-App, VoiceOver im Training.

## Quellen

- W3C Pointer Events, „Compatibility mapping with mouse events“ (Kompatibilitäts-Mausereignisse folgen bei Touch auf `pointerup`): https://w3c.github.io/pointerevents/#compatibility-mapping-with-mouse-events
- W3C Touch Events, „Interaction with Mouse Events and click“ (`mousedown`/`mouseup`/`click` erst nach `touchend`): https://w3c.github.io/touch-events/#mouse-events
- WebKit-Bug 225639, „[iOS] HTML datepicker's min-max attribute not working“: https://bugs.webkit.org/show_bug.cgi?id=225639
- WebKit-Bug 223128, „date/time input min and max attribute are ignored“: https://bugs.webkit.org/show_bug.cgi?id=223128
- Apple Developer Forums, „iOS and iPadOS date pickers ignores min/max date range when opening“: https://developer.apple.com/forums/thread/743096
- WCAG 2.2: 1.4.3 Kontrast (Minimum), 2.5.3 Label in Name, 2.5.8 Zielgröße (Minimum): https://www.w3.org/TR/WCAG22/
- Frühere Runden: `reviews/ios-ux-r2.md` (H-2), `reviews/ios-ux-r4.md`, Antworten in `reviews/umsetzung-r2.md` und `reviews/umsetzung-r4.md`.

## Zusammenfassung nach Schwere

| Schwere | Anzahl | Findings |
|---|---|---|
| Kritisch | 0 | – |
| Hoch | 1 | H-1 Erster Tap nach dem Tippen geht mit Touch verloren (Sheet „Speichern“, −/+, im Training „Satz fertig“) |
| Mittel | 2 | M-1 Sheet springt bei jedem Neuzeichnen nach oben, Fehlermeldung außer Sicht · M-2 „Speichern“ immer unterhalb des sichtbaren Bereichs |
| Niedrig | 5 | N-1 −/+ der Dauer 40 px breit · N-2 Hintergrund-Tap verwirft Eingaben · N-3 Backup-Status unter der Tab-Leiste · N-4 Fokus nach „Speichern“ verloren · N-5 Dauer-Feld: Name und Ansage |
