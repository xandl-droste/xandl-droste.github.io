# Review 3: iOS-Safari, Barrierefreiheit und Bedienbarkeit auf kleinen Displays (Runde 4)

Stand: Commit `f0fb7c1` (Zwischenstand vor den Fixes aus Runde 4, im öffentlichen Repo nicht auffindbar), Version 2.0.0. Verglichen mit 1.0.1 (`62b944b`). Schwerpunkt: was für 2.0 neu ist (Tag „Haupt“, RIR-Abfrage, RPE und Notiz beim Abschluss, Korrektur im Verlauf, Export für Coach, eine Trainingsdatei pro Durchgang mit „Erst sichern“, Archiv-Tab, Aufräumen älterer Trainingsdateien).

## Wichtige Einschränkung dieser Runde

**WebKit war nicht verfügbar.** In `/opt/pw-browsers` liegt nur Chromium. Den Download von Playwright-WebKit hat der Netzwerk-Proxy blockiert (`playwright.download.prss.microsoft.com`, 403). Alle Browser-Messungen dieser Runde stammen deshalb aus **Chromium mit Mobil-Emulation** (`isMobile`, `hasTouch`, iPhone-User-Agent, DPR 3). Layout, Maße, Überläufe und Kontraste lassen sich so verlässlich messen. iOS-eigenes Verhalten (Schieberegler, Tastatur, Teilen-Menü, VoiceOver) nicht. Das betrifft vor allem M-4 und M-6, die deshalb ausdrücklich auf die Checkliste verweisen. Auch `bugs.webkit.org` und `lists.webkit.org` waren aus der Sitzung nicht erreichbar. Quellen dazu stammen aus Suchergebnissen.

## Geprüfte Punkte

- **Unit-Tests**: `npm test`: 178 von 178 grün.
- **Repo-Browser-Tests** (`tests/e2e/*.e2e.mjs`, `BASE_URL` auf Port 8783): in Chromium alle 9 ohne Probleme und ohne externe Requests (training, import, offline, info, insecure, speichern, rir, durchgang, archiv). In WebKit konnte keiner laufen (siehe oben).
- **Eigener Durchlauf** (Skript außerhalb des Repos, Plan mit vier Hauptübungen: Back Squat, RDL, Klimmzug, Wadenheben): Onboarding, Archiv ohne Plan, Import-Vorschau, Heute, Fokus, RIR in der Pausenleiste (Fokus und Liste), RIR in der Karte nach der Pause, Fokus „Alle Sätze erledigt“ mit RIR, Abschluss-Dialog mit RPE und Notiz, Fertig-Bildschirm, Verlauf, Verlauf-Detail, Sheets für RPE, RIR und Notiz zum Training, Plan-Tab, Sheet „Export für Coach“, Archiv leer, Archiv mit Trainingsdatei (mit Vorgänger), Archiv-Detail, neuer Plan mit „Nachfolger“, Sheet „Erst sichern“.
  - Pro Bildschirm gemessen: horizontaler Überlauf, Höhe gegen sichtbare Höhe, alle sichtbaren Bedienelemente unter 44 px, Eingabefelder unter 16 px, Textkontrast (WCAG 1.4.3, mit Alpha-Mischung und ungünstigstem Verlaufsstopp bei Fancy).
  - Größen: 375 × 630 in **Hell, Dunkel und Fancy**; dazu Dunkel in 320 × 568, 250 × 420 (entspricht etwa 150 % Seitenzoom am 13 mini) und 812 × 340 (Querformat).
- **Eingaben**: keine Felder unter 16 px. Neue Felder (Notiz zum Training im Abschluss-Dialog und im Verlauf, RPE-Schieberegler) haben 16 px bzw. keine Texteingabe.
- **Kontraste**: In allen drei Stilen keine Unterschreitung bei neuen Elementen (Tag „Haupt“, RIR-Leiste mit „Ziel“, RPE-Wert, Skalenzahlen 12 px, Archiv-Karten, „Erst sichern“). Gemeldet wurde nur das deaktivierte „−“ der Wochenwahl (Opazität .35); deaktivierte Elemente sind von 1.4.3 ausgenommen.
- **Bedienelemente auf 375 × 630**: Außer den RIR-Chips in der Pausenleiste (44 × 40, siehe M-2) und dem bekannten Umschalter Liste/Fokus (44 × 32 sichtbar, per `::after` 44 × 45) ist alles mindestens 44 px. Die Hauptaktionen haben 48 px oder mehr.
- **Fokus-Modus bei 375 × 630**: passt ohne Scrollen, auch mit RIR-Chips in der Pausenleiste und mit der RIR-Karte nach dem letzten Satz (Höhe 630 = 630).
- **Code gelesen** (2.0-Änderungen): `views/live.js` (RIR-Chips, Leiste, Panel), `views/rpe.js`, `views/history.js`, `views/archive.js`, `views/plan.js`, `app.js` (Abschluss-Dialog, `withBackupFirst`, `switchToFile`, Archiv, `cleanUpOtherFiles`, Neuzeichnen und Fokus-Wiederherstellung), `storage.js`, `export.js`, `css/app.css`, `sw.js` (die neuen Module stehen in der Precache-Liste).
- **Barrierefreiheit im Code**: RIR-Chips mit `aria-pressed`, Gruppenbeschriftung mit Übungsname, Ansage beim Setzen und Entfernen; RPE-Regler mit `aria-label` und `aria-valuetext`; Archiv-Karten mit `aria-label`; Zurück-Link im Archiv-Detail („‹ Archiv“); keine neuen Animationen (`prefers-reduced-motion` bleibt gültig); Fokus-Rahmen für den Regler vorhanden.
- **Nachgeprüft aus Runde 3** (siehe Abschnitt unten).

## Nicht prüfbar (mit Grund)

- **Alles, was echtes iOS braucht**: Verhalten des Schiebereglers unter iOS (Tipp auf die Spur, Ziehen nach Fokus), Bildschirmtastatur im Abschluss-Dialog, Teilen-Menü mit `.md` und `.training.json`, Abbruch im Dialog „In Dateien sichern“, Dateiauswahl im Archiv, VoiceOver und Sprachsteuerung, Safe Area, Ton und Stummschalter, Wake Lock. Siehe Checkliste.
- **WebKit-Emulation**: nicht installiert und nicht herunterladbar (siehe oben). Die Unterschiede zwischen Chromium und WebKit (z. B. `summary`-Darstellung, Range-Input) konnten deshalb nicht verglichen werden.
- **Sheet „Ältere Trainingsdateien im Browser“** (Aufräumen nach dem Umstieg von 1.x): nur über den Repo-Test `durchgang.e2e.mjs` (grün) und den Code geprüft, nicht vermessen und nicht als Screenshot angesehen.
- **Update von 1.0.1 auf 2.0 mit laufendem Training**: nicht nachgestellt.

## Findings

### Kritisch

Keine.

### Hoch

Keine.

### Mittel

#### M-1: Liste: Am Pausenende springt der nächste Satz um rund 100 px nach unten

- **Fundstelle**: `training/src/views/live.js:150` (`rirCardPanel`: Panel nur dann nicht in der Karte, wenn die Chips gerade in der Pausenleiste stehen), `:123` (`rirBarItem` endet mit der Pause), `app.js` Timer-Tick (`softRender` am Pausenende).
- **Nachstellen**: Ansicht Liste, Hauptübung (z. B. Back Squat) bis zum letzten Satz abhaken. Während der Pause steht die RIR-Frage in der Leiste, die Karte bleibt klein. Pause enden lassen oder „Weiter“. Gemessen (375 × 630): Oberkante des aktiven Satzes vorher 287 px, nachher 388 px bei gleicher Scrollposition (`scrollY` 706 → 706). Die Seite wird 93 px höher (2571 → 2664). Das passiert auch, wenn der RIR in der Leiste schon beantwortet wurde, denn das Panel erscheint immer, solange die Übung fertig ist.
- **Beschreibung**: Mit dem Ende der Pause wird oberhalb des Satzes, den man als Nächstes antippen will, die Frage „Wie viele Wiederholungen wären noch gegangen?“ mit fünf Chips eingefügt. Liste ist die Standardansicht. Es passiert nach jeder Hauptübung, also mehrmals pro Training, und zwar genau im Moment des Signals, in dem man zum Handy greift.
- **Auswirkung**: Der Zielsatz rutscht weg, unter der Fingerposition liegen dann Kopf und „⋯“ der Superset-Karte oder Chips. Fehltaps öffnen meist nur ein Sheet, aber der Zustand wirkt unruhig. Die Spezifikation verlangt stabile Elemente und keine versehentlichen Taps. Rückgabe aus Runde 1: Neuzeichnen per `replaceChildren` lässt keine Scroll-Verankerung zu (Safari hat ohnehin keine CSS-Scroll-Verankerung).
- **Empfehlung**: Das Panel in der Karte schon während der Pause einblenden (reservierter Platz, kein Sprung), dafür in der Leiste nur einen kurzen Hinweis zeigen. Oder: nach beantwortetem RIR in der Karte nur eine kleine Zeile „RIR 2 · ändern“ statt der fünf Chips, und vor dem Einfügen die Scrollposition um die Höhenänderung oberhalb des aktiven Satzes korrigieren (`scrollBy`).
- **Sicherheit der Einschätzung**: hoch (gemessen, Ursache im Code eindeutig).

#### M-2: RIR-Chips in der Pausenleiste ohne Abstand zu „Rückgängig“ und „Weiter“

- **Fundstelle**: `training/css/app.css:270-274` (Chips 40 px hoch, `::after` je 2 px größer), Leiste `live.js:478`.
- **Nachstellen (375 × 630)**: Letzten Satz einer Hauptübung abhaken. Gemessen: „Rückgängig“ y 522–566, x 142–258; „Weiter“ y 522–566, x 275–350; Chips sichtbar ab y 566, Tippfläche (per `::after`) ab y 564. Abstand senkrecht 0 px, die Tippflächen überlappen 2 px. Chips „1“ und „2“ liegen direkt unter „Rückgängig“, „3“ und „4+“ direkt unter „Weiter“. Chips 44 × 40 sichtbar, waagrecht 4 px Abstand.
- **Beschreibung**: In 1.0.1 stand in dieser Zeile nur der Text „Als Nächstes“, also nichts Antippbares. Jetzt stehen fünf Knöpfe ohne Abstand unter den beiden Knöpfen, die man direkt nach dem Satz benutzt. „Rückgängig“ ist 10 s lang sichtbar, genau dann, wenn man den RIR einträgt; danach steht dort „+30 s“.
- **Auswirkung**: Mit müden oder feuchten Händen trifft ein Tap auf den oberen Rand eines Chips „Rückgängig“ (öffnet den Satz wieder, der RIR fällt weg) oder „Weiter“ (beendet die Pause sofort, nicht umkehrbar). Umgekehrt landet ein Tap auf „Rückgängig“ als RIR-Wert. Die Spezifikation verlangt genügend Abstand und keine versehentlichen Taps neben dem Timer. Der Abstandsfix aus Runde 3 (16 px zwischen „Rückgängig“ und „Weiter“) ist umgesetzt, gilt aber nur waagrecht.
- **Empfehlung**: Zeilenabstand in der Leiste bei sichtbaren RIR-Chips auf mindestens 8 px setzen (`.card.rest:has(.rir-bar) { row-gap: 8px }` oder eine Klasse), Chips sichtbar 44 px hoch. Die Leiste wird dadurch rund 12 px höher; im Fokus ist dafür Platz (bei 375 × 630 ist zwischen „Satz fertig“ und der Leiste über 150 px frei, gesehen im Screenshot beim Klimmzug; bei Übungen mit Gewichts-Stepper und Notiz vom letzten Mal vorher nachmessen). Den Abstand in `rir.e2e.mjs` messen (dort ist die Grenze aktuell 36 × 40).
- **Sicherheit der Einschätzung**: hoch für die Maße, mittel für die Häufigkeit der Fehltaps (am Gerät prüfen, Checkliste 2).

#### M-3: RIR in der Pausenleiste ohne Übungsnamen; „Als Nächstes“ entfällt dafür

- **Fundstelle**: `training/src/views/live.js:478-481` (Leiste zeigt nur „RIR“ und „Ziel …“; der Name steht nur in `aria-label`).
- **Nachstellen**: Fokus, Back Squat fertig. Oben steht schon die nächste Übung (im Testplan Klimmzug, ebenfalls mit Tag „Haupt“), unten „RIR · Ziel 3 · 0 1 2 3 4+“. Liste mit Hauptübung als Superset-Partner a): Statt „Als Nächstes: b) …“ stehen die Chips.
- **Beschreibung**: Der Entwurf sah „Back Squat · RIR? 0 1 2 3 4+ · Ziel 2“ vor. Umgesetzt ist nur „RIR / Ziel 3“. Wer nach einer Minute wieder aufs Display schaut (Sperrbildschirm, Gespräch), sieht eine RIR-Frage direkt unter einer anderen Hauptübung. Für Supersets verlangt die Spezifikation, dass der Timer zeigt, zu welcher Übung als Nächstes gewechselt wird. Das fehlt während der RIR-Frage.
- **Auswirkung**: Der RIR kann gedanklich der falschen Übung zugeordnet werden (gespeichert wird er immer bei der richtigen, also wird der Wert falsch). In der Liste fehlt während der ganzen Pause der Hinweis auf die nächste Übung.
- **Empfehlung**: In der Leiste den gekürzten Übungsnamen zeigen („Squat: RIR?“, mit Auslassungspunkten), z. B. als erste Zeile des Labels statt „RIR“. Bei Supersets die Chips erst nach dem Wechselhinweis oder den Hinweis in die Zeitzeile („Pause · weiter mit b)“) verlegen.
- **Sicherheit der Einschätzung**: hoch für den Befund, mittel für die Auswirkung.

#### M-4: RPE-Schieberegler: unter iOS vermutlich schwer zu treffen, Neuzeichnen nach jeder Wahl (am Gerät prüfen)

- **Fundstelle**: `training/src/views/rpe.js:30-33` (`onchange` → `onPick`, `onclick` setzt ohne Wert den aktuellen Wert), `app.js:1000ff.` (`finishSheet`: `onPick` ruft `render()`), `app.js` `render()` (Fokus wird nur wiederhergestellt, wenn das Element fokussiert war oder ein Button mit `data-fid` zuletzt getippt wurde).
- **Beschreibung**: Drei Punkte, die in Chromium nicht auftreten, aber unter iOS gut belegt bzw. wahrscheinlich sind:
  1. Unter iOS springt der Griff bei einem Tipp auf die Spur nicht an die Stelle, man muss den Griff ziehen (RangeTouch-Doku, StackOverflow, Quirksmode laut Telerik-Forum). Ohne Wert steht der Regler intern auf 5. Ein Tipp etwa auf „8“ löst dann nur `click` aus, `onclick` übernimmt `read(e)` = **5**. Man bekommt „5 · schwer“ statt nichts oder 8.
  2. WebKit-Bug 266283 (Dez. 2023): Ein **fokussierter** Range-Regler lässt sich unter iOS nicht ziehen. Ob der Regler nach dem ersten Tipp fokussiert ist und `render()` ihn wieder fokussiert, hängt von iOS ab (WebKit-Bug 299087: Klick fokussiert in Safari 18.6 nicht). Falls doch, scheitert das zweite Ziehen.
  3. Jede Änderung zeichnet das Sheet neu (`replaceChildren`). Mit VoiceOver (Wischen nach oben/unten am Regler) ersetzt das bei jedem Schritt das Element; ob der VoiceOver-Cursor auf dem Regler bleibt, ist offen. Zusätzlich springt das Sheet nach oben: in Chromium von `scrollTop` 23 auf 0, weil der Abschluss-Dialog jetzt 575 px hoch ist und nur 552 px Platz hat.
- **Auswirkung**: Die RPE ist freiwillig, ein falscher Wert landet aber unbemerkt im Coach-Export. Im schlechtesten Fall lässt sich der Wert am iPhone nur mühsam einstellen.
- **Empfehlung**: Am Gerät prüfen (Checkliste 4). Falls bestätigt: elf Chips (0–10, zwei Reihen à 6/5, 44 px) wie im Entwurf 2.0 vorgesehen, oder Regler behalten und eine eigene Zeigerbehandlung (`pointerdown` auf der Spur → Wert aus der x-Position), ohne `onclick`-Übernahme. Beim Wählen nicht das ganze Sheet neu zeichnen, sondern nur Wert und „Zurücksetzen“ aktualisieren.
- **Sicherheit der Einschätzung**: mittel. Punkt 1 ist ein lang bekanntes iOS-Verhalten, ich konnte es mangels WebKit und Gerät aber nicht nachstellen. Punkt 2 und 3 sind unsicher.

#### M-5: Seitenzoom 150 % (250 px Breite): vierter Tab und RIR-Chips laufen über, RIR-Chips in der Leiste nur 21 px breit

- **Fundstelle**: `training/src/app.js:233` (vier Tabs), `css/app.css:292` (`.tabs button` ohne Mindestbreite und Umbruch), `:131` und `:151` (`.chips.rir-chips` `nowrap`, Chips `min-width: 44px`), `:270` (Leisten-Chips `min-width: 0`).
- **Nachstellen**: Breite 250 px (≈ 150 % am 13 mini, das README empfiehlt Seitenzoom für größere Schrift):
  - Heute, Verlauf, Plan, Archiv: Tab „Archiv“ endet bei 256 px, die Seite scrollt waagrecht (`scrollWidth` 256).
  - Liste nach einer Hauptübung: Chip „4+“ der RIR-Frage in der Karte endet bei 273 px (5 × 44 + 4 × 8 = 252 px in einer 208 px breiten Karte).
  - Pausenleiste: Chips 21 × 40 px. Bei 320 px Breite (iPhone SE 1. Gen., ≈ 117 % Zoom) 35 × 40 px.
  - Bei 280 px und mehr laufen die Tabs nicht über.
- **Beschreibung**: Neu mit 2.0. Bis 1.0.1 passten drei Tabs. Die Anpassungen für schmale Breiten aus Runde 2 und 3 (Superset untereinander, Gewichtsfeld) decken die neuen Elemente nicht ab.
- **Auswirkung**: Horizontales Scrollen auf jedem Hauptbildschirm bei 150 %, im Training ein angeschnittener Chip. Die Spezifikation verbietet horizontales Scrollen, die Leisten-Chips liegen weit unter 44 px.
- **Empfehlung**: `.tabs button { min-width: 0; padding: 0 4px; }` und unter 280 px `font-size: 14px` (oder Tabs mit Symbol und kurzer Beschriftung). RIR-Chips in der Karte unter 330 px mit `min-width: 0` bzw. `flex-wrap: wrap` (3 + 2). In der Leiste unter 330 px die Chips in eine eigene Zeile über die ganze Breite legen (die Leiste ist dort ohnehin `position: static`).
- **Sicherheit der Einschätzung**: hoch für die Messwerte, mittel für die Gleichsetzung Breite = Zoomstufe (wie in Runde 3).

#### M-6: Wechsel der Trainingsdatei: Die bisherige wird sofort nach einem „erfolgreichen“ Export aus dem Browser gelöscht, auch nach dem Download-Fallback

- **Fundstelle**: `training/src/app.js:514-524` (`withBackupFirst`: `if (await doExport()) await proceed();`), `:526-539` (`switchToFile` löscht die bisherige im selben Schreibvorgang und ruft `showToast(toastText)`), `doExport` (Download zählt als gesichert, Hinweis „Bitte prüfen, ob sie in ‚Dateien‘ … liegt“ nur als Toast), `export.js:12-39`.
- **Beschreibung**: Ab 2.0 ist die bisherige Trainingsdatei nach dem Wechsel nur noch in Dateien (Entwurf 3.5). Die App verlässt sich dafür auf das Ergebnis des Teilen-Menüs:
  - Beim Download-Fallback (kein `canShare` mit Dateien oder `NotAllowedError`) gilt die Datei sofort als gesichert. Der Hinweis „Bitte prüfen …“ wird im selben Moment vom Toast „Übernommen.“ bzw. „Plan neu gestartet …“ ersetzt, man sieht ihn nicht. In der Home-Bildschirm-App unter iOS führten Blob-Downloads in der Vergangenheit oft zu nichts Brauchbarem.
  - Beim Teilen zählt jedes abgeschlossene Ziel, nicht nur „In Dateien sichern“ (z. B. „Kopieren“ oder eine Nachricht an sich selbst).
  - Der Dialog „Erst sichern“ sagt nicht, was im Teilen-Menü zu wählen ist (Fertig-Bildschirm und Spezifikation: „In Dateien sichern, bei Rückfrage Ersetzen wählen“). Bei „Plan erneut starten“ hat die neue Datei einen neuen Namen, für die bisherige gilt aber weiterhin der alte, also ist „Ersetzen“ hier richtig.
- **Auswirkung**: Selten, aber endgültig: Wenn die Datei nicht wirklich in Dateien liegt, sind die Trainings des bisherigen Durchgangs weg. Vor 2.0 blieb die bisherige Datei im Browser.
- **Empfehlung**: Nach dem Export und vor dem Löschen kurz bestätigen lassen („Liegt die Datei in Dateien? Ja, wechseln / Nochmal sichern“), mindestens beim Download-Fallback. Im Dialog „Erst sichern“ Dateinamen und den Satz „Im Teilen-Menü ‚In Dateien sichern‘ wählen, bei Rückfrage ‚Ersetzen‘“ zeigen. Am Gerät prüfen, ob ein Abbruch im Dialog „In Dateien sichern“ als `AbortError` ankommt (Checkliste 7).
- **Sicherheit der Einschätzung**: hoch für den Ablauf im Code, mittel für die Häufigkeit (unter iOS 15+ wird normalerweise geteilt, nicht heruntergeladen).

### Niedrig

#### N-1: Abschluss-Dialog: Tap neben das Sheet verwirft RPE und Notiz; Dialog ist höher als der Bildschirm

- **Fundstelle**: `app.js:240` (Tap auf den Hintergrund schließt jedes Sheet), `app.js:949-950` (`askFinish` setzt `finishInput` beim Öffnen zurück).
- **Nachstellen**: „Abschließen“, RPE wählen, Notiz tippen, oben auf den abgedunkelten Streifen tippen, wieder „Beenden“: RPE „–“, Notiz leer. Der Dialog ist bei 375 × 630 575 px hoch bei 552 px Platz; „Training verwerfen“ ist erst nach Scrollen ganz sichtbar.
- **Auswirkung**: Eine getippte Notiz geht durch einen Fehltap verloren.
- **Empfehlung**: `finishInput` nur nach Speichern oder Verwerfen zurücksetzen. Den Hintergrund-Tap bei Sheets mit Eingaben nicht schließen lassen.
- **Sicherheit der Einschätzung**: hoch (nachgestellt).

#### N-2: „Pause“ wird zu „Paus“ abgeschnitten, solange „Rückgängig“ sichtbar ist

- **Fundstelle**: `css/app.css:254` und `:257` (`minmax(0, 1fr)`, `overflow: hidden` ohne Auslassungspunkte).
- **Nachstellen**: 375 × 630, Satz abhaken: „3:00 Paus“ (alle Stile). Folge des breiteren Abstands aus Runde 3, nicht speziell 2.0.
- **Empfehlung**: `text-overflow: ellipsis` oder unter 400 px das Wort weglassen (die Farbe der Zeit zeigt den Zustand, `aria-label` bleibt).
- **Sicherheit der Einschätzung**: hoch (Screenshot).

#### N-3: „Ziel“ in der RIR-Leiste nur 11 px

- **Fundstelle**: `css/app.css:268`.
- **Beschreibung**: Kleinster Text der App, liegt in der wichtigsten Leiste. Kontrast reicht (gemessen), die Größe ist aus Armlänge im Studio aber kaum lesbar. `.rest.ready .rir-label small` (`:275`) greift nie, weil die Chips nur während einer laufenden Pause in der Leiste stehen.
- **Empfehlung**: mindestens 13 px, „Ziel 2–3“ notfalls einzeilig neben „RIR“. Die tote Regel entfernen.
- **Sicherheit der Einschätzung**: hoch.

#### N-4: Tag „Haupt“ erklärt sich nur über `title`

- **Fundstelle**: `views/live.js:107-108`, `views/plan.js` (`exerciseLine`).
- **Beschreibung**: Die Erklärung („nach dem letzten Satz kommt die RIR-Frage“) steht nur im `title`. Auf dem iPhone gibt es keinen Tooltip, VoiceOver liest `title` bei einem `span` nicht zuverlässig. Gelesen wird nur „Haupt“, zwischen Übungsname und „⋯“.
- **Empfehlung**: Einmal im Plan-Tab einen Satz zur Bedeutung zeigen; für VoiceOver „Hauptübung“ als versteckten Text.
- **Sicherheit der Einschätzung**: mittel.

## Nachgeprüft aus Runde 3

| Punkt R3 | Stand 2.0 | Prüfung |
|---|---|---|
| M-1 Abstand „Rückgängig“/„Weiter“ | behoben: 17 px (142–258 / 275–350) | gemessen, Chromium 375 × 630 |
| M-2 Gewichtsfeld bei Zoom | Regel `@media (max-width: 340px)` legt das Feld über die Knöpfe | nur Code, nicht neu gemessen |
| M-3 kein Ton bei Stummschalter | offen (Betreiber entscheidet nach Gerätetest), kein `audioSession` im Code | Code |
| N-1 1 px zu hoch | behoben: Höhe 630 = 630 auf allen passenden Bildschirmen | gemessen |
| N-2 „Als Nächstes“ beim Halten | behoben („Halten läuft: …“) | Code |
| N-3 Label in Name | behoben („Weiter, Pause beenden“) | Accessibility-Name im Skript gelesen |
| N-4 bis N-8 | laut `umsetzung-r3.md` „später“, im CSS unverändert (kein `summary::after`, kein `inert`) | Code |
| N-9 Querformat Fokus scrollt | bekannt, abgelehnt. Mit 2.0 gilt das auch für die RIR-Chips: bei 812 × 340 steht die Leiste unten (`position: static`), man muss pro Hauptübung hinunterscrollen | gemessen |

## Bedienfluss (gezählt in Chromium)

- RIR: 0 Taps (überspringen) oder 1 Tap während der Pause. Korrektur im Verlauf: Detail → „Ändern“ → Chip → „Fertig“ (3).
- Abschluss: „Abschließen“ → „Beenden und speichern“ (2, wie 1.0.1). Mit RPE und Notiz: + Ziehen + Tippen in das Feld.
- Export für Coach: Plan → „Export für Coach“ → „Teilen“ → Ziel im Teilen-Menü (3 in der App).
- Nachfolger: Plan → „Plan öffnen (Datei)“ → Datei → „Nachfolger“ → „Übernehmen“ → ggf. „Als Datei sichern und weiter“ → Teilen-Menü. Abbrechen bricht sauber ab (Repo-Test `durchgang`).
- Archiv: Tab „Archiv“ → „Datei ansehen“ → Datei (2 + Auswahl). Ohne Plan vom Start über „Ältere Datei im Archiv ansehen“, Rückweg über „‹ Start“ (keine Sackgasse).
- Texte durchgängig Deutsch und mit den Begriffen aus `docs/begriffe.md` (Trainingsdatei, Durchgang, Nachfolger, Sichern). Keine Fehlermeldung ohne Handlungsanweisung gefunden.

## Checkliste: nur auf einem echten iPhone prüfbar

Am iPhone 13 mini, App über „Zum Home-Bildschirm“ installiert, falls nicht anders angegeben. Punkte aus Runde 3, die weiter gelten, stehen am Ende.

1. **M-1, Sprung**: Liste, Hauptübung beenden, Daumen über den nächsten Satz halten, Pausenende abwarten. Springt der Satz weg? Fehltaps?
2. **M-2, RIR-Chips**: Zehnmal direkt nach dem letzten Satz einer Hauptübung einen Chip tippen bzw. „Rückgängig“ tippen. Wie oft trifft man das Falsche?
3. **M-3**: Nach einer Hauptübung das Handy sperren, nach 1 min entsperren. Ist klar, zu welcher Übung die RIR-Frage gehört?
4. **M-4, RPE-Regler** (Abschluss-Dialog und Verlauf → „Ändern“): (a) Ohne Wert auf die Spur bei „8“ tippen: was steht danach da? (b) Griff ziehen, loslassen, gleich noch einmal ziehen: lässt er sich bewegen? (c) VoiceOver: Regler wählen, nach oben wischen: bleibt der VoiceOver-Cursor auf dem Regler, was wird angesagt? (d) Senkrecht über den Regler wischen: scrollt das Sheet, ohne den Wert zu ändern?
5. **Abschluss-Dialog mit Tastatur**: Notizfeld antippen. Verdeckt die Tastatur „Beenden und speichern“? Kommt man ohne Schließen der Tastatur zum Knopf? Bleibt die Notiz nach „Fertig“ erhalten?
6. **M-5, Zoom**: Im Safari-Tab „aA“ 125 % und 150 %: Tabbar ohne waagrechtes Scrollen? RIR-Chips in Leiste und Karte treffbar? Anzeigezoom „Größerer Text“ (320 pt): Leisten-Chips?
7. **M-6, Sichern vor dem Wechsel**: „Plan erneut starten“ mit ungesichertem Stand → „Als Datei sichern und weiter“ → „In Dateien sichern“ → im Ordnerdialog „Abbrechen“. Wechselt die App trotzdem? Gleiches mit „Kopieren“ als Ziel. Danach in Dateien prüfen, ob die bisherige Datei mit allen Trainings da ist („Ersetzen“ angeboten?).
8. **Export für Coach**: „Teilen“ bietet eine `.md`-Datei an (nicht nur Text)? In Dateien sichern, in einer KI-App öffnen. „Kopieren“ setzt den ganzen Text in die Zwischenablage?
9. **Archiv**: „Datei ansehen“ → Dateien-App: sind `.training.json` und `plan.json` wählbar? Abbrechen lässt nichts hängen? App in den Hintergrund und zurück: Archiv noch da? Nach App-Beenden leer?
10. **Ältere Trainingsdateien beim Umstieg**: Mit einem 1.0.1-Stand, der nach „Ganz neu“ eine ungesicherte ältere Datei enthält, auf 2.0 aktualisieren. Erscheint das Sheet, passt es auf den Bildschirm, funktionieren „Als Datei sichern“, „Verwerfen“ (mit Rückfrage) und „Später“?
11. **Update 1.0.1 → 2.0 während eines laufenden Trainings**: Training fortsetzen, RIR nach der nächsten Hauptübung (der alte Plan hat keine Hauptübungen: keine Frage erwartet), Abschluss mit RPE.
12. **VoiceOver, neue Teile**: RIR-Chips (Ansage „2 Wiederholungen im Tank“, gewählt/nicht gewählt), Tag „Haupt“, Archiv-Karten, „Erst sichern“-Dialog (Fokus auf der Überschrift).
13. **Aus Runde 3 weiter offen**: Punkte 2 bis 20 der Checkliste in `reviews/ios-ux-r3.md` (Tastatur im Bearbeiten-Sheet, Ton mit Stummschalter, Wake Lock, Timer im Hintergrund, App-Beenden, Safe Area, Sticky/Overscroll, Export mit „Ersetzen“, Import aus Dateien, Offline, Update, gelöschte Daten, Dynamic Type, VoiceOver, Sprachsteuerung, Fancy-Hintergrund, Konsole). Für 2.0 zusätzlich bei Punkt 11 (Export) den neuen Dateinamen `<planname>-<JJJJ-MM-TT>.training.json` prüfen: Bietet „In Dateien sichern“ beim zweiten Sichern derselben Trainingsdatei „Ersetzen“ an?

## Quellen

- WebKit-Bug 266283 „Cannot drag the thumb of a focused <input type=range> on iOS“ (Dez. 2023): https://bugs.webkit.org/show_bug.cgi?id=266283 (aus der Sitzung nicht abrufbar, Inhalt aus der Mailingliste in den Suchergebnissen: https://lists.webkit.org/pipermail/webkit-unassigned/2023-December/1139040.html)
- WebKit-Bug 299087 (Klick fokussiert Range-Input in Safari 18.6 nicht): https://bugs.webkit.org/show_bug.cgi?id=299087
- RangeTouch (Tipp auf die Spur bewegt den Griff auf Touch-Geräten nicht): https://github.com/selz/rangetouch
- StackOverflow „range input slider on mobile“ (iOS 11.4, Griff springt nicht an die Tippstelle): https://kiwix.lema.org/stackoverflow.com_en_all_2023-11/questions/51614553/range-input-slider-on-mobile
- Telerik-Forum „range input type on mobile“ (verweist auf Quirksmode: unter iOS erst tippen, dann ziehen): https://www.telerik.com/forums/range-input-type-on-mobile
- WCAG 2.2: 1.4.3 Kontrast (Minimum), 2.5.8 Zielgröße (Minimum), 2.5.3 Label in Name: https://www.w3.org/TR/WCAG22/
- Frühere Runde: `reviews/ios-ux-r3.md`, Antworten in `reviews/umsetzung-r3.md`.

## Zusammenfassung nach Schwere

| Schwere | Anzahl | Findings |
|---|---|---|
| Kritisch | 0 | – |
| Hoch | 0 | – |
| Mittel | 6 | M-1 Sprung in der Liste am Pausenende · M-2 RIR-Chips ohne Abstand zu „Rückgängig“/„Weiter“ · M-3 RIR-Leiste ohne Übungsname, „Als Nächstes“ fehlt · M-4 RPE-Regler unter iOS (am Gerät prüfen) · M-5 Überlauf bei 150 % (Tabs, RIR-Chips) · M-6 Löschen der bisherigen Trainingsdatei nach unsicherem Export |
| Niedrig | 4 | N-1 Fehltap verwirft RPE/Notiz · N-2 „Paus“ abgeschnitten · N-3 „Ziel“ 11 px · N-4 „Haupt“ nur per `title` erklärt |
