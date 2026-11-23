# Security-Review (Reviewer 1: IT-Security), Runde 4

Stand: Commit `f0fb7c1` (Zwischenstand vor den Fixes aus Runde 4, im öffentlichen Repo nicht auffindbar), Version 2.0.0. Vergleich mit 1.0.1 (`62b944b`) über `git diff 62b944b..f0fb7c1` (41 Dateien, vor allem Archiv, Coach-Export, Nachfolger/`carryOver`, RIR/RPE, Aufräumen des Browserspeichers).
Prüfumgebung: Node 22, Playwright-Chromium (headless, 375 × 630), lokaler Server `127.0.0.1:8781`. Hilfsskripte lagen außerhalb des Repos unter `/tmp/review-security/`.

## Geprüfte Punkte

| Bereich | Was ich getan habe | Ergebnis |
|---|---|---|
| Tests | `npm test` | 178 von 178 grün. |
| Browser-Prüfungen | Alle neun Skripte aus `tests/e2e/` gegen Port 8781 (Chromium) | Alle ohne Probleme, jeweils „externe Requests: keine“. |
| Netzwerk | Request-Protokoll in allen e2e-Läufen und in meinem eigenen XSS-Lauf (Archiv, Coach-Export, Import, Verlauf, Plan, laufendes Training) | Keine Requests an fremde Origins. Keine CDN-Skripte, Fonts oder Tracker im Code (`grep` nach `fetch`, `XMLHttpRequest`, `WebSocket`, `sendBeacon`, `import(`). Einziger externer Link ist der statische Verweis auf die GitHub-Datenschutzerklärung (nur bei Klick). |
| XSS | Präparierte `.training.json` mit `<img onerror>`, `<script>`, `<svg onload>`, Backtick-Zäunen und Zeilenumbrüchen in Planname, Einheitsname, Übungsname, Hinweis, Warm-up, Variante, `rirTargets`, `previous.planName`, `carryOver.note`, Trainingsnotiz, Blocknotiz, `name`/`variantName` im Block. Geöffnet im Archiv (Liste, Detail, Coach-Export), per Import (Vorschau, Heute, Verlauf, Detail, Plan) und im laufenden Training (Warm-up aufgeklappt). Code-Suche nach `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `eval`, `new Function`, `document.write`, `srcdoc`, datengetriebenen `href`/`src`/`on*`-Attributen. | Kein Skript lief, kein Element wurde eingeschleust, kein Dialog. Alles erscheint als Text. Alle Ausgaben laufen über `h()`/`svgEl()` in `training/src/dom.js` (Textknoten, `setAttribute`). Keine Fundstelle der genannten Senken in `training/`. |
| Trusted Types / CSP | `insertAdjacentHTML` und ein dynamisches Inline-Skript im laufenden Dokument ausprobiert; Meta-CSP in `training/index.html` und `index.html` gelesen | Chromium blockiert beides (`require-trusted-types-for 'script'`, `TypeError`). Die Policy `sw` erlaubt nur `./sw.js`. CSP ohne `unsafe-inline`/`unsafe-eval`, `connect-src 'none'`, `base-uri 'none'`, `form-action 'none'`, `object-src 'none'`. Referrer-Policy `no-referrer` auf beiden Seiten. |
| Import-Härtung | Node-Skript gegen `parseImportText`: `__proto__`/`constructor` oben, verschachtelt und in `rirTargets`; 100 000 und 2,5 Mio. Ebenen; kaputtes JSON; BOM; `1e400`; negative Werte in `carryOver`; leere `carryOver.sets`; `rpe` 11; `rirLast` 2,5; `previous.fileName` mit `../`; `schemaVersion` 3; `main: "yes"`; 5000 `deletedSessionIds`; 4,9 MB mit 3400 Trainings | Alles Unzulässige abgelehnt, mit Pfad und Klartext. Kein Prototyp verschmutzt. Tiefenprüfung bricht nach Ebene 13 ab (2,5 Mio. Ebenen in rund 1 s). Neue Felder aus 2.0 (`createdAt`, `previous`, `carryOver`, `main`, `rpe`, `note`, `rirLast`, `name`, `variantName`) haben Typ-, Bereichs- und Längengrenzen. |
| Halbes Speichern | Code: `applyImports` ist rein, `checkReimport` vor dem Speichern, `saveImported` in einer IndexedDB-Transaktion (Datei, `activeFileId`, `lastExport`, Löschen der bisherigen). Archiv: Datei nur in `S.archive`, kein Schreibaufruf. | Kein halbes Speichern gefunden. Archiv schreibt nachweislich nicht (e2e `archiv` prüft IndexedDB vorher/nachher). |
| Nachfolger und Startwerte | Fuzz in Node: 3000 zufällige Trainingsdateien (übersprungene Übungen, fehlende Vorgaben, Deload, offene Trainings, Übungen außerhalb des Plans), daraus Nachfolger und Nachfolger des Nachfolgers, jeweils durch den Validator; Coach-Export für alle | 0 Fehler. Ein Nachfolger ist immer wieder einlesbar. |
| Coach-Export | Code gelesen, Ausgabe mit Schadtext erzeugt | Backticks werden zu `'`, Leerraum inkl. Zeilenumbrüche zu einem Leerzeichen; die Codeblöcke lassen sich nicht schließen. Startwerte, IDs, Zeitstempel und Einstellungen fehlen wie vorgesehen. Dateiname aus bereinigtem Plannamen. Anzeige in `<pre>` per Textknoten. Siehe N2. |
| Agent-Prompt | Diff gelesen | Ergebniszeilen jetzt mit `carryOver` und RIR; Name als JSON-String, RIR-Ziel per `JSON.stringify` maskiert, Backticks im Block maskiert. |
| Service Worker | `training/sw.js` und `scripts/update-sw.mjs`, e2e `offline` | Nur Version und Precache-Liste geändert (neue Module enthalten, Test prüft das). Scope `./`, nur GET derselben Origin innerhalb des Scopes, SHA-256-Prüfung bei Installation und Auslieferung, kein Laufzeit-Caching, Update erst nach „Aktualisieren“, alte Caches nur mit eigenem Präfix gelöscht. |
| Speicher | `training/src/storage.js`, Abläufe Wechsel/Erneut starten/Aufräumen, eigener Zwei-Tab-Versuch | Siehe M1, N1, N3. Lokal liegen nur IndexedDB `training-pwa` (Stores `files`, `kv`); kein `localStorage`/`sessionStorage`, keine Cookies. |
| Export / FIT / Dateinamen | `export.js`, `garminFileName`, `trainingFileName`, `coachExportFileName`; Archiv-Garmin-Export | Dateinamen nur aus `[a-z0-9-]`, Datum und festen Endungen. FIT-Encoder seit 1.0.1 unverändert. |
| Clickjacking | `app.js:4-7` | Frame-Buster leert das Dokument und bricht ab, wenn die App eingebettet ist. GitHub Pages erlaubt keine eigenen Header (`frame-ancestors`/`X-Frame-Options` nicht setzbar, `frame-ancestors` wirkt im Meta-Tag nicht). Das bleibt die passende Gegenmaßnahme. |
| Lieferkette | `package.json`, `node_modules/` | Keine Abhängigkeiten, kein Lockfile, kein Build. `node_modules/` enthält nur Symlinks auf Playwright der Prüfumgebung (nicht versioniert, `.gitignore`). `npm audit` entfällt mangels Abhängigkeiten. Keine neuen gebündelten Fremdbibliotheken in 2.0. |
| Workflow | `.github/workflows/pages.yml`; Tags per `git ls-remote` gegen die gepinnten SHAs geprüft | `actions/checkout@3d3c42e…` = v7.0.1, `upload-pages-artifact@fc324d3…` = v5.0.0, `deploy-pages@368f825…` = v5.0.1. Global `contents: read`, `pages: write`/`id-token: write` nur im Deploy-Job, `persist-credentials: false`, Tests vor dem Deploy, nur `index.html`, `root.css`, `training/` werden ausgeliefert. |
| Repo / Secrets / persönliche Daten | Diff und Historie nach `ghp_`, `github_pat_`, `AKIA`, Private Keys, token/secret/password, Mail-Domains; Commit-Identitäten; Volltextsuche (ohne Ausgabe der Werte) nach den Zeichenketten aus `legal.js` über HEAD | Keine Secrets. Commits nur mit `Claude <noreply@anthropic.com>` und der GitHub-`noreply`-Adresse. Die Betreiberangaben stehen in HEAD nur in `training/src/legal.js`; die Kontaktadresse in der Spezifikation ist jetzt ein Platzhalter. |
| GitHub-Einstellungen | `gh api` (soweit der Proxy es erlaubt): Rulesets, Sichtbarkeit, Secret Scanning | Ruleset „Schutz main und develop“: kein Löschen, kein Force-Push, keine Bypass-Akteure. Ruleset „Schutz Versions-Tags“ (`refs/tags/v*`): kein Löschen, Ändern, Force-Push. Secret Scanning und Push Protection aktiv. Siehe N6. |

## Nicht geprüft (mit Grund)

- **Echtes iPhone / iOS Safari und WebKit:** Kein Gerät; das WebKit von Playwright ist in dieser Umgebung nicht installiert (`/opt/pw-browsers/webkit-2359` fehlt). Daher nicht geprüft: Trusted-Types-Unterstützung in Safari, Teilen-Menü mit Datei (wann `navigator.share` als Erfolg zurückkommt, wichtig für N1), Speicher-Eviction, ob Safari-Tab und Home-Bildschirm-App denselben Speicher teilen (wichtig für M1).
- **Web Share API mit Datei:** Headless-Chromium hat kein `canShare` mit Dateien, es lief immer der Download-Fallback.
- **Ausgelieferte Seite:** `xandl-droste.github.io` ist aus dieser Umgebung gesperrt (Proxy 403). Header und ausgelieferter Stand nicht geprüft. 2.0 ist laut Tags ohnehin noch nicht ausgeliefert (letzter Tag `v1.0.1`).
- **GitHub-Pages-Einstellungen, Environment `github-pages`, Actions-Rechte:** Diese API-Pfade sperrt der Proxy. Nur Rulesets und Secret Scanning gelesen.
- **Echter voller Speicher:** nicht nachgestellt, nur Code gelesen.

## Findings

### Kritisch

Keine.

### Hoch

Keine.

### Mittel

#### M1: Veraltete zweite Instanz löscht beim Wechsel der Trainingsdatei ein neueres, ungesichertes Training

- **Fundstelle:** `training/src/storage.js:163` (`saveImported(…, { dropFileId, force = true })`), aufgerufen ohne `force: false` aus `training/src/app.js:530` (`switchToFile`); Entscheidung „gesichert?“ in `training/src/app.js:514` (`withBackupFirst`) auf Basis von `S.file`/`S.lastExport` der eigenen Instanz.
- **Nachstellen (Chromium, reproduziert):** Tab A: Plan öffnen, „Als Datei sichern“ (IndexedDB: Datei `rev 0`, gesichert). Tab B (gleiche App): Training mit drei Sätzen beenden, nicht sichern (IndexedDB: `rev 1`, 1 Training). Zurück in Tab A (dort weiterhin `rev 0` im Speicher): Plan-Tab → „Plan öffnen (Datei)“ → anderer Plan → „Ganz neu“ → „Übernehmen“. Kein „Erst sichern“, kein Hinweis. Danach enthält IndexedDB nur noch die neue Datei (`rev 0`, 0 Trainings); das Training aus Tab B ist weg und lag nie in einer Datei.
- **Beschreibung:** Runde 3 hat das Überschreiben durch eine zweite Instanz mit dem `stamp`-Abgleich behoben. Importe und Wechsel schreiben aber weiterhin mit `force: true` an diesem Abgleich vorbei. In 1.0.1 hatte das nur zur Folge, dass die bisherige Datei unsichtbar im Browser liegen blieb. Seit 2.0 löscht derselbe erzwungene Schreibvorgang die bisherige Datei (`dropFileId`). Ob sie gesichert ist, prüft die App nur am veralteten Stand im Arbeitsspeicher, nicht am gespeicherten. Betroffen sind „Nachfolger“, „Ganz neu“, „Plan erneut starten“ und das Öffnen einer anderen `.training.json`. Mit derselben Ursache überschreibt „Anpassen“ bzw. ein Abgleich in einer veralteten Instanz die neuere Datei mit gleicher `fileId` (das gab es schon in 1.0.1).
- **Auswirkung:** Integrität und Verfügbarkeit: ein beendetes, noch nicht gesichertes Training geht still und endgültig verloren. Voraussetzung sind zwei offene Instanzen (zwei Tabs, Desktop/iPad; auf dem iPhone mindestens zwei Safari-Tabs). Kein Angreifer nötig.
- **Empfehlung:** In `saveImported` die Prüfung nicht abschalten, wenn `dropFileId` gesetzt ist (oder grundsätzlich `force: false` und bei `StaleError` „In einem anderen Fenster geändert, bitte neu laden“ zeigen). Zusätzlich in derselben Transaktion vor dem Löschen die gespeicherte Datei lesen und nur löschen, wenn deren `revision` ≤ `lastExport.revision` aus `kv` ist; sonst abbrechen. Einen e2e-Test mit zwei Seiten ergänzen (wie oben).
- **Sicherheit der Einschätzung:** Hoch für den Mechanismus (reproduziert, Code gelesen). Mittel für die Häufigkeit auf dem Referenzgerät.

### Niedrig

#### N1: Bisherige Trainingsdatei wird nach einer nicht überprüfbaren „Sicherung“ sofort aus dem Browser gelöscht

- **Fundstelle:** `training/src/export.js:36-39` (Download-Fallback meldet nach `a.click()` immer Erfolg), `training/src/app.js:514` (`withBackupFirst` → `doExport` → Wechsel mit Löschen), `training/src/app.js:1461-1471` (ältere Dateien: Export, dann `remove(f)`), `training/src/app.js:1421` (`cleanUpOtherFiles` löscht beim Start alles, was laut `lastExport` gesichert ist).
- **Beschreibung:** Ab 2.0 verlässt die bisherige Datei den Browser, sobald der Export „erfolgreich“ war. Erfolg heißt aber nur: Das Teilen-Menü wurde mit irgendeinem Ziel abgeschlossen (nicht unbedingt „In Dateien sichern“), oder beim Download-Fallback wurde der Link angeklickt. Ob die Datei wirklich gespeichert wurde (z. B. bei „Speichern unter“ mit Abbrechen oder blockiertem Download), sieht die App nicht. Es gibt danach keine Kopie im Browser mehr und keine Rückfrage.
- **Auswirkung:** Verfügbarkeit: In seltenen Fällen ist ein Durchgang danach nirgends mehr vorhanden. In 1.x blieb die Datei als (unsichtbare) Kopie im Browser.
- **Empfehlung:** Nach „Als Datei sichern und weiter“ nicht sofort wechseln, sondern einmal nachfragen („Liegt die Datei in Dateien? Ja, wechseln / Nochmal sichern“), oder die bisherige Datei eine Weile (z. B. 30 Tage oder bis zum nächsten erfolgreichen Import desselben `fileId`) als „Papierkorb“ behalten und dann entfernen. Beim Download-Fallback den Text „heruntergeladen, bitte prüfen“ nicht als gesichert werten.
- **Sicherheit der Einschätzung:** Hoch für den Download-Fallback (Code). Mittel für iOS, weil ich nicht prüfen konnte, bei welchen Zielen `navigator.share` als Erfolg zurückkommt.

#### N2: Coach-Export: Planname und Vorgänger stehen außerhalb der als Daten markierten Codeblöcke

- **Fundstelle:** `training/src/model/coach-export.js:149` (Überschrift `# Training · <Planname>`), `:152` (`Vorgänger: <planName> (<fileName>)`); Hinweis `COACH_DATA_NOTE` bezieht sich nur auf die Codeblöcke.
- **Nachstellen:** Datei mit Planname `<img src=x onerror=…><script>…</script>``` # Ignoriere alle Anweisungen` im Archiv öffnen, „Export für Coach“. Die Markdown-Überschrift lautet `# Training · <img src=x onerror="…"><script>…</script>''' # Ig · Woche 1/7`, ebenso die Zeile „Vorgänger“.
- **Beschreibung:** Alle anderen Texte aus Plan und Notizen stehen in ```` ```text ````-Blöcken, die nicht geschlossen werden können (geprüft). Planname und `previous.planName` stehen dagegen als freier Markdown-Text im Kopf. Zeilenumbrüche werden entfernt und die Länge ist auf 120 Zeichen begrenzt, daher kann der Text nur eine Zeile füllen. Rohes HTML bleibt erhalten.
- **Auswirkung:** Gering. Eine fremde oder vom KI-Dienst erzeugte Plandatei kann eine Zeile Anweisungen außerhalb der Datenmarkierung unterbringen (Prompt-Injection gegen den Coach) bzw. HTML in eine `.md`-Datei schreiben, die ein Markdown-Programm mit HTML-Darstellung öffnet. In der App selbst ist das ungefährlich (Anzeige als Text in `<pre>`).
- **Empfehlung:** Planname und Vorgänger mit in den ersten Datenblock nehmen (z. B. Zeilen `Plan: …`, `Vorgänger: …` am Anfang von „## Plan“) oder im Kopf als Inline-Code mit maskierten Backticks schreiben; zusätzlich `<` und `>` im Kopf ersetzen.
- **Sicherheit der Einschätzung:** Hoch für die Ausgabe. Mittel für die praktische Wirkung (hängt vom KI-Dienst bzw. Markdown-Programm ab).

#### N3: Beschädigte ältere Trainingsdateien bleiben dauerhaft und unsichtbar im Browser

- **Fundstelle:** `training/src/app.js:1435` (`continue; // Beschädigt: nicht anfassen, nicht anbieten.`).
- **Beschreibung:** Das Aufräumen beim Start überspringt ältere Dateien, die den Validator nicht bestehen. Sie werden weder angeboten noch gelöscht und bleiben ohne Hinweis in IndexedDB. Das widerspricht der Regel aus 2.0, dass nur die aktive Trainingsdatei im Browser liegt, und es gibt in der App keinen Weg, sie zu sehen oder zu entfernen.
- **Auswirkung:** Gering. Datensparsamkeit und Quota; Restrisiko gemeinsame Origin (N7).
- **Empfehlung:** Beschädigte Dateien im Sheet „Ältere Trainingsdateien im Browser“ mit „Roh sichern“ (unveränderter JSON-Text) und „Verwerfen“ anbieten.
- **Sicherheit der Einschätzung:** Hoch (Code gelesen; nicht im Browser nachgestellt).

#### N4: Zeitstempel ohne Bereichsgrenze (aus Runde 3, N5, unverändert offen)

- **Fundstelle:** `training/src/model/validate.js:429` (`isoField` prüft Format und `Date.parse`, keinen Bereich); Meldung im Garmin-Export `training/src/app.js` (`doGarminExport`, jeder `RangeError` als „über 49 Tage“).
- **Beschreibung / Auswirkung:** Wie in Runde 3. Neu in 2.0 gilt das auch für `createdAt`; der Garmin-Export ist jetzt zusätzlich aus dem Archiv mit fremden Dateien erreichbar. Weiterhin nur falsche Meldungen, kein Überlauf.
- **Empfehlung:** Bereich 2000–2100 wie bei `date`, Meldung im Garmin-Export nach Ursache unterscheiden.
- **Sicherheit der Einschätzung:** Hoch (Code gelesen).

#### N5: „Export fehlgeschlagen“ bei vollem Speicher (aus Runde 3, N3, unverändert offen, neue Folge)

- **Fundstelle:** `training/src/app.js`, `doExport` (`store.setLastExport` im selben `try` wie der Export).
- **Beschreibung:** Wie in Runde 3. Neu in 2.0: `withBackupFirst` wertet dieses `false` als „nicht gesichert“. Bei vollem Speicher lässt sich daher nicht auf einen Nachfolger oder eine andere Datei wechseln, obwohl die Datei heruntergeladen bzw. geteilt wurde. Das ist sicher (kein Datenverlust), aber gerade bei vollem Speicher ist Wechseln und Aufräumen das, was der Nutzer braucht.
- **Empfehlung:** Wie in Runde 3: Erfolg des Exports getrennt vom Merken melden; `S.lastExport` im Speicher setzen, auch wenn `setLastExport` scheitert.
- **Sicherheit der Einschätzung:** Hoch für den Ablauf (Code), nicht im Browser nachgestellt.

#### N6: `main` ohne Pull-Request-Pflicht und ohne verpflichtende Prüfungen (aus Runde 3, N7, Entscheidung Betreiber)

- **Fundstelle:** Ruleset „Schutz main und develop“ (per `gh api` gelesen: nur `deletion` und `non_fast_forward`).
- **Beschreibung:** Jede Identität mit Schreibrecht (auch eine Agenten-Sitzung mit Push-Rechten) kann direkt auf `main` pushen und damit ausliefern. `CLAUDE.md` verbietet das nur als Regel. Der Workflow führt die Tests vor dem Deploy aus, das bremst kaputte Stände, aber nicht unerwünschte.
- **Empfehlung:** Im Ruleset für `main` „Require a pull request before merging“ und „Require status checks“ ergänzen (Betreiber-Einstellung).
- **Sicherheit der Einschätzung:** Hoch für die Einstellung; Pages- und Environment-Einstellungen konnte ich diesmal nicht lesen.

#### N7: Gemeinsame Origin `xandl-droste.github.io` (aus Runde 3, N4, unverändert, latent)

- **Fundstelle:** Architektur; `training/src/storage.js`, `training/sw.js`, `CLAUDE.md` („GitHub Pages“).
- **Beschreibung / Auswirkung:** Wie in Runde 3: IndexedDB und Cache Storage gelten für die ganze Origin. Durch die Regel in `CLAUDE.md`, die Prüfung beim Start und die SHA-256-Prüfung im Service Worker abgefangen, solange kein weiteres Pages-Projekt mit Skripten dazukommt. Ob derzeit weitere Pages-Repos bestehen, konnte ich diesmal nicht abfragen.
- **Empfehlung:** Regel beibehalten; bei weiteren Projekten eigene (Sub-)Domain.
- **Sicherheit der Einschätzung:** Hoch (Same-Origin-Policy). Quelle: GitHub Docs, „About GitHub Pages“, https://docs.github.com/en/pages/getting-started-with-github-pages/about-github-pages

## Aus Runde 3 erledigt (geprüft)

- R3 N1 (verwaiste Stände in IndexedDB): durch das Aufräumen in 2.0 behoben, mit den Einschränkungen aus N1 und N3.
- R3 N2 (CSV-Formel-Injektion): CSV-Export entfernt (`training/src/model/csv.js` gelöscht).
- R3 N6 (Kontaktadresse in der Spezifikation): jetzt Platzhalter; in HEAD stehen die Betreiberangaben nur in `legal.js`.
