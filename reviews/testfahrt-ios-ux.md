# Review: iOS/UX (Testfahrt-Fixes)

Geprüft wurden nur die uncommitteten Änderungen gegenüber `develop` (`git diff develop`) auf dem Branch `feature/testfahrt-bugs`. Rolle und Format folgen `docs/spezifikation.md`, Abschnitt 9 (Reviewer 3).

**Vorgehen**
- **Code gelesen:** der Diff von `training/css/app.css`, `training/src/app.js`, `training/src/dom.js`, `training/src/model/live.js`, `training/src/views/live.js`, `tests/live.test.js` und `tests/e2e/*` sowie der jeweilige Kontext.
- **Playwright mit WebKit:** Touch an, `deviceScaleFactor` 2, `de-AT`, iPhone-User-Agent. Die App lief unter 127.0.0.1:8765. Den Zustand „Los!“ (`.rest.ready`) habe ich mit `page.clock` erzeugt.
- **Seitenzoom nachgestellt:** 125 % = 300 × 504, 150 % = 250 × 420, 200 % = 188 × 315. Dazu 320 × 568 und Querformat 812 × 330.
- **Vergleich mit `develop`:** Ein Abzug des Ordners `training/` aus `develop` (`git archive`, nur lesend) lief auf einem zweiten Port. So ließ sich trennen, was neu ist und was schon vorher bestand.
- **Tests:** `npm test` mit 135 von 135 bestanden. `tests/e2e/training.e2e.mjs` lief mit `BROWSER=webkit` ohne Probleme und ohne externe Requests.
- Skripte und Screenshots lagen außerhalb des Repos. Im Repo wurde nichts geändert.

## Geprüfte Punkte

| Bereich | Was geprüft wurde | Ergebnis |
|---|---|---|
| Fokus passt auf 375 × 630 | Dokumenthöhe und Lage von Steppern, „Satz fertig“ und Leiste. Zustände: Bereit, Pause mit Rückgängig, Pause mit +30 s, `.rest.ready`, alles erledigt. Jeweils Hell, Dunkel und Fancy | Passt. Dokumenthöhe 631 bei 630 sichtbar (1 px Rundung wie vorher). „Satz fertig“ liegt bei 362–426, die Leiste bei 522–614 (Pause) bzw. 537–614 (Bereit/Los!) |
| Leiste: Maße | Pause: „Rückgängig“/„+30 s“ und „Weiter“ je 44 hoch, Umschalter 44 × 32. Leiste 92 px hoch (Pause) bzw. 77 px (sonst) | Siehe M-1 und N-1 |
| Tippfläche des Umschalters | `elementFromPoint` Pixel für Pixel über die Spalte des Umschalters | Trifft von y 574 bis 613 (39 px), Breite 44. Direkt darüber (≤ 573) liegt „Weiter“, ohne Lücke (M-1) |
| Kontraste des Umschalters | Berechnete Farben. Normal: Icon `--text` auf `--row` (Dunkel #f2f5f3 auf #1f2a25 ≈ 14:1, Hell #14201b auf #eef2ef ≈ 15:1, Fancy Weiß auf dunklem Glas > 10:1). `.ready`: `--acText` auf `--acbg` (6,2 / 10,5 / ≥ 7,7) | Erfüllt WCAG 1.4.11 (≥ 3:1) in allen Stilen |
| Fokusrahmen | `:focus-visible` am Umschalter: 3 px in Akzentfarbe, in `.ready` `--acText` | In Ordnung |
| Fokus nach dem Umschalten | Tap und Enter in beide Richtungen | Der Fokus bleibt auf dem neuen Umschalter (gleiche `data-fid`). Die Beschriftung wechselt zwischen „Zum Fokus wechseln“ und „Zur Liste wechseln“ |
| Scrollen nach Fokus → Liste | Aktiver Satz bzw. Karte „Alle Sätze erledigt“ nach dem Wechsel über den Umschalter und über das Menü (das Scrollen wartet, bis das Sheet zu ist) | Aktiver Satz bei y 287–343, Karte bei 395–513. Beides sichtbar. Liste → Fokus aus tief gescrollter Liste: `scrollY` 1, nichts abgeschnitten |
| Warm-up bleibt offen | Aufklappen, Satz abhaken und rückgängig, Ansicht hin und zurück wechseln | Bleibt offen. Zuklappen geht. Der Zustand gilt nur für das laufende Training (Session-ID) |
| Keine Pause nach dem letzten Satz | Code (`model/live.js`), Unit-Test, Browser | In Ordnung. Auch mit „Später“ korrekt, weil `activeSlot` zurückgestellte Blöcke berücksichtigt |
| Nur ein Abschluss-Knopf | Liste und Fokus, alles erledigt | Die Karte hat keinen Knopf, „Abschließen“ steht nur in der Leiste. Layout-Problem siehe M-2 |
| Auswahlfeld im Verlauf | Tap auf das Feld, dann `selectOption`: danach Fokus auf `BODY` (auf `develop` noch `chart-ex`). Per Tastatur bleibt der Fokus im Feld | Wirkt wie gedacht. Folgen für VoiceOver siehe N-3 |
| VoiceOver-Beschriftung | `ariaSnapshot` der Leiste in Liste, Fokus und „alles erledigt“ sowie der Karte | Beschriftungen vorhanden, Name von „Abschließen“ passt zu WCAG 2.5.3. Ansagen siehe N-4 |
| Kleine Viewports / ≤ 330 px | 320 × 568, 300 × 504, 250 × 420, 188 × 315, 812 × 330 | Umschalter überall erreichbar. „Als Nächstes“ stärker gekürzt, siehe N-2 |
| Externe Requests | Netzwerkprotokoll im e2e-Lauf | Keine |

## Nicht geprüft (mit Grund)

- **Echtes iOS 27 auf dem iPhone 13 mini.** Playwright-WebKit auf macOS ist kein iOS. Ohne Gerät nicht prüfbar sind:
  - ob die Auswahl nach dem Fix wirklich nicht mehr erneut aufgeht,
  - wie iOS Taps zwischen „Weiter“ und Umschalter zuordnet (Tap-Korrektur),
  - die Safe-Area unter der Leiste in der Standalone-App,
  - was VoiceOver nach dem Umschalten tatsächlich vorliest,
  - ob `pointerType` bei VoiceOver-Doppeltipp `touch` ist.

  Siehe Checkliste.
- **Dynamic Type:** lässt sich in WebKit nicht einstellen. Alle Größen sind weiter in `px`, die Änderungen ändern daran nichts.
- **Ein komplettes Superset-Training in der Liste mit Halte-Countdown und Umschalter.** Halten mit Fokus → Liste deckt der Repo-e2e-Test ab. Den Fall „Halten läuft, dann umschalten“ habe ich nicht eigens getestet.

## Findings

### Kritisch

Keine.

### Hoch

Keine.

### Mittel

#### M-1: Umschalter liegt ohne Abstand direkt unter „Weiter“ bzw. „Abschließen“. Ein knapp verfehlter Tap wechselt die Ansicht

- **Fundstelle:** `training/css/app.css:245` (`row-gap: 0`), `:247` (Umschalter in der letzten Spalte, `justify-self: end`), `training/src/views/live.js:388-395`.
- **Messwerte (375 × 630, WebKit, alle drei Stile):**
  - „Weiter“: x 275–350, y 530–574.
  - Umschalter: x 306–350, y 574–606, Tippfläche bis 613.
  - `elementFromPoint` liefert bis y 573 `rest-skip` und ab y 574 `view-toggle`. Es gibt 0 px Abstand, und der Umschalter liegt horizontal genau unter dem rechten Teil von „Weiter“.
  - Nach dem letzten Satz liegt dasselbe unter „Abschließen“ (x 262–383, y 530–574, Umschalter x 339–383).
  - Bei 320 × 568 und 300 × 504 gilt das Gleiche: „Weiter“ endet bei 520, der Umschalter beginnt bei 520.
- **Beschreibung:** „Weiter“ wird nach fast jedem Satz getippt, im Studio mit müden oder feuchten Händen. Trifft der Daumen 1–2 px zu tief, springt die App von Fokus in die Liste oder umgekehrt, statt die Pause zu beenden. Abschnitt 9 verlangt „genügend Abstand, keine versehentlichen Taps neben dem Timer“.
- **Auswirkung:** Kein Datenverlust, ein Tap macht es rückgängig. Mitten im Training ist der Sprung in eine andere Ansicht aber verwirrend. Die Pause läuft zudem weiter, obwohl man sie beenden wollte.
- **Empfehlung:**
  - Den Umschalter nicht unter „Weiter“ setzen. Möglich ist die linke Seite der Zeile „Als Nächstes“ (Spalte 1, Text daneben) oder eine eigene Spalte ganz rechts über beide Zeilen.
  - Oder mindestens 8 px senkrechten Abstand. Die Höhe könnte aus dem Innenabstand kommen (Tippfläche nach unten statt `row-gap: 0`).
  - Zusätzlich hilft eine sichtbare Abgrenzung (Rahmen).
- **Sicherheit:** hoch für die Geometrie (gemessen). Wie oft es auf dem Gerät zu Fehltaps kommt, hängt von der iOS-Tap-Korrektur ab (Checkliste).

#### M-2: Nach dem letzten Satz (10 s Rückgängig-Fenster) ragen „Abschließen“ und der Umschalter aus dem Bildschirm. Die Seite scrollt horizontal

- **Fundstelle:** `training/css/app.css:232` (`grid-template-columns: 1fr auto auto`), `:247`, `training/src/views/live.js:384-395`.
- **Messwerte (375 × 630, Fokus und Liste, alle Stile):**
  - „Rückgängig“: x 140–253.
  - „Abschließen“: x 262–383 (44 hoch).
  - Umschalter: x 339–383.
  - `scrollWidth` 383 > 375. Knopf und Icon sind rechts abgeschnitten.
  - Nach Ablauf des Rückgängig-Fensters ist alles in Ordnung (Abschließen x 229–350).
- **Beschreibung:** Die Zeitspalte („0:00 Bereit“), „Rückgängig“ und „Abschließen“ sind zusammen breiter als die Leiste. Die Ursache besteht schon auf `develop` (dort Abschließen x 263–384). Durch die Änderung wiegt sie schwerer:
  - „Abschließen“ ist jetzt der **einzige** Abschluss-Knopf. Auf `develop` hatte die Karte im Fokus noch einen breiten „Training beenden“.
  - Der neue Umschalter liegt ebenfalls teilweise außerhalb.
  - Auf iOS lässt sich die Seite in diesem Moment seitlich verschieben.
- **Auswirkung:** Genau in dem Moment, in dem man abschließen will, wirkt die Leiste kaputt. Zieht man seitlich, verschiebt sich die ganze Seite.
- **Empfehlung:**
  - Wenn alles erledigt ist, „0:00 Bereit“ ausblenden oder kürzen. Nach dem letzten Satz gibt es keine Pause mehr, die Zeit hat keine Bedeutung.
  - Oder `grid-template-columns: minmax(0, 1fr) auto auto` setzen und die Zeit kürzen.
  - Einen e2e-Test ergänzen: `scrollWidth <= innerWidth` direkt nach dem letzten Satz.
- **Sicherheit:** hoch (gemessen, in allen Stilen und beiden Ansichten).

### Niedrig

#### N-1: Tippflächen in der Leiste unter den Vorgaben der Spezifikation

- **Fundstelle:** `training/css/app.css:244` (`.rest .btn.sm { min-height: 44px }`), `:247-248`.
- **Messwerte:**
  - Der Umschalter ist sichtbar 44 × 32, die Tippfläche 44 × 39 (die Erweiterung über `::after` wirkt laut `elementFromPoint` wie beschrieben).
  - „Weiter“ und „Abschließen“ sind von 48 auf 44 px geschrumpft.
- **Beschreibung:** Abschnitt 5 verlangt „Touch-Ziele überall mindestens 44 px, Haupt-Aktionen 48 px oder mehr“. Der Umschalter erreicht 44 px nur in der Breite. „Abschließen“ ist jetzt die einzige Abschluss-Aktion, also eine Haupt-Aktion, und hat 44 statt 48. WCAG 2.5.8 (24 px) ist erfüllt.
- **Empfehlung:**
  - Die Tippfläche auch nach oben bzw. links erweitern, wenn M-1 durch Umstellen gelöst wird. Ziel: mindestens 44 × 44.
  - Für „Abschließen“ wieder 48 px. Das passt, weil im Zustand „alles erledigt“ kein Stepper und kein „Satz fertig“ auf dem Bildschirm steht. Die Leiste darf dort höher sein, etwa über eine Klasse für „alles erledigt“.
- **Sicherheit:** hoch.

#### N-2: Bei ≤ 330 px bekommt „Als Nächstes“ nur noch die halbe Breite

- **Fundstelle:** `training/css/app.css:235` (`grid-column: 1 / -2`) zusammen mit `:322` (`grid-template-columns: 1fr 1fr` bei ≤ 330 px).
- **Messwerte:**
  - Text 135 px breit bei 320 × 568, 125 px bei 300 × 504 (125 % Zoom). Gekürzt, zum Beispiel „Als Nächstes: Trap…“.
  - Auf `develop` reichte die Zeile über die ganze Leiste (`1 / -1`).
  - Bei 250 und 188 px (eine Spalte) ist die Breite unverändert.
- **Auswirkung:** Bei Zoom bzw. auf kleinen Geräten ist kaum noch zu lesen, welche Übung als Nächstes kommt. Bei Supersets ist das die wichtigste Information der Leiste.
- **Empfehlung:** In der Media-Query `≤ 330px` die Zeile wieder auf `1 / -1` setzen und den Umschalter in eine eigene Zeile oder neben die Zeit stellen.
- **Sicherheit:** hoch.

#### N-3: Auswahlfeld im Verlauf verliert nach Touch den Fokus. Das betrifft möglicherweise VoiceOver

- **Fundstelle:** `training/src/app.js:75-76`, `:1059`.
- **Beschreibung:** Nach einer Auswahl per Touch liegt der Fokus auf `body`. Gemessen in WebKit: `activeElement` ist `BODY`, auf `develop` war es `chart-ex`. Für sehende Nutzer ist das ohne Folgen. Bei VoiceOver ist offen, ob der Doppeltipp Pointer-Events mit `pointerType: 'touch'` auslöst. Wenn ja, wird das neu gezeichnete Feld nicht fokussiert. Der VoiceOver-Cursor springt dann womöglich an den Seitenanfang, statt beim Feld und dem neuen Diagramm zu bleiben.

  Der e2e-Test simuliert Touch nur über ein synthetisches `pointerdown`. Das eigentliche iOS-Verhalten (Auswahl öffnet erneut) prüft er nicht. Außerdem bleibt `lastPointerType` global stehen: Wer erst tippt und dann eine externe Tastatur nutzt, hat bis zum nächsten Klick den Touch-Zustand.
- **Empfehlung:** Grundsätzlicher wäre es, das `<select>` beim Wechsel der Übung nicht zu ersetzen und nur das Diagramm neu zu zeichnen. Dann braucht es weder Fokus-Wiederherstellung noch Sonderfall. Ansonsten am Gerät prüfen (Checkliste).
- **Sicherheit:** mittel. Wirkung bei VoiceOver unklar, nur am Gerät prüfbar.

#### N-4: Screenreader-Ansagen beim Abschluss und beim Ansichtswechsel

- **Fundstelle:** `training/src/app.js:752`, `training/src/views/live.js:176-180`, `:399-407`.
- **Beschreibung:**
  - **Kein Hinweis „alles erledigt“:** Nach dem letzten Satz sagt die Live-Region nur „…, Satz 3 erledigt“. Da keine Pause mehr folgt, fehlt jeder Hinweis, dass alles erledigt ist und unten „Abschließen“ wartet.
  - **Keine Ansage beim Wechsel:** Beim Umschalten wechselt der ganze Inhalt. Der Fokus bleibt auf dem Umschalter (gut), es gibt aber keine Ansage („Ansicht Liste“). VoiceOver liest im besten Fall nur die neue Beschriftung „Zum Fokus wechseln“. Daraus muss man rückschließen, dass man jetzt in der Liste ist.
  - **Dreifach gesagt:** „Alle Sätze erledigt“ steht als `aria-label` der Region, als Überschrift und als Text in der Leiste.
- **Empfehlung:**
  - Wenn `activeSlot` null wird, „Alle Sätze erledigt. Unten Abschließen.“ ansagen.
  - Beim Umschalten „Ansicht Liste“ bzw. „Ansicht Fokus“ ansagen.
  - Das `aria-label` der Karte weglassen (die Überschrift genügt) oder `aria-labelledby` auf die Überschrift setzen.
- **Sicherheit:** mittel (Accessibility-Baum geprüft, echte VoiceOver-Ausgabe nicht).

## Hinweise ohne Finding

- **Icon ohne Text:** Der Umschalter zeigt das Ziel als Icon (Liste bzw. Karte), ohne Text. Für Sehende ist die Bedeutung nicht selbsterklärend. Im Zustand `.ready` fehlt der Hintergrund, dort wirkt das Icon wie Dekoration. Die Beschriftung für VoiceOver ist korrekt. Ein kurzes Wort wie „Liste“ bzw. „Fokus“ neben dem Icon würde helfen, wenn der Platz es nach M-1 und N-2 zulässt.
- **Spezifikation nachziehen:** Dort steht in Abschnitt 5 „Er startet nach einem Satz automatisch mit der `restSec`“. Die neue Regel (keine Pause nach dem letzten offenen Satz) ist sinnvoll und getestet. Die Spezifikation sollte das Gleiche sagen.
- **Scrollen zum aktuellen Satz:** `scrollIntoView({ block: 'center' })` verhält sich mit der klebenden Leiste gut. Bei `prefers-reduced-motion` gibt es kein weiches Scrollen (`app.css:356`).
- **Bestand von vorher, nicht Teil dieser Änderung:** Bei 188 × 315 (200 % Zoom) scrollt der Fokus horizontal. Ursache ist der Stepper `+2,5` (rechts bei 213). Das ist bekannt aus `reviews/ios-ux-r2.md`.
- **Unit-Test:** Der neue Test in `tests/live.test.js` deckt auch den Fall „früher Satz außer der Reihe als letzter offener“ ab.

## Checkliste für das iPhone 13 mini (iOS 27)

1. **Verlauf:** Übungsauswahl antippen, eine andere Übung wählen, „Fertig“. Die Auswahl darf nicht erneut aufgehen, das Diagramm wechselt. Dasselbe mit VoiceOver: Wo steht der VoiceOver-Cursor danach?
2. **Fokus, Pause läuft:** zehnmal zügig mit dem Daumen auf „Weiter“ tippen, eher am unteren Rand. Wie oft wechselt stattdessen die Ansicht (M-1)?
3. **Nach dem letzten Satz:** Sind „Abschließen“ und der Umschalter vollständig sichtbar? Lässt sich die Seite seitlich verschieben (M-2)?
4. **Standalone-App (Home-Bildschirm):** Hält die Leiste Abstand zum Home-Indikator? Passt der Fokus weiter ohne Scrollen?
5. **VoiceOver:** Umschalter doppeltippen. Was wird vorgelesen, wo steht der Cursor? Nach dem letzten Satz: Wird klar, dass „Abschließen“ wartet?
6. **Warm-up** in der Liste aufklappen, einen Satz abhaken, Pause ablaufen lassen. Das Warm-up bleibt offen.
7. **Seitenzoom 125 %** (Safari „aA“): Ist „Als Nächstes“ noch lesbar (N-2)?
