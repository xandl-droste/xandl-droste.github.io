# Review: Code-Qualität (Testfahrt-Fixes)

Ich habe den uncommitteten Arbeitsstand auf `feature/testfahrt-bugs` gegen `develop` (`git diff develop`) nur lesend geprüft. Ausgeführt habe ich nur `npm test` (135/135 grün). Darin steckt auch die Prüfung, ob die Precache-Liste und die Hashes in `training/sw.js` aktuell sind. Im Repo habe ich nichts geändert.

## Geprüfte Punkte

| Bereich | Wie geprüft | Ergebnis |
|---|---|---|
| Keine Pause nach dem letzten offenen Satz (`model/live.js:177-186`) | Code gelesen, alle Fälle der Bedingung durchgespielt: abhaken, Rückgängig, außer der Reihe, „Später“, übersprungene Übungen. Mit `slotOrder`/`activeSlot` verglichen. Neuer Unit-Test gelesen. | Für `toggleSet` korrekt. „Später“-Blöcke zählen über `activeSlot` weiter als offen, danach startet also noch eine Pause. Übersprungene Blöcke zählen nicht. Das bisherige Verhalten bei `restSec = 0` (laufende Pause bleibt) ist unverändert. Andere Wege zu „alles erledigt“ lassen die Regel aus, siehe M1. |
| Warm-up bleibt offen (`app.js:56,731-734,1010`, `views/live.js:239-244`) | Code, `h()`/`setProps` in `dom.js` (Behandlung von `false`, `on*`), Ablauf des `toggle`-Events | Funktioniert. Der Schlüssel ist `session.id` (neue ID bei jedem Start, `startLive`/`newId`). Bei einem Trainingswechsel oder Neustart ist das Warm-up also wieder zu. Nach `restoreLive` ist es zu (liegt nur im Speicher), das ist vertretbar. Kein Render-Loop: Der Handler zeichnet nicht neu. |
| Ansicht-Umschalter in der Leiste (`views/live.js:394-405`, `app.js:726-729`, `dom.js` Icons) | Code, Fokus-Wiederherstellung in `render()` | Er läuft über dieselbe Einstellung wie das Menü (`updateSettings`), es gibt keinen zweiten Zustand. `aria-label` ist gesetzt, das Icon ist dekorativ. |
| Scrollen zum aktiven Satz (`app.js:261,1060-1070`) | Code. Fälle: Menü-Sheet noch offen, hin und zurück im Sheet, anderer Bildschirm | Das Flag wird genau einmal verbraucht, auch wenn am Ende keine Liste angezeigt wird. Kein Rest-Zustand. |
| Auswahlfeld nach Touch nicht neu fokussieren (`app.js:74-76,1059`) | Code, e2e-Prüfung | Funktioniert. Kleinere Unschärfen siehe N3. |
| „Alle Sätze erledigt“ ohne eigenen Knopf (`views/live.js:175-180,256-259,331-333`) | Code. Nach verwaisten `data-fid` (`finish2`, `finish-list`) in `src` und `tests` gesucht. | Duplikat sauber zu `allDoneCard()` zusammengeführt. Keine toten Referenzen. Im Kopf („Beenden“) und in der Leiste („Abschließen“) bleibt Beenden erreichbar. |
| CSS (`app.css:235,242-249` und Media-Queries 300-345) | Grid-Linien `1 / -2` und `-2` bei 3, 2 und 1 Spalte nachgerechnet. Overrides und Spezifität geprüft. | Das Layout geht in allen drei Grid-Varianten auf: Bei 1 Spalte steht der Umschalter in einer eigenen Zeile rechts. Die Regeln sind aber verstreut, siehe N1. Die Tippfläche ist kleiner als 44 px, siehe N2. |
| Repo-Regeln (CLAUDE.md) | Diff durchsucht nach `innerHTML`, `insertAdjacentHTML`, `eval`, `new Function`, externen URLs und persönlichen Daten | Nichts davon. Alles wird mit `h()` gebaut. `npm run sw` ist gelaufen (Hashes in `sw.js` passen, der Test ist grün). |
| Kommentare | Alle neuen und geänderten Kommentare gelesen | Deutsch, sachlich, passen zum Code. Kleinigkeit siehe N3. |
| Unit-Test `tests/live.test.js:59-76` | Gelesen, gegen die Implementierung geprüft | Aussagekräftig: Er prüft die laufende Pause vor dem letzten Satz, das Ende der Pause mit dem letzten Satz, Rückgängig und den Fall „außer der Reihe“. Fälle mit „Später“ und Übersprungen fehlen, siehe N4. |
| e2e-Tests (`training.e2e.mjs`, `helpers.mjs`) | Gelesen. Geprüft, ob eine Prüfung auch ohne den Fix grün wäre. | Die Warm-up-, Select-, Umschalter-, Scroll- und Abschluss-Prüfungen schlagen ohne den jeweiligen Fix fehl, sind also nicht falsch-positiv. Laufzeit und Robustheit siehe N5. |

## Nicht geprüft (mit Grund)

- **e2e im Browser:** Nicht ausgeführt. Der Auftrag war ein Code-Review, und die Logik war aus dem Code eindeutig. Die e2e-Tests habe ich nur gelesen.
- **Echtes iOS (Select-Verhalten, Tippflächen):** Kein Gerät. Ob iOS ein fokussiertes `<select>` wirklich erneut öffnet, habe ich nicht nachgestellt.
- **Optik der Leiste in Hell/Dunkel/Fancy:** Gehört zur UX-Rolle. Geprüft habe ich nur, ob die CSS-Regeln sich korrekt verhalten.

## Findings

### Kritisch

Keine.

### Hoch

Keine.

### Mittel

#### M1: „Keine Pause nach dem letzten Satz“ gilt nur für das Abhaken, nicht für Überspringen oder Satz entfernen

- **Fundstelle:** `training/src/model/live.js:243-247` (`setSkipped`) und `:229-240` (`removeSet`). Die neue Regel steht nur in `toggleSet` (`:180-182`).
- **Beschreibung:** Satz von Übung A abhaken, die Pause läuft (`rest.afterItem = A`). Dann die letzte offene Übung B überspringen oder deren letzten offenen Satz entfernen. Danach ist `activeSlot` null, aber `setSkipped` löscht die Pause nur bei `rest.afterItem === i`, und `removeSet` fasst sie gar nicht an. Die Leiste zeigt dann „Abschließen“ zusammen mit einer laufenden „Pause“. Am Ende kommen trotzdem Signalton und „Los!“ (`app.js:1116-1128`), obwohl nichts mehr folgt. Genau das soll der Fix verhindern, und der Kommentar in `toggleSet` sagt es so.
- **Auswirkung:** Gleiches Ziel, aber uneinheitliches Verhalten je nach Bedienweg. Ein Ton nach Trainingsende wirkt wie ein Fehler. Keine Datenverluste.
- **Empfehlung:** Die Regel an einer Stelle festhalten, z. B. eine Hilfsfunktion `function dropRestIfDone(next) { if (!activeSlot(next)) next.rest = null; return next; }`. Sie in `toggleSet`, `setSkipped` und `removeSet` aufrufen. Alternativ zentral in `setLive` in `app.js`. Dazu je einen Unit-Test: Übung überspringen, wenn sie die letzte offene ist, und letzten offenen Satz entfernen.
- **Sicherheit der Einschätzung:** Hoch, aus dem Code eindeutig, nicht im Browser nachgestellt.

### Niedrig

#### N1: Regeln für `.rest` verstreut, doppelte Selektoren überschreiben sich

- **Fundstelle:** `training/css/app.css:231` und `:245` (`.card.rest`), `:235` und `:246` (`.rest .next`), `:236`, `:241` und `:244` (`.rest .btn.sm`, jetzt dreimal), dazu `gap` in `:232` und `row-gap` in `:245`.
- **Beschreibung:** Die neuen Regeln stehen als zweiter Block hinter den alten. Wer den Timer anpasst, muss für Padding, Gap und Button-Höhe jeweils zwei oder drei Stellen finden. `padding: 8px 12px` in `:231` wird für oben und unten sofort wieder überschrieben. `.rest .btn.sm { min-height: 44px }` senkt die Höhe von `.btn.sm` (48 px) nur in der Leiste, steht aber nicht neben den beiden anderen `.rest .btn.sm`-Regeln.
- **Empfehlung:** Je Selektor eine Regel: `.card.rest { padding: 7px 12px; }`, `.rest { … gap: 0 16px; }`, `.rest .next { grid-column: 1 / -2; align-self: center; … }`, `.rest .btn.sm { min-height: 44px; padding: 0 12px; white-space: nowrap; }`. Den Kommentar zur Höhe (375 × 630) direkt darüber stellen.
- **Sicherheit der Einschätzung:** Hoch.

#### N2: Tippfläche des Umschalters unter 44 px, Kommentar beschreibt eine Grenzlösung

- **Fundstelle:** `training/css/app.css:242-248` (`.rest .view-toggle { height: 32px }`, `::after { bottom: -7px }`).
- **Beschreibung:** Die Tippfläche ist 44 × 39 px. Sie liegt unter dem Minimum von 44 pt, das der Rest der App einhält (`.icon-btn`, `.link`, `.seg button`). Das `::after` greift nur, solange `padding-bottom` der Leiste genau 7 px bleibt. Die beiden Werte sind nicht gekoppelt: Ändert jemand das Padding, ändert sich die Tippfläche unbemerkt mit.
- **Empfehlung:** Den Wert über eine Variable koppeln (`--rest-pad: 7px`, verwendet für `padding-block` und für `bottom: calc(-1 * var(--rest-pad))`). Oder das `::after` auch nach oben verlängern (`top: -6px`, `row-gap` ist ohnehin 0), dann sind es 44 × 45. Mit der iOS/UX-Rolle klären, ob 39 px reichen.
- **Sicherheit der Einschätzung:** Mittel. Ob das in der Praxis stört, muss jemand am Gerät prüfen.

#### N3: `lastPointerType` wird nie zurückgesetzt, Kommentar ungenau

- **Fundstelle:** `training/src/app.js:74-76`, `:1059`.
- **Beschreibung:** Nach einem Touch-Tipp irgendwo in der App bleibt `lastPointerType === 'touch'`, auch wenn danach per Tastatur bedient wird (iPad mit Tastatur, Hybridgeräte). Ein danach per Tastatur geändertes `<select>` verliert dann den Fokus, und der Fokus springt an den Seitenanfang. Gerade die Tastaturnutzung wollte die Ausnahme schützen. Außerdem heißt es im Kommentar „Art der letzten Berührung“, gespeichert wird aber jeder Pointer-Typ (auch `mouse`, `pen`).
- **Empfehlung:** Bei `keydown` zurücksetzen: `document.addEventListener('keydown', () => { lastPointerType = ''; }, true);`. Kommentar ändern in „Art des letzten Zeigers (Maus, Touch, Stift)“.
- **Sicherheit der Einschätzung:** Mittel. Der Randfall ist selten.

#### N4: Unit-Test deckt „Später“ und übersprungene Übungen nicht ab

- **Fundstelle:** `tests/live.test.js:59-76`.
- **Beschreibung:** Die neue Bedingung hängt an `activeSlot`, und das berücksichtigt `deferred` und `skipped`. Gerade diese beiden Fälle sind nicht getestet: Pause startet, wenn nur noch ein „Später“-Block offen ist. Keine Pause, wenn nur noch übersprungene Blöcke offen sind. Ein späterer Umbau von `slotOrder` könnte das unbemerkt ändern.
- **Empfehlung:** Zwei kurze Fälle ergänzen. (a) Einen Block über `setDeferred` zurückstellen, alle anderen Sätze abhaken: `live.rest` ist gesetzt. (b) Die letzte offene Übung über `setSkipped` überspringen, dann den letzten anderen Satz abhaken: `live.rest === null`. Zusammen mit M1 auch den Fall „erst abhaken, dann überspringen“.
- **Sicherheit der Einschätzung:** Hoch.

#### N5: e2e mit festen Wartezeiten und langer Klickschleife

- **Fundstelle:** `tests/e2e/training.e2e.mjs:54` und `:265-270` (je Klick `waitForTimeout(620)`, bis zu 60 Durchläufe), dazu weitere 620er-Waits in `:220`, `helpers.mjs:81`.
- **Beschreibung:** Die Wartezeit hängt fest an `DOUBLE_TAP_MS = 600` (`app.js:720`) und ist bei jeder Verwendung neu als Zahl hingeschrieben. Ändert sich die Sperre, schlagen die Tests still fehl: Klicks werden verschluckt, und die Schleife bricht erst über `guard` ab. Die neue Schleife kostet bei einer ganzen Einheit rund 20 bis 37 s. Endet die Schleife über `guard`, gibt es dazu keine eigene Meldung. Das fängt erst die nachfolgende `ends`-Prüfung ab, mit einer weniger klaren Meldung.
- **Empfehlung:** Eine Konstante `TAP_GAP_MS = 620` in `helpers.mjs` mit einem Kommentar, der auf `DOUBLE_TAP_MS` verweist, und überall verwenden. Nach der Schleife melden, wenn noch offene Sätze übrig sind („Liste: nicht alle Sätze abhakbar“). Optional die meisten Sätze per Rückgängig-freiem Weg abhaken, z. B. die Wartezeit nur zwischen Klicks auf dieselbe Übung einhalten. Das ist aber Geschmackssache.
- **Sicherheit der Einschätzung:** Mittel. Heute stabil, das Risiko liegt in der Wartung.

## Hinweise ohne Finding

- `views/live.js:241`: `A.warmupToggle?.(…)` ist die einzige optional aufgerufene Aktion. Alle anderen (`A.askFinish`, `A.undo` …) werden direkt aufgerufen. `A` stellt `warmupToggle` immer bereit, das `?.` kann also weg. Ausnahme: Es war für Test-Stubs gedacht, dann einen kurzen Kommentar dazu.
- `views/live.js:241`: Mit `open` gerendert, löst `<details>` asynchron ein `toggle`-Event aus. `warmupToggle(true)` läuft also bei jedem Neuzeichnen einmal mit. Das ist harmlos (kein Render), kann beim Debuggen aber überraschen. Ein Satz im Kommentar würde reichen.
- `S.warmupOpen` wird beim Beenden oder Verwerfen nicht zurückgesetzt. Wegen der Kopplung an `session.id` ist das folgenlos, es bleibt nur ein alter Wert im Speicher.
- `views/live.js:377`: `restBar` ist exportiert. Ohne `view` bleibt die letzte Spalte leer, weil `.rest .next` jetzt fest `1 / -2` belegt. Heute ruft nur `liveView` die Funktion auf, und zwar mit `view`. Falls `restBar` woanders gedacht war: den Export entfernen oder `view` als Pflicht dokumentieren.
- `app.js:1064`: Der Name `scrollToActiveSet(screen)` könnte nach „Satz setzen“ klingen. `scrollToActiveSetOnce` oder `maybeScrollToActive` wäre klarer. Rein kosmetisch.
- Die Zusammenführung zu `allDoneCard()` und das Entfernen des zweiten Abschluss-Knopfs sind sauber: keine verwaisten `data-fid`, und die e2e-Helfer wurden passend umgestellt.
