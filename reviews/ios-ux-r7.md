# Review Runde 7: iOS-Safari, Barrierefreiheit und Bedienbarkeit auf kleinen Displays

Reviewer 3 (frische Instanz). Grundlage: `docs/spezifikation.md` (vollständig gelesen, Rolle laut Abschnitt 9), `CLAUDE.md`, `docs/stand.md`, `docs/begriffe.md`. Geprüft wurde der Stand `6ad6a6a`; während der Prüfung kam `5dfd97f` dazu (nur der Zwecktext der Info-Seite und `sw.js`), das ist berücksichtigt. Version 3.0.0.

In dieser Umgebung gibt es nur **Chromium**, kein WebKit. Alle Browser-Messungen liefen in Chromium mit Mobil-Emulation (375 × 630, `isMobile`, `hasTouch`, `deviceScaleFactor` 2, `locale` de-AT). Getippt wurde mit Touch (`locator.tap()`). **Nichts in diesem Bericht ist in WebKit oder auf einem iPhone geprüft.** Was davon abhängt, steht in der Checkliste am Ende.

## Geprüfte Punkte

- **Unit-Tests**: `npm test`, 207/207 bestanden.
- **Browser-Prüfungen des Repos** (Chromium, `BASE_URL=http://127.0.0.1:8773/training/`): alle zehn Skripte aus `npm run e2e` (training, import, offline, info, insecure, speichern, rir, durchgang, archiv, anderes-training). Alle ohne Probleme, ohne externe Requests. `training.e2e` prüft dabei für jeden Satz zweier Einheiten, dass der Fokus bei 375 × 630 nicht scrollt; `anderes-training.e2e` enthält die Prüfung „Wert tippen, dann ±“ an vier Stellen.
- **Eigener Rundgang mit Messung** (Skripte außerhalb des Repos), pro Bildschirm horizontaler Überlauf, Höhe, Elemente rechts außerhalb, sichtbare Bedienelemente unter 44 px, mit Screenshots. Bildschirme: Start ohne Plan, Import-Vorschau, Menü, Heute, Sheet „Anderes Training eintragen“, Training Liste (mit und ohne Pause), Bearbeiten-Sheet, Optionen-Sheet, Fokus, „Training beenden?“ nach einem Satz (vorzeitiges Ende), „Training abgeschlossen“, Verlauf, Verlaufsdetail, Plan, Archiv, Info.
  - Stile **Hell, Dunkel und Fancy** bei 375 × 630, dazu Dunkel bei 320 × 568 und im Querformat 812 × 340.
  - Ergebnis: nirgends horizontales Scrollen, nichts rechts abgeschnitten, keine JS-Fehler. Unter 44 px sind nur das Zahlenfeld im Gewichts-Stepper (Höhe 26–40 px, Tippfläche über das per `for` verknüpfte Label vergrößert) und der Umschalter Liste/Fokus (sichtbar 44 × 32, Tippfläche per `::after` 44 × 45). Beides wie in Runde 6, bewusst so, kein Finding.
  - Fokus bei 375 × 630: passt ohne Scrollen (mit Stepper, „Satz fertig“ und Pausentimer). Bei 320 × 568 scrollt er um 54 px, im Querformat liegt der Timer unter dem Inhalt (Absicht laut CSS); beides nicht die Referenzgröße, Querformat steht in `docs/wishlist.md`.
- **Fixes aus Runde 6 nachgeprüft** (Chromium, Touch):
  - H-1 (Wert tippen, dann −/+): Fokus „82,5“ eingetippt, dann „+0,5“ → 83. Wiederholungen „8“, dann „−“ → 7. Bestätigt; Verlauf und Dauer deckt der Repo-Test ab (grün). Siehe aber M-1 (Sonderfall, wenn der Fokus im Feld bleibt).
  - N-1 („Beenden und speichern“ unter dem Rand): Nach einem Satz „Beenden“: „Beenden und speichern“ 509–559 px, „Weiter trainieren“ 567–617 px bei 630 px Höhe, fest unten. Bei 320 × 568 ebenfalls sichtbar (447–555 px). Mit emulierter Safe Area (375 × 812, `--safe-b` 34 px) endet „Weiter trainieren“ 46 px über dem unteren Rand, also über dem Home-Indikator. „Training verwerfen“ liegt im scrollenden Teil.
  - N-2 (Tab nach einer Eingabe): Gewicht „70“, Tab → Fokus auf „Gewicht um 0,5 kg erhöhen“, nächster Tab „… 2,5 kg erhöhen“. Behoben.
  - N-3 (RPE-Regler ohne Wert): Griff und Spur ohne Wert mit Rand in `--mut`. Gerechnet: Hell `#55635c` auf `#f4f6f4` ca. 5,6 : 1, Dunkel `#9aa8a2` auf `#0f1412` ca. 7,9 : 1, Fancy `#e4dcf7` auf dem Verlauf über 9 : 1. Im Screenshot deutlich als Regler erkennbar. Behoben.
  - N-4 (Überschriften in Listen-Buttons): `<span class="list-title">` statt `<h3>` (Code, `views/history.js`). Behoben.
  - Wert tippen, dann direkt „Satz fertig“: Der Satz zählt beim ersten Tap mit dem getippten Gewicht (77,5).
- **Code gelesen**: `app.js` vollständig (Neuzeichnen und `renderAfterTap`, Fokus-Wiederherstellung in `render()`, Sheets, Training, Abschluss, Verlauf, Import, Export, Service Worker), `views/live.js`, `views/activity.js`, `views/rpe.js`, die Änderungen in `views/history.js`, `format.js` (`parseNum`, `fmtNum`), `model/live.js` (`stepValue`), `css/app.css`, `index.html`, `manifest.webmanifest`. Dazu `reviews/ios-ux-r6.md` und `reviews/umsetzung-r6.md`.
- **Barrierefreiheit im Code**: Icon-Buttons mit `aria-label`, Chips und Umschalter mit `aria-pressed`, Tabs mit `aria-current="page"`, Sheets mit `role="dialog"`, `aria-modal`, Namen und Fokus auf der Überschrift; beim Schließen geht der Fokus an den Auslöser zurück. Ansagen über eine dauerhafte Live-Region, Timer mit `role="timer"` und `aria-live="off"`. Zustände („übersprungen“, „später“, „nicht gesichert“, „Haupt“) als Text. `prefers-reduced-motion` schaltet Übergänge ab. Sichtbarer Fokus über `:focus-visible` (3 px). Kontraste der Textfarben: unverändert seit Runde 6 (dort in allen drei Stilen gemessen); neu gerechnet nur die RPE-Ränder (oben).
- **Bedienfluss** (unverändert gegenüber Runde 6, im Rundgang nachvollzogen): erster Satz 2 Taps („Training starten“, Haken), pro Satz 1 Tap, bis zum Export 5–6 Taps, anderes Training mit Vorschlag 3 Taps. Texte durchgängig Deutsch, Begriffe nach `docs/begriffe.md`.

## Nicht prüfbar (mit Grund)

- **WebKit-Emulation**: in dieser Umgebung nicht vorhanden. Damit ungeprüft: Reihenfolge `pointerup`/`blur`/`change`/`click` beim Tippen unter iOS und ob ein Tap auf einen Button das Eingabefeld überhaupt verlässt (entscheidend für M-1), `position: sticky` mit negativem `bottom` in Sheets, Datumsauswahl, Zifferntastatur, Verhalten fester Elemente bei offener Tastatur, `overscroll-behavior`, Scroll-Chaining hinter Sheets.
- **Echtes iPhone**: Home-Bildschirm-Betrieb, Statusleiste, Wake Lock, Ton und Vibration, Timer nach App-Wechsel und Sperre, App-Beenden, Teilen-Menü und Dateien-App, Offline und Update, gelöschte Browserdaten, VoiceOver, Blur-Leistung im Fancy-Stil. Alles in der Checkliste.
- **Dynamic Type**: feste px-Größen ohne `-apple-system-body` (seit Runde 1 abgelehnt, `reviews/umsetzung-r2.md`). Ersatzweise 320 px Breite gemessen (entspricht etwa 115 % Seitenzoom). Nicht erneut als Finding geführt.
- **Teilen-Menü, Dateien, Offline, Service-Worker-Update**: nur über die Repo-Prüfungen `offline`, `speichern`, `insecure` (Chromium) und Code.
- **Tastatur über Sheets**: Chromium-Emulation blendet keine Bildschirmtastatur ein; siehe N-1 und Checkliste.

## Findings

### Kritisch

Keine.

### Hoch

Keine.

### Mittel

#### M-1: Bleibt der Fokus beim Tap auf −/+ im Zahlenfeld, zeigt das Feld danach den alten getippten Wert, gespeichert wird ein anderer

- **Fundstelle**: `training/src/app.js:1405–1438` (`render()`: `typed` wird aus dem fokussierten Feld gelesen und nach dem Neuzeichnen per `target.value = typed.value` ins neue Feld geschrieben, unabhängig davon, ob sich der Wert im Zustand gerade geändert hat). Betroffen sind alle −/+, die sofort `render()` aufrufen: `views/live.js:385` (`bump` → `A.setValue` → `setLive` → `render`), `app.js:843–846` (`HE.setValue`), `views/activity.js:80–87` (Dauer, `A.update(…, { render: true })`).
- **Nachstellen** (Chromium, 375 × 630): Fokus-Ansicht, ins Gewichtsfeld tippen, „90“ eingeben. Dann „+2,5“ auslösen, ohne dass das Feld den Fokus verliert (im Test per `element.click()`; so verhält sich ein Browser, der beim Tap auf einen Button das Feld nicht verlässt). Ergebnis: Das Feld zeigt weiter **90**. Ein zweites „+2,5“: Feld weiter **90**, im laufenden Training gespeichert **92,5**. „Satz fertig“ speichert den Satz mit **92,5 kg**, sichtbar war 90.
- **Beschreibung**: Die Übernahme des getippten Texts in `render()` ist als Schutz gedacht, falls „während des Tippens“ neu gezeichnet wird. Sie greift aber auch, wenn der Tap selbst den Wert geändert hat: Der Stepper rechnet richtig (seit dem Fix aus Runde 6 vom Feldinhalt), danach überschreibt `render()` die neue Zahl im Feld wieder mit dem alten Text. Weil der Feldinhalt per Skript gesetzt wird, kommt kein `change`, Zustand und Anzeige bleiben auseinander. Jeder weitere Tap rechnet vom angezeigten Text aus, „+“ scheint also nichts zu tun, während im Hintergrund ein anderer Wert steht. In Chromium mit Touch tritt das nicht auf, weil der Tap das Feld verlässt (`blur` → `change` vor `click`).
- **Auswirkung**: Ob das am iPhone vorkommt, hängt davon ab, ob ein Tap auf einen `<button>` bei offener Tastatur das Feld verlässt. Das ist nicht dokumentiert (Berichte und Foren widersprechen sich, siehe Quellen) und hier nicht prüfbar. Sicher betroffen sind Wege, bei denen der Fokus im Feld bleibt: Hardware-Tastatur am iPad/iPhone mit Tastenkürzeln, Schalter- und Sprachsteuerung, eventuell VoiceOver-Doppeltipp. Folge im ungünstigen Fall: Ein anderes Gewicht als angezeigt landet im Satz und speist Vorbelegung, Steigerungsvorschlag, Coach-Export und Garmin-Export, ohne dass man es sieht.
- **Empfehlung**: Den getippten Text nur übernehmen, wenn der Zustand für dieses Feld nicht gerade durch eine Aktion geändert wurde. Am einfachsten im Stepper-Handler zuerst das Feld verlassen: in `bump` (live.js) und im Dauer-`bump` (activity.js) `if (document.activeElement === input) input.blur();` vor dem Setzen; der `change` übernimmt dann den getippten Wert, danach setzt `setValue` den neuen. Alternativ in `render()` `typed` nur verwenden, wenn `typed.value` nicht mehr zum Zustand passt bzw. nur bei zeitgesteuertem Neuzeichnen (`softRender`). Browser-Test ergänzen: Feld fokussiert lassen, Button per `click()` auslösen, erwartet Feld = Zustand = getippter Wert ± Schritt (Training, Verlauf, Dauer).
- **Sicherheit der Einschätzung**: hoch für den Mechanismus (in Chromium reproduziert, Code eindeutig); gering bis mittel, ob ein normaler Tap am iPhone ihn auslöst (Checkliste Punkt 1b).

### Niedrig

#### N-1: Querformat mit Tastatur: feste Aktionen nehmen in Sheets fast den ganzen sichtbaren Platz

- **Fundstelle**: `training/css/app.css:327–331` (`.sheet-actions`, `position: sticky`), genutzt in `finishSheet` (`app.js:1173–1197`) und im Sheet „Anderes Training“ (`views/activity.js:68–73`).
- **Nachstellen**: 812 × 340, Training starten, einen Satz abhaken, „Beenden“. Das Sheet ist 299 px hoch, der feste Bereich mit „Beenden und speichern“ und „Weiter trainieren“ belegt davon 125 px (Screenshot). Am iPhone 13 mini im Querformat verdeckt die Tastatur zusätzlich gut die Hälfte des Bildschirms; dann bleibt für die Notiz kaum Platz, möglicherweise liegt das Textfeld ganz hinter dem festen Bereich.
- **Auswirkung**: Nur im Querformat beim Eintippen einer Notiz (Abschluss, anderes Training). Kein Datenverlust; man kann die Tastatur schließen. Im Hochformat (Referenz) unproblematisch.
- **Empfehlung**: Im niedrigen Querformat (`@media (max-height: 560px)`) `.sheet-actions` nicht festhalten (`position: static`, wie schon beim Pausentimer), oder die beiden Knöpfe dort nebeneinander statt untereinander.
- **Sicherheit**: mittel (Höhen gemessen; das Zusammenspiel mit der iOS-Tastatur nicht prüfbar, Checkliste Punkt 4).

#### N-2: „Training verwerfen“ steht beim Vorlesen und am Ende des Scrollbereichs direkt vor der Hauptaktion

- **Fundstelle**: `training/src/app.js:1190–1197`.
- **Beschreibung**: Seit dem Fix für r6 N-1 ist die DOM-Reihenfolge „… Notiz → Training verwerfen → Beenden und speichern → Weiter trainieren“. VoiceOver liest die zerstörerische Aktion vor der Hauptaktion. Ist der Inhalt kurz (alle Sätze erledigt) oder ganz nach unten gescrollt, steht „Training verwerfen“ unmittelbar über „Beenden und speichern“, nur durch die Trennlinie des festen Bereichs getrennt.
- **Auswirkung**: Gering, „Training verwerfen“ fragt nach. Nach „Abbrechen“ in der Rückfrage ist allerdings auch der Abschluss-Dialog zu (man landet im Training; RPE und Notiz bleiben erhalten).
- **Empfehlung**: „Training verwerfen“ als Textlink ans Ende des scrollenden Teils mit etwas Abstand (z. B. `margin-top: 12px`) oder als `link` in Gefahrenfarbe; „Abbrechen“ in der Rückfrage zurück in den Abschluss-Dialog statt ins Training.
- **Sicherheit**: hoch für Reihenfolge und Lage; gering für die tatsächliche Fehltap-Rate.

### Weiter offen aus früheren Runden (nicht neu gezählt)

| Punkt | Stand |
|---|---|
| Hintergrund bei offenem Sheet nicht `inert`, `overscroll-behavior: contain` am Sheet fehlt (Runde 1 N-9, Runde 3 N-8, „später“) | unverändert (`sheetFrame`, `app.js:264`; `.sheet > .card`, `app.css:306`). Checkliste Punkte 5 und 6. |
| Dynamic Type (Runde 1 N-1, abgelehnt) | unverändert |
| Fokus im Querformat und bei 320 × 568 scrollt (Wunschliste) | unverändert |

## Checkliste: nur auf einem echten iPhone prüfbar

Am iPhone 13 mini, App über „Zum Home-Bildschirm“ installiert, falls nicht anders angegeben.

1. **Tippen und danach direkt tippen**:
   - (a) Fokus: Gewicht eintippen, ohne „Fertig“ direkt „Satz fertig“. Zählt der Satz beim ersten Tap mit dem getippten Gewicht? Zehnmal.
   - (b) Fokus: Gewicht „80“ eintippen, Tastatur offen lassen, direkt „+2,5“. **Steht im Feld 82,5, und schließt sich dabei die Tastatur?** Bleibt die Tastatur offen und das Feld zeigt 80, ist M-1 am Gerät real: dann noch einmal „+2,5“ und „Satz fertig“, danach im Verlauf nachsehen, welches Gewicht gespeichert ist.
   - (c) Gleiches im Bearbeiten-Sheet der Liste, in der Korrektur im Verlauf und bei der Dauer im Sheet „Anderes Training“.
   - (d) Mit offener Tastatur auf eine leere Stelle tippen: Schließt die Tastatur, und erscheint der Wert ohne spürbare Verzögerung?
2. **„Fertig“ in der Leiste über der Zifferntastatur**: Gibt es sie im Home-Bildschirm-Betrieb? Schließt ein Tap darauf die Tastatur, ohne dass sie gleich wieder aufgeht?
3. **Markieren beim Antippen eines Zahlenfelds**: Ist der alte Wert markiert, sodass die erste Ziffer ihn ersetzt?
4. **Tastatur und Sheets**: „Training beenden?“ nach vorzeitigem Ende: Notiz antippen, bleibt das Textfeld über dem festen Bereich mit „Beenden und speichern“ sichtbar? Dasselbe im Querformat (N-1). Sheet „Anderes Training“: Trainingsart und Notiz antippen, bleibt das Feld sichtbar und „Speichern“ erreichbar? Nach dem Schließen der Tastatur: Sitzt das Sheet wieder bündig unten?
5. **Scrollen**: Bei offenem Sheet am Ende weiter wischen: Scrollt die Seite dahinter mit? Gummiband am Seitenanfang im Training? Pausentimer und Tab-Leiste stabil beim Ein- und Ausblenden der Safari-Leiste (im Browser-Tab)?
6. **VoiceOver**: Kommt man per Wischen aus einem offenen Sheet in den Hintergrund? Reihenfolge im Abschluss-Dialog (N-2: „Training verwerfen“ vor „Beenden und speichern“). Ansage nach dem Haken, RIR-Chips, „Rückgängig“. Verlaufsliste: Was wird bei einem Eintrag vorgelesen? Stepper mit VoiceOver: Wert eintippen, dann „+“ per Doppeltipp: stimmen Ansage, Feld und gespeicherter Wert überein (M-1)?
7. **Datumsauswahl im Sheet „Anderes Training“**: Darstellung in halber Breite, Datum in der Zukunft wählbar (WebKit-Bug 225639) und dann Meldung sichtbar.
8. **RPE-Regler**: Ohne Wert bei Tageslicht erkennbar (Rand seit r6)? Tipp auf die Spur, Ziehen, senkrechtes Wischen scrollt das Sheet ohne Wertänderung.
9. **Safe Area und Statusleiste**: feste Sheet-Aktionen (Abschluss-Dialog jetzt auch) über dem Home-Indikator, Timer nicht im Home-Indikator, Statusleiste im Stil Hell lesbar, im Querformat nichts unter der Notch.
10. **Fancy**: Glas-Karten lesbar, Scrollen der langen Liste ohne Ruckeln (viele `backdrop-filter`), Hintergrund-Verlauf beim Scrollen.
11. **Weiter offen aus früheren Runden**: Ton mit Stummschalter, Vibration, Wake Lock nach Rückkehr, Timer nach Sperre und App-Wechsel, App beenden mitten im Training und fortsetzen, Teilen-Menü „In Dateien sichern“ mit „Ersetzen“ und Abbruch, Import aus der Dateien-App, Flugmodus nach der ersten Ladung, Update des Service Workers (Hinweis „Neue Version verfügbar“, nicht mitten im Training), gelöschte Website-Daten und Wiederherstellung per Import, Zoom 125/150 % im Safari-Tab. Einzelheiten: `reviews/ios-ux-r4.md`, `reviews/ios-ux-r5.md`, `reviews/ios-ux-r6.md`, jeweils „Checkliste“.

## Quellen

- W3C Pointer Events, „Compatibility mapping with mouse events“: https://w3c.github.io/pointerevents/#compatibility-mapping-with-mouse-events
- HTML Living Standard, Ereignis `change` bei Textfeldern (nur durch Nutzereingabe, nicht beim Setzen per Skript): https://html.spec.whatwg.org/multipage/input.html#common-input-element-events
- WebKit-Bug 198922 (Tastatur bleibt nach „Fertig“/Ausblenden offen, Fokusverhalten bei offener Tastatur): https://bugs.webkit.org/show_bug.cgi?id=198922
- Apple Developer Forums, „iOS13 – Date/Time input: blur event is not fired immediately on dialog close“ (Feld verliert den Fokus erst beim nächsten Tap auf ein fokussierbares Element): https://developer.apple.com/forums/thread/123777
- Ionic Keyboard Plugin Issue 81 (Tastatur bei Tap auf einen Button offen halten, d. h. Standard ist Schließen): https://github.com/driftyco/ionic-plugin-keyboard/issues/81
- WCAG 2.2: 1.4.3, 1.4.11, 2.4.3, 2.5.8: https://www.w3.org/TR/WCAG22/
- WebKit-Bug 225639 (Datumsauswahl ignoriert min/max): https://bugs.webkit.org/show_bug.cgi?id=225639

## Zusammenfassung nach Schwere

| Schwere | Anzahl | Findings |
|---|---|---|
| Kritisch | 0 | – |
| Hoch | 0 | – |
| Mittel | 1 | M-1 Bleibt der Fokus beim Tap auf −/+ im Feld, überschreibt `render()` die neue Zahl mit dem alten Text; Anzeige und gespeicherter Wert laufen auseinander |
| Niedrig | 2 | N-1 Querformat mit Tastatur: feste Sheet-Aktionen nehmen fast den ganzen Platz · N-2 „Training verwerfen“ vor bzw. direkt über „Beenden und speichern“ |

Alle Findings aus Runde 6 (H-1, N-1 bis N-4) sind in Chromium als behoben bestätigt.
