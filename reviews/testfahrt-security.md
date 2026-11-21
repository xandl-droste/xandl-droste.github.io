# Review: Security (Testfahrt-Fixes)

Geprüft wurde nur das, was sich im Arbeitsverzeichnis auf Branch `feature/testfahrt-bugs` gegenüber `develop` geändert hat (`git diff develop`, 9 Dateien, +153/−29). Ich habe nur gelesen. Im Repo habe ich nichts geändert und nichts angelegt. Für die Browser-Prüfungen lief die bestehende e2e-Suite gegen die lokale App (http://127.0.0.1:8765/training/, Playwright aus dem Scratchpad).

## Geprüfte Punkte

| Bereich | Wie geprüft | Ergebnis |
|---|---|---|
| XSS / verbotene Sinks | Diff durchsucht nach `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `eval`, `new Function`, `setTimeout(string)`, `document.write`. Neue Render-Pfade gelesen: `allDoneCard`, `warmupCard`, `viewToggle` in `training/src/views/live.js`, neue Icons in `training/src/dom.js:43-45`. Den Weg über `h()`/`setProps` in `dom.js:9-29` nachverfolgt. | Keine neuen Sinks. Die Warm-up-Texte aus dem Plan (importierte Daten) gehen weiter als Textknoten über `h('li', {}, t)`. `open: Boolean(open)` wird über `setAttribute('open', '')` gesetzt oder bei `false` weggelassen. `ontoggle` ist eine Funktion und wird per `addEventListener` angehängt, nicht als Attribut-String. Die SVG-Pfade der neuen Icons sind feste Konstanten. `aria-label` und Texte sind statisch. |
| CSP | Die neuen CSS-Regeln (`training/css/app.css:242-249`, darunter `::after { content: "" }`) gelesen. Geprüft, ob Inline-Styles oder `style`-Attribute dazukommen. | Alles steht im externen Stylesheet. Es gibt keine Inline-Styles und keine `style`-Props. Die CSP muss nicht gelockert werden. |
| Netzwerk | Diff auf `fetch`, `import()` und URLs durchsucht. `npm run e2e` ausgeführt (training, import, offline, info, insecure). | Der Diff bringt keine neuen Requests. In allen fünf e2e-Läufen gab es „externe Requests: keine“ und „Probleme: keine“. |
| Service Worker / Integrität | `training/sw.js` (VERSION, HASHES) mit `shasum -a 256` für die fünf geänderten Dateien unter `training/` abgeglichen. | Alle fünf Hashes stimmen mit `sw.js` überein. `VERSION` wurde erneuert. Die SHA-256-Prüfung bleibt also wirksam, und das Update erreicht die Clients. Scope und Cache-Strategie sind unverändert. |
| Zustand / Speicher | Neue Felder `S.warmupOpen` und `S.scrollToActive` (`training/src/app.js:56-57`) und ihre Verwendung (`app.js:261, 727-735, 1010, 1059-1070`) geprüft. Ebenso, ob sie in IndexedDB landen. | Die beiden Felder liegen nur im Arbeitsspeicher und werden nicht persistiert. `S.warmupOpen` hält nur eine Session-ID und wird nur mit `===` verglichen. `warmupToggle` prüft auf `S.live` und läuft deshalb auch dann ohne Fehler, wenn das `toggle`-Event erst nach dem Trainingsende eintrifft. Der Live-Stand selbst wird beim Laden weiterhin geprüft (`training/src/model/live.js:31`, Version und `fileId`). Diese Änderung schwächt das nicht. |
| Modelllogik `toggleSet` | `training/src/model/live.js:177-186`, neuer Test `tests/live.test.js:59-76`, `npm test`. | Das Verhalten wird nur enger: `rest` wird in mehr Fällen auf `null` gesetzt, der Satz-Index wird weiterhin in Zeile 172-173 geprüft. Es gibt keinen neuen Pfad, der ungeprüfte Indizes nutzt. `npm test`: 135/135 bestanden. |
| Event-Listener | Neuer globaler `pointerdown`-Listener (`app.js:75-76`). | Er speichert nur `pointerType` als String. Er greift nicht in Events ein und speichert keine Daten. Kein Risiko. |
| Fokus-/Scroll-Logik | `render()`-Ende und `scrollToActiveSet` (`app.js:1059-1070`). | `querySelector` arbeitet nur mit festen Selektoren, und `scrollIntoView` ist rein lokal. Ist ein Sheet offen, wird übersprungen, ein Sheet wird also nicht weggescrollt. |
| Tests | Diff von `tests/e2e/helpers.mjs` und `tests/e2e/training.e2e.mjs` gelesen. | Nur Testcode. Er enthält keine Secrets, keine externen Ziele und keine persönlichen Daten. |
| Persönliche Daten / Repo | Diff auf Namen, Orte, Mailadressen und Tokens durchsucht. | Nichts gefunden. `training/src/legal.js` ist nicht geändert. |

## Nicht geprüft (mit Grund)

- **Echtes iPhone / iOS Safari:** Kein Gerät verfügbar. Ob ein Auswahlfeld nach Touch wirklich nicht erneut aufgeht (`app.js:1059`), lässt sich nur dort prüfen. Für die Sicherheit spielt das keine Rolle.
- **Bestehende Bereiche außerhalb des Diffs:** Import-Härtung, FIT/CSV-Export, Workflow, Git-Historie und Framing habe ich nicht neu geprüft, weil der Diff sie nicht berührt. Die e2e-Läufe für Import, Offline und Insecure waren grün.
- **Gezielte Tests mit präparierten Warm-up-Texten im Browser:** Nicht eigens gelaufen. Der Render-Pfad (`h('li', {}, t)`) ist gegenüber `develop` aber unverändert und läuft über Textknoten. Die Aussage stützt sich auf die Code-Analyse.

## Findings

### Kritisch

Keine.

### Hoch

Keine.

### Mittel

Keine.

### Niedrig

Keine.

## Hinweise (ohne Finding)

- **H1: `lastPointerType` wird nie zurückgesetzt** (`training/src/app.js:75-76, 1059`). Nach einer Touch-Eingabe bekommt ein `SELECT` beim Neuzeichnen auch dann keinen Fokus zurück, wenn die nächste Eingabe per Tastatur kam (z. B. externe Tastatur, Switch Control). Das betrifft nur Barrierefreiheit, nicht die Sicherheit. Vorschlag: zusätzlich einen `keydown`-Listener in der Capture-Phase, der `lastPointerType = ''` setzt.
- **H2: Die vergrößerte Tippfläche des Umschalters** (`training/css/app.css:247-248`, `::after` mit `bottom: -7px`) reicht in den Innenabstand der Leiste. Ein versehentlicher Tap wechselt nur die Ansicht, ändert keine Daten und lässt sich zurücknehmen. Das ist kein Sicherheitsrisiko, sollte aber im iOS/UX-Review auf Überlappung mit dem Home-Indikator bzw. der Safe-Area geprüft werden.
- **H3: `S.scrollToActive` kann gesetzt bleiben.** Er wird in `updateSettings` gesetzt (`app.js:261`), und `scrollToActiveSet` setzt ihn erst zurück, wenn kein Sheet mehr offen ist. Wird der Wechsel über das Menü-Sheet ausgelöst, bleibt der Wert bis zum nächsten `render()` ohne Sheet stehen und scrollt dann einmal. Das ist gewollt und harmlos. Die Bedingung `screen !== 'live'` fängt den Fall ab, dass man dazwischen den Bildschirm wechselt.
- **H4: Die SW-Precache-Liste ist konsistent.** Wird nach dem Review noch etwas unter `training/` geändert, muss `npm run sw` erneut laufen. Sonst liefert der Service Worker wegen der Hash-Prüfung den alten Stand aus. Das wäre sicher, die Fixes kämen dann aber nicht an.

## Fazit

Die Änderungen bringen keine neuen Sicherheitsrisiken und verschärfen keine Altlasten. Alles Neue wird über die bestehende `h()`-Hilfe mit Textknoten und `addEventListener` gerendert. Neuer Zustand liegt nur im Arbeitsspeicher. CSP und Service-Worker-Integrität bleiben gewahrt. Unit-Tests (135/135) und alle e2e-Läufe ohne externe Requests sind grün.
