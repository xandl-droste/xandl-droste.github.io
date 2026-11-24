# Security-Review (Reviewer 1: IT-Security), Runde 5

Stand: Commit `f2cbaf7` (privates WIP-Repo), Version 3.0.0, `SCHEMA_VERSION` 3. Schwerpunkt: Änderungen seit 2.0.0 (`git diff da4a029..f2cbaf7`, 25 Dateien: andere Trainings mit Validator, Zusammenführen, Sheet, Verlauf, Archiv, Coach-Export, Agent-Prompt, Backup-Status, Service-Worker-Liste). Bereiche ohne Änderung seit Runde 4 habe ich nur stichprobenartig erneut geprüft (siehe Tabelle).
Prüfumgebung: Node 22, Playwright-Chromium (headless, 375 × 630), lokaler Server `127.0.0.1:8771`. Eigene Skripte und präparierte Dateien lagen außerhalb des Repos im Scratchpad der Sitzung.

## Geprüfte Punkte

| Bereich | Was ich getan habe | Ergebnis |
|---|---|---|
| Tests | `npm test` | 199 von 199 grün. |
| Browser-Prüfungen | Alle zehn Skripte aus `tests/e2e/` gegen Port 8771 (Chromium) | Alle ohne Probleme, jeweils „externe Requests: keine“ (bei `anderes-training` über die Prüfung `external.length === 0`). |
| Netzwerk | Request-Protokoll in allen e2e-Läufen und in meinen eigenen Läufen (Import, Heute, Verlauf, Detail, Korrigieren, Löschen-Dialog, Vorschläge, Coach-Export, Agent-Prompt, Archiv); `grep` nach `fetch`, `XMLHttpRequest`, `WebSocket`, `sendBeacon`, `import(`, `window.open`, `location.*` in `training/` | Keine Requests an fremde Origins. Einziges `fetch` steht im Service Worker (nur eigene Origin, siehe unten). Keine CDN-Skripte, Fonts oder Tracker. |
| XSS (neu in 3.0) | Präparierte `.training.json` mit sechs anderen Trainings: Trainingsart `<img src=x onerror=…>`, `<script>…</script>`, `<svg onload=…>`, Backtick-Zaun mit Zeilenumbruch, `javascript:alert(1)`, Bidi-Override `U+202E` mit `<b>`; Notizen mit `<img onerror>`, `<iframe src="javascript:…">` und Backticks; Planname mit HTML. Geöffnet per Import (Vorschau, Heute, Verlauf, jede Detailansicht, „Korrigieren“-Sheet, Lösch-Rückfrage, Vorschlag-Chips, Speichern über einen Chip, Coach-Export, Agent-Prompt-Sheet) und im Archiv (Kopf, Liste, Detail, Coach-Export). Geprüft: `window.__pwn`, `dialog`-Ereignisse, eingeschleuste Elemente bzw. `on*`-Attribute im DOM. Code-Suche nach `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `eval`, `new Function`, `document.write`, `srcdoc`. | Kein Skript lief, kein Dialog, kein eingeschleustes Element. Alle neuen Ausgaben (`views/activity.js`, `views/history.js`, `views/archive.js`, `app.js`) laufen über `h()` aus `training/src/dom.js` (Textknoten, `el.value`, `setAttribute`). Datengetriebene Attribute sind nur `data-fid` mit geprüfter ID und `value`. Keine der genannten Senken in `training/`. Siehe N2 (Steuerzeichen). |
| CSP / Referrer / Trusted Types | `training/index.html`, `index.html` (seit 2.0 unverändert) | CSP ohne `unsafe-inline`/`unsafe-eval`, `connect-src 'none'`, `base-uri 'none'`, `form-action 'none'`, `object-src 'none'`, `require-trusted-types-for 'script'` mit Policy `sw`. Referrer-Policy `no-referrer` auf beiden Seiten. |
| Import-Härtung `activities` | Node-Skript gegen `validateTrainingFile`/`parseImportText`: leere bzw. nur aus Leerzeichen bestehende Trainingsart, 61 Zeichen, Zeilenumbruch, HTML; `durationMin` 0, 601, 1,5, `"90"`; `rpe` 11, −1, `null`; `week` 0, 53; Datum 1999, 2026-02-30, 2099; `createdAt` fehlt bzw. Jahr 9999; unbekanntes Feld; `__proto__` im Eintrag; Notiz 2001 Zeichen; doppelte ID; 2001 Einträge; `activities` als Objekt, `null`, `[]`; ID `../../x` | Alles Unzulässige abgelehnt, mit Pfad und Klartext. `__proto__` fängt schon `parseJsonSafe`. Prototyp nicht verschmutzt. Durchgelassen werden: Trainingsart mit Zeilenumbruch, HTML und Steuerzeichen (unschädlich in der Anzeige, siehe N2), Datum bis 2100 (Zukunft prüft nur das Modell, wie dokumentiert), `createdAt` ohne Bereichsgrenze (N5). |
| Zusammenführen und halbes Speichern | `mergeTrainingFiles` mit (a) anderem Training im einen und Krafttraining mit gleicher ID im anderen Stand, (b) 1500 + 1500 anderen Trainings; Code-Pfade `confirmImport`, `switchToFile`, `openFiles` (Zusammenführen mit Browser-Stand), `saveImported` | Beide Fälle ergeben einen ungültigen Stand (doppelte ID bzw. 3000 > 2000). `confirmImport` und `switchToFile` prüfen das Ergebnis mit `checkReimport` vor dem Schreiben und speichern dann nichts („Nicht übernommen: …“). Kein halbes Speichern, kein Datenverlust. (a) ist nur mit präparierter Datei erreichbar, (b) praktisch nicht. Siehe Anmerkung in N1. |
| Neue Schreibpfade | `addActivity`, `updateActivity`, `deleteActivity` (`model/activities.js`), `setFile` → `store.saveFile` | Jeder Eintrag läuft durch `validateActivityEntry`, die Obergrenze 2000 prüft `addActivity`, Datum in der Zukunft lehnt das Modell ab. Schreiben über `guardedWrite` mit `stamp`-Abgleich (veraltetes Fenster schreibt nicht). Löschen merkt die ID in `deletedSessionIds` (begrenzt). |
| Backup-Status / Wechsel | `model/backup.js`, `model/switch.js`, `withBackupFirst` | Andere Trainings zählen für `hasData` und `unsavedSessionIds`. Eine Datei, die nur andere Trainings enthält, löst vor einem Wechsel „Erst sichern“ aus. Der Schutz aus Runde 4 (M1: `saveImported` mit `expectRevision`, kein `force` beim Entfernen) ist unverändert vorhanden. |
| Coach-Export (neu: andere Trainings) | Code gelesen, Ausgabe mit Schadtext erzeugt (Node und im Browser) | Trainingsart und Notiz laufen durch `cleanText` (Leerraum inkl. `U+2028` zu Leerzeichen, Backticks zu `'`) und stehen im Codeblock „Trainings“. Der Block lässt sich nicht schließen. Anzeige in der App als Text in `<pre>`. |
| Agent-Prompt (neu: Zusammenfassung) | `activitySummaryLines`, `buildAgentPrompt` mit Schadtext | Trainingsart als `JSON.stringify` (Zeilenumbrüche maskiert), danach Backticks zu ```, eigener ```` ```text ````-Block mit Datenhinweis, keine Notizen. Der Block lässt sich nicht schließen. Hinweis zur Weitergabe an den KI-Dienst nennt die anderen Trainings. |
| Last (präparierte Datei) | 2000 andere Trainings mit je 1900 Zeichen Notiz (4,2 MB): Parsen, Coach-Export, Zusammenfassung in Node; Import, Verlauf, Sheet im Browser | Parsen 39 ms, Coach-Export 15 ms, Verlauf mit 2000 Einträgen ca. 220 ms, Sheet ca. 230 ms (Chromium, Desktop-CPU). Keine Fehler. Auf dem iPhone langsamer, aber kein Hängen zu erwarten. |
| Service Worker | `git diff` von `training/sw.js`, e2e `offline`, Code von `fetch`/`serve`/`activate` | Nur Version und Precache-Liste geändert (`model/activities.js`, `views/activity.js` aufgenommen, Test prüft Liste und Hashes). Scope `./`, nur GET derselben Origin innerhalb des Scopes, SHA-256-Prüfung bei Installation und Auslieferung, kein Laufzeit-Caching, Update erst nach „Aktualisieren“, alle Fenster laden bei `controllerchange` neu, alte Caches nur mit eigenem Präfix gelöscht. |
| Versionssprung 2.0 → 3.0 | `validateTrainingFile`, `boot()`, `classifyOtherFiles` | 3.0 liest Schema 1–3 und hebt auf 3. Eine 2.0-App lehnt Dateien mit `schemaVersion` 3 mit „neuere App-Version“ ab; im Browser liegende neuere Dateien behandelt 2.0 als „newer“ und lässt sie unangetastet. Kein stilles Verwerfen gefunden. |
| Speicher | `training/src/storage.js`, `grep` nach `localStorage`, `sessionStorage`, `document.cookie` | Nur IndexedDB `training-pwa` (Stores `files`, `kv`). Kein `localStorage`/`sessionStorage`, keine Cookies. Andere Trainings liegen in der Trainingsdatei, kein neuer Speicherort. |
| Export / Dateinamen / FIT | `export.js`, Dateinamen-Funktionen, `doGarminExport` | Keine Änderung seit 2.0. Andere Trainings haben keinen Garmin-Export (Button fehlt, `doGarminExport` findet die ID nicht unter `sessions` und bricht ab). Dateinamen enthalten keine Trainingsart. |
| Clickjacking | `training/src/app.js:4-7` (unverändert) | Frame-Buster leert das Dokument und bricht ab. Importierte Module haben beim Laden keine relevanten Seiteneffekte (einzig `wakelock.js` registriert einen `visibilitychange`-Listener). GitHub Pages erlaubt keine eigenen Header, `frame-ancestors` wirkt im Meta-Tag nicht. Nur Code gelesen, diesmal nicht im Browser nachgestellt. |
| Lieferkette | `package.json`, `node_modules/`, `npm audit` | Keine Abhängigkeiten, kein Lockfile, kein Build. `node_modules/` enthält nur die Symlinks auf Playwright der Prüfumgebung (ignoriert). `npm audit` verweigert mangels Lockfile, es gibt nichts zu prüfen. Keine neuen Fremdbibliotheken. |
| Workflow | `.github/workflows/pages.yml` (seit 2.0 unverändert), Tags per `git ls-remote` | `actions/checkout@3d3c42e…` = v7.0.1, `upload-pages-artifact@fc324d3…` = v5.0.0, `deploy-pages@368f825…` = v5.0.1 (geprüft). Global `contents: read`, `pages: write`/`id-token: write` nur im Deploy-Job, `persist-credentials: false`. |
| Repo / Secrets / persönliche Daten | `git log -p da4a029..HEAD` nach `ghp_`, `github_pat_`, `AKIA`, Private Keys, password/secret/token; Commit-Identitäten; Suche (ohne Ausgabe) nach den Werten aus `legal.js` über HEAD; Suche nach Hinweisen auf das private Repo | Keine Secrets. Commits nur mit `Claude <noreply@anthropic.com>` und der GitHub-`noreply`-Adresse. Betreiberangaben in HEAD nur in `training/src/legal.js`. Session-Links und Verweise auf das WIP-Repo siehe N4. |

## Nicht geprüft (mit Grund)

- **Echtes iPhone / iOS Safari und WebKit:** Kein Gerät, WebKit von Playwright ist in dieser Umgebung nicht installiert. Nicht geprüft: Verhalten des neuen Sheets (Datumsfeld, `maxlength`) unter iOS, Trusted Types in Safari, Teilen-Menü mit Datei, Speicher-Eviction, getrennter Speicher von Safari-Tab und Home-Bildschirm-App.
- **Web Share API mit Datei:** Headless-Chromium hat kein `canShare` mit Dateien, es lief immer der Download-Fallback.
- **Ausgelieferte Seite und Header:** 3.0 ist noch nicht ausgeliefert, die Seite ist aus dieser Umgebung ohnehin gesperrt.
- **GitHub-Einstellungen des öffentlichen Repos (Rulesets, Pages, Secret Scanning):** Die Sitzung hat keinen API-Zugriff auf das öffentliche Repo (`gh api` verweigert). Stand aus Runde 4 nicht erneut bestätigt (N7).
- **Echter voller Speicher:** nicht nachgestellt, nur Code gelesen (N6).

## Findings

### Kritisch

Keine.

### Hoch

Keine.

### Mittel

Keine.

### Niedrig

#### N1: Import-Vorschau verschweigt andere Trainings

- **Fundstelle:** `training/src/model/training-file.js:166-178` (`summarize` zählt nur `sessions`), `training/src/app.js:502` (Zeile „N Trainings (…)“ bzw. „Noch keine Trainings“), `training/src/app.js:489` („Deine N Trainings bleiben unverändert“ mit `historyCount` nur aus `sessions`), Merge-Texte `app.js:480-482` („Training(s)“ ohne Unterscheidung).
- **Nachstellen (Chromium, reproduziert):** Leerer Browser, „Plan öffnen“, Datei mit sechs anderen Trainings und ohne Krafttrainings wählen. Die Vorschau zeigt „Noch keine Trainings“ und „Wird als Trainingsstand übernommen.“
- **Beschreibung:** Die Spezifikation verlangt vor jedem Übernehmen eine Vorschau mit Anzahl und Zeitraum der Trainings („Nie stumm überschreiben“). Andere Trainings sind laut `docs/begriffe.md` ebenfalls Trainings, erscheinen in der Vorschau aber nicht. Beim Abgleich werden sie zwar mitgezählt („2 Training(s) werden ergänzt“), aber nicht als andere Trainings erkennbar. Ergibt das Zusammenführen einen ungültigen Stand (gleiche ID in beiden Listen aus einer präparierten Datei, über 2000 andere Trainings), sagt die Vorschau „wird übernommen“, und erst nach „Übernehmen“ kommt „Nicht übernommen: …“.
- **Auswirkung:** Gering. Kein Datenverlust (vor jedem Wechsel greift „Erst sichern“, vor jedem Schreiben `checkReimport`). Die Entscheidung des Nutzers beruht aber auf unvollständigen Angaben, und eine fremde Datei mit vielen anderen Trainings sieht leer aus.
- **Empfehlung:** In `summarize` die anderen Trainings mitzählen und in der Vorschau eine eigene Angabe zeigen („3 Krafttrainings · 2 andere Trainings“, wie im Archiv-Kopf). `previewImport` könnte das Ergebnis des Zusammenführens schon für die Vorschau mit `validateTrainingFile` prüfen und den Fehler dort nennen.
- **Sicherheit der Einschätzung:** Hoch (Code gelesen, im Browser nachgestellt).

#### N2: Trainingsart lässt Steuer- und unsichtbare Zeichen zu

- **Fundstelle:** `training/src/model/validate.js:579` (Trainingsart nur mit Länge und `trim()`-Prüfung), `training/src/model/activities.js:16-22` (`cleanInput` ersetzt nur Leerraum), `training/src/model/coach-export.js:20-22` (`cleanText`).
- **Nachstellen:** Datei mit Trainingsart `"‮evil‬<b>x</b>"` bzw. nur `"​"` importieren. Die erste erscheint in Verlauf, Detail, Vorschlag-Chips und Coach-Export mit umgedrehter Leserichtung, die zweite ist ein Eintrag ohne sichtbare Trainingsart (`trim()` entfernt `U+200B` nicht).
- **Beschreibung:** Bidi-Steuerzeichen (`U+202A–U+202E`, `U+2066–U+2069`), Nullbreiten-Zeichen und andere Steuerzeichen (`\p{Cc}`, `\p{Cf}`) gehen ungefiltert in Anzeige, Vorschläge und Coach-Export. Das gilt ebenso für Plan- und Übungsnamen (seit 1.x), ist bei der Trainingsart aber neu, weil sie zusätzlich als Vorschlag wiederverwendet wird. Ausführbar ist nichts (nur Textknoten).
- **Auswirkung:** Gering. Täuschung in der Anzeige bzw. im Text für den Coach („Trojan Source“-Muster), unsichtbare Einträge. Voraussetzung ist eine fremde oder manipulierte `.training.json`; über das Sheet lässt sich das nur absichtlich eingeben.
- **Empfehlung:** In `cleanInput` und im Validator für Trainingsart (und sinnvollerweise alle Namen) Zeichen der Kategorien `Cc` und `Cf` entfernen bzw. ablehnen, z. B. `/[\p{Cc}\p{Cf}]/u`, und „leer“ nach dieser Bereinigung prüfen. In `cleanText` dieselbe Bereinigung.
- **Sicherheit der Einschätzung:** Hoch für das Verhalten (im Browser gesehen), niedrig für die praktische Relevanz.

#### N3: Doppelte IDs zwischen Trainings und anderen Trainings sind nur in der Datei verboten, nicht beim Zusammenführen ausgeschlossen

- **Fundstelle:** `training/src/model/training-file.js:131-137` (`addedActs` prüft nur gegen die anderen Trainings des Gewinners und gegen `deleted`, nicht gegen dessen `sessions`; umgekehrt bei `added`).
- **Beschreibung:** Der Validator verlangt seit Schema 3 eindeutige IDs über beide Listen (wegen der gemeinsamen `deletedSessionIds`). `mergeTrainingFiles` stellt das nicht her. Mit einer präparierten Datei (gleiche `fileId`, ein Krafttraining mit der ID eines lokalen anderen Trainings) entsteht ein ungültiger Stand. Das fängt `checkReimport` ab („Nicht übernommen“), danach lässt sich die Datei aber gar nicht mehr abgleichen. Bei zufälligen UUIDs tritt das ohne Absicht nicht auf.
- **Auswirkung:** Gering. Kein Datenverlust, nur eine blockierte Übernahme. Die Prüfung hängt allein an `checkReimport`; käme ein weiterer Schreibpfad ohne diese Prüfung hinzu, würde ein Stand gespeichert, den `boot()` danach als „beschädigt“ nicht mehr lädt.
- **Empfehlung:** Beim Zusammenführen Einträge des Verlierers verwerfen (oder mit Hinweis melden), deren ID im Gewinner in der jeweils anderen Liste vorkommt. Einen Unit-Test für beide Richtungen ergänzen.
- **Sicherheit der Einschätzung:** Hoch (in Node nachgestellt, Code gelesen).

#### N4: Session-Links und Verweise auf das WIP-Repo in Commits und `docs/stand.md`

- **Fundstelle:** Commit-Nachrichten `2feefdd..f2cbaf7` (Zeile `Claude-Session: https://claude.ai/code/session_…`), `docs/stand.md` Abschnitt „Wo der Code liegt“.
- **Beschreibung:** Die Zwischen-Commits tragen Session-Links, `docs/stand.md` nennt Namen und Branch des privaten Repos. Das ist im privaten Repo unkritisch und als Schritt vor der Übergabe in `docs/stand.md` bereits vermerkt (Legal Runde 4, N6). Ich führe es hier nur, weil die Spezifikation die Git-Historie ausdrücklich zum Prüfumfang zählt. Secrets oder Tokens enthalten die Links nicht.
- **Auswirkung:** Gering. Würden die Commits ungesquasht ins öffentliche Repo übernommen, wären interne Links und Arbeitsweise öffentlich.
- **Empfehlung:** Wie in `docs/stand.md` vermerkt: per `git merge --squash` mit neuer Nachricht übernehmen, danach im öffentlichen Repo `git log -p | grep -E 'claude.ai/code/session_|-wip'` laufen lassen.
- **Sicherheit der Einschätzung:** Hoch.

#### N5: Zeitstempel ohne Bereichsgrenze (aus Runde 3 N5 / Runde 4 N4, weiter offen, neue Folge)

- **Fundstelle:** `training/src/model/validate.js:433-439` (`isoField`), neu `validate.js:585` (`activities[].createdAt`), `training/src/model/backup.js:23`.
- **Beschreibung:** Wie in Runde 4. Neu: `createdAt` eines anderen Trainings wird für die Reihenfolge am selben Tag und für den Status „nicht gesichert“ genutzt. Ein importiertes anderes Training mit `createdAt` im Jahr 9999 gilt nach jeder späteren Änderung als „nicht gesichert“, auch direkt nach einer Sicherung mit anschließender Änderung, und steht am selben Tag immer zuletzt.
- **Auswirkung:** Gering, nur Anzeige. Kein Überlauf, kein Datenverlust.
- **Empfehlung:** Bereich 2000–2100 wie bei `date` für alle ISO-Zeitstempel.
- **Sicherheit der Einschätzung:** Hoch (Code gelesen, Validator in Node geprüft).

#### N6: „Export fehlgeschlagen“ bei vollem Speicher (aus Runde 3 N3 / Runde 4 N5, weiter offen)

- **Fundstelle:** `training/src/app.js:1245-1259` (`store.setLastExport` im selben `try` wie der Export).
- **Beschreibung / Auswirkung:** Unverändert wie in Runde 4 (Entscheidung „Später“). Ein erfolgreicher Export wird bei vollem Speicher als Fehlschlag gemeldet, ein Wechsel der Trainingsdatei bleibt dann aus. Kein Datenverlust.
- **Empfehlung:** Wie in Runde 4.
- **Sicherheit der Einschätzung:** Hoch für den Ablauf (Code), nicht nachgestellt.

#### N7: `main` ohne Pull-Request-Pflicht (aus Runde 3 N7 / Runde 4 N6, Entscheidung Betreiber)

- **Fundstelle:** Ruleset „Schutz main und develop“ des öffentlichen Repos.
- **Beschreibung:** Stand aus Runde 4 (nur Löschen und Force-Push gesperrt). Diesmal ohne API-Zugriff, daher nicht erneut bestätigt. Für 3.0 relevant, weil die Übergabe aus dem privaten Repo ein Schreiben ins öffentliche erfordert.
- **Empfehlung:** Wie in Runde 4 (PR-Pflicht und verpflichtende Prüfungen für `main`), sonst Entscheidung des Betreibers.
- **Sicherheit der Einschätzung:** Mittel (diesmal nicht gelesen).

#### N8: Gemeinsame Origin `xandl-droste.github.io` (aus Runde 3 N4 / Runde 4 N7, unverändert, latent)

- **Fundstelle:** Architektur; `training/src/storage.js`, `training/sw.js`, `CLAUDE.md` („GitHub Pages“).
- **Beschreibung / Auswirkung:** IndexedDB und Cache Storage gelten für die ganze Origin. Abgefangen durch die Regel in `CLAUDE.md`, die Prüfung des Stands beim Start und die SHA-256-Prüfung im Service Worker, solange kein weiteres Pages-Projekt mit Skripten dazukommt. Ab 3.0 liegen zusätzlich Trainingsarten und Notizen anderer Sportarten in diesem Speicher.
- **Empfehlung:** Regel beibehalten; bei weiteren Projekten eine eigene (Sub-)Domain.
- **Sicherheit der Einschätzung:** Hoch (Same-Origin-Policy). Quelle: GitHub Docs, „About GitHub Pages“, https://docs.github.com/en/pages/getting-started-with-github-pages/about-github-pages

## Aus Runde 4 erledigt (geprüft)

- R4 M1 (veraltete Instanz löscht beim Wechsel): `saveImported` prüft beim Entfernen immer `stamp` und `expectRevision` (`storage.js:166-182`), `switchToFile` übergibt beide. Code gelesen, e2e `speichern` grün.
- R4 N1 (Löschen nach nicht überprüfbarer Sicherung): Rückfrage „Datei gesichert?“ nach Download (`app.js`, `confirmDownloaded`). Code gelesen.
- R4 N2 (Planname außerhalb der Datenblöcke im Coach-Export): Planname, Datei und Vorgänger stehen im Codeblock „Datei“, Überschrift fest. In meinem Lauf bestätigt.
- R4 N3 (beschädigte ältere Dateien): `classifyOtherFiles` meldet sie als „nicht lesbar“ mit „Verwerfen“, neuere Schemaversionen bleiben unangetastet. Code gelesen.
