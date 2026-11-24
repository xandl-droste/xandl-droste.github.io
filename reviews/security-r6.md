# Security-Review (Reviewer 1: IT-Security), Runde 6

Stand: Commit `32a6680` (privates WIP-Repo), Version 3.0.0, `SCHEMA_VERSION` 3. Schwerpunkt sind die Änderungen seit Runde 5 (`git diff f2cbaf7..32a6680`, Code in `app.js`, `model/activities.js`, `model/training-file.js`, `model/validate.js`, `model/import.js`, `model/coach-export.js`, `views/activity.js`, `views/archive.js`, `css/app.css`, `sw.js`). Die übrigen Bereiche sind seit Runde 5 unverändert. Ich habe sie nur dort erneut geprüft, wo die Tabelle das sagt.
Prüfumgebung: Node 22, Playwright-Chromium (headless, 375 × 630), lokaler Server `127.0.0.1:8771`. Eigene Skripte und präparierte Dateien lagen außerhalb des Repos unter `/tmp/sec6`.

## Geprüfte Punkte

| Bereich | Was ich getan habe | Ergebnis |
|---|---|---|
| Tests | `npm test` | 205 von 205 grün (enthält den Test zu Precache-Liste und Hashes im Service Worker). |
| Browser-Prüfungen | Alle zehn Skripte aus `tests/e2e/` gegen Port 8771 (Chromium) | Alle ohne Probleme, jeweils „externe Requests: keine“ bzw. „alles in Ordnung“. |
| Netzwerk | Request-Protokoll in den e2e-Läufen und in meinen eigenen Läufen (Import, Abgleich, Verlauf, gerahmte Seite) | Keine Requests an fremde Origins. Seit Runde 5 gibt es keine neuen Netzwerk-APIs im Code. |
| XSS (Änderungen r5) | Neue Ausgaben gelesen: `historyCountText` in der Import-Vorschau und im Archiv-Kopf, `showActivityError`, Toast mit Trainingsart, `announce` (`textContent`), `sheet-actions`. Präparierte Datei mit Planname `X<img src=x onerror=…>` und Notiz `<svg onload=…>` importiert (Vorschau, Abgleich-Vorschau, Verlauf). `grep` nach `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `eval`, `new Function`, `document.write`, `srcdoc` in `training/`. | Kein Skript lief, kein Dialog, `window.__pwn` blieb `undefined`. Alles läuft über `h()` bzw. `textContent`. Keine der genannten Senken in `training/`. |
| Steuerzeichen in der Trainingsart (Fix r5 N2) | Node: `addActivity` und `validateTrainingFile` mit `U+202E`, `U+200B`, `U+0007` (Test im Repo), dazu `U+2028`, Tag-Zeichen `U+E0041`, Variantenwähler `U+FE0F`, `U+034F`, Hangul-Füllzeichen `U+3164`/`U+115F`, Braille-Leerzeichen `U+2800` | Die Zeichen aus Runde 5 werden im Modell ersetzt und vom Validator abgelehnt. Andere unsichtbare Zeichen gehen weiter durch, siehe N2. |
| Abgleich bei ID-Kollision (Fix r5 N3) | Node und Browser: lokaler Stand (Revision 10) mit zwei anderen Trainings, danach präparierte Datei mit derselben `fileId`, Revision 1 und einem Krafttraining mit der ID eines lokalen anderen Trainings | Das Ergebnis besteht jetzt den Validator. Dafür verdrängt die ältere Datei aber ein lokales anderes Training, siehe N1. |
| Import-Vorschau (Fix r5 N1) | Datei nur mit anderen Trainings importiert | Die Vorschau zeigt „2 andere Trainings (Di 10.11. bis Mi 11.11.)“. Behoben. |
| Validator: Sortierung und leere Liste | `validate.js:679-683` gelesen | Die Sortierung läuft nur ohne Fehler, die Vergleiche sind robust (Datum und `createdAt` sind dann schon geprüft). Kein neues Risiko. |
| Neuzeichnen nach einem Tap (`TAP_SETTLE_MS`) | `app.js:126-160` gelesen | Nur der Zeitpunkt des Neuzeichnens ändert sich. Es entsteht kein neuer Schreibpfad, und Daten gehen dabei nicht verloren. Ein Fallback-Timer verhindert ein dauerhaft ausbleibendes Neuzeichnen. |
| CSP / Referrer / Trusted Types | `training/index.html`, `index.html` | Seit Runde 5 unverändert: kein `unsafe-inline` bzw. `unsafe-eval`, `connect-src 'none'`, `base-uri 'none'`, `form-action 'none'`, `object-src 'none'`, `require-trusted-types-for 'script'`. Referrer-Policy ist auf beiden Seiten `no-referrer`. |
| Service Worker | `git diff` von `training/sw.js` | Nur `VERSION` und Hashes haben sich geändert. Logik, Scope und Cache-Strategie sind wie in Runde 5 (nur GET derselben Origin, SHA-256-Prüfung, kein Laufzeit-Caching, Update erst nach „Aktualisieren“). e2e `offline` ist grün. |
| Clickjacking | Diesmal im Browser nachgestellt: fremde Seite auf `127.0.0.1:8772` bindet die App per `<iframe>` ein | Das Dokument im Frame ist leer (`childElementCount` 0), es erscheint der Fehler „Die App läuft nicht eingebettet in fremden Seiten.“. Die Grenzen von GitHub Pages (kein `frame-ancestors` per Header, im Meta-Tag wirkungslos) gelten weiter. |
| Speicher | `grep` nach `localStorage`, `sessionStorage`, `document.cookie` | Wie in Runde 5: nur IndexedDB `training-pwa`. |
| Export / FIT / Dateinamen | `git diff` | Keine Änderung seit Runde 5. |
| Lieferkette | `package.json`, `node_modules/` | Weiter keine Abhängigkeiten und kein Lockfile. `node_modules/` enthält nur den Playwright-Link der Prüfumgebung. |
| Workflow | `git diff f2cbaf7..HEAD -- .github` | Leer, also unverändert seit Runde 5 (gepinnte SHAs, minimale Rechte). |
| Repo / Secrets / persönliche Daten | `git log -p f2cbaf7..HEAD` nach `ghp_`, `github_pat_`, `AKIA`, Private Keys und `xox?-`. Commit-Identitäten geprüft. Werte aus `legal.js` per `git grep` über HEAD und im Diff gesucht (ohne Ausgabe der Werte). | Keine Secrets. Commits nur mit `Claude <noreply@anthropic.com>`. Die Betreiberangaben stehen nur in `training/src/legal.js`. Session-Links bzw. `-wip` kommen in 11 Zeilen des neuen Diffs vor (bekannt, siehe N4). |

## Nicht geprüft (mit Grund)

- **Echtes iPhone / iOS Safari / WebKit:** Es gibt kein Gerät, und WebKit ist für Playwright in dieser Umgebung nicht installiert. Nicht geprüft: Trusted Types in Safari, Teilen-Menü mit Datei, Speicher-Eviction, getrennter Speicher von Safari-Tab und Home-Bildschirm-App, das neue Tap-Verhalten mit echtem Touch.
- **Web Share API mit Datei:** Headless-Chromium nutzt immer den Download-Fallback.
- **Ausgelieferte Seite und HTTP-Header:** 3.0 ist noch nicht ausgeliefert.
- **GitHub-Einstellungen des öffentlichen Repos (Rulesets, Secret Scanning):** Die Sitzung hat keinen API-Zugriff auf das öffentliche Repo (N7 ist daher nicht neu bestätigt).
- **Echter voller Speicher:** Nicht nachgestellt, nur den Code gelesen (N6).
- **`npm audit`:** Ohne Lockfile und ohne Abhängigkeiten gibt es nichts zu prüfen.

## Findings

### Kritisch

Keine.

### Hoch

Keine.

### Mittel

Keine.

### Niedrig

#### N1: Ältere präparierte Datei verdrängt beim Abgleich ein lokales anderes Training (neu durch den Fix aus Runde 5, N3)

- **Fundstelle:** `training/src/model/training-file.js:136-139` (`sessionIds` enthält auch die aus dem unterlegenen Stand ergänzten Trainings, `keptActs` filtert dann die eigenen anderen Trainings des Gewinners heraus). Text dazu: `training/src/app.js:500`.
- **Nachstellen (Chromium, reproduziert):** Eine `.training.json` mit Revision 10 und den anderen Trainings „Beachvolleyball“ und „Laufen“ importieren. Danach eine Datei mit derselben `fileId`, Revision 1 und einem Krafttraining öffnen, dessen `id` der ID von „Beachvolleyball“ entspricht. Die Vorschau zeigt: „Der Browser-Stand ist neuer (Stand 10, Datei 1). 1 Training(s) aus der Datei werden ergänzt. 1 gelöschte(s) Training(s) werden entfernt.“ Nach „Übernehmen“ fehlt „Beachvolleyball“ im Verlauf, dafür steht dort das Krafttraining aus der Datei. Die ID kommt nicht in `deletedSessionIds`.
- **Beschreibung:** Bei einer Kollision gibt der Abgleich dem Krafttraining aus dem *unterlegenen* (älteren) Stand Vorrang vor dem anderen Training des *Gewinners*. Das widerspricht der Regel „die höhere `revision` gewinnt, fehlende Einträge werden ergänzt“. Die Vorschau nennt das verdrängte Training außerdem „gelöscht“, obwohl es nie gelöscht wurde. In die Gegenrichtung (anderes Training im Verlierer, Krafttraining im Gewinner) funktioniert es richtig.
- **Auswirkung:** Gering. Es braucht eine präparierte Datei mit der `fileId` und einer Eintrags-ID des Nutzers. Beides steht nur in seiner eigenen `.training.json`, nicht im Coach-Export. Ohne Absicht tritt der Fall bei zufälligen UUIDs nicht auf. Wurde das verdrängte Training noch nicht gesichert, ist es aber endgültig weg, und die Vorschau beschreibt den Vorgang falsch.
- **Empfehlung:** Die Einträge des Gewinners haben Vorrang. Kollisionen nur gegen die Einträge des Verlierers prüfen, z. B.:
  `const winnerAllIds = new Set([...winner.sessions, ...(winner.activities ?? [])].map((x) => x.id));`
  `added` und `addedActs` nach `!winnerAllIds.has(id)` filtern, `keptActs` nicht nach ergänzten Trainings filtern. Den Unit-Test aus Runde 5 um diesen Fall ergänzen: lokales anderes Training bleibt, wenn eine Datei mit niedrigerer Revision ein Krafttraining mit derselben ID bringt. Optional einen eigenen Hinweis „N Einträge wegen doppelter ID übergangen“ statt „gelöschte(s)“.
- **Sicherheit der Einschätzung:** Hoch (in Node und im Browser nachgestellt).

#### N2: Filter für unsichtbare Zeichen in der Trainingsart ist lückenhaft (Rest aus Runde 5, N2)

- **Fundstelle:** `training/src/model/activities.js:19` (`INVISIBLE_RE`), `training/src/model/validate.js:432` (`ACTIVITY_TYPE_RE`).
- **Beschreibung:** Beide Ausdrücke listen Bereiche von Hand auf und decken nicht alle Format- bzw. unsichtbaren Zeichen ab. Modell und Validator lassen weiter durch: Tag-Zeichen `U+E0000–U+E007F` (Kategorie `Cf`, auch zum Verstecken von Text für KI-Dienste bekannt), Variantenwähler `U+FE00–U+FE0F`, `U+034F`, Hangul-Füllzeichen `U+3164`/`U+115F`/`U+1160`, Braille-Leerzeichen `U+2800`. Der Validator akzeptiert außerdem `U+2028`/`U+2029` (das Modell ersetzt sie über `\s`). Eine Trainingsart nur aus `U+3164` ergibt weiter einen Eintrag ohne sichtbaren Namen. Im Coach-Export und im Agent-Prompt sind Tag-Zeichen für den Nutzer unsichtbar, werden vom KI-Dienst aber gelesen.
- **Auswirkung:** Gering. Nur Anzeige bzw. Täuschung. Es setzt eine fremde oder manipulierte Datei voraus, und ausführbar ist nichts. Zum Agent-Prompt kommt nur die Trainingsart (als JSON-Text), die Notiz nicht. Im Coach-Export steht beides.
- **Empfehlung:** Mit Unicode-Eigenschaften statt Bereichslisten arbeiten, z. B. `/[\p{Cc}\p{Cf}\p{Zl}\p{Zp}\p{Default_Ignorable_Code_Point}]/gu`. Eine Leer-Prüfung zusätzlich nach dem Entfernen von `\p{Default_Ignorable_Code_Point}` und Füllzeichen ausführen. Optional dieselbe Bereinigung in `cleanText` (Coach-Export) für Notizen und Namen. Quelle: Unicode Standard Annex #44, Eigenschaft `Default_Ignorable_Code_Point`, https://www.unicode.org/reports/tr44/
- **Sicherheit der Einschätzung:** Hoch für das Verhalten (in Node geprüft), niedrig für die praktische Relevanz.

#### N3: Zeitstempel ohne Bereichsgrenze (aus Runde 3 N5, Runde 4 N4 und Runde 5 N5, weiter offen, Entscheidung „Später“)

- **Fundstelle:** `training/src/model/validate.js:435-442` (`isoField`), `activities[].createdAt`, `training/src/model/backup.js`.
- **Beschreibung / Auswirkung:** Wie in Runde 5. Ein importiertes anderes Training mit `createdAt` im Jahr 9999 gilt dauerhaft als „nicht gesichert“ und steht am selben Tag zuletzt. Das betrifft nur die Anzeige.
- **Empfehlung:** Für alle ISO-Zeitstempel den Bereich 2000–2100 vorgeben, wie bei `date`.
- **Sicherheit der Einschätzung:** Hoch (Code unverändert).

#### N4: Session-Links und Verweise auf das WIP-Repo in Commits (aus Runde 5 N4, unverändert)

- **Fundstelle:** Commit-Nachrichten `8405d39..32a6680` (Zeilen `Claude-Session: https://claude.ai/code/session_…`), `docs/stand.md` Abschnitt „Wo der Code liegt“.
- **Beschreibung / Auswirkung:** Unverändert. Im privaten Repo ist das unkritisch, und die Links enthalten keine Secrets. Der Schritt vor der Übergabe ist in `docs/stand.md` vermerkt.
- **Empfehlung:** Wie in `docs/stand.md`: Squash mit eigener Nachricht, danach im öffentlichen Repo `git log -p | grep -E 'claude.ai/code/session_|-wip'`.
- **Sicherheit der Einschätzung:** Hoch.

#### N5: „Export fehlgeschlagen“ bei vollem Speicher (aus Runde 3 N3 bis Runde 5 N6, weiter offen, Entscheidung „Später“)

- **Fundstelle:** `training/src/app.js:1277` (`store.setLastExport` im selben `try` wie der Export).
- **Beschreibung / Auswirkung:** Unverändert. Bei vollem Speicher wird ein erfolgreicher Export als Fehlschlag gemeldet. Daten gehen dabei nicht verloren.
- **Empfehlung:** Wie in den Vorrunden.
- **Sicherheit der Einschätzung:** Hoch für den Ablauf (Code gelesen), nicht nachgestellt.

#### N6: `main` ohne Pull-Request-Pflicht (aus Runde 3 N7 bis Runde 5 N7, Entscheidung Betreiber)

- **Fundstelle:** Ruleset des öffentlichen Repos.
- **Beschreibung:** Stand aus Runde 4, mangels API-Zugriff nicht erneut bestätigt.
- **Empfehlung:** PR-Pflicht und verpflichtende Prüfungen für `main`, sonst Entscheidung des Betreibers.
- **Sicherheit der Einschätzung:** Mittel.

#### N7: Gemeinsame Origin `xandl-droste.github.io` (aus Vorrunden, latent)

- **Fundstelle:** Architektur; `CLAUDE.md` Abschnitt „GitHub Pages“.
- **Beschreibung / Auswirkung:** Unverändert. IndexedDB und Cache Storage gelten für die ganze Origin. Abgesichert ist das durch die Regel in `CLAUDE.md` und die SHA-256-Prüfung im Service Worker.
- **Empfehlung:** Regel beibehalten. Für weitere Projekte eine eigene (Sub-)Domain verwenden.
- **Sicherheit der Einschätzung:** Hoch. Quelle: GitHub Docs, „About GitHub Pages“, https://docs.github.com/en/pages/getting-started-with-github-pages/about-github-pages

## Aus Runde 5 erledigt (geprüft)

- R5 N1 (Import-Vorschau verschweigt andere Trainings): behoben, im Browser gesehen („2 andere Trainings (…)“).
- R5 N2 (Steuerzeichen in der Trainingsart): für die genannten Zeichen behoben (Modell und Validator). Den Rest beschreibt N2 oben.
- R5 N3 (ID-Kollision beim Abgleich ergibt ungültigen Stand): Der Stand ist jetzt gültig. Die Umsetzung bevorzugt aber den falschen Eintrag, siehe N1 oben.
