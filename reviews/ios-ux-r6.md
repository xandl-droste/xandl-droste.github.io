# Review Runde 6: iOS-Safari, Barrierefreiheit und Bedienbarkeit auf kleinen Displays

Reviewer 3 (frische Instanz). Grundlage: `docs/spezifikation.md` (vollständig gelesen, Rolle laut Abschnitt 9), `CLAUDE.md`, Stand `32a6680` („Review Runde 5 umgesetzt …“), Version 3.0.0.

In dieser Umgebung gibt es nur **Chromium**, kein WebKit. Alle Browser-Messungen liefen in Chromium mit Mobil-Emulation (375 × 630, `isMobile`, `hasTouch`, `deviceScaleFactor` 2, `locale` de-AT). Getippt wurde mit Touch (`locator.tap()`), nicht mit Mausklicks. **Nichts in diesem Bericht ist in WebKit oder auf einem iPhone geprüft.** Was davon abhängt, steht in der Checkliste am Ende.

## Geprüfte Punkte

- **Unit-Tests**: `npm test`, alle bestanden (0 fehlgeschlagen).
- **Browser-Prüfungen des Repos** (Chromium, `BASE_URL=http://127.0.0.1:8773/training/`): alle zehn Skripte aus `npm run e2e` (training, import, offline, info, insecure, speichern, rir, durchgang, archiv, anderes-training). Alle ohne Probleme und ohne externe Requests. `training.e2e` prüft dabei für jeden Satz zweier Einheiten im Fokus, dass bei 375 × 630 nichts scrollt.
- **Eigener Rundgang mit Messung** (Skripte außerhalb des Repos), pro Bildschirm: horizontaler Überlauf, Höhe, Elemente rechts außerhalb, sichtbare Bedienelemente unter 44 px. Bildschirme: Start ohne Plan, Agent-Prompt, Import-Vorschau, Heute, Menü, Sheet „Anderes Training eintragen“, Training Liste (mit und ohne Pause), Bearbeiten-Sheet, Optionen-Sheet, Fokus (Beginn und Mitte), „Training beenden?“, „Training abgeschlossen“, Verlauf, Verlaufsdetail (Krafttraining und anderes Training), Plan, Export für Coach, Archiv, Info.
  - Größen: 375 × 630 (Referenz), 320 × 568, 288 × 485 (etwa 130 % Seitenzoom), 812 × 340 (Querformat).
  - Ergebnis: nirgends horizontales Scrollen, nichts rechts abgeschnitten. Einziges Element unter 44 px ist das Zahlenfeld im Gewichts-Stepper (Höhe 26–40 px je nach Breite). Das zugehörige Label „Gewicht · kg“ ist per `for` verknüpft und vergrößert die Tippfläche; ich werte das nicht als Finding.
  - Fokus bei 375 × 630: passt ohne Scrollen. Bei 320 × 568 scrollt er um 54 px, im Querformat liegt der Timer unter dem Inhalt (Absicht laut CSS, `max-height: 560px`). Beides sind nicht die Referenzgröße.
- **Safe Area** (emuliert, 375 × 812, `--safe-t` 50 px, `--safe-b` 34 px wie im Home-Bildschirm-Betrieb): Pausentimer endet 50 px über dem unteren Rand, „Speichern“ im Sheet 47 px darüber, also oberhalb des Home-Indikators. Heller Streifen hinter der Statusleiste im Stil Hell ist vorhanden.
- **Kontraste** (WCAG 1.4.3, Alpha-Mischung, bei Fancy der ungünstigste Verlaufsstopp) für Heute, Sheet „Anderes Training“, Verlauf, Plan, Training mit laufender Pause in **Hell, Dunkel und Fancy**: keine Textfarbe unter 4,5 : 1 bzw. 3 : 1 bei großer Schrift. Nicht-Text-Kontraste von Hand gerechnet (siehe N-3).
- **Gezielte Proben**:
  - Wert tippen, danach direkt −/+ antippen (Fokus, Bearbeiten-Sheet, Korrektur im Verlauf, Dauer im Sheet): siehe H-1.
  - Wert tippen, danach direkt „Satz fertig“ antippen: Der Satz zählt beim ersten Tap (Fix aus Runde 5 wirkt in Chromium).
  - Tab nach einer Eingabe (Tastatur): siehe N-2.
  - Höhe aller Sheets und Lage der Hauptaktion bei 375 × 630: siehe N-1.
  - Wischen auf dem Sheet-Hintergrund: Die Seite dahinter scrollt in Chromium nicht.
- **Code gelesen**: `app.js` vollständig (Neuzeichnen, `renderAfterTap`, Sheets, Fokus-Rückgabe, Training, Abschluss, Verlauf, Import, Export, Service Worker), `views/live.js`, `views/activity.js`, `views/rpe.js`, `views/history.js`, `views/plan.js`, `views/archive.js`, `dom.js`, `css/app.css`, `index.html`. Dazu `reviews/umsetzung-r5.md`, um die Fixes aus Runde 5 gezielt nachzuprüfen.
- **Barrierefreiheit im Code**: Icon-Buttons haben `aria-label`, Chips und Umschalter `aria-pressed`, Tabs `aria-current="page"`, Sheets `role="dialog"`, `aria-modal` und einen Namen, beim Öffnen bekommt die Überschrift den Fokus, beim Schließen der Auslöser. Ansagen laufen über eine dauerhafte Live-Region. Timer haben `role="timer"` mit `aria-live="off"`. Zustände („übersprungen“, „später“, „nicht gesichert“, „Haupt“) stehen als Text. `prefers-reduced-motion` schaltet Übergänge ab; Animationen gibt es keine. Sichtbarer Fokus über `:focus-visible` (3 px).
- **Bedienfluss** (Taps gezählt im Rundgang):
  - Erster Satz: App öffnen → „Training starten“ → Haken bzw. „Satz fertig“: **2 Taps**.
  - Pro Satz: **1 Tap** (Werte vorbelegt), Pause startet von selbst.
  - Bis zum Export: „Abschließen“ → „Beenden und speichern“ → „Als Datei sichern“ → im Teilen-Menü „In Dateien sichern“ → „Sichern“ (ggf. „Ersetzen“): **5–6 Taps**.
  - Anderes Training mit Vorschlag: „Anderes Training eintragen“ → Vorschlag → „Speichern“: **3 Taps**.
  - Texte durchgängig Deutsch, Begriffe wie in `docs/begriffe.md`. Fehlermeldungen im Sheet nennen, was zu tun ist.

## Nicht prüfbar (mit Grund)

- **WebKit-Emulation**: in dieser Umgebung nicht vorhanden. Damit ungeprüft: Reihenfolge `blur`/`change`/`click` beim Tippen unter iOS, `position: sticky` mit negativem `bottom` im Sheet (`.sheet-actions`), Datumsauswahl, Zifferntastatur, Verhalten fester Elemente bei offener Tastatur, `overscroll-behavior`, Scroll-Chaining hinter Sheets.
- **Echtes iPhone**: Home-Bildschirm-Betrieb, Statusleiste, Wake Lock, Ton und Vibration, Timer nach App-Wechsel und Sperre, App-Beenden, Teilen-Menü und Dateien-App, Offline und Update, gelöschte Browserdaten, VoiceOver und Sprachsteuerung, Blur-Leistung im Fancy-Stil. Alles in der Checkliste.
- **Dynamic Type**: Die App nutzt feste px-Größen ohne `-apple-system-body` (seit Runde 1 bewusst abgelehnt, siehe `reviews/umsetzung-r2.md`). Ersatzweise gemessen: Seitenzoom (288 und 320 px Breite). Nicht erneut als Finding geführt.
- **Teilen-Menü, Dateien, Offline, Service-Worker-Update**: nur über die Repo-Prüfungen `offline`, `speichern`, `insecure` (Chromium) und Code; das echte Verhalten nur am Gerät.

## Findings

### Kritisch

Keine.

### Hoch

#### H-1: Wert eintippen und danach direkt −/+ antippen: Der getippte Wert wird verworfen, gerechnet wird vom alten Wert

- **Fundstelle**:
  - `training/src/views/live.js:383` (`const bump = (d) => () => A.setValue(i, s, field, stepValue(value, d))`, `value` stammt aus dem letzten Zeichnen)
  - `training/src/views/activity.js:79–83` (`bump` rechnet mit `value` aus dem letzten Zeichnen)
  - `training/src/app.js:1052–1058` (`A.typeValue`/`A.commitValue` aktualisieren den Zustand ohne Neuzeichnen) und `app.js:844–847` (`HE.typeValue` tut nichts, `HE.commitValue` speichert und zeichnet erst nach dem Tap)
  - `training/src/app.js:153–161` (`renderAfterTap`, Fix für Runde 5 H-1)
- **Nachstellen** (Chromium, 375 × 630, Touch):
  1. Fokus, Trap Bar Jump, Gewicht leer. Ins Gewichtsfeld tippen, „82,5“ eingeben, direkt „+0,5“ antippen. Ergebnis: **0,5 kg** statt 83 kg.
  2. Gleich danach ins Feld Wiederholungen (Vorgabe 4) „8“ eingeben, direkt „−“ antippen. Ergebnis: **3** statt 7.
  3. Verlauf → Training → Satz „70 kg × 4“ → im Sheet „75“ eintippen, direkt „+2,5“. Ergebnis: **72,5 kg** wird gespeichert (statt 77,5).
  4. Sheet „Anderes Training“: Dauer „90“ eintippen, direkt „+“. Ergebnis: **65** statt 95.
- **Beschreibung**: Seit Runde 5 wird nach dem Verlassen eines Felds erst nach dem Tap neu gezeichnet, damit der Tap seinen Button trifft. Der Tap trifft jetzt den alten Button. Dessen Handler rechnet aber mit dem Wert, der beim letzten Zeichnen galt. Der getippte Wert steht zwar schon im Zustand (`typeValue` bzw. `durationMin` im Entwurf), wird aber überschrieben. Im Verlauf speichert `commitValue` den getippten Wert zuerst und `setValue` überschreibt ihn danach mit dem alten Wert plus Schritt. Vor Runde 5 ging der Tap verloren; jetzt wirkt er, aber auf den falschen Ausgangswert.
- **Auswirkung**: Typischer Ablauf am Gerät: Gewicht eintippen und mit ±0,5/±2,5 nachjustieren, oder Wiederholungen eintippen und mit − korrigieren. Dabei steht danach ein falscher Wert im Satz, im schlimmsten Fall 0,5 kg statt 82,5 kg. Wird das nicht bemerkt (müde, zwischen den Sätzen, „Satz fertig“ gleich danach), landet er im Verlauf und speist Vorbelegung, Steigerungsvorschlag, Startwerte, Coach-Export, Agent-Prompt und Garmin-Export. Im Verlauf wird der falsche Wert sofort gespeichert. Der Wert ist zwar sichtbar, aber die Erwartung „+0,5 auf das, was ich gerade eingetippt habe“ wird stumm verletzt.
- **Empfehlung**: Die −/+-Handler lesen den Ausgangswert zum Zeitpunkt des Taps aus dem aktuellen Zustand, nicht aus der Closure:
  - Training: `bump = (d) => () => A.step(i, s, field, d)` mit `A.step` = `updateSet(S.live, i, s, { [field]: stepValue(S.live.session.blocks[i].sets[s][field], d) })`.
  - Verlauf: aktuellen Wert aus `histSession().blocks[bi].sets[si]` lesen.
  - Sheet „Anderes Training“: `S.activityDraft.durationMin` lesen (z. B. `A.bumpDuration(delta)` im App-Teil).
  - Alternativ als Rückfallebene: im Handler zuerst den Wert des zugehörigen Eingabefelds (`#in-<field>-<i>-<s>` bzw. `#act-duration`) parsen, falls es noch im DOM steht.
  - Browser-Test mit `tap()` ergänzen: tippen, dann ±, erwarteter Wert = getippter Wert ± Schritt (alle vier Stellen).
- **Sicherheit der Einschätzung**: hoch. In Chromium an vier Stellen reproduziert. Der Mechanismus hängt nicht vom Browser ab, solange `change` vor `click` kommt. Das ist genau die Reihenfolge, auf der der Fix aus Runde 5 beruht. Ob iOS sie einhält, ist Checkliste Punkt 1.

### Mittel

Keine.

### Niedrig

#### N-1: „Training beenden?“ bei vorzeitigem Ende: „Beenden und speichern“ liegt unter dem Rand des Sheets

- **Fundstelle**: `training/src/app.js:1169–1192` (`finishSheet`), `css/app.css:314–317` (Sheet mit `max-height: 88dvh`). Das Sheet „Anderes Training“ hat dafür seit Runde 5 die festen Aktionen `.sheet-actions` (`app.css:322`), der Abschluss-Dialog nicht.
- **Nachstellen**: 375 × 630, Training starten, einen Satz abhaken, „Beenden“. Die beiden Hinweise („Offene Sätze …“, „Nur 1 von 26 …“) schieben den Inhalt auf 705 px bei 552 px Sheet-Höhe. „Beenden und speichern“ endet bei 650 px, sichtbar sind nur die oberen 30 px. Sind alle Sätze erledigt (Normalfall), passt der Knopf (470–520 px).
- **Auswirkung**: Beim vorzeitigen Beenden muss man scrollen bzw. den Knopf am Rand treffen. Mit offener Tastatur nach der Notiz ist er ganz verdeckt. Kein Datenverlust.
- **Empfehlung**: „Beenden und speichern“ und „Weiter trainieren“ wie im Sheet „Anderes Training“ in `.sheet-actions` legen; „Training verwerfen“ darf im scrollenden Teil bleiben.
- **Sicherheit**: hoch (gemessen). Wie es am iPhone mit Tastatur aussieht, ist Checkliste Punkt 4.

#### N-2: Tab nach dem Ändern eines Werts verliert den Fokus

- **Fundstelle**: `training/src/app.js:1056–1058` (`commitValue` → `renderAfterTap` → ohne Zeiger sofort `render()`), `app.js:1408` und `:1437` (Fokus-Wiederherstellung über `document.activeElement` zum Zeitpunkt von `change`).
- **Nachstellen**: Desktop-Tastatur (gilt auch für iPad-/iPhone-Tastatur und „Schaltersteuerung“), Fokus-Modus, ins Gewichtsfeld „70“ tippen, Tab. Danach liegt der Fokus auf `body`, der nächste Tab springt zum „Menü“ ganz oben. Erwartet: „Gewicht um 0,5 kg erhöhen“.
- **Beschreibung**: `change` kommt vor dem Fokuswechsel. `render()` ersetzt in diesem Moment das fokussierte Feld, der Fokuswechsel des Tab geht ins Leere.
- **Auswirkung**: Für Tastatur- und Schaltersteuerung geht nach jeder Eingabe die Position verloren. Mit VoiceOver per Wischen vermutlich nicht betroffen (Checkliste Punkt 6).
- **Empfehlung**: Bei Eingaben ohne Zeiger nicht in `change` zeichnen, sondern nach dem Fokuswechsel (`setTimeout(render, 0)` bzw. in `focusout` mit `relatedTarget`), damit `render()` das neue aktive Element wiederherstellt.
- **Sicherheit**: hoch in Chromium; am iPhone mit Tastatur nicht geprüft.

#### N-3: RPE-Regler ohne Wert: Griff und Spur kaum sichtbar

- **Fundstelle**: `training/css/app.css:136–145` (`.rpe-range`, `.rpe.unset .rpe-range::-webkit-slider-thumb { background: var(--row); }`).
- **Beschreibung**: Im Zustand „keine Angabe“ hat der Griff die Zeilenfarbe auf dem Sheet-Hintergrund: Hell `#eef2ef` auf `#f4f6f4` = 1,04 : 1, Dunkel `#1f2a25` auf `#0f1412` = 1,25 : 1. Spur und Rand (`--line`) liegen bei 1,2–1,5 : 1. Die Beschriftung „– / keine Angabe“ trägt den Zustand, aber dass es ein Regler zum Ziehen ist, sieht man kaum (WCAG 2.2, 1.4.11 verlangt 3 : 1 für Teile, die zum Erkennen eines Bedienelements nötig sind).
- **Auswirkung**: Im Sheet „Anderes Training“ und beim Abschluss ist bei Sonne im Studio oder müden Augen schwer zu sehen, wo der Griff sitzt.
- **Empfehlung**: Ungesetzten Griff mit deutlichem Rand zeichnen (z. B. `border: 3px solid var(--mut)` auf `--card`) und die Spur mit `--mut` umranden. „Ohne Wert“ bleibt über die gedämpfte Füllung erkennbar.
- **Sicherheit**: mittel (Werte gerechnet; ob 1.4.11 hier greift, ist Auslegungssache).

#### N-4: Überschriften in Listen-Buttons (Verlauf, Archiv)

- **Fundstelle**: `training/src/views/history.js:106–112` und `:119–124` (`<button class="card list-item">` mit `<h3>` darin).
- **Beschreibung**: Ein `<button>` darf laut HTML nur „phrasing content“ enthalten, `<h3>` gehört nicht dazu. VoiceOver liest den Button als Ganzes vor; ob die Überschriften im Rotor „Überschriften“ auftauchen und wohin sie dann springen, ist je nach Version unterschiedlich.
- **Auswirkung**: Gering. Möglicherweise uneinheitliche Navigation per Rotor, Validator-Warnungen.
- **Empfehlung**: Im Button `<span class="h3-like">` statt `<h3>`, oder die Überschrift außerhalb und den Button als Fläche darüber.
- **Sicherheit**: hoch für das Inhaltsmodell, gering für die tatsächliche Wirkung in VoiceOver (nicht geprüft).

### Weiter offen aus früheren Runden (nicht neu gezählt)

| Punkt | Stand |
|---|---|
| Hintergrund bei offenem Sheet nicht `inert` (Runde 1 N-9, Runde 3 N-8, „später“) | unverändert im Code (`sheetFrame`, `app.js:248`). Mit Tab kommt man aus dem Dialog heraus; mit VoiceOver hängt es von `aria-modal` ab (Checkliste Punkt 6). `.sheet > .card { overscroll-behavior: contain; }` fehlt weiterhin (Checkliste Punkt 5). |
| Dynamic Type (Runde 1 N-1, abgelehnt) | unverändert, siehe „Nicht prüfbar“ |

### Fixes aus Runde 5 nachgeprüft (Chromium)

| Runde 5 | Ergebnis |
|---|---|
| H-1 Tap nach dem Tippen | „Satz fertig“ und „Speichern“ reagieren beim ersten Tap. Neue Nebenwirkung bei −/+: H-1 dieses Berichts |
| M-1 Sheet springt | Scrollposition bleibt beim Neuzeichnen (Code `render()`), Meldung steht unten über „Speichern“ |
| M-2 „Speichern“ außer Sicht | fest unten, auch mit emulierter Safe Area oberhalb des Home-Indikators |
| N-1 −/+ 40 px | jetzt 44 px |
| N-2 Hintergrund-Tap | schließt nach einer Eingabe nicht mehr (Code) |
| N-3 Backup unter der Tab-Leiste | bei ungesichertem Stand steht die Backup-Karte vor „Anderes Training“ |
| N-4 Fokus nach „Speichern“ | `closeSheet()` gibt den Fokus an den Auslöser zurück (Code) |
| N-5 Name und Ansage der Dauer | sichtbares Label ist der Name, −/+ sagt „Dauer 65 Minuten“ an (Code) |

## Checkliste: nur auf einem echten iPhone prüfbar

Am iPhone 13 mini, App über „Zum Home-Bildschirm“ installiert, falls nicht anders angegeben.

1. **Tippen und danach direkt tippen** (Runde 5 H-1 und H-1 dieses Berichts):
   - (a) Fokus: Gewicht eintippen, ohne „Fertig“ direkt „Satz fertig“. Zählt der Satz beim ersten Tap, mit dem getippten Gewicht? Zehnmal.
   - (b) Fokus: Gewicht „80“ eintippen, direkt „+2,5“. Steht danach 82,5? (Vor dem Fix von H-1 erwartet: falscher Wert, danach 82,5.)
   - (c) Gleiches im Bearbeiten-Sheet der Liste, in der Korrektur im Verlauf und bei der Dauer im Sheet „Anderes Training“ (dann direkt „Speichern“).
   - (d) Mit Tastatur offen auf eine leere Stelle tippen: Schließt die Tastatur, und erscheint der Wert ohne Verzögerung über einer halben Sekunde?
2. **„Fertig“ in der Leiste über der Zifferntastatur**: Gibt es sie im Home-Bildschirm-Betrieb? Schließt ein Tap darauf die Tastatur, ohne dass sie gleich wieder aufgeht (das Feld wird beim Neuzeichnen ersetzt)?
3. **Markieren beim Antippen eines Zahlenfelds**: Ist der alte Wert markiert, sodass die erste Ziffer ihn ersetzt?
4. **Tastatur und Sheets**: Sheet „Anderes Training“: Trainingsart antippen, bleibt das Feld sichtbar? Notiz antippen: Bleibt „Speichern“ erreichbar? Abschluss-Dialog nach vorzeitigem Beenden (N-1): Notiz tippen, ist „Beenden und speichern“ zu erreichen? Nach dem Schließen der Tastatur: Sitzt das Sheet wieder unten bündig, oder bleibt ein Versatz?
5. **Scrollen**: Bei offenem Sheet am Ende des Inhalts weiter wischen: Scrollt die Seite dahinter mit? Pull-to-Refresh bzw. Gummiband am Seitenanfang im Training? Pausentimer und Tab-Leiste stabil beim Ein- und Ausblenden der Safari-Leiste (im Browser-Tab)? Läuft der Timer während schnellen Scrollens in der Liste ruckelfrei, und springt die Liste, wenn die Pause während des Scrollens endet?
6. **VoiceOver**: Sheet öffnen, kommt man per Wischen aus dem Dialog in den Hintergrund? Fokus-Reihenfolge im Sheet „Anderes Training“ (Überschrift → Trainingsart → Vorschläge → Datum → Dauer mit −/+ → RPE → Notiz → Abbrechen/Speichern). Wird die Fehlermeldung angesagt? Training: Ansage nach dem Haken („… Satz 1 erledigt, Pause 2:30“), RIR-Chips, „Rückgängig“. Verlaufsliste: Was liest VoiceOver bei einem Eintrag, und tauchen die Daten im Rotor „Überschriften“ auf (N-4)? Löst ein Doppeltipp mit VoiceOver das verzögerte Neuzeichnen korrekt aus (H-1 aus Runde 5)?
7. **Datumsauswahl im Sheet**: Darstellung in der halben Breite, Höhe wie das Dauer-Feld, Datum in der Zukunft wählbar (WebKit-Bug 225639) und dann Meldung sichtbar, „Zurücksetzen“ ergibt „Bitte ein Datum wählen.“
8. **RPE-Regler** (N-3): Ohne Wert bei Tageslicht erkennbar? Tipp auf die Spur, Ziehen, senkrechtes Wischen scrollt das Sheet ohne Wertänderung.
9. **Safe Area und Statusleiste**: Sheet-Aktionen über dem Home-Indikator, Timer nicht im Home-Indikator, Statusleiste im Stil Hell lesbar, im Querformat nichts unter der Notch.
10. **Fancy**: Glas-Karten mit Blur lesbar, Scrollen der langen Liste ohne Ruckeln (viele `backdrop-filter`), Hintergrund-Verlauf beim Scrollen (iOS ignoriert `background-attachment: fixed`).
11. **Weiter offen aus Runde 4 und 5**: Ton mit Stummschalter, Vibration, Wake Lock nach Rückkehr, Timer nach Sperre und App-Wechsel (Zeitstempel), App beenden mitten im Training und fortsetzen, Teilen-Menü „In Dateien sichern“ mit „Ersetzen“, Import aus der Dateien-App, Flugmodus nach der ersten Ladung, Update des Service Workers (Hinweis „Neue Version verfügbar“, nicht mitten im Training), gelöschte Website-Daten und Wiederherstellung per Import, Zoom 125/150 % im Safari-Tab. Einzelheiten: `reviews/ios-ux-r4.md` und `reviews/ios-ux-r5.md`, Abschnitt „Checkliste“.

## Quellen

- W3C Pointer Events, „Compatibility mapping with mouse events“ (bei Touch folgen `mousedown`, Fokuswechsel und `click` erst nach `pointerup`): https://w3c.github.io/pointerevents/#compatibility-mapping-with-mouse-events
- W3C Touch Events, „Interaction with Mouse Events and click“: https://w3c.github.io/touch-events/#mouse-events
- HTML Living Standard, Element `button`, Inhaltsmodell „Phrasing content“: https://html.spec.whatwg.org/multipage/form-elements.html#the-button-element
- HTML Living Standard, Ereignis `change` bei Textfeldern (beim Verlassen, vor dem Fokuswechsel): https://html.spec.whatwg.org/multipage/input.html#common-input-element-events
- WCAG 2.2: 1.4.3 Kontrast (Minimum), 1.4.11 Nicht-Text-Kontrast, 2.4.3 Fokus-Reihenfolge, 2.5.8 Zielgröße (Minimum): https://www.w3.org/TR/WCAG22/
- WebKit-Bug 225639, „[iOS] HTML datepicker's min-max attribute not working“: https://bugs.webkit.org/show_bug.cgi?id=225639
- Frühere Runden: `reviews/ios-ux-r5.md`, `reviews/umsetzung-r5.md`, `reviews/ios-ux-r4.md`, `reviews/umsetzung-r2.md`.

## Zusammenfassung nach Schwere

| Schwere | Anzahl | Findings |
|---|---|---|
| Kritisch | 0 | – |
| Hoch | 1 | H-1 Wert tippen und danach direkt −/+: getippter Wert wird verworfen, gerechnet wird vom alten Wert (Fokus, Bearbeiten-Sheet, Korrektur im Verlauf, Dauer im Sheet) |
| Mittel | 0 | – |
| Niedrig | 4 | N-1 „Beenden und speichern“ bei vorzeitigem Ende unter dem Sheet-Rand · N-2 Tab nach einer Eingabe verliert den Fokus · N-3 RPE-Regler ohne Wert kaum sichtbar · N-4 Überschriften in Listen-Buttons |
