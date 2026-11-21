# Review 3: iOS-Safari, Barrierefreiheit und Bedienbarkeit auf kleinen Displays (Runde 2)

Geprüfter Stand: Branch `develop`, Commit `2e7f125`. Rolle und Ausgabeformat nach `docs/spezifikation.md`, Abschnitt 9.

Vorgehen:
- Code-Analyse von `training/index.html`, `training/css/app.css`, `training/src/app.js`, `training/src/views/*.js`, `training/src/model/live.js`, `training/src/storage.js`, `training/src/wakelock.js`, `training/src/export.js`, `training/sw.js`, `training/manifest.webmanifest`.
- Browser-Tests mit Playwright 1.49.1 und WebKit (Build 2104), iPhone-Profil: `isMobile`, `hasTouch`, User-Agent „iPhone 13 Mini“, Viewport 375 × 630, `deviceScaleFactor` 2, Locale `de-AT`. Die App lief lokal über `python3 -m http.server` (127.0.0.1). Werkzeuge, Skripte und Screenshots liegen außerhalb des Repos.
- Seitenzoom habe ich über kleinere Viewports nachgestellt: 125 % = 300 × 504, 150 % = 250 × 420, 200 % = 188 × 315. Querformat: 812 × 330. Kleines Gerät: 320 × 568.
- Kontraste habe ich nach der WCAG-Formel aus den CSS-Variablen berechnet. Bei Fancy habe ich die halbtransparenten Flächen über jeden Verlaufs-Stopp gemischt.
- `npm test`: 93/93 bestanden. Die Browser-Prüfungen des Repos (`tests/e2e/*.e2e.mjs`) liefen mit `BROWSER=webkit`: `training` und `info` ohne Probleme. `import` und `offline` brechen in Playwright-WebKit ab (Gründe unter „Nicht prüfbar“).

## Geprüfte Punkte

| Bereich | Was geprüft wurde | Ergebnis |
|---|---|---|
| Layout 375 × 630 | Onboarding, Menü, KI-Prompt, Heute, Live Liste, Live nach Satz (Timer mit Rückgängig), Bearbeiten-Sheet, Live Fokus, Beenden-Sheet, Abschluss, Verlauf leer/Liste/Detail, Plan mit geöffneter Einheit, Info. Jeweils Hell, Dunkel und Fancy für die Live-Bildschirme | Kein horizontales Scrollen. Nichts abgeschnitten |
| Fokus passt auf 375 × 630 | Gemessen: Stepper enden bei 343 px, „Satz fertig“ 369–433 px, Timer 521–614 px. Dokumenthöhe 631 bei 630 sichtbar (1 px Rundung). Keine Überlappung. Dazu ein komplettes Training aller Einheiten im Fokus-Modus (Repo-Test `training.e2e.mjs` in WebKit) | Passt, in allen drei Stilen |
| Touch-Ziele 375 × 630 | Alle `button`, `a`, `input`, `select`, `textarea`, `summary` auf allen oben genannten Bildschirmen per Bounding-Box vermessen | Keine Ziele unter 44 px. Haupt-Buttons 50–64 px, „Satz fertig“ 64 px, Häkchen 48 px (Superset 44 px) |
| Seitenzoom 125/150/200 %, 320 × 568, Querformat | Gleiche Messung wie oben | Probleme ab 150 %, siehe M-2, N-2, N-6 |
| Eingabefelder | Schriftgröße aller Felder ≥ 16 px (gemessen), `inputmode` (`decimal`/`numeric`), `enterkeyhint`, Verhalten beim Antippen, Tippen und Bestätigen | Schrift und Tastaturtyp in Ordnung. Fehler beim Übernehmen der Eingabe, siehe H-1, H-2, M-1 |
| Doppeltipp, Rückgängig | Doppeltipp auf Häkchen schließt nur einen Satz ab, „Rückgängig“ im Timer öffnet ihn wieder (Repo-Test in WebKit) | In Ordnung |
| Autosave, Neustart | Neuladen mitten im Training: App startet im Training, Werte und erledigte Sätze sind da (Repo-Test in WebKit). Code: jede Änderung geht über `queueSave` in IndexedDB, zusätzlich bei `visibilitychange: hidden` | In Ordnung (Neuladen; echtes App-Beenden auf dem Gerät: Checkliste) |
| Timer | Code: Endzeitpunkt (`rest.endsAt`) statt Zähler, Anzeige alle 250 ms aus dem Zeitstempel | In Ordnung |
| Wake Lock | Code: Anforderung beim Start, erneut bei `visibilitychange: visible`, nach Neustart beim ersten Tippen. Freigabe beim Beenden | Logik in Ordnung. Wirkung nur am Gerät prüfbar |
| Service Worker | WebKit: Registrierung, ein Cache `training-pwa-<version>` mit 33 Einträgen (= Precache-Liste). Code: Update wartet auf „Aktualisieren“, Angebot auch bei späterem Start (`reg.waiting`) und bei Rückkehr in die App (`reg.update()`), laufendes Training wird vor dem Neuladen gesichert | Logik in Ordnung. Offline-Neuladen nicht prüfbar (siehe unten) |
| Export | WebKit: `navigator.canShare({files})` ist wahr, Abschluss → „Als Datei sichern“ meldet „Gesichert.“. Code: Abbruch im Teilen-Menü zählt nicht als Sicherung, sonst Download-Fallback | Ablauf in Ordnung. Teilen-Menü selbst nur am Gerät |
| Kontraste | Alle Text-/Flächen-Paare der drei Stile berechnet (Tabelle unten) | Text überall ≥ 4,5 : 1 |
| VoiceOver-Beschriftung | Accessibility-Baum (`ariaSnapshot`) von Live-Liste und Menü. Code: `aria-label`, `aria-pressed`, `aria-current`, Live-Region `#announce`, Dialog-Rollen | Weitgehend gut. Kleinere Punkte in N-4 |
| `prefers-reduced-motion` | CSS-Regel vorhanden. Die App hat keine Animationen | In Ordnung |
| Fokus-Sichtbarkeit | `:focus-visible` mit 3 px Rand in Akzentfarbe | In Ordnung, eine Ausnahme in N-4 |
| Texte | Alle sichtbaren Texte in Liste, Fokus, Sheets, Abschluss, Verlauf, Plan, Info durchgesehen | Durchgängig Deutsch und verständlich. Eine Abweichung von der Spezifikation in N-5 |
| Externe Requests | WebKit-Netzwerkprotokoll während aller Abläufe | Keine |

### Kontraste (berechnet)

| Paar | Hell | Dunkel | Fancy (schlechtester Verlaufspunkt) |
|---|---|---|---|
| Text auf Hintergrund | 15,4 | 16,9 | > 6 |
| Gedämpft auf Karte | 6,3 | 6,7 | 6,3 |
| Gedämpft auf Zeilenfläche | 5,6 | 6,0 | 4,8 |
| Akzent (Links, „Beenden“) auf Hintergrund | 5,7 | 10,5 | 8,2 |
| Akzent auf Zeilenfläche (Rahmen Häkchen, aktiver Satz) | 5,5 | 8,4 | 4,4 |
| Text auf Akzentfläche (Buttons) | 6,2 | 10,5 | 7,7 (rosa Ende) |
| Warnfarbe auf Karte | 7,3 | 7,3 | 4,9 |

Alle Texte erreichen AA. Rahmen von Ghost-Buttons und Steppern (`--line`) liegen bei 1,3–2,0 : 1. Diese Buttons sind über ihre Beschriftung erkennbar, das ist nach WCAG 1.4.11 zulässig.

## Nicht prüfbar (mit Grund)

- **Echtes iOS-Verhalten**: Safe-Area-Insets (Notch, Home-Indikator), Statusleiste `black-translucent`, Bildschirmtastatur (Höhe, Zubehörleiste, Verdecken), Wake Lock, Teilen-Menü mit „In Dateien sichern“ und „Ersetzen“, Dateien-App beim Import, Gummiband-Scrollen und Pull-to-Refresh, Verhalten der Adressleiste, Wechsel in andere Apps, App-Beenden durch iOS, VoiceOver-Ausgabe. Playwright-WebKit auf macOS ist kein iOS. Siehe Checkliste.
- **Dynamic Type bzw. „Größere Schrift“**: Lässt sich in WebKit nicht einstellen. Per Code-Analyse geprüft: Alle Größen sind in `px`, es gibt kein `-apple-system-body`. Die Einstellung wirkt also nicht (siehe M-2).
- **Offline nach dem ersten Laden**: In Playwright-WebKit bricht jedes Laden im Offline-Modus mit „WebKit encountered an internal error“ ab, auch auf einer neuen Seite. Das ist eine Grenze des Werkzeugs. Den Service Worker habe ich per Code geprüft (Tabelle oben).
- **Repo-Test `import.e2e.mjs` in WebKit**: Er erwartet einen Download. In Playwright-WebKit gibt `navigator.share` sofort Erfolg zurück, also gibt es keinen Download. Das ist ein Werkzeug-Effekt, kein Fehler der App.
- **Speicher voll**: Lässt sich in WebKit nicht nachstellen. Den Code-Pfad habe ich gelesen: Fehlermeldungen in `storageErrorMessage`, Abschlussbildschirm mit Warnung bei fehlgeschlagenem Speichern (`app.js:647-671`).
- **Signal am Pausenende bei gesperrtem Bildschirm**: Ohne Gerät nicht prüfbar. `navigator.vibrate` gibt es unter iOS nicht.

## Findings

### Kritisch

Keine.

### Hoch

#### H-1: Neurendern während der Eingabe löscht getippte Werte und schließt die Tastatur

- **Fundstelle**: `training/src/app.js:758-776` (`render()` ersetzt den ganzen DOM-Baum inklusive offenem Sheet). Auslöser ohne Nutzeraktion: `app.js:552` (Rückgängig-Fenster endet nach 10 s), `app.js:785-791` (Pausenende, „Los!“ endet nach 60 s), `app.js:94-97` (jeder Toast beim Ausblenden), `app.js:797` (Rückkehr in die App). Eingabe: `training/src/views/live.js:185` übernimmt den Wert erst bei `change`.
- **Nachstellen (WebKit, 375 × 630, reproduzierbar)**: Training starten, Häkchen bei Satz 1 antippen, sofort auf den Wert eines Satzes tippen. Im Sheet das Gewichtsfeld antippen und „77,5“ tippen, ohne zu bestätigen. Nach Ablauf der 10 s ist das Feld leer, „Aktuell:“ zeigt weiter den alten Wert. Gleiches mit der Notiz („…“ → Notiz tippen): Nach 10 s liegt der Fokus auf `body`. Der Text bleibt erhalten, weil er bei jeder Eingabe gespeichert wird, aber die Tastatur ist weg.
- **Beschreibung**: Jede Zustandsänderung baut alle Elemente neu. Ein Feld, in das gerade getippt wird, wird ersetzt. Der noch nicht übernommene Text geht verloren. Der Fokus wird zwar per `focus()` auf das neue Feld gesetzt, unter iOS öffnet ein programmatischer Fokus ohne Tippen aber keine Tastatur.
- **Auswirkung**: Das ist der typische Ablauf im Studio: Satz abhaken und gleich die tatsächlichen Wiederholungen korrigieren. Das fällt genau in das 10-s-Fenster. Dasselbe passiert am Ende jeder Pause und beim Ausblenden jedes Toasts. Der Wert ist dann still weg, oder die Tastatur geht mitten im Tippen zu.
- **Empfehlung**: Solange ein Eingabefeld oder eine Textarea den Fokus hat, nicht neu rendern. Zeitgesteuerte Aktualisierungen gezielt ausführen, wie es der Timer schon macht (`#rest-time`). Rückgängig-Fenster, „Los!“ und Toast nur im Timer- bzw. Toast-Element austauschen. Mindestens vor `render()` den Wert eines fokussierten `.num-in` übernehmen (`A.setValue`). Einen e2e-Test ergänzen: tippen, 11 s warten, Wert prüfen.
- **Sicherheit der Einschätzung**: hoch für den Wertverlust (in WebKit reproduziert, folgt direkt aus dem Code). Dass die Tastatur auf dem iPhone zugeht, gilt als wahrscheinlich und ist auf der Checkliste.

#### H-2: „Satz fertig“ bzw. „Fertig“ direkt nach dem Tippen eines Werts: Der Tap geht verloren (WebKit), oder auf dem iPhone möglicherweise der Wert

- **Fundstelle**: `training/src/views/live.js:185` (`onchange` → `A.setValue` → `setLive` → synchrones `render()`), `live.js:236` („Satz fertig“), `app.js:606` („Fertig“ im Bearbeiten-Sheet).
- **Nachstellen (WebKit, Tap und Klick, reproduzierbar)**: Fokus-Modus, Wiederholungsfeld antippen, Zahl tippen, direkt „Satz fertig“ antippen. Der Fortschritt bleibt bei „0 von 26 Sätzen“, erst der zweite Tap schließt den Satz ab. In der Liste: Wert antippen, im Sheet eine Zahl tippen, „Fertig“ antippen. Das Sheet bleibt offen.
- **Beschreibung**: Der Tap auf den Button nimmt dem Feld den Fokus. Dadurch feuert `change`, und `render()` ersetzt den Button, bevor der `click` ankommt. Der Klick landet auf keinem Button mehr. Die Repo-Tests sehen das nicht, weil sie vorher `Enter` drücken. Auf der iOS-Zahlentastatur gibt es keine Enter-Taste. Je nachdem, ob iOS das Feld vor dem `click` verlässt, geht entweder der Tap verloren (wie in WebKit) oder der Satz wird mit dem alten Wert abgeschlossen, weil `change` nach dem Entfernen des Felds nie feuert.
- **Auswirkung**: Das ist der Kernablauf im Fokus-Modus (Wert anpassen, „Satz fertig“). Entweder braucht es einen zweiten Tap, den man mit müden Händen leicht übersieht, oder es landet still ein falscher Wert im Protokoll.
- **Empfehlung**: Werte bei `input` in den Zustand übernehmen (ohne Neurendern, wie bei der Notiz), nicht erst bei `change`. Alternativ in `A.toggle` und beim Schließen eines Sheets zuerst den Wert eines fokussierten `.num-in` übernehmen. Das Neurendern nach `change` auf `requestAnimationFrame` verschieben, damit der `click` den ursprünglichen Button trifft. e2e-Test ohne `Enter`: tippen, dann direkt „Satz fertig“.
- **Sicherheit der Einschätzung**: hoch, dass der Ablauf fehlerhaft ist (in WebKit reproduziert). Welche der beiden Formen auf dem iPhone auftritt, ist nur am Gerät zu klären (Checkliste).

### Mittel

#### M-1: Antippen eines Zahlenfelds markiert den Inhalt nicht. Getippte Ziffern landen neben dem alten Wert

- **Fundstelle**: `training/src/views/live.js:187` (`onfocus: (e) => e.target.select()`).
- **Nachstellen (WebKit, reproduzierbar)**: Fokus-Modus, Wiederholungsfeld (Wert „4“) antippen. `selectionStart` und `selectionEnd` sind 0, nichts ist markiert. „8“ tippen ergibt „84“. Im Bearbeiten-Sheet ergibt „9“ auf „5“ den Wert „95“.
- **Beschreibung**: WebKit setzt die Einfügemarke nach dem `focus`-Ereignis beim Loslassen des Fingers neu und hebt so das `select()` auf. Auf iOS ist dieses Muster bekanntlich unzuverlässig.
- **Auswirkung**: Man muss erst löschen und dann tippen. Wer das übersieht, speichert absurde Werte (84 statt 8 Wdh.). Der Validator lässt bis 1000 zu.
- **Empfehlung**: Markieren nach dem Tippen ausführen, z. B. `setTimeout(() => el.setSelectionRange(0, el.value.length), 0)` im `focus`-Handler, oder zusätzlich in `pointerup`/`click`. Alternativ das Feld beim Fokus leeren und den alten Wert als Platzhalter zeigen.
- **Sicherheit der Einschätzung**: mittel. Reproduziert in WebKit-Emulation. Das genaue Verhalten auf dem iPhone steht auf der Checkliste.

#### M-2: Größere Schrift ist im Home-Bildschirm-Betrieb nicht möglich. Ab 150 % Zoom ist die Superset-Tabelle unbrauchbar

- **Fundstelle**: `training/css/app.css` (alle Größen in `px`, kein `-apple-system-body`), `app.css:121` und `app.css:286-295` (Superset-Zellen), `README.md:105`.
- **Beschreibung**:
  1. Dynamic Type wirkt nicht (Runde 1 N-1, damals abgelehnt). Das README empfiehlt als Ersatz den Safari-Zoom über „aA“. Im empfohlenen Betrieb als Home-Bildschirm-App (README, Schritt 3) gibt es diese Leiste nicht. Dort kann man die Schrift also gar nicht vergrößern, außer mit der systemweiten Lupe bzw. dem Bildschirmzoom.
  2. Gemessen bei 150 % (250 × 420): Die Wert-Buttons in Supersets sind nur 36 px breit, der Inhalt ist auf „6 …“ bzw. „12…“ gekürzt. Die Werte sind nicht lesbar (Screenshot liegt beim Reviewer). Fokus-Modus: Dokument 587 px bei 420 sichtbar, „Satz fertig“ endet bei 433, also unterhalb der Kante.
  3. Bei 200 % (188 × 315): horizontales Scrollen im Training sobald der Timer läuft (Breite 217), im Plan-Tab (240, Wochen-Stepper). Superset-Wert-Buttons nur 5 px breit, Zahlenfelder 34 px breit.
- **Auswirkung**: Mit schlechten Augen oder ohne Brille im Studio gibt es in der installierten App keinen Weg zu größerer Schrift. Wer im Browser zoomt, kann Supersets nicht mehr ablesen.
- **Empfehlung**: Schriftgrößen auf `rem` umstellen und `html { font: -apple-system-body; }` setzen. Mit `@supports` und einer Obergrenze per `clamp()` lässt sich das Fokus-Layout schützen. Superset-Zellen unter ca. 280 px Breite einspaltig stapeln (a über b) statt zwei Spalten. Das README korrigieren: Der „aA“-Zoom gilt nur in Safari, nicht in der Home-Bildschirm-App.
- **Sicherheit der Einschätzung**: hoch für die Messwerte (Emulation über den Viewport). Mittel dafür, dass Safaris Zoom-Einstellung in Home-Bildschirm-Apps fehlt (Checkliste).

### Niedrig

#### N-1: „Weiter“ liegt direkt neben „Rückgängig“ bzw. „+30 s“ und lässt sich nicht rückgängig machen

- **Fundstelle**: `training/src/views/live.js:251-254`, `app.css:212` (Abstand 8 px).
- **Beschreibung**: Wer nach einem Satz „Rückgängig“ treffen will und „Weiter“ erwischt, beendet die Pause sofort. Die Restzeit ist weg. „+30 s“ ist in den ersten 10 s durch „Rückgängig“ ersetzt und zählt danach nur von jetzt an. Die Spezifikation verlangt „keine versehentlichen Taps neben dem Timer“.
- **Auswirkung**: Pause verloren, man muss sie schätzen.
- **Empfehlung**: Mehr Abstand (≥ 16 px) oder „Weiter“ erst nach 1–2 s aktivieren. Besser: „Weiter“ selbst kurz rückgängig machbar (Restzeit merken).
- **Sicherheit der Einschätzung**: mittel (Bedienbarkeits-Einschätzung anhand von Screenshot und Maßen).

#### N-2: Querformat: im Fokus-Modus jeden Satz scrollen

- **Fundstelle**: `app.css:275-284`.
- **Beschreibung**: Gemessen bei 812 × 330: „Satz fertig“ liegt bei 378–434 px, der Timer bei 446–533, Dokumenthöhe 556. Die Zahlenfelder sind 40 px hoch. Das Manifest erlaubt `orientation: any`, die Spezifikation verlangt die Prüfung im Querformat (Runde 1 N-6, teilweise abgelehnt).
- **Auswirkung**: Wer das Handy quer ablegt, muss für jeden Satz scrollen und sieht den Timer nicht.
- **Empfehlung**: Im Querformat Stepper und „Satz fertig“/Timer zweispaltig anordnen. Oder bewusst nur Hochformat unterstützen und das im README nennen (iOS beachtet `orientation` im Manifest nicht zuverlässig).
- **Sicherheit der Einschätzung**: hoch (gemessen).

#### N-3: Toasts oben verdecken während des Trainings Titel, „Beenden“ und Menü

- **Fundstelle**: `app.css:244-252`, `app.js:858` („Neue Version verfügbar“, 20 s), `app.js:581` (+X kg übernommen, 4 s).
- **Beschreibung**: Der Toast liegt fest oben über der gesamten Breite (z-index 9). Während des Trainings verdeckt er bis zu 20 s den Kopf mit „Beenden“ und den Menü-Button.
- **Empfehlung**: Im Training Toasts über dem Timer bzw. unten anzeigen, oder das Update-Angebot erst nach dem Training zeigen.
- **Sicherheit der Einschätzung**: hoch (aus Code und CSS).

#### N-4: Kleinere VoiceOver- und Fokus-Details

- **Fundstelle**: `live.js:42-48`, `live.js:54`, `app.js:158-165`, `app.css:53` und `.rest.ready`.
- **Beschreibung**:
  - Das Häkchen hat `aria-pressed` und wechselt zusätzlich die Beschriftung („… abschließen“ / „… wieder öffnen“). VoiceOver liest dann z. B. „Satz 1 wieder öffnen, ausgewählt“. Das ist doppelt und verwirrend.
  - Die Wert-Beschriftung lautet „6 Wdh.. Ändern“ (doppelter Punkt) bzw. „– kg × 4“. Der Gedankenstrich wird als „Strich“ oder „minus“ vorgelesen.
  - Sheets haben `aria-modal`, der Hintergrund ist aber nicht `inert`. Mit VoiceOver kann man aus dem Dialog in den Hintergrund wischen (Runde 1 N-9, Fokusfalle nicht umgesetzt).
  - Im Zustand „Los!“ (`.rest.ready`) ist der Timer in Akzentfarbe gefüllt. Der Fokusrahmen hat dieselbe Farbe und ist dort unsichtbar (nur mit externer Tastatur relevant).
- **Empfehlung**: Entweder feste Beschriftung mit `aria-pressed` oder wechselnde Beschriftung ohne `aria-pressed`. „– kg“ als „Gewicht offen“ beschriften, doppelten Punkt entfernen. Beim offenen Sheet die übrigen Kinder von `#app` mit `inert` versehen. Im Zustand „Los!“ eine andere Fokusfarbe (`--acText`) verwenden.
- **Sicherheit der Einschätzung**: mittel. Accessibility-Baum geprüft, VoiceOver-Ausgabe selbst nur am Gerät.

#### N-5: Footer-Link heißt anders als in der Spezifikation

- **Fundstelle**: `app.js:193`.
- **Beschreibung**: Die Spezifikation (Abschnitt 5) verlangt unten den Link „Info & Datenschutz“, die App zeigt „Impressum & Datenschutz“. Das Menü sagt „Info, Impressum & Datenschutz“, die Seite heißt ebenso.
- **Empfehlung**: Einheitlich benennen, z. B. „Info & Datenschutz“ wie spezifiziert, oder die Spezifikation anpassen.
- **Sicherheit der Einschätzung**: hoch.

#### N-6: Bei 320 × 568 überdeckt der Timer „Satz fertig“ knapp

- **Fundstelle**: `app.css:282-295`.
- **Beschreibung**: Gemessen: „Satz fertig“ endet bei 433 px, der Timer (zweizeilig unter 330 px Breite, noch klebend über 560 px Höhe) beginnt bei 431. Das Dokument ist 587 hoch bei 568 sichtbar. Das trifft kleine Geräte bzw. das 13 mini mit leichtem Zoom (ca. 115–117 %) und bestimmter Safari-Leistenhöhe.
- **Empfehlung**: Die Grenze für `.rest { position: static }` an die Breite koppeln (z. B. auch bei `max-width: 330px`), oder unten im Fokus-Inhalt Platz in Timerhöhe reservieren.
- **Sicherheit der Einschätzung**: hoch für die Messung, niedrig für die Häufigkeit.

#### N-7: „Los!“ nach Rückkehr, obwohl die Pause längst vorbei ist

- **Fundstelle**: `app.js:785-791`.
- **Beschreibung**: War die App während der Pause im Hintergrund, setzt der erste Timer-Tick nach der Rückkehr `readyUntil = jetzt + 60 s`. „Los!“ erscheint dann auch, wenn die Pause schon Minuten vorbei ist. Ein Signal bei gesperrtem Bildschirm gibt es nicht (iOS kennt kein `vibrate`).
- **Empfehlung**: `readyUntil` aus `rest.endsAt + 60 s` berechnen und „Pause vorbei seit m:ss“ anzeigen. Im README klar sagen, dass es bei gesperrtem Bildschirm kein Signal gibt.
- **Sicherheit der Einschätzung**: hoch (Code).

## Bedienfluss (abgezählt in WebKit)

- **Erster Start bis zum ersten Satz** (mit Beispielplan): „Beispielplan laden“ → „Training starten“ → Häkchen = 3 Taps. Mit eigenem Plan: „Plan öffnen“ → Datei wählen (Dateien-App, ≥ 1 Tap) → „Übernehmen“ → „Training starten“ → Häkchen = mindestens 5 Taps.
- **Bei vorhandenem Plan**: „Training starten“ → Häkchen = 2 Taps.
- **Pro Satz**: 1 Tap, wenn die vorausgefüllten Werte stimmen. Mit Korrektur in der Liste: Wert → Feld → tippen → „Fertig“ (wegen H-2 ggf. zweimal) → Häkchen = 5–6 Taps. Im Fokus-Modus: Feld → tippen → „Satz fertig“ (wegen H-2 ggf. zweimal), oder Stepper ±.
- **Bis zum Export**: „Beenden“ → „Beenden und speichern“ → „Als Datei sichern“ → im Teilen-Menü „In Dateien sichern“ → Ort/„Sichern“ → „Ersetzen“ = 6 Taps.
- **Sackgassen und unklare Zustände**: keine echten Sackgassen gefunden. Unklar sind der verlorene Tap (H-2) und der leere Wert nach dem Neurendern (H-1). Fehlermeldungen beim Import und beim Speichern sagen, was zu tun ist.

## Positiv geprüft (tatsächlich getestet)

- Kein horizontales Scrollen und keine Touch-Ziele unter 44 px auf allen Bildschirmen bei 375 × 630 in allen Stilen (gemessen).
- Fokus-Modus passt bei 375 × 630 ohne Scrollen und ohne Überlappung, auch für ein komplettes Training aller Einheiten (Repo-Test in WebKit).
- Doppeltipp-Schutz und Rückgängig im Timer funktionieren (WebKit).
- Neustart mitten im Training: direkt im Training, Werte erhalten (WebKit).
- Alle Eingabefelder ≥ 16 px, also kein Auto-Zoom (gemessen).
- Textkontraste in allen drei Stilen ≥ 4,5 : 1 (berechnet).
- Keine externen Requests (WebKit-Netzwerkprotokoll).

## Checkliste: nur auf einem echten iPhone prüfbar

Am iPhone 13 mini, App über „Zum Home-Bildschirm“ installiert, falls nicht anders angegeben.

1. **H-1**: Satz abhaken, sofort Wert antippen, Gewicht tippen, 10 s warten. Geht die Tastatur zu? Ist der Wert weg? Dasselbe während einer Pause, die endet.
2. **H-2**: Fokus-Modus, Wiederholungen antippen, Zahl tippen, ohne „Fertig“ auf der Tastaturleiste direkt „Satz fertig“ tippen. Wird der Satz abgeschlossen? Mit welchem Wert (Verlauf prüfen)?
3. **M-1**: Feld mit Wert antippen. Ist der Inhalt markiert, oder steht die Einfügemarke drin?
4. **M-2**: Einstellungen → Anzeige → Textgröße groß sowie Bedienungshilfen → Größerer Text: Ändert sich etwas? Gibt es in der Home-Bildschirm-App einen Seitenzoom? In Safari „aA“ 125 % und 150 %: Superset lesbar?
5. **Tastatur**: Verdeckt die Tastatur im Bearbeiten-Sheet „Fertig“ oder ein Feld? Hat die Zahlentastatur die Leiste mit „Fertig“? Zeigt `decimal` ein Komma?
6. **Safe Area**: Statusleiste in Hell, Dunkel und Fancy lesbar (dunkler Streifen in Hell)? Tabbar und Timer über dem Home-Indikator? Querformat mit Notch links und rechts.
7. **Sticky im Safari-Tab**: Liste scrollen, Adressleiste fährt ein und aus. Springt der Timer oder die Tabbar?
8. **Overscroll**: Am oberen und unteren Rand ziehen. Gummiband oder Pull-to-Refresh im Training? (`overscroll-behavior` ist gesetzt.)
9. **Wake Lock** (iOS ≥ 18.4 nötig, davor in Home-Bildschirm-Apps defekt, siehe Quellen): Training starten, 2 min nicht berühren, Bildschirm bleibt an? In andere App wechseln und zurück, wieder 2 min. Nach dem Beenden geht der Bildschirm normal aus?
10. **Timer im Hintergrund**: Pause starten, App 1 min verlassen, zurück. Stimmt die Restzeit? Gesperrter Bildschirm: kein Signal am Pausenende (erwartet, N-7)?
11. **App-Beenden**: Mitten im Training App im App-Umschalter wegwischen, neu starten. Werte, Notiz und Pause erhalten?
12. **Export**: „Als Datei sichern“ → „In Dateien sichern“ → gleichen Ordner wählen. Kommt „Ersetzen“? Abbrechen im Teilen-Menü zeigt „Nicht gesichert“? Wenn Teilen fehlschlägt: Was passiert beim Download-Fallback in der Home-Bildschirm-App (Vorschau ohne Rückweg)?
13. **Import**: „Plan öffnen“ → Dateien-App → `.training.json` und eine `plan.json` aus iCloud. Sind die Dateien wählbar (nicht ausgegraut)? Abbrechen im Auswahldialog lässt nichts hängen?
14. **Offline**: Nach dem ersten Start Flugmodus, App beenden, neu öffnen, ein Training durchführen und sichern.
15. **Update**: Nach einem neuen Deployment App öffnen. Kommt „Neue Version verfügbar“? Nach „Aktualisieren“ neuer Stand, laufendes Training erhalten? Wird das Angebot nach einem verpassten Toast beim nächsten Öffnen wiederholt?
16. **Daten gelöscht**: Einstellungen → Safari → Websitedaten löschen bzw. App entfernen und neu hinzufügen. Danach über „Plan öffnen“ die letzte `.training.json` einlesen: alles wieder da?
17. **VoiceOver**: Ein Training mit VoiceOver: Ansage nach dem Satz („…, Pause 2:30“), „Pause vorbei“, Ansagen der Häkchen (N-4), Fokus nach dem Schließen eines Sheets, Wischen aus dem Sheet in den Hintergrund.
18. **Fancy**: Liegt der Verlauf korrekt hinter langen Seiten? (iOS ignoriert `background-attachment: fixed`.)

## Quellen

- WebKit-Bug 254545 „Wake Lock API does not work in Home Screen Web Apps“: https://bugs.webkit.org/show_bug.cgi?id=254545 (laut Safari-18.4-Release-Notes behoben: https://developer.apple.com/documentation/safari-release-notes/safari-18_4-release-notes)
- WebKit-Bug 255363 (Wake Lock nach Rückkehr vom Home-Bildschirm): https://bugs.webkit.org/show_bug.cgi?id=255363 (Status nicht geprüft)
- WCAG 2.2, 1.4.3 Kontrast (Minimum) und 1.4.11 Nicht-Text-Kontrast: https://www.w3.org/TR/WCAG22/

## Zusammenfassung nach Schwere

| Schwere | Anzahl | Findings |
|---|---|---|
| Kritisch | 0 | – |
| Hoch | 2 | H-1, H-2 |
| Mittel | 2 | M-1, M-2 |
| Niedrig | 7 | N-1 bis N-7 |
