# Review 3: iOS-Safari, Barrierefreiheit und Bedienbarkeit auf kleinen Displays (Runde 1)

Stand: `develop` @ 09a1a72 (Arbeitsbaum sauber). Geprüft am 2026-11-15.

Methode:
- Code-Analyse aller Dateien unter `training/` (HTML, CSS, alle Module in `src/`, `sw.js`, Manifest).
- Browser-Tests mit **Playwright 1.49.1 / WebKit** (Profil „iPhone 13 Mini“, Viewport auf **375 × 630** gesetzt, DPR 3, Touch). Dazu Varianten: 300 × 504 und 250 × 420 (Seitenzoom 125 % bzw. 150 %), 320 × 470 (iPhone SE im Browser), 812 × 340 (Querformat). Werkzeuge und Screenshots liegen außerhalb des Repos.
- Die Repo-E2E-Tests liefen ebenfalls mit WebKit (`BROWSER=webkit`).
- Offline-Neuladen ließ sich mit WebKit nicht emulieren (siehe unten). Ich habe es deshalb zusätzlich mit lokalem Chrome geprüft.
- Kontraste habe ich nach der WCAG-2.x-Formel aus den CSS-Variablen berechnet. Für Fancy habe ich die halbtransparenten Flächen über alle drei Verlaufsstopps gemischt.
- Webrecherche mit den Quellen bei den jeweiligen Findings.

## Geprüfte Punkte

| Bereich | Geprüft | Ergebnis kurz |
|---|---|---|
| Layout 375 × 630, alle Bildschirme (Onboarding, Heute, Verlauf Liste/Detail, Plan, Menü, KI-Sheet, Live Liste/Fokus, Bearbeiten-, Optionen-, Beenden-Sheet, Abschluss) | WebKit | Kein horizontales Scrollen, keine abgeschnittenen Bedienelemente |
| Hell / Dunkel / Fancy | WebKit, Screenshots | Der Standardstil ist kaputt, siehe H-1 |
| Fokus-Modus passt ohne Scrollen (375 × 630) | WebKit, alle 26 Sätze von E1 und Sätze von E2 inkl. Varianten-Chips, Superset und Steigerungs-Button | Passt: `scrollHeight = 630` in jedem Zustand |
| Größere Schrift / Seitenzoom | Emuliert über kleineren CSS-Viewport | Bei 125 % überdeckt der Timer „Satz fertig“, bei 150 % gibt es horizontales Scrollen, siehe M-4 |
| Querformat 812 × 340 | WebKit | Bedienbar, Fokus muss scrollen (erwartbar), siehe N-6 |
| Touch-Ziele ≥ 44 px / Haupt-Aktionen ≥ 48 px | Automatische Vermessung aller Bedienelemente | Erfüllt bis auf `select` im Verlauf, siehe N-2 |
| Doppeltipp / Fehltipp | WebKit `dblclick` auf „Satz fertig“ | Schließt zwei Sätze ab, siehe M-1 |
| Rückgängig nach Satz-Abschluss | WebKit | Möglich, aber ungünstig platziert, siehe M-2 |
| Timer mit Zeitstempel | Code + Playwright-Clock (Vorspulen) | Korrekt: Nach 60 s Vorspulen zeigt er 1:00, nach Ablauf „Bereit“ |
| Autosave / Neuladen im Training | WebKit `reload` | Training bleibt erhalten, landet aber auf „Heute“, siehe N-5 |
| Wake Lock | Nur Code + Recherche | Wird nach `visibilitychange` neu angefordert. Auf dem Gerät prüfen |
| Eingabefelder: Schriftgröße, `inputmode` | Code + DOM | Alle ≥ 16 px. `decimal` für kg, `numeric` für Wdh./Sek. In Ordnung |
| Overscroll / Pull-to-Refresh | Nur Code | Siehe N-7, auf dem Gerät prüfen |
| Safe-Area-Insets | Code (`viewport-fit=cover`, `env()` an #app, Tabbar, Timer, Sheet, Toast, Menü) | Im Code vollständig. Auf dem Gerät prüfen |
| Service Worker / Update | Code, WebKit (registriert, steuert die Seite), Chrome (offline neu laden) | Offline-Neuladen funktioniert in Chrome und stellt das laufende Training wieder her |
| Speicher voll | WebKit, `QuotaExceededError` beim Beenden simuliert | Sackgasse, siehe M-3 |
| Kontraste WCAG AA, alle Stile | Berechnet | Weitgehend erfüllt, eine Ausnahme in Fancy, siehe N-3 |
| VoiceOver-Beschriftungen, Rollen | Code + DOM | Beschriftungen gut. Probleme beim Fokus und bei Live-Regionen, siehe M-5 |
| `prefers-reduced-motion` | Code | Es gibt keine Animationen. Die Regel ist vorhanden. In Ordnung |
| Fokus-Sichtbarkeit | Code | `:focus-visible` mit 3 px in Akzentfarbe, in allen Stilen ausreichend kontrastreich. In Ordnung |
| Zustände nicht nur über Farbe | Code + Screenshots | „gesichert / nicht gesichert“ als Text, Satz erledigt mit Häkchen-Symbol. Der aktive Satz ist nur über den Rahmen erkennbar, siehe N-4 |
| Bedienfluss, Taps, Sackgassen, Texte | WebKit + Code | Siehe Abschnitt „Bedienfluss“ |
| Datei-Import / Teilen-Export | Code | Siehe N-8 und N-9. Auf dem Gerät prüfen |

## Nicht prüfbar (mit Grund)

- **Echtes iOS-Safari / Home-Bildschirm-Modus:** Playwright-WebKit ist WebKit für macOS. Es hat keinen Standalone-Modus, keine Statusleiste, keine Safe-Area-Insets, keine dynamische Adressleiste, keine Software-Tastatur, kein Teilen-Menü und keine Dateien-App.
- **Dynamic Type:** iOS-Systemschriftgröße wirkt in Safari nur auf Seiten, die `font: -apple-system-body` o. Ä. nutzen. Die App nutzt feste px-Werte. Emuliert habe ich nur den Safari-Seitenzoom (aA-Menü).
- **VoiceOver:** Es gab keinen echten Screenreader-Test. Geprüft habe ich nur ARIA-Attribute und das Fokusverhalten im DOM.
- **Offline in WebKit:** `context.setOffline` + `reload` bricht in Playwright-WebKit mit „internal error“ ab. Das ist eine Grenze des Werkzeugs. Ersatzweise habe ich mit Chrome geprüft (bestanden).
- **Export/Teilen:** Playwright-WebKit löst `navigator.share` aus und es kommt kein Download-Ereignis. Deshalb bricht `tests/e2e/import.e2e.mjs` unter WebKit mit Timeout ab. Das ist ein Problem der Testumgebung, kein App-Fehler.
- Hinweis zu den Repo-E2E-Tests unter WebKit: Sie melden „Refused to apply a stylesheet … style-src“. Das kommt vom Stylesheet, das Playwright für Screenshots einfügt. Ohne Screenshots sind es 0 Meldungen. Es ist kein App-Fehler, lässt die E2E-Tests unter WebKit aber fälschlich scheitern.

---

## Findings

### Kritisch

Keine.

### Hoch

#### H-1: Standardstil kaputt. `currentTheme()` gibt `undefined` zurück und registriert bei jedem Rendern einen neuen Listener

- **Fundstelle:** `training/src/app.js:49-56`. Eingeführt in 1aa0014 (Schritt 6, offenbar ein fehlerhaft eingefügter Block):
  ```js
  function currentTheme() {
    if (S.file?.settings?.theme) return S.file.settings.theme;
    return window.addEventListener('hashchange', () => { … openInfo(); });
    matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }
  ```
- **Nachgestellt (WebKit):** Erster Aufruf mit `colorScheme: dark` ergibt `data-theme="undefined"` und `<meta name="theme-color" content="undefined">`. Die App erscheint hell, weil die `:root`-Defaults hell sind. Nach „Beispielplan laden“ steht in IndexedDB `settings: { view: 'list' }` ohne `theme`. Der Grund: `createTrainingFile` spreizt `{ theme: undefined }` über den Default `'dark'` (`training-file.js:19`). Im Menü ist kein Stil als gewählt markiert. Das betrifft auch Importe ohne vorhandene Datei (`app.js:335`).
- **Auswirkung:**
  - Die Vorgabe „Standard Dunkel“ ist verletzt, ebenso „`prefers-color-scheme` als Vorbelegung“. Wer im Dunkelmodus trainiert, sieht beim ersten Start und bis zur manuellen Wahl den hellen Stil (blendet im Studio). Mit `black-translucent` ist dann auch die Statusleiste auf hellem Grund unlesbar, siehe M-6.
  - `theme-color` ist ungültig.
  - Jedes `render()` ohne gespeicherten Stil hängt einen weiteren `hashchange`-Listener an. Das ist ein Speicherleck, und `openInfo` wird mehrfach ausgelöst.
  - Umgekehrt fehlt der `#info`-Listener ganz, sobald ein Stil gespeichert ist. Ein Wechsel auf `#info` öffnet die Info-Seite dann nicht mehr. Nur der Aufruf mit `#info` beim Start funktioniert.
- **Empfehlung:** Die Funktion wiederherstellen (`return matchMedia(…).matches ? 'light' : 'dark';`) und den `hashchange`-Listener einmalig auf Modulebene registrieren. In `createTrainingFile` `undefined`-Werte nicht über die Defaults spreizen. Einen Unit- oder E2E-Test ergänzen: Erststart mit `colorScheme: dark` ergibt `data-theme="dark"`, mit `light` ergibt er `"light"`.
- **Sicherheit:** Sehr hoch. Im Code eindeutig und im Browser reproduziert.

### Mittel

#### M-1: Doppeltipp auf „Satz fertig“ schließt zwei Sätze ab

- **Fundstelle:** `training/src/views/live.js:230`, `training/src/app.js:498-510`. In `css/app.css:48` steht `touch-action: manipulation`, deshalb kommen beide Taps als Klick an.
- **Nachstellen:** Fokus-Modus, Doppeltipp auf „Satz fertig“. Der Fortschritt springt von „0 von 31“ auf „2 von 31 Sätzen“ (WebKit-Test). Nach dem ersten Tap wird neu gerendert, und derselbe Button gehört dann zum **nächsten** Satz. Dasselbe passiert in der Liste, wenn ein Häkchen doppelt getippt wird: Satz an und wieder aus. Bei Supersets verschiebt sich zudem die aktive Zelle.
- **Auswirkung:** Mit nassen oder zittrigen Händen ist ein doppelter Tap realistisch. Der zweite Satz wird mit vorausgefüllten Werten als erledigt protokolliert, und die Pause startet neu. Rückgängig geht nur über den Toast, und der bietet nur den letzten Satz an (M-2).
- **Empfehlung:** Nach dem Abschluss eines Satzes für ca. 600–800 ms keine weiteren `toggle`-Aufrufe annehmen, oder Klicks mit `event.detail > 1` ignorieren. Alternativ „Satz fertig“ kurz deaktivieren bzw. erst nach einer sichtbaren Übergangsanzeige auf den nächsten Satz umschalten.
- **Sicherheit:** Hoch (reproduziert). Auf dem Gerät mit echtem Finger bestätigen.

#### M-2: „Rückgängig“ steht oben im Toast, verdeckt Kopf, „Beenden“ und Menü und verschwindet nach 4 s

- **Fundstelle:** `training/css/app.css:233-240` (Toast `top: safe-t + 8px`), `app.js:66-74` und `app.js:505` (4000 ms).
- **Nachstellen:** Einen Satz abschließen. Der Toast liegt bei y = 8–68 px und überdeckt Titel, Fortschrittszeile, „Beenden“ (y = 36–80) und den Menü-Button (y = 6–50). Siehe Screenshot `p-live-toast.png`.
- **Auswirkung:**
  - Die wichtigste Fehltap-Korrektur liegt im schlecht erreichbaren oberen Drittel. Das widerspricht „wichtige Aktionen im unteren Drittel“.
  - Im Fokus-Modus ist der abgeschlossene Satz nach dem Tap nicht mehr sichtbar. Ohne Toast lässt er sich nur über Menü → Liste → Häkchen wieder öffnen.
  - Während jeder Pause sind „Beenden“ und das Menü 4 s lang nicht tippbar.
  - Jeder neue Toast ersetzt den vorigen, auch „Neue Version verfügbar“.
- **Empfehlung:** Den Undo-Toast im Live-Training unten direkt über dem Pausentimer anzeigen (oder „Rückgängig“ als Button in die Timerleiste aufnehmen, solange die Pause des eben abgeschlossenen Satzes läuft). Die Anzeigezeit an die Pause koppeln oder auf mindestens 8 s verlängern. Den Toast nicht über Kopf und Menü legen.
- **Sicherheit:** Hoch.

#### M-3: Speicher voll beim Beenden ist eine Sackgasse. Das laufende Training lässt sich nicht als Datei sichern

- **Fundstelle:** `training/src/app.js:581-594` (`finishLiveNow` bricht bei Speicherfehler ab), `app.js:629-646` (`doExport` exportiert nur `S.file` ohne das laufende Training), `storage.js:110-113` (Meldung).
- **Nachstellen (WebKit):** `IDBObjectStore.put` für die Datei wirft `QuotaExceededError`. Danach Beenden → „Beenden und speichern“. Toast: „Speicher voll. Bitte jetzt ‚Als Datei sichern‘ und Platz freigeben.“ Das Sheet bleibt offen. Im Live-Bildschirm gibt es keinen Export-Button. Exportiert man über Plan oder Heute, fehlt die heutige Einheit in der Datei.
- **Auswirkung:** Die Handlungsanweisung lässt sich nicht befolgen, und das Training geht verloren, wenn die App danach beendet wird. Der Live-Zwischenstand liegt nur im Speicher, weil das Autosave ebenfalls scheitert.
- **Empfehlung:** Scheitert `saveFinished`, die fertige Datei trotzdem in `S.file` übernehmen (als „nicht im Browser gespeichert“ markieren) und direkt den Abschlussbildschirm mit „Als Datei sichern“ zeigen. Alternativ im Fehler-Sheet einen Button „Training als Datei sichern“ anbieten, der die Datei inklusive der laufenden Session exportiert.
- **Sicherheit:** Hoch für den Ablauf. Auf iOS ist echter Quota-Fehler selten, weil die Datenmengen klein sind.

#### M-4: Bei größerem Seitenzoom überdeckt der Timer „Satz fertig“. Ab 150 % gibt es horizontales Scrollen

- **Fundstelle:** `training/css/app.css:199-210` (sticky `.rest`), `app.css:108-118` (Superset-Raster `22px 1fr 1fr`), keine Anpassung für sehr schmale Viewports.
- **Nachstellen:**
  - 300 × 504 (Safari-Seitenzoom 125 % auf dem 13 mini), Fokus, Fancy: „Satz fertig“ liegt bei y 369–433, die sticky Timerleiste bei 403–496. Die untere Hälfte des Haupt-Buttons liegt **unter** dem Timer (Screenshot `zoom125-focus.png`). Gleiches Bild bei 320 × 470 (iPhone SE im Browser): Button 309–373, Timer 369–462.
  - 250 × 420 (150 %): `scrollWidth > innerWidth`. „Weiter“ ragt rechts aus dem Bild, „+30 s“ bricht um, Superset-Wertebuttons schrumpfen auf **21 × 48 px** (Text abgeschnitten).
- **Auswirkung:** Wer die Schrift über Safari-Zoom vergrößert (der einzige Weg, da Dynamic Type nicht greift, siehe N-1), tippt beim Griff nach „Satz fertig“ leicht auf „Weiter“ oder „+30 s“. Ein beendeter Timer lässt sich nicht rückgängig machen. Supersets sind bei 150 % praktisch nicht bedienbar.
- **Empfehlung:**
  - Den Fokus-Modus so bauen, dass der Timer nicht überlappt. Zum Beispiel Fokus-Inhalt und Timer in ein Flex-Layout mit fester Höhe (`100dvh`) setzen, damit der Inhalt kleiner wird statt darunterzulaufen. Oder dem Inhalt `padding-bottom` in Höhe des Timers geben.
  - `@media (max-width: 330px)`: Superset-Tabelle untereinander statt nebeneinander, `white-space: nowrap` für „+30 s“, Timer-Buttons umbrechen lassen.
- **Sicherheit:** Hoch für die Emulation. Ob Safari-Seitenzoom exakt so skaliert, auf dem Gerät prüfen.

#### M-5: Komplettes Neurendern bei jeder Aktion. VoiceOver-Fokus und Live-Regionen gehen verloren

- **Fundstelle:** `training/src/app.js:677-694` (`root.replaceChildren(...)` bei jeder Änderung). Die Fokus-Wiederherstellung nutzt `document.activeElement`. `views/live.js:32` hat `aria-live` am Fortschritt, `app.js:140` `role="status"` am Toast.
- **Nachstellen:** Im Fokus-Modus „Wiederholungen erhöhen“ antippen. Danach ist `document.activeElement` `BODY` (WebKit). Safari fokussiert Buttons beim Antippen nicht, deshalb greift die `data-fid`-Wiederherstellung nicht.
- **Auswirkung (VoiceOver):** Nach jedem Tap auf +/−, Häkchen oder „Satz fertig“ ist das fokussierte Element aus dem DOM entfernt. VoiceOver springt typischerweise an den Seitenanfang. Die `aria-live`-Region des Fortschritts wird jedes Mal neu erzeugt statt aktualisiert, und neu eingefügte Live-Regionen werden oft nicht angesagt. Dasselbe gilt für den Toast mit „Rückgängig“.
- **Empfehlung:**
  - Eine dauerhafte, außerhalb von `#app` liegende Live-Region (`role="status"`) anlegen und nur deren Text ändern. Ansagen etwa: „Satz 2 erledigt, Pause 2 Minuten“, „Gewicht 42,5 kg“.
  - Nach Aktionen den Fokus explizit auf das logische Folgeelement setzen (gleicher Stepper-Button, nächster Satz), unabhängig von `activeElement`. Zum Beispiel die `data-fid` des Auslösers in den Handlern merken.
  - Langfristig nur geänderte Knoten aktualisieren.
- **Sicherheit:** Mittel. Das DOM-Verhalten ist belegt, das VoiceOver-Verhalten nicht am Gerät geprüft.

#### M-6: Statusleiste `black-translucent` ist im Stil „Hell“ unlesbar (Home-Bildschirm)

- **Fundstelle:** `training/index.html:12`.
- **Beschreibung:** `black-translucent` legt **weiße** Statusleisten-Symbole über den Seiteninhalt. Im Stil Hell (`#f4f6f4`) sind Uhrzeit und Akku dann praktisch unsichtbar. Durch H-1 ist Hell derzeit sogar der faktische Standard. Quellen: [Changing the iOS status bar of your PWA](https://medium.com/appscope/changing-the-ios-status-bar-of-your-progressive-web-app-9fc8fbe8e6ab), [Progressier: Customizing the status bar](https://intercom.help/progressier/en/articles/10574799-complete-guide-to-customizing-the-mobile-status-bar-in-a-website-or-pwa). Laut einem Einzelbericht hat sich das Verhalten in iOS 26.1 geändert ([Glide-Forum](https://community.glideapps.com/t/webapp-status-bar-not-transparent-anymore/85272)).
- **Auswirkung:** Im Standalone-Modus mit hellem Stil ist die Statusleiste nicht lesbar.
- **Empfehlung:** Im Stil Hell hinter `env(safe-area-inset-top)` einen dunklen Streifen legen (z. B. ein fixes Element in `--text`), oder auf `default` umstellen und die Safe-Area oben dafür nicht mehr einrechnen. Auf dem Gerät mit der installierten iOS-Version prüfen.
- **Sicherheit:** Mittel. Das ist dokumentiertes Verhalten, aber nicht am Gerät geprüft, und iOS-26-Änderungen sind unklar.

#### M-7: Gewicht beim ersten Training pro Satz neu eintippen

- **Fundstelle:** `training/src/model/live.js:121-129` (`updateSet` ändert nur den einen Satz). Die Vorbelegung kommt aus `progression.js`.
- **Nachstellen:** Beim ersten Training einer Übung (Gewicht leer, „eintragen“) bei Satz 1 40 kg eingeben und „Satz fertig“ tippen. Satz 2 steht wieder auf „eintragen“ (Screenshot `p-focus-rest.png`). In der Liste zeigen alle Sätze „– kg × 4“.
- **Auswirkung:** Pro Satz kommen 3–4 zusätzliche Taps dazu, mit Tastatur zwischen den Sätzen. Fehlt ein Eintrag, wird ein Satz ohne Gewicht protokolliert: „Satz fertig“ nimmt ein leeres Gewicht ohne Hinweis an.
- **Empfehlung:** Einen geänderten Wert an die folgenden **offenen** Sätze derselben Übung weitergeben, deren Wert leer ist oder noch dem alten Vorschlag entspricht. Optional bei leerem Gewicht (Einheit kg) kurz nachfragen.
- **Sicherheit:** Hoch.

### Niedrig

#### N-1: Dynamic Type wird nicht unterstützt
- **Fundstelle:** `training/css/app.css:29` und alle Größen in px.
- **Beschreibung:** Die iOS-Einstellung „Größere Schrift“ wirkt nicht. Nur Safari-Seitenzoom vergrößert, siehe dazu M-4.
- **Empfehlung:** Die Basis über `font: -apple-system-body` (nur unter `@supports`) setzen und Größen in `rem` angeben. Dann M-4 mitlösen. Alternativ bewusst ablehnen und in der README auf den Seitenzoom hinweisen.
- **Sicherheit:** Hoch.

#### N-2: Auswahlfeld im Verlauf nur 23 px hoch (WebKit)
- **Fundstelle:** `training/css/app.css:157-160`. `.select` hat `min-height: 48px`, aber kein `appearance: none`.
- **Beschreibung:** WebKit rendert das native `select` mit 325 × 23 px (Screenshot `hist-list.png`). iOS-Safari übernimmt Höhen bei nativen Selects teils.
- **Empfehlung:** `-webkit-appearance: none; appearance: none;` plus eigener Pfeil, oder `height: 48px`.
- **Sicherheit:** Mittel. Am Gerät prüfen.

#### N-3: Fancy: gedämpfter Text auf Zeilenfläche unter 4,5 : 1
- **Fundstelle:** `training/css/app.css:16-22`.
- **Beschreibung:** `--mut #d3c7ee` auf `--row` (über Karte, über Verlauf) erreicht 5,19 (oben), 4,25 (Mitte) und **3,99** (unten, `#0f3a5a`). Betroffen sind die 13-px-Tags („gesichert“, „übersprungen“) und die Satznummern. Alle anderen Paare erfüllen AA in allen Stilen (z. B. Text/Karte ≥ 8,27, Akzent-Button-Text ≥ 6,2, Hell `--mut` auf Karte 6,31). `background-attachment: fixed` wird von iOS-Safari ignoriert, deshalb streckt sich der Verlauf über die ganze Seite.
- **Empfehlung:** `--mut` in Fancy aufhellen (z. B. `#e4dcf7`) oder Tags in `--text` setzen.
- **Sicherheit:** Hoch (berechnet).

#### N-4: Aktiver Satz in der Liste nur visuell markiert
- **Fundstelle:** `training/src/views/live.js:112` und `:129`, nur die Klasse `act` (Rahmen in Akzentfarbe).
- **Beschreibung:** Sehend ist das über die Rahmenform erkennbar. Für VoiceOver gibt es keine Kennzeichnung.
- **Empfehlung:** `aria-current="step"` an der aktiven Zeile setzen oder „(aktuell)“ in das `aria-label` des Häkchens aufnehmen.
- **Sicherheit:** Hoch.

#### N-5: Nach Neustart der App landet man auf „Heute“ statt im Training
- **Fundstelle:** `training/src/app.js:725` (`S.screen = 'home'`, auch wenn `S.live` gesetzt ist).
- **Beschreibung:** iOS beendet Home-Bildschirm-Apps im Hintergrund häufig (z. B. Musik-App, Kamera). Danach braucht es einen zusätzlichen Tap auf „Training fortsetzen“. Erst dieser fordert den Wake Lock wieder an. Die Daten bleiben erhalten (geprüft), auch die laufende Pause, weil sie per Zeitstempel gespeichert ist.
- **Empfehlung:** Mit gespeichertem Live-Training direkt in `live` starten und `keepAwake(true)` beim ersten Tap anfordern.
- **Sicherheit:** Hoch.

#### N-6: Querformat: Fokus-Modus scrollt, Zahlenfelder 40 px hoch
- **Fundstelle:** `training/css/app.css:264-268`.
- **Beschreibung:** Bei 812 × 340 liegt „Satz fertig“ bei y 184–240 und der Timer bei 245–332. Die Seite ist 555 px hoch. Die Eingabefelder sind 232 × 40 px. Die Spezifikation verlangt nur Hochformat, im Studio ist Querformat selten.
- **Empfehlung:** Im Querformat Stepper und Button zweispaltig anordnen. Optional `orientation: portrait` im Manifest.
- **Sicherheit:** Hoch.

#### N-7: Overscroll-Sperre auf `body` statt `html`
- **Fundstelle:** `training/css/app.css:30`.
- **Beschreibung:** `overscroll-behavior` wirkt am Root-Scroller zuverlässig nur auf `html`. Im Safari-Browser kann Pull-to-Refresh dadurch ein Neuladen auslösen. Daten gehen nicht verloren (Autosave), man landet aber auf „Heute“ (N-5). Im Standalone-Modus gibt es kein Pull-to-Refresh.
- **Empfehlung:** `html { overscroll-behavior-y: none; }`.
- **Sicherheit:** Mittel. Am Gerät prüfen.

#### N-8: Download-Fallback gilt sofort als „gesichert“
- **Fundstelle:** `training/src/export.js:29-38`, `app.js:636-639`.
- **Beschreibung:** Ein Fehler beim Teilen, der kein `AbortError` ist, sowie Browser ohne Datei-Teilen führen zum `a.download`-Fallback. Der Export wird sofort als gesichert verbucht, obwohl iOS-Safari erst eine Rückfrage zeigt, die abgebrochen werden kann. Ebenso zählt Teilen an ein beliebiges Ziel (z. B. Nachrichten) als „gesichert“.
- **Empfehlung:** Beim Fallback den Text auf „Download gestartet. Bitte in Dateien prüfen.“ ändern und die 7-Tage-Erinnerung nicht zurücksetzen. Alternativ einen kurzen Dialog „Gesichert?“ anzeigen.
- **Sicherheit:** Mittel.

#### N-9: Dialoge ohne Fokusfalle und ohne Fokus-Rückgabe; veraltetes Sheet nach „plan.json jetzt öffnen“
- **Fundstelle:** `training/src/app.js:129-136` und `:253`.
- **Beschreibung:**
  - `aria-modal` ist gesetzt, aber Tab und Escape funktionieren nur im Sheet. Beim Schließen kehrt der Fokus nicht zum Auslöser zurück.
  - „plan.json jetzt öffnen“ setzt `S.sheet = null` ohne `render()`. Bricht man die Dateiauswahl ab, bleibt das KI-Sheet sichtbar, obwohl es logisch geschlossen ist. Ein späterer Klick auf „Schließen“ funktioniert trotzdem.
  - Ob iOS das `cancel`-Event des Dateifelds feuert, hängt von der iOS-Version ab. Ohne das Event bleibt ein unsichtbares `input` im DOM (harmlos).
- **Empfehlung:** Den Auslöser merken und beim Schließen fokussieren. Nach `S.sheet = null` `render()` aufrufen.
- **Sicherheit:** Hoch.

#### N-10: Kein Signal am Pausenende auf dem iPhone
- **Fundstelle:** `training/src/app.js:705` (`navigator.vibrate?.(200)`).
- **Beschreibung:** iOS-Safari unterstützt `navigator.vibrate` nicht. Am Pausenende ändert sich nur die Anzeige („0:00 Bereit“). Wer nicht auf den Bildschirm schaut, verpasst das Ende.
- **Empfehlung:** Eine deutlich sichtbare Änderung am Pausenende (z. B. Timerleiste in Akzentfarbe, Text „Los!“). Optional einen kurzen Ton über Web Audio nach vorheriger Nutzergeste (offline möglich, ohne externe Ressource).
- **Sicherheit:** Hoch (Vibration-API fehlt in iOS-Safari).

#### N-11: Gemischte Begriffe
- **Beschreibung:** „Session(s)“ (Heute, Verlauf) und „Training(s)“ (Start-Toast, Import-Vorschau) stehen für dasselbe. Englische Begriffe: „Backup“, „Deload“, „Warm-up“, „RIR“, „Fancy“, „Superset“. Einige stammen aus der Spezifikation und sind im Studio gängig.
- **Empfehlung:** Durchgängig „Training“ verwenden. „Backup“ → „Sicherung“. „RIR“ einmalig erklären (z. B. im Plan-Tab „RIR = Wiederholungen in Reserve“).
- **Sicherheit:** Hoch.

---

## Bedienfluss (gemessen bzw. abgezählt)

- **Bis zum ersten Satz** (Plan vorhanden): App öffnen → „Training starten“ (1) → Häkchen bzw. „Satz fertig“ (2). Beim allerersten Training kommen pro Satz die Gewichtseingabe (Wert antippen → Feld → Tastatur → „Fertig“) und wegen M-7 jeder weitere Satz dazu.
- **Pro Satz** (Werte vom letzten Mal passen): **1 Tap**. Optional „Weiter“, um die Pause zu beenden. Gewicht ändern in der Liste: Wert (1) → ± (1–n) → „Fertig“ (1). Im Fokus-Modus direkt ± tippen.
- **Bis zum Export nach dem letzten Satz:** „Beenden“ (1) → „Beenden und speichern“ (2) → „Als Datei sichern“ (3) → Teilen-Menü „In Dateien sichern“ (4) → „Sichern“ (5) → ggf. „Ersetzen“ (6). Davon sind 3 Taps in der App.
- **Sackgassen / unklare Zustände:** M-3 (Speicher voll), „Speicher nicht verfügbar“ (`app.js:681`, ohne Menü, Info oder Import: man kommt nicht weiter). Auch `setWeek` scheitert still (`app.js:358`), ist aber durch die Grenzen der Buttons praktisch nicht erreichbar.
- **Texte:** Durchgängig Deutsch und verständlich. Die Import-Fehler nennen den JSON-Pfad, dazu „Bitte die Datei korrigieren (oder vom Agenten korrigieren lassen)“. Das ist eine brauchbare Handlungsanweisung. Begriffe siehe N-11.

## Positiv geprüft (tatsächlich getestet)

- Fokus-Modus bei 375 × 630: In allen getesteten Zuständen (Einzelübung, Superset, Haltezeit, Varianten-Chips „Leg Curl“, Steigerungs-Button) passen Stepper (52 px), „Satz fertig“ (64 px) und Timer ohne Scrollen.
- Kein horizontales Scrollen bei 375 und 320 px Breite. Alle Bedienelemente außer dem `select` sind ≥ 44 px, Haupt-Buttons ≥ 48 px.
- Pausentimer rechnet mit Zeitstempel und stimmt nach dem Vorspulen. Laufendes Training und Pause überstehen das Neuladen.
- Offline-Neuladen mit gesteuertem Service Worker stellt das laufende Training wieder her (Chrome).
- Eingabefelder ≥ 16 px (kein Zoom), passende `inputmode`, `enterkeyhint`.
- Keine Animationen, `prefers-reduced-motion` respektiert. Fokusrahmen sichtbar.

## Checkliste: nur auf einem echten iPhone prüfbar

Am besten mit iPhone 13 mini, aktuelle iOS-Version, einmal in Safari und einmal vom Home-Bildschirm.

1. **Erster Start im Dunkelmodus und im Hellmodus** (nach Fix H-1): Startet die App im passenden Stil? Ist die Statusleiste (Uhrzeit, Akku) im Home-Bildschirm-Modus in **allen drei Stilen** lesbar (M-6)?
2. **Safe Area:** Menü-Button unter Notch/Dynamic Island nicht verdeckt. Tabbar, Pausentimer und Sheets enden über dem Home-Indikator. Im Querformat links/rechts nichts unter der Notch.
3. **Adressleiste (Safari-Browser):** Beim Scrollen der Liste verkleinert sich die Leiste. Bleibt der Pausentimer stabil am unteren Rand, ohne zu springen oder hinter der Leiste zu verschwinden? Gleiches für die Tabbar.
4. **Fokus-Modus bei sichtbarer Höhe ~630 pt:** Stepper, „Satz fertig“ und Timer ohne Scrollen sichtbar, auch mit ausgeklappter Safari-Leiste.
5. **Tastatur:** Gewicht antippen. Erscheint das Dezimalfeld mit Komma? Wird der Wert beim Antippen markiert (`select()` funktioniert auf iOS oft nicht)? Verdeckt die Tastatur im Bearbeiten-Sheet das Feld? Wird „Fertig“ in der Tastaturleiste übernommen?
6. **Doppeltipp und Fehltipps** mit nassem Finger auf „Satz fertig“, das Häkchen sowie „Weiter“ bzw. „+30 s“ direkt unter „Satz fertig“ (M-1, M-4).
7. **App-Wechsel:** Während der Pause in eine andere App, nach 1 Minute zurück. Stimmt der Timer? Bleibt der Bildschirm danach wieder an (Wake Lock)? Wake Lock funktioniert in Home-Bildschirm-Apps erst ab iOS 18.4 ([Safari 18.4 Release Notes](https://developer.apple.com/documentation/safari-release-notes/safari-18_4-release-notes), [WebKit Bug 254545](https://bugs.webkit.org/show_bug.cgi?id=254545)). Bei aktivem Stromsparmodus prüfen, ob der Bildschirm trotzdem ausgeht.
8. **App beenden** (aus dem App-Umschalter wischen) mitten im Training, neu öffnen: Sätze, Notiz und Pause sind vorhanden (N-5).
9. **Pull-to-Refresh** im Safari-Browser während des Trainings (N-7).
10. **Datei-Import über die Dateien-App:** `.training.json` und `plan.json` sind auswählbar (nicht ausgegraut). Abbrechen der Auswahl hinterlässt keinen hängenden Zustand.
11. **Export:** Teilen-Menü zeigt „In Dateien sichern“. Beim zweiten Mal in denselben Ordner kommt die Rückfrage „Ersetzen“. Abbrechen im Teilen-Menü zeigt „Nicht gesichert“. Abbrechen erst im Dateien-Dialog: Was meldet die App? Gleiches für CSV und Garmin `.fit`.
12. **Flugmodus** nach erster Ladung: App vom Home-Bildschirm starten, ein Training komplett durchführen und exportieren.
13. **Update:** Nach einer neuen Version erscheint „Neue Version verfügbar“. „Aktualisieren“ lädt neu, ohne das Training zu verlieren. Ohne Tippen ist nach dem nächsten Kaltstart der neue Stand aktiv.
14. **Gelöschte Websitedaten** (Einstellungen → Safari → Erweitert → Website-Daten): Die App startet im Onboarding, die Wiederherstellung per „Plan öffnen“ mit der `.training.json` funktioniert.
15. **VoiceOver:** Ein Training komplett mit VoiceOver. Werden Häkchen, Stepper, Timer und Toasts sinnvoll angesagt? Wohin springt der VoiceOver-Cursor nach jedem Tap (M-5)?
16. **Seitenzoom 125 % / 150 %** (aA-Menü) und „Größere Schrift“ in den Bedienungshilfen (N-1, M-4).
17. **`select` im Verlauf:** Tippfläche mindestens 44 pt hoch (N-2)?
18. **Fancy-Stil:** Scroll-Performance mit `backdrop-filter` auf vielen Karten und die Lesbarkeit der Tags unten auf der Seite (N-3).

## Zusammenfassung nach Schwere

| Schwere | Anzahl | IDs |
|---|---|---|
| Kritisch | 0 | – |
| Hoch | 1 | H-1 |
| Mittel | 7 | M-1 bis M-7 |
| Niedrig | 11 | N-1 bis N-11 |
