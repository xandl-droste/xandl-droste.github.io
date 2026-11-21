# Review 3: iOS-Safari, Barrierefreiheit und Bedienbarkeit auf kleinen Displays (Runde 3)

Geprüfter Stand: Branch `develop`, Commit `62ce59a`. Rolle und Ausgabeformat nach `docs/spezifikation.md`, Abschnitt 9.

Vorgehen:
- Code-Analyse von `training/index.html`, `training/css/app.css`, `training/src/app.js`, `training/src/views/*.js`, `training/src/dom.js`, `training/src/format.js`, `training/src/sound.js`, `training/src/wakelock.js`, `training/src/export.js`, `training/src/storage.js`, `training/sw.js`, `training/manifest.webmanifest`, Teile von `training/src/model/live.js`.
- Browser-Tests mit Playwright 1.65.1 und WebKit, Geräteprofil „iPhone 13 mini“ (`isMobile`, `hasTouch`, User-Agent, `deviceScaleFactor` 3), Viewport 375 × 630, Locale `de-AT`. Die App lief lokal über `python3 -m http.server` (127.0.0.1:8773), geladen wurde der Testplan `tests/fixtures/beispielplan.plan.json` über „Plan öffnen“. Skripte und Screenshots liegen außerhalb des Repos.
- Rundgang über alle Bildschirme: Onboarding, Menü, Agent-Prompt, Import-Vorschau, Heute, Plan (zu- und aufgeklappt), Verlauf (leer, Liste, Detail, Satz korrigieren), Info, Live-Liste, Bearbeiten-Sheet, Fokus für jede Übung von Einheit 1 (25 Sätze), Halte-Countdown (Copenhagen Plank, Hüftbeuger), „Alle Sätze erledigt“, Beenden-Dialog, Abschluss. Gemessen pro Bildschirm: horizontales Scrollen, Tippziele unter 44 px, Überläufe, im Fokus die Lage von „Satz fertig“ und Timer.
- Stile Hell, Dunkel und Fancy auf Onboarding, Heute, Live-Liste, Fokus und Verlauf-Detail (Screenshots).
- Größere Schrift bzw. Seitenzoom über kleinere Viewports nachgestellt: 320 × 568 (Display-Zoom bzw. ca. 117 %), 300 × 500 (ca. 125 %), 280 × 470 (ca. 134 %), 250 × 420 (150 %). Querformat: 812 × 340.
- Kontraste nach der WCAG-Formel aus den CSS-Variablen berechnet, bei Fancy die halbtransparenten Flächen über jeden der drei Verlaufs-Stopps gemischt.
- `npm test`: 136/136 bestanden. Repo-Browserprüfungen mit `BROWSER=webkit`: `offline` und `info` ohne Probleme, `training` ohne App-Fehler (nur die bekannten CSP-Meldungen „Refused to apply a stylesheet“, siehe unten), `import` bricht ab (Werkzeug, siehe „Nicht prüfbar“), `insecure` läuft nur in Chromium.
- Frühere Berichte (`reviews/ios-ux*.md`, `reviews/testfahrt-ios-ux.md`) und Antworten (`reviews/umsetzung-r2.md`, `reviews/testfahrt-umsetzung.md`) habe ich erst nach den eigenen Messungen gelesen, um behobene Punkte nachzuprüfen.

## Geprüfte Punkte

| Bereich | Ergebnis | Wie geprüft |
|---|---|---|
| Kein horizontales Scrollen bei 375 × 630 | erfüllt auf allen Bildschirmen, alle drei Stile | gemessen (`scrollWidth` = 375) |
| Fokus-Modus ohne Scrollen bei 375 × 630 | erfüllt für alle 25 Sätze von Einheit 1, auch mit laufendem Halte-Countdown und mit „102,5“ kg | gemessen: „Satz fertig“ endet bei 338–450 px, Timer 514–614 px, keine Überlappung. Einzige Abweichung: 1 px (N-1) |
| Tippziele ≥ 44 px | erfüllt bis auf die Zahlenfelder (38 px hoch, Label darunter gehört per `for` dazu) und den Umschalter (sichtbar 44 × 32, Tippfläche per `::after` 44 × 45, per `elementFromPoint` nachgeprüft) | gemessen |
| Haupt-Aktionen ≥ 48 px | „Satz fertig“ 64 px, „Training starten“ 50 px, „Abschließen“ 48 px, Stepper 52 px, Gewichts-Stepper innen 44/46 px | CSS und Messung |
| Eingabefelder ≥ 16 px (kein Zoom-Sprung) | erfüllt: Zahlenfelder 32–48 px, Textarea, Select 16 px | CSS, `getComputedStyle` |
| Zahlentastatur | Gewicht `inputmode="decimal"`, Wdh./Sekunden `numeric` | Code und DOM |
| Rückgängig nach Fehltap | erfüllt: 10 s „Rückgängig“ im Timer, erneuter Tap auf den Haken öffnet, Doppeltipp-Sperre 600 ms | WebKit |
| Autosave und Neustart | im Repo-Test `training.e2e` in WebKit bestanden (Werte und erledigte Sätze nach Reload da) | Repo-Test |
| Offline | Repo-Test `offline.e2e` in WebKit bestanden (Reload offline, Plan öffnen, Training beenden) | Repo-Test |
| Service-Worker-Update | Code: neue Version wartet, Angebot per Toast, nicht während eines Trainings, beim nächsten Start erneut über `reg.waiting` | Code |
| Timer auf Zeitstempel | Pause (`rest.endsAt`) und Halten (`startedAt`) rechnen mit Zeitstempeln; das Intervall aktualisiert nur die Anzeige | Code |
| Wake Lock | angefordert bei Start/Fortsetzen, erneut bei `visibilitychange`, nach Neustart beim ersten Tap | Code |
| Safe Area | `viewport-fit=cover`, Innenabstände mit `env(safe-area-inset-*)` für `#app`, Menü, Timer, Tabbar, Sheets, Toast; dunkler Streifen hinter der Statusleiste im Stil Hell | Code (Einsätze nicht emulierbar) |
| Kontraste Text (WCAG AA) | alle berechneten Paare ≥ 4,5 : 1 (Tabelle unten) | berechnet |
| Zustände nicht nur über Farbe | erfüllt: Haken mit Symbol, Tags „übersprungen“, „später“, „nicht gesichert“ als Text, Timer „Pause/Los!/Bereit“, aktiver Satz mit 2-px-Rahmen | Screenshots, Code |
| `prefers-reduced-motion` | keine Animationen, `scrollIntoView` ohne `smooth`, Regel in `app.css:353` | Code |
| Fokus-Sichtbarkeit | `:focus-visible` 3 px in `--focus`, im Zustand „Los!“ in `--acText` | Code |
| VoiceOver-Beschriftungen | Accessibility-Baum des Fokus-Modus geprüft: alle Icon-Buttons beschriftet, Timer `role=timer` ohne Dauer-Ansage, Ansagen über eine dauerhafte `role=status`-Region | `ariaSnapshot` in WebKit |
| Texte auf Deutsch | durchgängig, Fachbegriffe (RIR, Deload, Fancy) wie in der Spezifikation | Rundgang |

### Kontraste (berechnet)

| Stil | Paar | Verhältnis |
|---|---|---|
| Hell | Text/Hintergrund 15,4 · Gedämpft auf Karte 6,3, auf Zeile 5,6 · Akzent auf Karte 6,2 · Weiß auf Akzent 6,2 · Gefahr auf Karte 7,3 · Akzent im Timer 5,8 | alle AA |
| Dunkel | Text/Karte 15,1 · Gedämpft auf Karte 6,7, auf Zeile 6,0 · Akzent auf Karte 9,4 · Text auf Akzent 10,5 · Gefahr 7,3 | alle AA |
| Fancy | Gedämpft auf Karte 6,3–8,4, auf Zeile 4,8–6,3 · Gelb auf Karte 5,7–7,7 · Gefahr auf Karte 4,9–6,6 · Dunkel auf Akzent-Verlauf 7,7–12,4 | alle AA (knappster Wert 4,81 : 1, Gedämpft auf Zeile über `#0f3a5a`) |
| alle | Linienfarbe `--line` als Rand von Ghost-Buttons und Stepper-Kreisen: 1,3–1,9 : 1 | unter 3 : 1, siehe N-6 |

## Nicht prüfbar (mit Grund)

- **Echtes iOS-Verhalten**: Safe-Area-Werte, Statusleiste, Bildschirmtastatur (Höhe, Zubehörleiste, Verdecken von „Fertig“), Wake Lock, Ton mit Stummschalter, Teilen-Menü mit „In Dateien sichern“ und „Ersetzen“, Dateien-App beim Import, Gummiband-Scrollen, Adressleiste, App-Wechsel, App-Beenden durch iOS, VoiceOver- und Sprachsteuerungs-Ausgabe. Playwright-WebKit auf macOS ist kein iOS. Siehe Checkliste.
- **Dynamic Type / „Größerer Text“**: Lässt sich in WebKit nicht einstellen. Per Code: alle Größen in `px`, kein `-apple-system-body`, die Einstellung wirkt also nicht (siehe M-2).
- **Repo-Test `import.e2e.mjs` in WebKit**: wartet auf einen Download. In Playwright-WebKit gibt es `navigator.share` und `canShare` (geprüft: beide vorhanden, sicherer Kontext), also wird geteilt statt heruntergeladen. Werkzeug-Effekt, kein App-Fehler. Den Download-Fallback habe ich nur im Code gelesen.
- **CSP-Meldungen „Refused to apply a stylesheet“ in der WebKit-Konsole**: In den Screenshots fehlt kein Stil (Fortschrittsbalken, Breiten). Ich vermute von Playwright eingefügte Stile, habe die Quelle aber nicht ermittelt. Auf dem iPhone in der Web-Inspektor-Konsole prüfen (Checkliste).
- **Speicher voll**: nicht nachstellbar. Code gelesen: `storageErrorMessage`, Warnkarte auf dem Abschluss-Bildschirm.
- **Signal bei gesperrtem Bildschirm**: ohne Gerät nicht prüfbar; `navigator.vibrate` gibt es unter iOS nicht.
- **Querformat mit echter Notch**: Safe-Area links/rechts nicht emulierbar, nur die Größe 812 × 340.

## Findings

### Kritisch

Keine.

### Hoch

Keine.

### Mittel

#### M-1: Abstand zwischen „Rückgängig“ und „Weiter“ ist auf dem iPhone 13 mini weiter 8 px. Der Fix aus Runde 2 greift unter 400 px nicht

- **Fundstelle**: `training/css/app.css:229` (`.rest { … gap: 0 16px }`) wird von `app.css:289` (`@media (max-width: 400px) { .card { padding: 12px; gap: 8px; } }`) überschrieben. Gleiche Spezifität, die Media-Query steht später. `reviews/umsetzung-r2.md` nennt N-1 als „Abstand im Timer von 8 auf 16 px“.
- **Nachstellen (WebKit, 375 × 630)**: Training starten, Satz 1 abhaken. Gemessen: „Rückgängig“ 154–267 px, „Weiter“ 275–350 px, Abstand 8 px. Zugleich wird aus dem Zeilenabstand 0 ein Abstand von 8 px (Leiste höher als geplant).
- **Beschreibung**: Die beiden Knöpfe, die direkt nach jedem Satz nebeneinander stehen, haben auf allen Geräten unter 400 px Breite nur 8 px Abstand. „Weiter“ beendet die Pause sofort und lässt sich nicht rückgängig machen.
- **Auswirkung**: Wer nach einem Fehltap auf den Haken „Rückgängig“ treffen will und „Weiter“ erwischt, verliert die Pause. Die Spezifikation verlangt „keine versehentlichen Taps neben dem Timer“. Der als behoben gemeldete Punkt ist auf dem Referenzgerät nicht behoben. Es passiert pro Training mehrfach in genau dem Moment, in dem man müde und schnell tippt.
- **Empfehlung**: Spezifität erhöhen (`.card.rest { gap: 0 16px; }`, wie schon bei `.card.rest { padding … }`) oder die Regel in der Media-Query wiederholen. Ein e2e-Test, der den Abstand bei 375 px misst, verhindert den Rückfall.
- **Sicherheit der Einschätzung**: hoch (gemessen, Ursache im CSS eindeutig).

#### M-2: Größere Schrift bzw. Seitenzoom: Das Gewichtsfeld schrumpft ab ca. 130 % auf 0–28 px. Dynamic Type wirkt weiterhin nicht

- **Fundstelle**: `training/css/app.css:192-197` und `:326-330` (`.stp-multi`, vier Knöpfe à 44–52 px plus Feld mit `min-width: 0`), `training/src/views/live.js:299-309`, `README.md:106` („Ab ca. 150 % stehen die beiden Übungen eines Supersets untereinander“).
- **Nachstellen (WebKit)**: Liste, Wert von Satz 1 antippen (Bearbeiten-Sheet), Breite des Gewichtsfelds messen. Ergebnis:

  | Viewport (≈ Zoom) | Gewichtsfeld im Sheet | im Fokus |
  |---|---|---|
  | 375 × 630 (100 %) | 107 px | 117 px |
  | 320 × 568 (≈ 117 %) | 76 px | 94 px |
  | 300 × 500 (≈ 125 %) | 56 px | 74 px |
  | 280 × 470 (≈ 134 %) | 28 px | 46 px |
  | 250 × 420 (150 %) | **0 px** | 16 px |

  Bei 280 px zeigt das Sheet vom Platzhalter nur „ein“, bei 250 px gar nichts mehr; die Beschriftung „Gewicht · kg“ bricht in drei Zeilen. Playwright meldet das Feld bei 250 px als „nicht sichtbar“. Bei 375 und 320 px passt „102,5“ (Screenshots geprüft).
- **Beschreibung**: Der Gewichts-Stepper mit vier Knöpfen (neu seit Schritt 9) ist für schmale Breiten nicht angepasst. Die Superset-Anpassung aus Runde 2 schützt nur die Tabelle. Unabhängig davon bleibt Dynamic Type abgelehnt (`reviews/umsetzung-r2.md`, M-2): In der Home-Bildschirm-App gibt es damit keine Möglichkeit, die Schrift zu vergrößern, außer der iOS-Bedienungshilfe „Zoom“.
- **Auswirkung**: Wer im Safari-Tab mit 150 % arbeitet (das README empfiehlt das als Weg zu größerer Schrift), kann kein Gewicht mehr sehen oder eintippen, nur noch per ±-Knopf blind ändern. Im Verlauf („Satz korrigieren“) gleich. Das README verspricht eine Bedienbarkeit, die es nicht gibt.
- **Empfehlung**: Unter ca. 330 px Breite die Knöpfe in eine zweite Zeile legen (Feld oben über die ganze Breite, darunter −2,5 −0,5 +0,5 +2,5) oder die inneren 0,5-Knöpfe ausblenden und dafür das Feld behalten. Dem Feld eine Mindestbreite geben (z. B. `min-width: 5ch`). Das README entsprechend korrigieren. Für Dynamic Type bleibt die Empfehlung aus Runde 2 (`rem` plus `-apple-system-body` mit Obergrenze); falls weiter abgelehnt, im README klar sagen, dass größere Schrift in der installierten App nicht geht.
- **Sicherheit der Einschätzung**: hoch für die Messwerte, mittel für die Gleichsetzung „Viewport-Breite = Zoomstufe“.

#### M-3: Mit Stummschalter (Klingeln aus) gibt es auf dem iPhone kein Signal am Pausenende und beim Halten

- **Fundstelle**: `training/src/sound.js:21-30` (Web Audio ohne `navigator.audioSession`), `training/src/app.js:102-105` (`navigator.vibrate?.(…)`), Menü „Signalton“ `app.js:280-289`.
- **Beschreibung**: Safari behandelt Web Audio standardmäßig als „ambient“. Dieser Ton folgt dem Stummschalter. `navigator.vibrate` gibt es unter iOS nicht. Steht das iPhone im Studio auf lautlos (häufig), kommt am Pausenende und beim Start/Ende des Haltens gar kein Signal, auch bei Einstellung „Laut“. Der Probeton im Menü bleibt dann ebenfalls stumm, ohne Hinweis, warum. Seit Safari 16.4 gibt es `navigator.audioSession.type`; mit `'playback'` spielt Web Audio auch bei Stummschalter, unterbricht aber laufende Musik anderer Apps.
- **Auswirkung**: Der Halte-Countdown (Seitenwechsel, Ende) und das Pausenende sind ohne Signal nur am Bildschirm erkennbar. Wer sich auf den Ton verlässt, verpasst das Pausenende.
- **Empfehlung**: Am Gerät prüfen (Checkliste 4). Wenn bestätigt: im Menü unter „Signalton“ den Hinweis „Bei Stummschalter kein Ton (iOS)“ anzeigen, oder eine Stufe „Laut, auch im Stummmodus“ anbieten, die vor dem Ton `navigator.audioSession.type = 'playback'` setzt und danach auf `'auto'` zurückstellt (Musik wird dann kurz unterbrochen). Im README nennen.
- **Sicherheit der Einschätzung**: mittel. Das Verhalten ist in mehreren WebKit-Bugs beschrieben (Quellen), ich konnte es nicht auf einem Gerät nachstellen.

### Niedrig

#### N-1: Jeder Bildschirm ist 1 px zu hoch und damit scrollbar

- **Fundstelle**: `training/index.html:24` (`#announce` nach `#app`), `training/css/app.css:49` (`.sr-only` ohne `top`/`margin: -1px`).
- **Nachstellen**: Onboarding, Heute, Fokus usw.: `document.documentElement.scrollHeight` = 631 bei 630 sichtbar (WebKit und Chromium). Die Live-Region liegt absolut an ihrer statischen Position unter `#app` (630–631 px).
- **Auswirkung**: Auch Bildschirme, die passen, lassen sich minimal verschieben; im Safari-Tab kann das die Adressleiste ein- und ausfahren lassen. Der Repo-Test erlaubt 1 px Toleranz (`helpers.mjs`), deshalb fällt es dort nicht auf.
- **Empfehlung**: `.sr-only { top: 0; left: 0; margin: -1px; padding: 0; border: 0; }` (übliches Muster).
- **Sicherheit der Einschätzung**: hoch (gemessen, Ursache gefunden).

#### N-2: Während des Halte-Countdowns zeigt der Timer „Als Nächstes“ den Satz, der gerade läuft

- **Fundstelle**: `training/src/views/live.js:403` (`nextLabel(live)` = aktiver Satz).
- **Nachstellen**: Fokus, Copenhagen Plank, „Halten starten“. Unten steht „0:00 Bereit · Als Nächstes: b) Copenhagen Plank · Satz 1“, obwohl genau dieser Satz läuft.
- **Auswirkung**: Unklarer Zustand: „Bereit“ und „Als Nächstes“ widersprechen dem laufenden Countdown oben.
- **Empfehlung**: Bei laufendem Halten in der Leiste „Halten läuft“ bzw. den Satz danach zeigen.
- **Sicherheit der Einschätzung**: hoch (Screenshot).

#### N-3: Sichtbarer Text und Beschriftung passen bei „Weiter“ und „+30 s“ nicht zusammen (Sprachsteuerung)

- **Fundstelle**: `training/src/views/live.js:396` („+30 s“ → „Pause um 30 Sekunden verlängern“), `:400` („Weiter“ → „Pause beenden“).
- **Beschreibung**: WCAG 2.5.3 (Label in Name): Der sichtbare Text muss in der zugänglichen Beschriftung vorkommen. iOS-Sprachsteuerung („Tippe auf Weiter“) findet den Knopf sonst nicht. „Abschließen“ → „Training abschließen“ und „Rückgängig: …“ sind korrekt.
- **Empfehlung**: „Weiter, Pause beenden“ und „+30 s, Pause verlängern“ oder das `aria-label` weglassen.
- **Sicherheit der Einschätzung**: hoch für die Abweichung (Accessibility-Baum), mittel für die Auswirkung auf die Sprachsteuerung.

#### N-4: Aufklappbare Karten haben kein sichtbares Zeichen, dass sie aufgehen

- **Fundstelle**: `training/css/app.css:128` und `:145` (`summary { display: flex }` entfernt in WebKit das Dreieck), `live.js:240-245` (Warm-up), `views/plan.js:47-53` (Einheiten im Plan-Tab).
- **Beschreibung**: „Warm-up (ca. 10 Min)“ und „Einheit 1 – schwer“ im Plan sehen aus wie gewöhnliche Karten. Im Plan steht der Hinweistext in der Zusammenfassung zusätzlich fett (erbt `font-weight: 700`). Für VoiceOver ist der Zustand über `details` vorhanden.
- **Auswirkung**: Die Übungen der Woche im Plan-Tab werden leicht übersehen.
- **Empfehlung**: Ein Chevron per CSS (`summary::after`) mit Drehung bei `[open]`, Hinweistext mit `font-weight: 400`.
- **Sicherheit der Einschätzung**: hoch (Screenshots).

#### N-5: Im Verlauf führt der Tab „Verlauf“ nicht aus der Detailansicht zurück

- **Fundstelle**: `training/src/app.js:202` (`histId` wird nur zurückgesetzt, wenn man von einem anderen Tab kommt).
- **Nachstellen**: Verlauf → Training öffnen → nach unten scrollen → Tab „Verlauf“. Man bleibt im Detail (nur nach oben gescrollt). Zurück geht nur über „‹ Verlauf“ oben. In der Home-Bildschirm-App gibt es keine Browser-Zurück-Geste.
- **Auswirkung**: Die Detailseite ist mit allen Übungen lang (gemessen 2674 px). Gängiges iOS-Muster (aktiven Tab antippen = zur Liste) fehlt; „‹ Verlauf“ liegt außerhalb des Daumenbereichs.
- **Empfehlung**: Tap auf den aktiven Tab „Verlauf“ setzt `histId` zurück. Gleiches gilt für die Info-Seite (2644 px): unten einen zweiten „Zurück“-Knopf anbieten.
- **Sicherheit der Einschätzung**: hoch (WebKit).

#### N-6: Ränder von Ghost-Buttons und Stepper-Kreisen kaum sichtbar

- **Fundstelle**: `training/css/app.css:68`, `:183` (`border: 1px solid var(--line)`).
- **Beschreibung**: `--line` erreicht gegen Karte bzw. Hintergrund nur 1,3 : 1 (Hell, Dunkel) bzw. 1,8–1,9 : 1 (Fancy). Die Beschriftung identifiziert die Knöpfe, WCAG 1.4.11 ist damit formal erfüllt. Für das Treffen mit feuchten Fingern ist aber die sichtbare Fläche der −/+-Kreise wichtig; sie ist im Dunkel-Stil auf den Screenshots nur zu ahnen.
- **Empfehlung**: Für `.rb` einen Hintergrund `var(--row)` oder einen kräftigeren Rand (≥ 3 : 1) verwenden.
- **Sicherheit der Einschätzung**: mittel (berechnet; Wirkung im Studio-Licht am Gerät prüfen).

#### N-7: Bei 250 px Breite (150 %) läuft „Beenden“ aus seinem Knopf

- **Fundstelle**: `training/css/app.css:202` (`.live-meta { margin-right: 52px }`), `live.js:30-32`.
- **Nachstellen**: 250 × 420, Liste: `.live-meta` 200 px Inhalt in 182 px, „Beenden“-Knopf 56 px breit für 74 px Text.
- **Auswirkung**: Die Tippfläche ist kleiner als der sichtbare Text, der Rand des Textes reagiert nicht.
- **Empfehlung**: Fortschrittstext unter 330 px umbrechen lassen (`flex-wrap`) und dem Link `flex: none` geben.
- **Sicherheit der Einschätzung**: hoch (gemessen).

#### N-8: Offene Sheets: Fokus und VoiceOver können in den Hintergrund wandern (weiter offen aus Runde 2)

- **Fundstelle**: `training/src/app.js:222-229` (`role="dialog"`, `aria-modal`, aber kein `inert` für die übrigen Kinder von `#app`).
- **Nachstellen**: Fokus-Modus, „Optionen“ öffnen, Tab drücken: Nach den Sheet-Elementen landet der Fokus auf Elementen im Hintergrund (Gewichtsfeld, Wiederholungen). Kein Hintergrund-Element hat `inert` oder `aria-hidden`.
- **Auswirkung**: Mit VoiceOver kann man aus dem Sheet in den Trainingsbildschirm wischen und dort Knöpfe auslösen, während das Sheet offen ist. Das Sheet-Panel scrollt außerdem ohne `overscroll-behavior: contain`; am Ende des Agent-Prompts kann die Seite dahinter mitscrollen (am Gerät prüfen).
- **Empfehlung**: Beim Öffnen `inert` auf alle Geschwister des Sheets setzen, beim Schließen entfernen. `.sheet > .card { overscroll-behavior: contain; }`.
- **Sicherheit der Einschätzung**: hoch für den Tastaturfokus (WebKit), mittel für VoiceOver (aria-modal wird von iOS teils beachtet).

#### N-9: Querformat: im Fokus-Modus muss man pro Satz scrollen (bekannt, abgelehnt)

- **Fundstelle**: `training/css/app.css:307-316`.
- **Messung 812 × 340**: Dokumenthöhe 468–558 px, „Satz fertig“ und Timer sind je nach Übung erst nach Scrollen zu sehen. Das Manifest erlaubt `orientation: any`.
- **Stand**: In Runde 1 und 2 abgelehnt (Spezifikation verlangt Hochformat), beim Betreiber als offen notiert (`docs/stand.md`). Nur zur Vollständigkeit aufgeführt.
- **Sicherheit der Einschätzung**: hoch (gemessen).

## Bedienfluss (abgezählt in WebKit)

- **Erster Start bis zum ersten Satz**: „Plan öffnen“ → Datei wählen (Dateien-App, ≥ 1 Tap) → „Übernehmen“ → „Training starten“ → Haken = mindestens 5 Taps.
- **Mit gespeichertem Plan**: „Training starten“ → Haken = 2 Taps. Nach einem Neustart mitten im Training startet die App direkt im Training.
- **Pro Satz**: 1 Tap, wenn die Vorbelegung stimmt („Satz fertig“ bzw. Haken). Mit Korrektur im Fokus: Feld → Zahl → „Satz fertig“ = 3 Taps oder Stepper. In der Liste: Wert → Feld → Zahl → „Fertig“ → Haken = 5 Taps. Halten: „Halten starten“, der Satz schließt sich am Ende selbst ab.
- **Bis zum Export**: „Abschließen“ (bzw. „Beenden“) → „Beenden und speichern“ → „Als Datei sichern“ → im Teilen-Menü „In Dateien sichern“ → „Sichern“ → „Ersetzen“ = 6 Taps.
- **Sackgassen und unklare Zustände**: keine echten Sackgassen. Unklar: „Als Nächstes“ während des Haltens (N-2), stummer Ton bei Stummschalter (M-3), Rückweg aus langen Detailseiten (N-5). Fehlermeldungen (Import, Speicher voll, Export nicht einlesbar, laufendes Training blockiert Import) sagen jeweils, was zu tun ist.

## Nachgeprüft aus früheren Runden

| Punkt | Ergebnis |
|---|---|
| Runde 2 N-1 (Abstand „Weiter“) | nicht wirksam unter 400 px, siehe M-1 |
| Runde 2 M-2 (Zoom) | Superset- und Timer-Anpassung wirken (keine horizontalen Scrollbalken bei 320, 300, 280, 250 px). Neu: Gewichts-Stepper, siehe M-2 |
| Runde 2 N-4 (VoiceOver-Details) | Haken-Beschriftung, „Gewicht offen“, Fokusfarbe bei „Los!“ umgesetzt; `inert` weiter offen, siehe N-8 |
| Runde 2 N-6 (320 × 568) | behoben: Timer liegt unter dem Inhalt (`position: static`), „Satz fertig“ 351–415, Timer 458–551 |
| Testfahrt M-1/N-1 (Umschalter unter „Weiter“) | behoben: Umschalter links unten, Tippfläche 44 × 45 (per `elementFromPoint` 5 px über und 6 px unter dem sichtbaren Knopf getroffen) |
| Testfahrt M-2 (Leiste nach dem letzten Satz zu breit) | behoben: kein horizontales Scrollen nach dem letzten Satz (375 px) |
| Warm-up bleibt offen | im Repo-Test `training.e2e` (WebKit) bestanden |

## Checkliste: nur auf einem echten iPhone prüfbar

Am iPhone 13 mini, App über „Zum Home-Bildschirm“ installiert, falls nicht anders angegeben.

1. **M-1**: Nach einem Satz zehnmal zügig mit dem Daumen auf „Rückgängig“ tippen (jeweils neuen Satz abhaken). Wie oft trifft man „Weiter“?
2. **Tastatur**: Im Bearbeiten-Sheet das Gewichtsfeld antippen. Verdeckt die Tastatur „Fertig“ oder die Wiederholungen? Hat die Zahlentastatur die Leiste mit „Fertig“? Zeigt `decimal` ein Komma? Ist der alte Wert markiert, sodass eine Ziffer ihn ersetzt? Im Fokus: Feld antippen, Zahl tippen, direkt „Satz fertig“ (ein Tap genügt, neuer Wert im Verlauf)?
3. **Tastatur und Neuzeichnen**: Satz abhaken, sofort einen Wert antippen und tippen, 10 s warten bzw. Pause ablaufen lassen. Bleibt die Tastatur offen und der Wert erhalten?
4. **M-3, Ton**: Signalton „Laut“, Stummschalter an: Probeton im Menü, Pausenende, Halte-Countdown. Hörbar? Dann Stummschalter aus, Musik in einer anderen App läuft: Wird sie unterbrochen oder gemischt? Nach App-Wechsel und Rückkehr (ohne Tap) innerhalb von 60 s nach Pausenende: kommt der Ton?
5. **Wake Lock**: Training starten, 2 min nicht berühren: Bildschirm bleibt an? In andere App wechseln und zurück, wieder 2 min. Nach Neustart der App mitten im Training (erst nach dem ersten Tap angefordert)? Nach dem Beenden geht der Bildschirm normal aus?
6. **Timer im Hintergrund**: Pause starten, App 1 min verlassen bzw. sperren, zurück. Stimmt die Restzeit? Halte-Countdown starten, sperren, nach Ende zurück: Satz abgeschlossen, Pause läuft ab dem Halte-Ende?
7. **App-Beenden**: Mitten im Training im App-Umschalter wegwischen, neu starten. Werte, Notiz, „später“ und Pause erhalten?
8. **Safe Area**: Statusleiste in Hell (dunkler Streifen), Dunkel und Fancy lesbar? Tabbar und Timer über dem Home-Indikator? Querformat mit Notch links und rechts: nichts unter der Notch.
9. **Sticky und Overscroll** (auch im Safari-Tab): Liste scrollen, Adressleiste fährt ein und aus. Springt der Timer? Am oberen/unteren Rand ziehen: Gummiband im Training? Scrollt beim langen Agent-Prompt die Seite hinter dem Sheet mit (N-8)? Doppeltipp neben einen Knopf (z. B. auf die Stepper-Karte): zoomt die Seite?
10. **N-1**: Lässt sich der Heute-Bildschirm um 1 px verschieben, fährt im Safari-Tab dabei die Adressleiste ein?
11. **Export**: „Als Datei sichern“ → „In Dateien sichern“ → gleichen Ordner wählen. Kommt „Ersetzen“ statt „… (1)“? Abbrechen zeigt „Nicht gesichert: Teilen abgebrochen“? „Für Garmin exportieren“ bietet die `.fit` an?
12. **Import**: „Plan öffnen“ → Dateien-App → `.training.json` und `plan.json` aus iCloud. Wählbar (nicht ausgegraut)? Auch eine als `.txt` gespeicherte Datei aus einer KI-App? Abbrechen im Auswahldialog lässt nichts hängen?
13. **Offline**: Nach dem ersten Start Flugmodus, App beenden, neu öffnen, Training durchführen und sichern.
14. **Update**: Nach einem neuen Deployment App öffnen. Kommt „Neue Version verfügbar“ (nicht während eines Trainings)? Nach „Aktualisieren“ neuer Stand, Daten erhalten?
15. **Daten gelöscht**: App vom Home-Bildschirm entfernen und neu hinzufügen bzw. Websitedaten löschen. Danach über „Plan öffnen“ die letzte `.training.json` einlesen: alles wieder da?
16. **M-2, Schrift**: Einstellungen → Anzeige & Helligkeit → Textgröße und Bedienungshilfen → Größerer Text: ändert sich in der App etwas? Anzeigezoom „Größerer Text“ (320 pt): passt der Fokus? Im Safari-Tab „aA“ 125 % und 150 %: Gewichtsfeld lesbar und antippbar?
17. **VoiceOver**: ein Training: Ansage nach dem Satz („…, Pause 2:30“), „Pause vorbei“, Halte-Ansagen („Gleich geht’s los“, „Seite wechseln“, „Geschafft“), Fokus nach dem Schließen eines Sheets, Wischen aus einem Sheet in den Hintergrund (N-8), Warm-up auf-/zuklappen.
18. **Sprachsteuerung**: „Tippe auf Weiter“ und „Tippe auf Rückgängig“ während einer Pause (N-3).
19. **Fancy**: Liegt der Verlauf hinter langen Seiten sauber (iOS ignoriert `background-attachment: fixed`)? Ruckelt das Scrollen in der langen Liste (viele Karten mit `backdrop-filter`)?
20. **Konsole**: Über den Web-Inspektor am Mac: erscheinen auch auf dem iPhone CSP-Meldungen „Refused to apply a stylesheet“?

## Quellen

- WebKit-Bug 237322 „webaudio api is muted when the iOS ringer is muted“: https://bugs.webkit.org/show_bug.cgi?id=237322 (Mailingliste: https://lists.webkit.org/pipermail/webkit-unassigned/2024-September/1186593.html)
- WebKit-Bug 252746 „Inconsistent audio playback behaviour when device is muted“: https://bugs.webkit.org/show_bug.cgi?id=252746
- W3C Audio Session (Entwurf): https://www.w3.org/TR/audio-session/ · MDN `AudioSession.type`: https://developer.mozilla.org/docs/Web/API/AudioSession/type
- WebKit-Bug 254545 „Wake Lock API does not work in Home Screen Web Apps“ (laut Sekundärquellen mit iOS 18.4 behoben): https://bugs.webkit.org/show_bug.cgi?id=254545 · https://progressier.com/pwa-capabilities/screen-wake-lock
- WCAG 2.2: 1.4.3 Kontrast (Minimum), 1.4.11 Nicht-Text-Kontrast, 2.5.3 Label in Name: https://www.w3.org/TR/WCAG22/

## Zusammenfassung nach Schwere

| Schwere | Anzahl | Findings |
|---|---|---|
| Kritisch | 0 | – |
| Hoch | 0 | – |
| Mittel | 3 | M-1 Abstand „Rückgängig“/„Weiter“ weiter 8 px · M-2 Gewichtsfeld bei Zoom ab ca. 130 % unbrauchbar, kein Dynamic Type · M-3 kein Signal bei Stummschalter |
| Niedrig | 9 | N-1 bis N-9 |
