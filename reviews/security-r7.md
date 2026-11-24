# Security-Review (Reviewer 1: IT-Security), Runde 7

Stand: Commit `6ad6a6a` (privates WIP-Repo), Version 3.0.0, `SCHEMA_VERSION` 3. Schwerpunkt sind die Änderungen seit Runde 6 (`git diff 32a6680..6ad6a6a`): Zusammenführen mit Vorrang des Gewinners (`model/training-file.js`), Filter für unsichtbare Zeichen per Unicode-Eigenschaften und Bereinigung im Validator (`model/validate.js`, `model/activities.js`), Stepper lesen den Ausgangswert aus dem Feld (`views/live.js`, `views/activity.js`), Neuzeichnen nach Tastatureingabe, Sheet-Aufbau (`app.js`), CSS und `sw.js` (nur Hashes). Die übrigen Bereiche sind seit Runde 6 unverändert. Ich habe sie nur dort erneut geprüft, wo die Tabelle das sagt.
Prüfumgebung: Node 22, Playwright-Chromium (headless, 375 × 630), lokaler Server `127.0.0.1:8771`. Eigene Skripte und präparierte Dateien lagen außerhalb des Repos unter `/tmp/sec7`.

## Geprüfte Punkte

| Bereich | Was ich getan habe | Ergebnis |
|---|---|---|
| Tests | `npm test` | 207 von 207 grün (enthält den Test zu Precache-Liste und Hashes im Service Worker). |
| Browser-Prüfungen | Alle zehn Skripte aus `tests/e2e/` gegen Port 8771 (Chromium) | Alle ohne Probleme, jeweils „externe Requests: keine“ bzw. „alles in Ordnung“. |
| Netzwerk | Request-Protokoll in den e2e-Läufen und in eigenen Läufen (Import, Abgleich, Verlauf, Detail, gerahmte Seite); `grep` nach `fetch(`, `XMLHttpRequest`, `WebSocket`, `sendBeacon`, `importScripts` in `training/` | Keine Requests an fremde Origins. `fetch` nur im Service Worker (gleiche Origin). Keine neuen Netzwerk-APIs seit Runde 6. |
| XSS | `grep` nach `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `eval(`, `new Function`, `document.write`, `srcdoc` in `training/` und `index.html`. Präparierte `.training.json` (Planname `X<img src=x onerror=…>`, Trainingsart `<svg onload=…>`, Notiz `<img onerror>` mit Backticks) importiert: Vorschau, Verlauf, Detail, Abgleich-Vorschau. Neue Ausgaben gelesen (`.list-title`-Span, `sheet-actions`, Vorschau-Texte in `app.js:502-508`). | Keine Senke im App-Code. Kein Skript lief, kein Dialog, `window.__pwn` blieb `undefined`, keine eingeschleusten `img`/`script`-Elemente. Payloads erscheinen nur als Text. |
| Unsichtbare Zeichen (Fix r6 N2) | Node: `validateTrainingFile` mit 24 Zeichenfällen (Tag-Zeichen, Variantenwähler, Hangul-Füller, Braille-Leerzeichen, `U+2028`, Khmer/Mongolisch, `U+FFA0`, Bidi, ZWJ-Emoji, NBSP, `U+3000`, `U+1680`, Kombinationszeichen ohne Basis, Zalgo, Private Use, Nichtzeichen, einzelnes Surrogat, lange Zeichen wie `U+FDFD`) | Alle in Runde 6 genannten Zeichen werden jetzt abgelehnt (Validator) bzw. ersetzt (Modell), reine Leerraum-Arten mit „darf nicht leer sein“. Durch gehen weiter: Kombinationszeichen (auch ohne Basis), Private Use, Nichtzeichen, einzelne Surrogate. Siehe N2. |
| Bereinigung im Validator | `validate.js:589-597` und `field()` gelesen | Die Länge wird am Rohwert geprüft, das Muster lehnt unsichtbare Zeichen ab, bevor `cleanActivityType` läuft. Ein Ergebnis „leer nach Bereinigung“ ist nicht möglich, weil `trim()` denselben Leerraum entfernt, den die Leer-Prüfung vorher erkennt. `INVISIBLE_RE` (Flag `g`) wird nur mit `replace` benutzt, kein `lastIndex`-Problem. |
| Zusammenführen (Fix r6 N1) | Node und Browser: lokaler Stand Revision 10 mit zwei anderen Trainings; präparierte Datei mit derselben `fileId` und einem Krafttraining mit der ID eines lokalen anderen Trainings, einmal mit Revision 1, einmal mit Revision 20. Zusätzlich Datei mit Revision 11 und dieser ID in `deletedSessionIds`. | Revision 1: Das lokale andere Training bleibt, nichts wird als gelöscht gemeldet. Behoben. Revision 20 bzw. 11: Der lokale Eintrag fällt weg, ohne dass die Vorschau es nennt. Das Ergebnis besteht den Validator. Siehe N1. |
| Stepper mit Wert aus dem Feld | `views/live.js:385`, `views/activity.js:79-92`, `format.js:71` (`parseNum`), `model/live.js:204-227` (`updateSet`, `clampOrNull`), `model/history.js:195-208` | Der Feldwert läuft über `parseNum` (nur endliche Zahlen) und danach durch die Klemmung auf die Grenzen aus `LIMITS` (kg 0–1000, Wdh. 0–1000, s 0–36000). Werte wie `1e9`, `Infinity`, `-5` landen im erlaubten Bereich. Live-Grenzen und Validator-Grenzen stimmen überein, ein beendetes Training bleibt also importierbar. |
| CSP / Referrer / Trusted Types | `training/index.html`, `index.html`, `git diff` | Unverändert seit Runde 6: kein `unsafe-inline`/`unsafe-eval`, `connect-src 'none'`, `base-uri 'none'`, `form-action 'none'`, `object-src 'none'`, `require-trusted-types-for 'script'`. Referrer-Policy `no-referrer` auf beiden Seiten. |
| Service Worker | `git diff 32a6680..HEAD -- training/sw.js`, Kernstellen gelesen | Nur `VERSION` und Hashes geändert. Weiter: nur GET derselben Origin, SHA-256-Prüfung beim Precache, Löschen nur eigener Caches (`training-pwa-`), Update erst nach „Aktualisieren“ (`SKIP_WAITING`). e2e `offline` grün. |
| Clickjacking | Fremde Seite auf `127.0.0.1:8772` bindet die App per `<iframe>` ein | Im Frame wird nichts gezeichnet (kein `body`-Inhalt). Die Grenzen von GitHub Pages (kein `frame-ancestors` per Header, im Meta-Tag wirkungslos) gelten weiter. |
| Speicher | `grep` nach `localStorage`, `sessionStorage`, `document.cookie` | Keine Treffer. Nur IndexedDB `training-pwa`. |
| Export / FIT / Dateinamen | `git diff` | Keine Änderung seit Runde 6. `doExport` (`app.js:1271-1292`) unverändert, siehe N4. |
| Lieferkette | `package.json`, `node_modules/` | Keine Abhängigkeiten, kein Lockfile. `node_modules/` enthält nur den Playwright-Link der Prüfumgebung. |
| Workflow | `.github/workflows/pages.yml`, `git diff 32a6680..HEAD -- .github` | Unverändert: Actions per Commit-SHA gepinnt, `contents: read` global, `pages: write`/`id-token: write` nur im Deploy-Job. |
| Repo / Secrets / persönliche Daten | `git log -p 32a6680..HEAD` nach `ghp_`, `github_pat_`, `AKIA`, Private Keys, `xox?-`. Commit-Identitäten. Werte aus `legal.js` per `git grep` über HEAD und im neuen Diff gesucht (ohne Ausgabe der Werte). | Einziger Treffer ist der Prüftext im Bericht aus Runde 6. Commits nur mit `Claude <noreply@anthropic.com>`. Die Betreiberangaben stehen nur in `training/src/legal.js` und kommen im neuen Diff nicht vor. Alle 10 neuen Commits enthalten einen Session-Link (bekannt, siehe N5). |

## Nicht geprüft (mit Grund)

- **Echtes iPhone / iOS Safari / WebKit:** Kein Gerät, WebKit für Playwright hier nicht installiert. Nicht geprüft: Trusted Types in Safari, Teilen-Menü mit Datei, Speicher-Eviction, getrennter Speicher von Safari-Tab und Home-Bildschirm-App, Darstellung von Kombinationszeichen in WebKit.
- **Web Share API mit Datei:** Headless-Chromium nutzt immer den Download-Fallback.
- **Ausgelieferte Seite und HTTP-Header:** 3.0 ist noch nicht ausgeliefert.
- **GitHub-Einstellungen des öffentlichen Repos (Rulesets, Secret Scanning):** Kein API-Zugriff auf das öffentliche Repo in dieser Sitzung (N6 nicht neu bestätigt).
- **Echter voller Speicher:** Nicht nachgestellt, nur Code gelesen (N4).
- **`npm audit`:** Ohne Lockfile und Abhängigkeiten nichts zu prüfen.

## Findings

### Kritisch

Keine.

### Hoch

Keine.

### Mittel

Keine.

### Niedrig

#### N1: Vorschau verschweigt lokale Einträge, die beim Übernehmen einer neueren Datei wegfallen (neu)

- **Fundstelle:** `training/src/model/training-file.js:127` und `:135` (Einträge des Verlierers werden per `winnerIds` bzw. `deleted` gefiltert, aber nicht gezählt), `training/src/app.js:502-504` (Text der Vorschau).
- **Nachstellen (Chromium, reproduziert):** `.training.json` mit Revision 10 und den anderen Trainings „<svg onload=…>“ (ID `…0001`) und „Laufen“ importieren. Danach eine Datei mit derselben `fileId`, Revision 20, ohne andere Trainings und mit einem Krafttraining mit der ID `…0001` öffnen. Vorschau: „Die Datei ist neuer (Stand 20, im Browser 10) und wird übernommen. 1 Training(s), die nur im Browser sind, werden ergänzt.“ Nach „Übernehmen“ fehlt das lokale andere Training, ohne Hinweis. Gleiches Ergebnis in Node mit einer Datei Revision 11, die die ID nur in `deletedSessionIds` führt (`addedSessions` 1, `removedSessions` 0).
- **Beschreibung:** Gewinnt die Datei, fallen lokale Einträge, die nur im Browser stehen, in zwei Fällen still heraus: ID-Kollision mit einem Eintrag der Datei (die andere Liste) und Tombstone in der Datei. `removedSessions` zählt nur Einträge des Gewinners, die Vorschau nennt nur die ergänzten. Inhaltlich folgt das der Regel „höhere `revision` gewinnt“ bzw. „`deletedSessionIds` beider Stände werden vereinigt“; die Spezifikation verlangt aber auch „Nie stumm überschreiben“ (Abschnitt 2, Import).
- **Auswirkung:** Gering. Der Tombstone-Fall ist ein gewollter Ablauf (Löschen auf einem anderen Stand), wird aber nicht angekündigt. Der Kollisionsfall braucht eine präparierte Datei mit `fileId` und Eintrags-ID, also eine Kopie der eigenen `.training.json`. Wer die hat, kann mit einer höheren Revision ohnehin Plan und Trainings ersetzen. Ist der lokale Eintrag nicht gesichert, ist er weg.
- **Empfehlung:** Im Abgleich zusätzlich zählen, wie viele Einträge des Verlierers wegen `deleted` bzw. `winnerIds` nicht übernommen werden (z. B. `droppedLocal`), und in der Vorschau nennen, wenn der Verlierer der Browser-Stand ist: „N Training(s) aus dem Browser fallen weg (in der Datei gelöscht oder doppelte ID).“ Unit-Test für beide Fälle.
- **Sicherheit der Einschätzung:** Hoch (in Node und im Browser nachgestellt).

#### N2: Restliche Lücken bei unsichtbaren bzw. irreführenden Zeichen (Rest aus Runde 5 N2 und Runde 6 N2)

- **Fundstelle:** `training/src/model/validate.js:436` (`INVISIBLE_CLASS`); für Plan- und Übungsnamen und Notizen `validate.js` (Textfelder ohne Muster) und `training/src/model/coach-export.js:21-22` (`cleanText`).
- **Beschreibung:** Für die Trainingsart ist der Fix aus Runde 6 wirksam: Alle dort genannten Zeichen werden abgelehnt bzw. ersetzt. Weiter durch gehen in der Trainingsart Kombinationszeichen ohne Basiszeichen (z. B. nur `U+0301 U+0301`, ergibt einen Eintrag mit kaum sichtbarem Namen, im Browser gesehen), Private-Use-Zeichen (`\p{Co}`, je nach Schrift unsichtbar oder Symbol), Nichtzeichen (`\p{Cn}`) und einzelne Surrogate (`\p{Cs}`). Unverändert seit 1.x: Planname, Übungsnamen und Notizen nehmen Bidi-Steuerzeichen, Tag-Zeichen (`U+E00xx`) und sogar `U+0000` an (in Node mit `validatePlan` geprüft), und `cleanText` reicht sie in den Coach-Export durch. Tag-Zeichen sind dort für den Nutzer unsichtbar, für einen KI-Dienst aber lesbar.
- **Auswirkung:** Gering. Nur Anzeige bzw. Täuschung, nichts ist ausführbar (alles über Textknoten). Zalgo-Text läuft in Chromium nicht über die Karte hinaus (gemessen). Bei Plan und Notizen setzt es eine fremde oder manipulierte Datei voraus.
- **Empfehlung:** In `INVISIBLE_CLASS` zusätzlich `\p{Co}\p{Cn}\p{Cs}` aufnehmen und eine Trainingsart ablehnen, die nach dem Entfernen von `\p{M}` leer ist. Optional `cleanText` im Coach-Export (und die JSON-Ausgabe im Agent-Prompt) um das Entfernen von `\p{Cc}`, `\p{Cf}` und Tag-Zeichen ergänzen, damit keine unsichtbaren Anweisungen an den KI-Dienst gehen. Quelle: Unicode Standard Annex #44 (Allgemeine Kategorien `Co`, `Cn`, `Cs`, `M`), https://www.unicode.org/reports/tr44/
- **Sicherheit der Einschätzung:** Hoch für das Verhalten (in Node und Chromium geprüft), niedrig für die praktische Relevanz.

#### N3: Zeitstempel ohne Bereichsgrenze (aus Runde 3 N5 bis Runde 6 N3, weiter offen, Entscheidung „Später“)

- **Fundstelle:** `training/src/model/validate.js:448-455` (`isoField`), u. a. `activities[].createdAt`.
- **Beschreibung / Auswirkung:** Unverändert. Ein importierter Zeitstempel im Jahr 9999 lässt einen Eintrag dauerhaft „nicht gesichert“ erscheinen bzw. verschiebt die Sortierung am selben Tag. Nur Anzeige.
- **Empfehlung:** Für alle ISO-Zeitstempel den Bereich 2000–2100 vorgeben, wie bei `date`.
- **Sicherheit der Einschätzung:** Hoch (Code unverändert).

#### N4: „Export fehlgeschlagen“ bei vollem Speicher (aus Runde 3 N3 bis Runde 6 N5, weiter offen, Entscheidung „Später“)

- **Fundstelle:** `training/src/app.js:1284` (`store.setLastExport` im selben `try` wie der Export).
- **Beschreibung / Auswirkung:** Unverändert. Schlägt nur das Speichern des Export-Stands fehl, meldet die App einen erfolgreichen Export als Fehlschlag. Daten gehen nicht verloren.
- **Empfehlung:** `setLastExport` in ein eigenes `try` legen und dann „Gesichert, Stand konnte nicht gemerkt werden“ melden.
- **Sicherheit der Einschätzung:** Hoch für den Ablauf (Code gelesen), nicht nachgestellt.

#### N5: Session-Links und Verweise auf das WIP-Repo in Commits (aus Runde 5 N4 und Runde 6 N4, unverändert)

- **Fundstelle:** Commit-Nachrichten `32a6680..6ad6a6a` (alle 10 mit `Claude-Session: https://claude.ai/code/session_…`), `docs/stand.md`.
- **Beschreibung / Auswirkung:** Unverändert. Im privaten Repo unkritisch, die Links enthalten keine Secrets. Der Schritt vor der Übergabe ist in `docs/stand.md` vermerkt.
- **Empfehlung:** Wie in `docs/stand.md`: Squash mit eigener Nachricht, danach im öffentlichen Repo `git log -p | grep -E 'claude.ai/code/session_|-wip'`.
- **Sicherheit der Einschätzung:** Hoch.

#### N6: `main` ohne Pull-Request-Pflicht (aus Runde 3 N7 bis Runde 6 N6, Entscheidung Betreiber)

- **Fundstelle:** Ruleset des öffentlichen Repos.
- **Beschreibung:** Stand aus Runde 4, mangels API-Zugriff nicht erneut bestätigt.
- **Empfehlung:** PR-Pflicht und verpflichtende Prüfungen für `main`, sonst Entscheidung des Betreibers.
- **Sicherheit der Einschätzung:** Mittel.

#### N7: Gemeinsame Origin `xandl-droste.github.io` (aus Vorrunden, latent)

- **Fundstelle:** Architektur; `CLAUDE.md` Abschnitt „GitHub Pages“.
- **Beschreibung / Auswirkung:** Unverändert. IndexedDB und Cache Storage gelten für die ganze Origin. Abgesichert durch die Regel in `CLAUDE.md` und die SHA-256-Prüfung im Service Worker.
- **Empfehlung:** Regel beibehalten. Für weitere Projekte eine eigene (Sub-)Domain verwenden.
- **Sicherheit der Einschätzung:** Hoch. Quelle: GitHub Docs, „About GitHub Pages“, https://docs.github.com/en/pages/getting-started-with-github-pages/about-github-pages

## Aus Runde 6 erledigt (geprüft)

- R6 N1 (ältere präparierte Datei verdrängt ein lokales anderes Training): behoben, in Node und im Browser nachgestellt. Die Gegenrichtung (neuere Datei) beschreibt N1 oben.
- R6 N2 (Handliste unsichtbarer Zeichen): für alle genannten Zeichen behoben (Unicode-Eigenschaften, Validator bereinigt wie die App). Rest siehe N2 oben.
