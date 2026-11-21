# Security-Review (Reviewer 1: IT-Security), Runde 2

Geprüfter Stand: Branch `develop`, Commit `2e7f125`. Prüfung nur lesend. Browser-Tests liefen mit Playwright 1.65.1 (Chromium und WebKit 27.2), installiert außerhalb des Repos, gegen `python3 -m http.server` auf 127.0.0.1. Die Server wurden am Ende beendet. Im Repo ist nur diese Datei neu.

## Geprüfte Punkte

| Bereich | Wie geprüft | Ergebnis |
|---|---|---|
| Netzwerk | Playwright, alle Requests des Browser-Kontexts einschließlich Service Worker mitgeschnitten (Chromium 141, WebKit 110 Requests). Durchlauf: Erstladen, Beispielplan, Training, Export, Verlauf, Garmin-Export, CSV, Info-Seite, präparierter Import, Neuladen. Zusätzlich `fetch('https://example.org/')` aus der App. Code durchsucht nach `fetch`, `import()`, URLs. | 0 externe Requests in beiden Engines. Ein fremder `fetch` wird von der CSP (`connect-src 'self'`) blockiert. Keine CDN-Skripte, Fonts oder Tracker. Der einzige externe Link (GitHub-Datenschutzerklärung, `views/info.js:27`) wird nur auf Tippen geöffnet und hat `rel="noopener noreferrer"`. |
| XSS | Code: alle Render-Pfade (`dom.js`, `views/*`, `app.js`). Suche nach `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `eval`, `new Function`, `document.write`, `setAttribute` mit Nutzerdaten, `href`/`src`. Browser: Import einer präparierten `.training.json` mit HTML/JS-Payloads (`<img onerror>`, `<script>`, `<svg onload>`) in Planname, Einheitsname, `suggestedDay`, Warm-up, Übungsname, Cue, Variantenname und -cue, RIR-Text, Notizen, unbekannter Übungs-ID und im Dateinamen. Danach wurden Vorschau, Heute, Verlauf (Liste und Detail mit Graph), Plan und Live-Training angezeigt. | Kein Payload ausgeführt, keine Elemente eingeschleust, keine Dialoge, keine CSP-Verstöße durch die App. Alle Texte gehen über `textContent` oder Textknoten, SVG-Attribute bekommen nur Zahlen. Keine verbotenen Sinks im App-Code. |
| CSP / Trusted Types | Die exakte CSP aus `training/index.html` auf einer eigenen Testseite in einer Kopie außerhalb des Repos, in beiden Engines: `eval`, `new Function`, `setTimeout(string)`, Inline-`<script>`, `style`-Attribut, `data:`-Import, Worker aus `data:`, Script-`src` auf eine fremde Origin. In der App selbst: `innerHTML`- und `script.textContent`-Zuweisung. | Alles blockiert (EvalError/TypeError). Inline-Skript und Inline-Style greifen nicht. Trusted Types werden in Chromium und WebKit durchgesetzt. Die einzige Policy `sw` lässt nur `./sw.js` zu (`app.js:851-856`). Kein `unsafe-inline` und kein `unsafe-eval`. `base-uri`, `form-action` und `object-src` stehen auf `'none'`. `<meta name="referrer" content="no-referrer">` ist gesetzt. |
| Import-Härtung | 18 präparierte Dateien über die echte Dateiauswahl: kaputtes JSON, `__proto__`, `constructor`, 5 000 und 200 000 Ebenen Verschachtelung, `1e309`, negative und riesige kg-Werte, Notiz über 2000 Zeichen, über 5 MB, 300 Schlüssel, unbekanntes Feld, `schemaVersion: 99`, 30. Februar, doppelte Session-ID, Schlüssel mit 100 000 Zeichen, Array als Wurzel, BOM. Mehrfachauswahl gültig + kaputt. Danach IndexedDB vor und nach den Importen verglichen und `({}).polluted` geprüft. | Jeder Fall bricht mit Pfad und Klartext ab. Keine Prototype Pollution. Die Mehrfachauswahl bricht komplett ab. IndexedDB ist danach byte-gleich (nichts halb gespeichert). Übernommen wird in einer Transaktion (`storage.js:120-126`). Vor dem Speichern läuft eine Wiedereinlese-Prüfung (`app.js:367`). Zu den Fehlermeldungen siehe N2. |
| Service Worker | Code `sw.js`, `scripts/update-sw.mjs`. Browser: Scope, Cache-Inhalte, Offline-Neuladen, Cache-Poisoning (`legal.js` und `index.html` direkt im Cache durch präparierte Antworten ersetzt), Update-Ablauf in einer App-Kopie (Datei ohne `npm run sw` geändert, danach neuer SW mit neuem Hash). | Scope `/training/`. Ein Cache `training-pwa-<version>`, 33 Einträge, alle aus der eigenen Origin. Fremde Origins und Nicht-GET-Requests fasst der SW nicht an. Offline-Start klappt. Das Cache-Poisoning wirkt nicht: Der SHA-256-Abgleich verwirft die präparierten Einträge und lädt geprüft nach. Eine geänderte Datei ohne neuen SW wird nicht ausgeliefert, es bleibt beim alten, konsistenten Stand. Ein neuer SW wartet (`waiting`), die App zeigt „Neue Version verfügbar“. Erst „Aktualisieren“ aktiviert ihn, dann wird der alte Cache gelöscht und neu geladen. Laufende Trainings werden vorher gesichert (`app.js:871-876`). |
| Speicher | Browser: `localStorage`, `sessionStorage`, `document.cookie`, IndexedDB-Inhalt. Quota-Fehler simuliert (`IDBObjectStore.put` wirft `QuotaExceededError`) während eines Trainings und beim Beenden. IndexedDB gelöscht, dann neu geladen. Manipulierten Live-Stand in IndexedDB geschrieben, dann neu geladen. | localStorage, sessionStorage und Cookies sind leer. IndexedDB `training-pwa` enthält `files` und `kv` (`activeFileId`, `live`, `lastExport:<id>`). Bei einem Quota-Fehler kommt ein verständlicher Toast. Der Abschlussbildschirm warnt per `role=alert` und bietet den Datei-Export an. Nach dem Löschen startet die App sauber im Onboarding. Ein manipulierter Live-Stand legt die App lahm, siehe M1. |
| Export / FIT | Code `export.js`, `csv.js`, `training-file.js`, `garmin/*`. Dateinamen aus dem präparierten Plannamen erzeugt. CSV mit `=HYPERLINK(...)` und `@SUM(...)` in Notizen. FIT-Encoder mit Extremwerten (Sessions über 45, 59 Tage und 100 Jahre) in Node. | Dateinamen werden auf `[a-z0-9-]` bereinigt und gekürzt, kein Pfad-Traversal. Die Garmin-Datei bekommt nur das validierte Datum. Die CSV maskiert Formelzeichen (`'`-Präfix) und `; " \n`. Kein Feld beginnt mit einem Formelzeichen. Keine Freitexte im FIT. `writeValue` prüft jeden Wert auf den Bereich und wirft, statt überzulaufen. Bei sehr langen Sessions schlägt der Export aber fehl, siehe N3. |
| Lieferkette | `package.json`, `git ls-files`, Imports im App-Code. Gepinnte Action-SHAs über die GitHub-API mit den Release-Tags verglichen, auch die transitive Action in `upload-pages-artifact`. | Keine Laufzeit- und keine Dev-Abhängigkeiten, daher kein Lockfile nötig. `npm audit` ist ohne Lockfile und Abhängigkeiten nicht anwendbar. `actions/checkout@3d3c42e…` = v7.0.1, `upload-pages-artifact@fc324d3…` = v5.0.0, `deploy-pages@368f825…` = v5.0.1, alle exakt die Tag-Commits. Transitiv ist `actions/upload-artifact` ebenfalls per SHA gepinnt. Die Playwright-Version für e2e steht im README (nur Entwickler). Lizenz MIT, keine gebündelten Fremdbibliotheken. |
| Repo und Deployment | `git log --all`: Identitäten, Nachrichten und Diffs auf Secret-Muster (`ghp_`, `github_pat_`, `AKIA`, Private Keys, token/secret/password) und Mailadressen. Alle jemals versionierten Pfade. PNG-Chunks der Icons, `spike/test.fit`. Workflow-Datei. `gh api`: Pages, Environments, Rulesets, Actions-Rechte, Secret Scanning, andere Pages-Repos des Accounts. | Keine Secrets. Commits nur mit `noreply`-Identitäten. Persönliche Angaben stehen nur in `training/src/legal.js` (gewollt, siehe N5). Die Icons haben nur IHDR/IDAT/IEND. Der Workflow hat global `contents: read`, `pages: write`/`id-token: write` nur im Deploy-Job, `persist-credentials: false` und liefert nur `index.html`, `root.css` und `training/` aus. Das Environment `github-pages` ist auf `main` beschränkt. Das Ruleset verhindert Löschen und Force-Push auf `main`/`develop` ohne Bypass. Secret Scanning und Push Protection sind aktiv. Standardrechte für Workflows: read. Derzeit hat nur dieses Repo Pages. |
| Clickjacking / Framing | Fremde Origin bettet `/training/` per iframe ein, auch mit `sandbox="allow-scripts"` und `sandbox="allow-scripts allow-same-origin"`. Zusätzlich Einbettung durch eine Seite derselben Origin. Live-Header von `https://xandl-droste.github.io/` abgefragt. | GitHub Pages setzt keine `X-Frame-Options`/`frame-ancestors`, und Meta-CSP kann `frame-ancestors` nicht. Die JS-Sperre in `app.js:4-7` leert die Seite in jedem eingebetteten Fall (nur der leere `<html>`-Rest bleibt). Das ist im Rahmen von Meta/JS die passende Gegenmaßnahme. Restrisiko: Ohne JS rendert die App ohnehin nichts Bedienbares. |

## Nicht geprüft (mit Grund)

- **Echtes iPhone / Safari (iOS):** Kein Gerät verfügbar. Playwright-WebKit ist nicht identisch mit iOS Safari, besonders bei Service Worker, Share Sheet, Storage-Eviction und Quota.
- **Ausgelieferte App auf GitHub Pages:** `main` enthält bisher nur den Initial-Commit, und `https://xandl-droste.github.io/training/` liefert 404. Geprüft wurde nur die Startseite (Header). Ob der Workflow nach dem Merge auf `main` wie erwartet deployt, ließ sich nicht testen.
- **Echter voller Speicher:** Nur simuliert (QuotaExceededError injiziert), nicht durch tatsächliches Auffüllen des Speichers.
- **Laufender Workflow:** Nicht ausgeführt. Geprüft wurden nur die Workflow-Datei, die SHAs und die Repo-Einstellungen.
- **Vorgaben im Web Share API-Pfad:** In den Tests wurde `canShare` deaktiviert, damit der Download-Fallback läuft. Das Teilen-Menü selbst braucht ein Gerät.
- **WebKit-CSP-Meldungen `style-src-elem inline`:** Im WebKit-Lauf gab es 3 solche Meldungen, genau eine je `page.screenshot()`. Playwright fügt dafür ein Inline-`<style>` ein. Sie stammen nicht von der App, das habe ich aber nicht weiter isoliert.

## Findings

### Kritisch

Keine.

### Hoch

Keine.

### Mittel

#### M1: Laufendes Training aus IndexedDB wird beim Start nicht validiert, ein defekter Stand sperrt die App dauerhaft

- **Fundstelle:** `training/src/app.js:806-808` (`S.live = st.live` ohne Prüfung, nur `S.file` wird in Zeile 812 validiert), Absturz beim Rendern in `views/live.js` bzw. `model/live.js` (`live.items.forEach is not a function`). `LIVE_VERSION` (`model/live.js:8`) wird gespeichert, aber nie geprüft.
- **Nachstellen:** App öffnen, Plan laden. In IndexedDB `training-pwa` → `kv` unter dem Schlüssel `live` ein Objekt mit passender `fileId` und kaputter Struktur ablegen (z. B. `items: "kaputt"`). Neu laden. Ergebnis in Chromium und WebKit: komplett leere Seite, unbehandelter TypeError, kein Menü, kein Export, kein Import.
- **Beschreibung:** Der gespeicherte Trainingsstand wird seit Runde 1 wie ein Import geprüft. Für den Live-Stand fehlt diese Prüfung. Jede Abweichung der Struktur bringt das erste `render()` zum Absturz. Weil der Live-Stand dann bei jedem Start wieder geladen wird, kommt die App nicht mehr hoch. Mögliche Auslöser sind eine Seite derselben Origin (siehe N1), ein Programmfehler oder ein künftiges Update, das die Live-Struktur ändert, während ein Training läuft. Der Update-Ablauf sichert den alten Live-Stand vor dem Neuladen (`app.js:874`) und reicht ihn damit an den neuen Code weiter.
- **Auswirkung:** Verfügbarkeit. Die App ist tot, und in der App gibt es keinen Weg zurück. Man muss die Website-Daten löschen und verliert damit auch alle noch nicht exportierten Trainings in `files`, obwohl diese gültig wären. Keine Codeausführung (getestet: kein XSS über den Live-Stand).
- **Empfehlung:** Den Live-Stand beim Start strukturell prüfen: `version === LIVE_VERSION`, `fileId`, `session` über `validateLoggedSession` bzw. die Satz-Prüfung aus `validate.js`, und `items.length === session.blocks.length` mit den erwarteten Feldern. Ist er ungültig, verwerfen (`store.clearLive()`) und einen Hinweis zeigen. Zusätzlich `render()` bzw. den Bildschirmaufbau in `try/catch` legen und bei Fehlern eine Notfallansicht mit „Als Datei sichern“ und „Laufendes Training verwerfen“ anbieten.
- **Sicherheit der Einschätzung:** Hoch, dass der Fehler eintritt (in beiden Engines reproduziert). Mittel, wie wahrscheinlich er im Alltag ist (heute nur durch Manipulation oder künftige Änderungen).

### Niedrig

#### N1: Restrisiko gemeinsame Origin `xandl-droste.github.io` (Daten lesen und ändern)

- **Fundstelle:** Architektur. `training/src/storage.js` (IndexedDB `training-pwa`), `training/sw.js:5-6`.
- **Nachstellen:** In einer Kopie auf derselben Origin eine Seite `/other/` mit einem Skript, das `indexedDB.open('training-pwa')` liest. Ergebnis: Sie liest Plan und Historie ohne Hindernis, in Chromium und WebKit.
- **Beschreibung:** Alle Project-Pages dieses Accounts laufen unter derselben Origin wie die App (`https://xandl-droste.github.io/<repo>/`). Die SHA-256-Prüfung im Service Worker verhindert jetzt nachweislich das Cache-Poisoning, und die Frame-Sperre greift auch bei gleicher Origin. IndexedDB lässt sich aber nicht nach Pfad trennen. Eine andere Seite derselben Origin kann Trainingsdaten lesen, verändern oder löschen und damit z. B. M1 auslösen. Derzeit hat laut GitHub-API nur dieses Repo Pages, das Risiko ist also latent.
- **Auswirkung:** Vertraulichkeit und Integrität der lokalen Trainingsdaten, sobald ein weiteres (fremdes, kompromittiertes oder unsauberes) Pages-Projekt unter dem Account erscheint.
- **Empfehlung:** In `CLAUDE.md`/README festhalten: keine weiteren GitHub-Pages-Projekte unter diesem Account, oder die App auf eine eigene (Sub-)Domain als eigene Origin legen. Ändert der Betreiber das, sollte M1 vorher behoben sein.
- **Sicherheit der Einschätzung:** Hoch (Same-Origin-Policy, getestet). Quelle zur URL-Struktur: GitHub Docs, „About GitHub Pages“ (Types of GitHub Pages sites), https://docs.github.com/en/pages/getting-started-with-github-pages/about-github-pages

#### N2: Fehlermeldungen im Import geben überlange Schlüssel ungekürzt aus

- **Fundstelle:** `training/src/model/validate.js:189` (`weekKeys`: `${path}.${k}` ohne `short()`), ebenso `:91` (`p` beim verbotenen Schlüssel, betrifft nur den Pfad).
- **Nachstellen:** Plan mit `rirTargets: { "<100 000 × 9>": "1" }` importieren. Die Fehlerliste enthält einen 100 000 Zeichen langen Eintrag.
- **Beschreibung:** Für unbekannte Felder werden lange Schlüssel seit Runde 1 gekürzt (`short`), für Wochen-Schlüssel nicht. Das wird nur als Text gerendert, also ohne XSS. Die Anzeige wird aber unbrauchbar, und große Strings landen im DOM.
- **Auswirkung:** Kosmetisch bzw. geringe Selbst-DoS mit einer präparierten Datei. Die Größe ist durch das 5-MB-Limit begrenzt.
- **Empfehlung:** In `weekKeys` (und überall, wo Schlüssel in Pfade kommen) `short(k)` verwenden.
- **Sicherheit der Einschätzung:** Hoch.

#### N3: Garmin-Export scheitert bei Sessions über ca. 49,7 Tage mit allgemeiner Meldung

- **Fundstelle:** `training/src/garmin/fit.js:134` (`elapsed = (t1 - t0) * 1000`), `:171-173`, Prüfung in `:63`. Anzeige in `app.js:740-742`.
- **Nachstellen:** In Node `sessionToFit(seed, session)` mit `startedAt`/`endedAt` 59 Tage auseinander. Ergebnis: `RangeError: FIT-Wert außerhalb des Bereichs: 5097600000`. Mit 45 Tagen klappt es.
- **Beschreibung:** Die Gesamtdauer geht in Millisekunden in ein `uint32`. Der Encoder läuft korrekt nicht über, sondern wirft. Für den Nutzer heißt das nur „Garmin-Export fehlgeschlagen“. Möglich ist das, wenn ein Training wochenlang offen bleibt (die App bietet es beim Start immer wieder zum Fortsetzen an) oder bei einer importierten Datei. Der Validator begrenzt die Dauer einer Session nicht.
- **Auswirkung:** Gering. Kein Speicherfehler, kein falsches FIT, nur kein Export.
- **Empfehlung:** Session-Dauer im Validator begrenzen (z. B. `endedAt - startedAt` ≤ 24 h) oder vor dem FIT-Export auf das letzte Satzende kürzen und klar melden („Training dauerte länger als 49 Tage“).
- **Sicherheit der Einschätzung:** Hoch.

#### N4: Revision am Limit 1e9 schaltet die Backup-Erkennung „nicht gesichert“ ab

- **Fundstelle:** `training/src/model/training-file.js:37` (`Math.min(LIMITS.maxRevision, …)`), `training/src/model/backup.js:15` (`file.revision > lastExport.revision`).
- **Nachstellen:** In Node `bumpRevision` auf eine Datei mit `revision: 1e9` und `lastExport.revision = 1e9`. Ergebnis: Revision bleibt 1e9, `unsavedChanges: false`, `unsavedSessionIds: []`, obwohl eine neue Session dazukam.
- **Beschreibung:** Eine (präparierte oder fremde) `.training.json` mit `revision` nahe 1e9 ist gültig. Nach dem Import erhöht sich die Revision nicht mehr, und neue Trainings gelten sofort als gesichert. Es bleibt nur die 7-Tage-Erinnerung. Auch beim Zusammenführen entscheidet dann nur noch der Gleichstand (lokal gewinnt).
- **Auswirkung:** Die Warnung vor ungesicherten Daten fällt still aus, damit droht Datenverlust bei gelöschtem Browserspeicher. Praktisch nur mit präparierter Datei erreichbar.
- **Empfehlung:** `maxRevision` beim Import deutlich niedriger als die interne Grenze ansetzen (z. B. Import ≤ 1e8, intern bis `Number.MAX_SAFE_INTEGER`). Oder die Backup-Erkennung zusätzlich an `updatedAt`/`endedAt` > `lastExport.at` koppeln.
- **Sicherheit der Einschätzung:** Hoch (Logik nachgerechnet). Mittel bei der praktischen Relevanz.

#### N5: Widerspruch zwischen `CLAUDE.md` und `legal.js` zu persönlichen Angaben

- **Fundstelle:** `CLAUDE.md` (Abschnitt „Persönliche Daten“: `[NAME]` und `[WOHNORT]` seien Platzhalter und würden nicht ersetzt) gegenüber `training/src/legal.js:4-5`. Dort stehen seit Commit `460c2f3` ein Klarname und ein Wohnort. Werte bewusst nicht zitiert.
- **Beschreibung:** Laut Spezifikation §6 hat der Betreiber die Angaben selbst eingetragen (Offenlegung nach § 25 MedienG). Das ist also gewollt, und sie stehen nur an dieser einen Stelle (per Volltextsuche über Repo und Historie geprüft). Die Arbeitsregel in `CLAUDE.md` beschreibt aber einen anderen Stand. Ein Agent, der sich an `CLAUDE.md` hält, könnte die Werte „zurücksetzen“ oder für einen Datenschutzverstoß halten. Umgekehrt ist nicht dokumentiert, dass diese Angaben dauerhaft in der öffentlichen Git-Historie stehen und nicht mehr entfernbar sind (Forks, Caches).
- **Auswirkung:** Prozess und Transparenz, keine technische Schwachstelle.
- **Empfehlung:** `CLAUDE.md` angleichen („Name und Wohnort stehen absichtlich nur in `legal.js`, nicht ändern, nicht kopieren“).
- **Sicherheit der Einschätzung:** Hoch.

#### N6: Repo-Einstellungen könnten die Arbeitsregeln technisch absichern

- **Fundstelle:** GitHub-Einstellungen (per `gh api` gelesen): Ruleset „Schutz main und develop“ enthält nur `deletion` und `non_fast_forward`. Actions: `allowed_actions: all`, `sha_pinning_required: false`.
- **Beschreibung:** Direkte Commits auf `main`/`develop` sind technisch möglich (laut `CLAUDE.md` verboten). Jeder direkte Push auf `main` deployt sofort, mit `node --test` als einziger Hürde. Beliebige Actions sind erlaubt. Das SHA-Pinning stellt nur der Test `tests/workflow.test.js` sicher, nicht GitHub.
- **Auswirkung:** Gering. Bei einem kompromittierten Token oder einem Versehen gibt es weniger Schutz vor einem ungeprüften Deploy.
- **Empfehlung:** Im Ruleset „Require a pull request before merging“ und als Status-Check den Test-Job ergänzen. Unter Actions → General „Allow actions created by GitHub“ (bzw. selected) und „Require actions to be pinned to a full-length commit SHA“ aktivieren.
- **Sicherheit der Einschätzung:** Hoch (Einstellungen gelesen). Der Nutzen hängt vom Arbeitsablauf ab.

## Hinweise ohne Finding (geprüft, in Ordnung mit Restrisiko)

- **Frame-Sperre:** Sie läuft als erste Anweisung von `app.js`, aber erst nach dem Auswerten der statischen Imports (ES-Module). Keiner der Imports hat Seiteneffekte mit UI, daher geprüft unkritisch.
- **Service-Worker-Fallback** `fetch(req)` (`sw.js:108-110`): Schlägt die Prüfung fehl, wird ungeprüft aus dem Netz geliefert, aber nicht gecacht. Das ist bewusst so, damit kein hängender Stand entsteht. Restrisiko: Fehlen einzelne Cache-Einträge, kann ein Versionsmix entstehen. Kein Sicherheitsproblem.
- **Prompt-Injection über einen fremden Plan im KI-Prompt:** Der Plan wird als Codeblock mit dem Hinweis „nur Daten“ eingefügt (`agent-prompt.js:131-138`). Ein Restrisiko bleibt naturgemäß beim KI-Dienst.
- **GitHub Pages** sendet `access-control-allow-origin: *` und `cache-control: max-age=600`. Unkritisch, die App-Dateien sind öffentlich und enthalten keine Nutzerdaten. Der SW lädt mit `cache: 'reload'`.
- **Wiki** ist aktiviert. Laut GitHub Docs dürfen standardmäßig nur Collaborators ein öffentliches Wiki bearbeiten (https://docs.github.com/en/communities/documenting-your-project-with-wikis/changing-access-permissions-for-wikis). Kein Handlungsbedarf, gegebenenfalls deaktivieren, wenn es nicht genutzt wird.

## Reproduktion

Skripte lagen außerhalb des Repos unter `/private/tmp/claude-502/security-r2/scripts/` (`sec.mjs`: Netzwerk, XSS, Import-Härtung, Quota, manipulierter Live-Stand, gelöschte Daten, Cache-Poisoning; `sec2.mjs`: Framing, Offline, SW-Update, Trusted Types; `csp.mjs`: CSP-Wirksamkeit; `frame.mjs`: Sandbox-Framing und gleiche Origin). Aufruf: `PLAYWRIGHT_BROWSERS_PATH=<dir>/browsers BROWSER=chromium|webkit node scripts/sec.mjs`. Dafür muss die App auf `http://127.0.0.1:8841/training/` laufen. Unit-Tests: `npm test` → 93/93 bestanden.
