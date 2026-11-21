# Security-Review (Reviewer 1: IT-Security), Runde 3

Geprüfter Stand: Branch `develop`, Commit `62ce59a`. Geprüft wurde das ganze Projekt, nicht nur die letzten Änderungen. Ich habe nur gelesen. Im Repo ist nur diese Datei neu. Die Browser-Tests liefen mit Playwright 1.65.1 (Chromium und WebKit), installiert außerhalb des Repos, gegen `python3 -m http.server` auf 127.0.0.1:8771 (App) und 127.0.0.1:8772 (Kopie der App mit Testseiten, fremde Origin für Framing). Beide Server sind beendet. Skripte und präparierte Dateien lagen im Scratchpad außerhalb des Repos.

## Geprüfte Punkte

| Bereich | Wie geprüft | Ergebnis |
|---|---|---|
| Netzwerk | Playwright, alle Requests des Browser-Kontexts mitgeschnitten (einschließlich Service Worker). Ablauf: Erstladen, Neuladen unter SW-Kontrolle, Plan öffnen, Training mit 3 Sätzen, Beenden, Garmin-Export, Info-Seite, Offline-Neuladen, in Chromium und WebKit. Code durchsucht nach `fetch`, `import()`, `XMLHttpRequest`, URLs in JS, CSS (`url(`, `@import`, `@font-face`), HTML und Manifest. | 0 externe Requests (Chromium 211, WebKit 181 Requests, alle auf 127.0.0.1:8771). Keine CDN-Skripte, Fonts oder Tracker. Der einzige externe Link (GitHub-Datenschutzerklärung, `training/src/views/info.js:27`) öffnet sich nur auf Tippen, mit `rel="noopener noreferrer"`. Ein von mir eingeschleustes `<img>` auf eine fremde Adresse blockiert die CSP (`img-src 'self'`). |
| XSS | Code: `dom.js` (`h`, `setProps`, `svgEl`), alle Views, `app.js`. Suche nach `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `eval`, `new Function`, `document.write`, `setTimeout(string)`, `href`/`src`, `style` mit Daten. Browser (Chromium): `.training.json` mit Payloads (`<img onerror>`, `<script>`, drei Backticks, Anführungszeichen, `=HYPERLINK(...)`, U+202E) in Planname, Einheitsname, `suggestedDay`, Warm-up, Übungsname, Cue, Variantenname und -cue, RIR-Text und allen Notizen. Danach Vorschau, Heute, Verlauf (Liste, Detail, Graph), Plan (alle Einheiten aufgeklappt), Live-Training Liste, Optionen-Sheet, Fokus und KI-Prompt angezeigt. | Kein Payload ausgeführt (`window.__xss` blieb leer), keine `<img>`/`<script>` im DOM, keine Dialoge. Die Payloads erscheinen nur als Text. Alle Texte gehen über Textknoten, `value` über die Property, `style` nur mit einer berechneten Prozentzahl (`views/live.js:34`), SVG-Attribute nur mit Zahlen. Keine verbotenen Sinks im App-Code. |
| CSP / Trusted Types | CSP-Meta in `training/index.html:6` und `index.html:6` gelesen. Eine Testseite mit genau dieser CSP in einer Kopie außerhalb des Repos, in Chromium und WebKit: `eval`, `new Function`, `innerHTML`, `insertAdjacentHTML`, Inline-`<script>`, `setTimeout(string)`. In der App selbst: `innerHTML`-Zuweisung. | Alles blockiert (EvalError bzw. TypeError), in beiden Engines. Trusted Types werden in Chromium und Playwright-WebKit durchgesetzt. Die einzige Policy `sw` lässt nur `./sw.js` zu (`app.js:1213-1218`), eine zweite Policy gleichen Namens ist nicht erlaubt. Kein `unsafe-inline`, kein `unsafe-eval`. `base-uri`, `form-action`, `object-src`, `connect-src` stehen auf `'none'`. `<meta name="referrer" content="no-referrer">` ist auf beiden Seiten gesetzt. `frame-ancestors` fehlt (geht per Meta nicht), siehe Framing. |
| Import-Härtung | `validate.js` vollständig gelesen (Limits, `checkStructure`, verbotene Schlüssel, Whitelist je Objekt, Zahlbereiche, Datumsprüfung). In Node und über die echte Dateiauswahl im Browser: kaputtes JSON, 200 000 Ebenen Verschachtelung, 6 MB, `__proto__`, `constructor`, absurde Zahlen (`weeks: 1e300`, `sets: 1e9`, `restSec: -5`), 300 Schlüssel, Mehrfachauswahl gültig + ungültig. IndexedDB nach jedem Versuch gelesen, `({}).polluted` geprüft. | Jeder Fall bricht mit Pfad und Klartext ab („Es wurde nichts geändert“). IndexedDB blieb leer (`files: []`, `kv: []`), auch bei der Mehrfachauswahl. Keine Prototype Pollution. Übernommen wird in einer Transaktion (`storage.js:120-126`), vorher läuft eine Wiedereinlese-Prüfung (`app.js:456`). Der gespeicherte Stand und das laufende Training werden beim Start erneut validiert (`app.js:1152-1175`, `model/live.js:30-50`). Lücke bei Zeitstempeln siehe N5. |
| Service Worker | `sw.js` und `scripts/update-sw.mjs` gelesen. `npm test` (prüft, dass `sw.js` aktuell ist). Browser: Scope, Cache-Namen, Offline-Neuladen, Cache-Poisoning (`legal.js` und `index.html` im Cache durch präparierte Antworten ersetzt, dann echtes Neuladen mit `#info`, online und offline), fremder Cache `evil-cache`. `serve()` zusätzlich direkt im SW-Kontext aufgerufen. | Scope `/training/`. Nur ein Cache `training-pwa-<version>`, nur eigene Origin, nur GET. Offline-Start klappt in beiden Engines. Die präparierten Inhalte wurden in keinem Fall ausgeliefert (Info-Seite zeigte die echten Angaben). `serve()` erkennt den falschen Hash, löscht den Eintrag und lädt geprüft nach. Fremde Caches werden ignoriert. Update: neuer SW wartet, „Aktualisieren“ sendet `SKIP_WAITING`, nicht während eines Trainings (`app.js:1221-1228`). Restrisiko Fallback `fetch(req)` (`sw.js:112-113`) wie in Runde 2 beschrieben, kein Sicherheitsproblem. |
| Speicher | `storage.js` gelesen. Browser: Inhalt von IndexedDB nach mehreren Importen, `localStorage`/`sessionStorage`/Cookies (Code-Suche). Quota-Fehler simuliert (`IDBObjectStore.put` wirft `QuotaExceededError`) während eines Trainings, beim Beenden und beim Export. Zwei Tabs mit derselben App. | Kein `localStorage`, kein `sessionStorage`, keine Cookies im Code. IndexedDB `training-pwa`: `files` und `kv` (`activeFileId`, `live`, `lastExport:<id>`). Quota-Fehler: verständlicher Toast, der Abschlussbildschirm warnt per `role=alert` und bietet den Export an. Probleme: Datenverlust bei zwei offenen Instanzen (M1), verwaiste Trainingsstände (N1), falsche Meldung nach erfolgreichem Export (N3). |
| Export / FIT / CSV | `export.js`, `csv.js`, `training-file.js`, `garmin/fit.js`, `garmin/session-fit.js` gelesen. Dateinamen aus dem präparierten Plannamen erzeugt (Download im Browser). CSV in Node mit Formel-Payloads, auch mit Komma im Feld. FIT in Node mit Zeitstempeln im Jahr 9998 und 1980. | Dateinamen nur `[a-z0-9-]`, gekürzt auf 60 Zeichen, kein Pfad-Traversal (`img-src-x-onerror-…training.json`). FIT-Dateiname nur aus dem validierten Datum. Keine Freitexte im FIT. `writeValue` prüft jeden Wert und wirft statt überzulaufen. Maximalwerte aus dem Validator passen in die FIT-Typen (Wdh. ≤ 1000 in `uint16`, kg × 16 ≤ 16 000, Summe Wdh. in `uint32`). CSV maskiert führende Formelzeichen und `; " \n`, aber nicht für Programme mit Komma als Trennzeichen (N2). FIT bei Zeitstempeln außerhalb des Bereichs siehe N5. |
| KI-Prompt | `agent-prompt.js` gelesen. Prompt mit präpariertem Plan im Browser erzeugt. | Plan und Ergebnisse stehen als „nur Daten“ in Codeblöcken. Backticks werden als ``` geschrieben, im Prompt gab es genau die erwarteten Fences, der Datenblock lässt sich nicht beenden. Notizen gehen nicht in den Prompt. Restrisiko Prompt-Injection beim KI-Dienst bleibt naturgemäß. |
| Lieferkette | `package.json`, `git ls-files`, Imports. `npm audit`. Gepinnte Action-SHAs per `gh api` mit den Tags verglichen, auch die transitive Action in `upload-pages-artifact`. Icons auf Metadaten-Chunks. | Keine Laufzeit- und keine Dev-Abhängigkeiten, kein Lockfile nötig. `npm audit` meldet `ENOLOCK`, ist ohne Abhängigkeiten nicht anwendbar. `actions/checkout@3d3c42e…` = v7.0.1, `upload-pages-artifact@fc324d3…` = v5.0.0, `deploy-pages@368f825…` = v5.0.1, jeweils exakt der Tag-Commit und das aktuelle Release. Transitiv `actions/upload-artifact@bbbca2d…` per SHA gepinnt. Icons nur mit IHDR/IDAT/IEND. Lizenz MIT, keine gebündelten Fremdbibliotheken (`OPEN_SOURCE = []`). |
| Repo und Deployment | `git log --all` (40 Commits): Identitäten, Nachrichten, Diffs auf Secret-Muster (`ghp_`, `github_pat_`, `AKIA`, `sk-`, Private Keys, token/secret/password/api_key) und Mailadressen. Volltextsuche nach Name und Wohnort aus `legal.js` über HEAD und Historie. Workflow gelesen. `gh api`: Pages, Environment, Branch-Policy, Ruleset, Actions-Rechte, Secret Scanning, Pages-Repos des Accounts. Live-Site: Header und ob Repo-Dateien ausgeliefert werden. | Keine Secrets. Commits nur mit `noreply`-Identitäten. Name und Wohnort stehen nur in `training/src/legal.js` (gewollt). Die Kontaktadresse steht zusätzlich in der Doku und in der Historie, siehe N6. Workflow: global `contents: read`, `pages: write`/`id-token: write` nur im Deploy-Job, `persist-credentials: false`, liefert nur `index.html`, `root.css`, `training/` aus. Live geprüft: `docs/`, `reviews/`, `tests/`, `README.md`, `CLAUDE.md` liefern 404. Pages `build_type: workflow`, HTTPS erzwungen. Environment `github-pages` nur für `main`. `sha_pinning_required: true`, Standardrechte read, Secret Scanning und Push Protection aktiv. Nur dieses Repo hat Pages. Offene Härtung siehe N7. |
| Clickjacking / Framing | Fremde Origin (127.0.0.1:8772) bettet `/training/` per iframe ein: ohne Sandbox, `sandbox="allow-forms"`, `sandbox="allow-scripts allow-forms"`, in Chromium und WebKit. Live-Header von `https://xandl-droste.github.io/training/`. | GitHub Pages sendet weder `X-Frame-Options` noch `frame-ancestors`, Meta-CSP kann `frame-ancestors` nicht. Die JS-Sperre (`app.js:4-7`) leert die Seite ohne Sandbox komplett. Mit Sandbox ohne Skripte erscheint nur der `<noscript>`-Text, mit Sandbox ohne `allow-same-origin` gibt es weder Bedienelemente noch Zugriff auf die echten Daten. Keine Buttons in irgendeinem eingebetteten Fall. Das ist im Rahmen von Meta/JS die passende Gegenmaßnahme. Die Startseite `index.html` hat keine Sperre, enthält aber nur zwei Links. |
| Unit-Tests | `npm test` | 136/136 bestanden, offline. |

## Nicht geprüft (mit Grund)

- **Echtes iPhone / iOS Safari:** Kein Gerät verfügbar. Playwright-WebKit ist nicht identisch mit iOS Safari, besonders bei Trusted Types (Unterstützung je nach iOS-Version), Service Worker, Share Sheet, Storage-Eviction, Quota und der Frage, ob Safari-Tab und Home-Bildschirm-App denselben Speicher teilen (wichtig für M1).
- **Echter voller Speicher:** Nur simuliert, nicht durch tatsächliches Auffüllen.
- **Web Share API mit Datei:** In Chromium/WebKit-Headless fehlt `canShare` mit Dateien, es lief der Download-Fallback. Das Teilen-Menü braucht ein Gerät.
- **Ausgelieferter Stand auf GitHub Pages:** `main` steht auf `28d0dfc`, `develop` ist zwei Commits weiter. Live geprüft habe ich nur Header und welche Pfade ausgeliefert werden, nicht das Verhalten der ausgelieferten App.
- **Laufender Workflow:** Nicht ausgelöst. Die letzten drei Läufe auf `main` waren laut API erfolgreich.
- **Reparatur des Caches beim echten Neuladen:** Beim Neuladen nach dem Poisoning stand der präparierte Eintrag danach noch im Cache, obwohl der richtige Inhalt ausgeliefert wurde. Direkt aufgerufen repariert `serve()` den Eintrag. Ob Chromium/WebKit die Module beim Neuladen aus dem Speicher-Cache holten, habe ich nicht weiter isoliert. Sicherheitsrelevant ist nur, dass der präparierte Inhalt nie ausgeliefert wurde, und das ist geprüft.

## Findings

### Kritisch

Keine.

### Hoch

Keine.

### Mittel

#### M1: Zweite offene Instanz der App überschreibt beendete Trainings ohne Warnung

- **Fundstelle:** `training/src/app.js:181-185` (`setFile` speichert den ganzen Stand aus dem Arbeitsspeicher), `:262-270` (`updateSettings`), `training/src/storage.js:65-70` (`put` ersetzt die Datei vollständig). Es gibt keinen Abgleich zwischen Instanzen (kein `BroadcastChannel`, keine Web Locks, keine Revisionsprüfung vor dem Schreiben).
- **Nachstellen (Chromium, reproduziert):** Plan öffnen. Zweiten Tab mit derselben App öffnen. Im ersten Tab ein Training mit 3 Sätzen beenden: IndexedDB enthält `revision 1, sessions=1`. Im zweiten Tab nur den Stil auf „Hell“ stellen: IndexedDB enthält wieder `revision 0, sessions=0`. Nach dem Neuladen des ersten Tabs zeigt der Verlauf „Noch keine Trainings“.
- **Beschreibung:** Jede Instanz hält den ganzen Trainingsstand im Speicher und schreibt ihn bei jeder Änderung komplett zurück. Eine ältere Instanz überschreibt so alles, was eine andere Instanz inzwischen gespeichert hat. Auslöser sind harmlose Aktionen wie Stil, Ansicht, Ton, Woche setzen oder eine Notiz im Verlauf. Gleiches gilt für den Live-Stand (`kv/live`). Weil die Revision der älteren Instanz kleiner ist, bemerkt auch die Backup-Anzeige nichts.
- **Auswirkung:** Integrität und Verfügbarkeit der Trainingsdaten. Ein beendetes, noch nicht exportiertes Training geht still verloren. Das passiert z. B. mit zwei Browser-Tabs, auf Desktop oder iPad oder wenn die App in Safari und als Home-Bildschirm-App offen ist (ob diese auf iOS denselben Speicher teilen, konnte ich nicht prüfen). Keine Codeausführung, kein Angreifer nötig.
- **Empfehlung:** Vor jedem Schreiben in derselben Transaktion die gespeicherte `revision`/`updatedAt` lesen. Ist sie neuer als der eigene Stand, nicht schreiben, sondern neu laden bzw. einen Hinweis „In einem anderen Fenster geändert“ zeigen. Zusätzlich per `BroadcastChannel('training-pwa')` andere Instanzen nach jedem Speichern benachrichtigen, damit sie neu laden. Einstellungen (Stil, Ansicht, Ton) getrennt von der Datei speichern oder als Patch auf den gespeicherten Stand anwenden.
- **Sicherheit der Einschätzung:** Hoch für den Mechanismus (reproduziert). Mittel für die Häufigkeit auf dem Referenzgerät.

### Niedrig

#### N1: Frühere Trainingsstände bleiben unsichtbar in IndexedDB und lassen sich in der App weder öffnen noch löschen

- **Fundstelle:** `training/src/storage.js:65-70, 120-126` (nur `put`, kein Löschen in `files`), `training/src/app.js:416, 422` (Texte „Der aktuelle bleibt im Browser gespeichert“).
- **Nachstellen (Chromium, reproduziert):** Trainingsstand A importieren, dann einen anderen Trainingsstand B („Anderer Trainingsstand“), dann einen Plan mit „Ganz neu“. IndexedDB `files` enthält danach drei Stände, `kv` zwei `lastExport`-Einträge. In der App ist nur der letzte erreichbar.
- **Beschreibung:** Die Vorschau sagt offen, dass der bisherige Stand im Browser bleibt. Es gibt aber keinen Weg in der App, ihn wieder zu öffnen oder zu löschen. Die Stände sammeln sich an (je bis zu 5 MB nach Limit) und verbrauchen Quota. Wer „Ganz neu“ wählt, um mit leerer Historie zu beginnen, behält die alte Historie unbemerkt auf dem Gerät.
- **Auswirkung:** Datensparsamkeit und Speicherverbrauch. Die alten Daten bleiben für jede Seite derselben Origin lesbar (siehe N4). Mehr Quota-Verbrauch macht Quota-Fehler wahrscheinlicher.
- **Empfehlung:** Entweder beim Wechsel den alten Stand nach Bestätigung löschen (nachdem er exportiert wurde) oder im Plan-Tab eine Liste „Gespeicherte Trainingsstände“ mit Öffnen und Löschen anbieten. Dabei die zugehörigen `lastExport:<id>` mitlöschen.
- **Sicherheit der Einschätzung:** Hoch (reproduziert, Code gelesen).

#### N2: CSV-Formel-Injektion in Programmen mit Komma als Trennzeichen

- **Fundstelle:** `training/src/model/csv.js:11-12`.
- **Nachstellen (Node, reproduziert):** Plan mit dem Übungsnamen `Squat,=1+1,@SUM(1),x` und eine Notiz `ok, -2+3`. Die CSV-Zeile enthält beide Felder ungequotet: `…;Squat,=1+1,@SUM(1),x;…;ok, -2+3`.
- **Beschreibung:** `csvField` setzt `'` nur vor ein führendes Formelzeichen des ganzen Felds und quotet nur bei `;`, `"` und Zeilenumbruch. Öffnet ein Programm die Datei mit Komma als Trennzeichen (Excel oder Numbers mit englischer Ländereinstellung, LibreOffice oder Google Sheets mit Komma), beginnt nach jedem Komma eine neue Zelle. `=1+1` und `@SUM(1)` stehen dann am Zellenanfang und werden als Formel ausgewertet. Felder mit `;` sind gequotet und dadurch auch dort geschützt.
- **Auswirkung:** Gering. Übungsnamen kommen aus importierten Plänen (z. B. von einem KI-Dienst oder einer fremden Datei), Notizen vom Nutzer selbst. Möglich sind z. B. `HYPERLINK`-Formeln, die beim Anklicken Daten an eine fremde Adresse schicken. Moderne Tabellenprogramme warnen zum Teil.
- **Empfehlung:** Jedes Textfeld immer in Anführungszeichen setzen (dann zerlegt auch ein Komma-Parser nicht), zusätzlich den `'`-Präfix für führende `= + - @ Tab CR` behalten. So empfiehlt es OWASP (https://owasp.org/www-community/attacks/CSV_Injection). Optional `sep=;` als erste Zeile für Excel.
- **Sicherheit der Einschätzung:** Hoch für die Ausgabe. Mittel für die praktische Ausnutzbarkeit, weil sie vom Programm und dessen Ländereinstellung abhängt.

#### N3: Nach einem erfolgreichen Export meldet die App „Export fehlgeschlagen“, wenn der Speicher voll ist

- **Fundstelle:** `training/src/app.js:970-985` (`store.setLastExport` in Zeile 977 im selben `try` wie der Export).
- **Nachstellen (Chromium, reproduziert):** Training starten, `IDBObjectStore.prototype.put` wirft `QuotaExceededError`, Training beenden, „Als Datei sichern“. Die Datei wird heruntergeladen, der Toast sagt aber „Export fehlgeschlagen. Bitte erneut versuchen.“, und der Bildschirm zeigt nicht „Gesichert“.
- **Beschreibung:** Gerade in der Situation, für die der Abschlussbildschirm ausdrücklich zum Export rät, bekommt der Nutzer eine falsche Fehlermeldung. Er exportiert dann mehrfach (beim Download entstehen Kopien wie „… (1)“) oder glaubt, er habe keine Sicherung.
- **Auswirkung:** Gering. Kein Datenverlust, aber eine irreführende Meldung bei der Datensicherung.
- **Empfehlung:** Den Export-Erfolg unabhängig vom Merken des Exportstands melden: `setLastExport` in einem eigenen `try` ausführen, `S.lastExport` trotzdem im Speicher setzen und bei einem Fehler „Gesichert. Der Sicherungsstand konnte im Browser nicht gemerkt werden“ zeigen.
- **Sicherheit der Einschätzung:** Hoch.

#### N4: Restrisiko gemeinsame Origin `xandl-droste.github.io` (unverändert)

- **Fundstelle:** Architektur. `training/src/storage.js` (IndexedDB `training-pwa`), `training/sw.js:5-6`, `CLAUDE.md` (Abschnitt „GitHub Pages“).
- **Beschreibung:** Alle Pages-Projekte des Accounts teilen sich die Origin. IndexedDB und Cache Storage lassen sich nicht nach Pfad trennen. Eine andere Seite derselben Origin könnte Trainingsdaten (auch die verwaisten aus N1) lesen, ändern oder löschen. Seit Runde 2 ist das besser abgefangen: `CLAUDE.md` verbietet weitere Pages-Projekte mit JavaScript, der gespeicherte Stand und das laufende Training werden beim Start validiert, und der SW liefert nur Inhalte mit passendem SHA-256 aus (geprüft). Laut GitHub-API hat derzeit nur dieses Repo Pages. Auch `script-src 'self'` erlaubt Skripte der ganzen Origin, nicht nur aus `/training/`. Das wird aber nur relevant, wenn es zusätzlich eine Injektionsstelle gäbe.
- **Auswirkung:** Latent. Vertraulichkeit und Integrität der lokalen Daten, sobald ein weiteres Pages-Projekt mit Skripten unter dem Account erscheint.
- **Empfehlung:** Die Regel beibehalten. Langfristig eine eigene (Sub-)Domain als eigene Origin, falls weitere Projekte geplant sind.
- **Sicherheit der Einschätzung:** Hoch (Same-Origin-Policy). Quelle: GitHub Docs, „About GitHub Pages“, https://docs.github.com/en/pages/getting-started-with-github-pages/about-github-pages

#### N5: Zeitstempel ohne Bereichsgrenze, Garmin-Export meldet dann einen falschen Grund

- **Fundstelle:** `training/src/model/validate.js:412-419` (`isoField` prüft nur Format und `Date.parse`), `:439-441`; `training/src/garmin/fit.js:43`; Meldung in `training/src/app.js:1001-1003`.
- **Nachstellen (Node, reproduziert):** Gültige `.training.json` mit `date: "2026-11-01"`, aber `startedAt`/`endedAt`/`doneAt` im Jahr 9998 (oder 1980). Der Import wird angenommen. `sessionToFit` wirft `RangeError: fitTime: außerhalb des FIT-Bereichs`, die App zeigt daraufhin „Die Sätze dieses Trainings liegen zu weit auseinander (über 49 Tage)“.
- **Beschreibung:** `date` ist auf 2000–2100 begrenzt, die ISO-Zeitstempel nicht. Sie müssen auch nicht zu `date` passen. Jeder `RangeError` im Garmin-Export wird pauschal als „über 49 Tage“ gemeldet.
- **Auswirkung:** Gering. Kein Überlauf, der Encoder wirft korrekt. Nur eine irreführende Meldung und Werte wie „vor −N Tagen“ bei präparierten Dateien.
- **Empfehlung:** In `isoField` den Bereich wie bei `date` begrenzen (2000–2100) und die Meldung im Garmin-Export am Fehlertext unterscheiden (Zeitraum außerhalb des FIT-Bereichs bzw. über 49 Tage).
- **Sicherheit der Einschätzung:** Hoch.

#### N6: Kontaktadresse des Betreibers steht außer in `legal.js` auch in der Doku und in der Git-Historie

- **Fundstelle:** `docs/spezifikation.md:243` (Kontaktadresse als Wert von `KONTAKT_MAIL`). In der Historie außerdem in `tests/e2e/info.e2e.mjs` (hinzugefügt in `1aa0014`, entfernt in `a5c881c`). Wert bewusst nicht zitiert.
- **Beschreibung:** `CLAUDE.md` legt fest, dass die Betreiberangaben (Name, Wohnort, Kontakt) ausschließlich in `training/src/legal.js` stehen und nicht in Tests oder Doku kopiert werden. Name und Wohnort halten das ein (per Volltextsuche über HEAD und Historie geprüft). Die Kontaktadresse steht noch in der Spezifikation, also im öffentlichen Repo (nicht auf der Website, `docs/` wird nicht ausgeliefert, live geprüft: 404).
- **Auswirkung:** Gering. Die Adresse ist über die Info-Seite ohnehin öffentlich. Es geht um die Einhaltung der eigenen Regel und darum, dass Agenten die Spezifikation als Vorlage nutzen und die Adresse weiterkopieren.
- **Empfehlung:** In `docs/spezifikation.md` durch einen Platzhalter (`[KONTAKT_MAIL]`) ersetzen, mit dem Hinweis, dass der Wert nur in `legal.js` steht. Die Historie lässt sich nur durch Umschreiben bereinigen, was bei einer ohnehin öffentlichen Adresse nicht nötig ist.
- **Sicherheit der Einschätzung:** Hoch.

#### N7: Repo-Einstellungen sichern die Arbeitsregeln nur teilweise ab

- **Fundstelle:** GitHub-Einstellungen (per `gh api` gelesen): Actions `allowed_actions: all`. Ruleset „Schutz main und develop“ nur mit `deletion` und `non_fast_forward`. Environment `github-pages` mit `can_admins_bypass: true`. Dependabot aus.
- **Beschreibung:** Seit Runde 2 ist `sha_pinning_required` aktiv, das ist umgesetzt. Weiterhin sind beliebige Actions erlaubt, und direkte Pushes auf `main` und `develop` sind technisch möglich (laut `CLAUDE.md` verboten). Jeder Push auf `main` deployt, einzige Hürde ist `node --test`. Ohne Dependabot für GitHub Actions fallen neue Releases der gepinnten Actions nur manuell auf (heute sind alle drei aktuell).
- **Auswirkung:** Gering. Weniger Schutz gegen einen versehentlichen oder mit gestohlenem Token ausgelösten Deploy.
- **Empfehlung:** Unter Actions → General „Allow actions created by GitHub“ wählen (die drei genutzten Actions sind von GitHub). Im Ruleset für `main` „Require a pull request before merging“ ergänzen (Merge-Commit von `develop` per PR bleibt möglich). Optional Dependabot nur für `github-actions` (`.github/dependabot.yml`), damit SHA-Updates als PR kommen.
- **Sicherheit der Einschätzung:** Hoch (Einstellungen gelesen). Der Nutzen hängt vom Arbeitsablauf ab.

## Hinweise ohne Finding (geprüft, in Ordnung mit Restrisiko)

- **Frame-Sperre und ES-Module:** Die Sperre läuft nach dem Auswerten der statischen Imports. Keiner davon hat Seiteneffekte mit UI. In allen eingebetteten Fällen gab es keine Bedienelemente.
- **SW-Nachricht `SKIP_WAITING`:** Jede Seite derselben Origin kann sie senden. Folge wäre nur ein vorgezogenes Update auf einen geprüften Stand.
- **Revision an der Obergrenze:** Der Fall aus Runde 2 (N4) ist behoben. `backup.js:16-17` vergleicht bei gleicher Revision zusätzlich `updatedAt`, ein Test deckt das ab.
- **Live-Stand aus IndexedDB:** Der Fall aus Runde 2 (M1) ist behoben. `restoreLive` validiert die Session, rechnet die Anzeige-Daten aus dem Plan neu und prüft `rest` und `deferred`. Ein kaputter Stand wird verworfen, `render()` hat eine Notfallansicht (`app.js:1020-1027`).
- **GitHub Pages** sendet `access-control-allow-origin: *` und `cache-control: max-age=600`. Unkritisch, die App-Dateien sind öffentlich und enthalten keine Nutzerdaten. Der SW lädt mit `cache: 'reload'`.

## Reproduktion

Skripte und präparierte Dateien lagen im Scratchpad außerhalb des Repos (`sec/mkfx.mjs` erzeugt die Dateien; `t1.mjs` Import-Härtung, XSS, CSV/JSON-Dateinamen, verwaiste Stände; `t2.mjs` CSP-Wirksamkeit und Framing; `t3.mjs`/`t4.mjs`/`t5.mjs` Netzwerk, Offline und Cache-Poisoning; `t6.mjs` zwei Tabs; `t7.mjs` Quota; `csv.mjs`, `fit.mjs`, `val.mjs` in Node). Aufruf: App mit `python3 -m http.server 8771 --bind 127.0.0.1` im Repo-Root starten, dann `BROWSER=chromium|webkit node t<n>.mjs`. Unit-Tests: `npm test` → 136/136 bestanden.
