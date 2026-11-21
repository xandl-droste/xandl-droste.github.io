# Security-Review (Reviewer 1: IT-Security), Runde 1

Stand: `develop` @ `09a1a72`, geprüft am 2026-11-15. Ich habe nur gelesen. Außer dieser Datei wurde im Repo nichts geändert. Werkzeuge (Playwright 1.x, Chromium Headless Shell) lagen außerhalb des Repos unter `/private/tmp/claude-502/security-review/`. Die lokalen Server (Port 8766 für die App, 8767 als fremde Origin) sind beendet.

## Geprüfte Punkte

| Bereich | Wie geprüft | Ergebnis |
|---|---|---|
| Netzwerk | Playwright (Chromium): Import, alle Bildschirme, Live-Training, Fokus-Modus, Abschluss, JSON-, CSV- und FIT-Export, Info. Jeder Request im Browser-Kontext wurde protokolliert. Dazu `npm run e2e` (4 Suites) gegen den lokalen Server. Grep nach `fetch`/XHR/WebSocket/`sendBeacon`/`http(s)://` in `training/`. | 60 Requests, 0 extern. Kein CDN, keine Fonts, kein Tracker. Einziges `fetch` ist `./plans/seed.plan.json` (gleiche Origin). Keine Cookies (`document.cookie` und `context.cookies()` leer). |
| XSS | Präparierte `.training.json` mit HTML/JS-Payloads (`<img onerror>`, `"><svg onload>`, `</textarea><script>`, `javascript:`, `<iframe srcdoc>`, `<a href=javascript:>`) in Planname, Einheitsnamen, `suggestedDay`, Warm-up, Übungsnamen, Cues, Varianten, `byWeek.cue`, `rirTargets` und Notizen. Danach alle Bildschirme und Sheets geöffnet. Zweimal ausgeführt: einmal normal und einmal mit `bypassCSP: true`, damit die Abwehr auch ohne CSP belegt ist. Dazu Code-Review aller Render-Stellen (`dom.js`, `views/*`, `app.js`). | Keine Ausführung (`window.__xss` blieb leer), keine eingeschleusten Elemente. Die Payloads erscheinen als Text. In `training/` gibt es kein `innerHTML`, `insertAdjacentHTML`, `eval`, `new Function` oder `document.write`. `h()` setzt Text nur als Textknoten. Event-Handler werden nur bei Funktionswerten gesetzt. Attribute mit Nutzerdaten gibt es nur bei `data-fid` (validierte IDs) und `aria-label` (Text). |
| Import-Härtung | Node-Fuzzing direkt gegen `validate.js` (28 Fälle) und Browser-Tests (Mehrfachauswahl gültig+kaputt, `__proto__`, > 5 MB, Abbruch der Vorschau). | Kaputtes JSON, leere Datei, Array/null als Wurzel, `__proto__`/`constructor`/`prototype` auf jeder Ebene, 100 000 Ebenen tiefe Verschachtelung, 6 MB, negative, zu große und `1e400`-Zahlen, Gleitkomma statt Ganzzahl, Zahl als String, Pfad-artige IDs, unbekannte Felder und eine neuere `schemaVersion` werden abgelehnt, mit Pfad. `Object.prototype` bleibt unverändert. Bei gültiger und kaputter Datei zusammen bleibt IndexedDB leer. Abbruch der Vorschau ändert nichts. Der Validator gibt nur bereinigte Kopien mit bekannten Feldern zurück. Siehe aber N2 und N3. |
| CSP / Referrer | `training/index.html:6-7`, `index.html:6-7`, Konsole/`securitypolicyviolation` während der Tests | Meta-CSP ohne `unsafe-inline`/`unsafe-eval`, `default-src 'none'`, `base-uri`/`form-action`/`object-src` gesperrt. Es gab keine CSP-Verletzungen (die Inline-Breite der Fortschrittsleiste läuft über CSSOM, das ist erlaubt). `referrer=no-referrer` auf beiden Seiten. Härtung siehe N8. |
| Service Worker | Code-Review `sw.js`, `scripts/update-sw.mjs`, Registrierung in `app.js:750-771`. Browser: Scope, Cache-Inhalt, Offline-Reload, Laufzeit-Caching, Cache-Manipulation von einer Seite außerhalb des Scopes. | Scope `/training/`. 33 Einträge, alle gleiche Origin und im Scope. Kein Laufzeit-Caching (Cache bleibt nach zusätzlichen Fetches bei 33). Fremde Origins und Nicht-GET werden nicht angefasst. Offline-Start funktioniert. Updates warten auf „Aktualisieren“ (`SKIP_WAITING`), alte `training-pwa-*`-Caches werden beim Aktivieren gelöscht, die Version ist ein Inhalts-Hash, und ein Test prüft die Aktualität. Cache-Poisoning über die gleiche Origin ist nachgewiesen, siehe M1. |
| Speicher | IndexedDB, `localStorage`, `sessionStorage`, Cookies und Caches nach einem Training ausgelesen. Code-Review `storage.js` und Fehlerpfade in `app.js`. | Nur IndexedDB `training-pwa` (Stores `files`, `kv`: `activeFileId`, `live`, `lastExport:<id>`) und der SW-Cache. `localStorage`/`sessionStorage` sind leer. Schreibzugriffe laufen in Transaktionen (Import, Trainingsende: alles oder nichts). Quota-Fehler zeigen eine verständliche Meldung (`storage.js:110-113`). Nach Löschen der Datenbank zeigt die App das Onboarding, die Wiederherstellung per Import wird von `import.e2e` geprüft. Siehe N9. |
| Export / FIT | Code-Review `export.js`, `training-file.js:92-102`, `csv.js`, `garmin/*`. Downloads im Browser geprüft. Werte an den Grenzen getestet. | Dateinamen sind auf `[a-z0-9-]` (max. 60) bereinigt, belegt mit Payload-Planname → `img-src-x-onerror-….training.json`. FIT-Dateiname besteht nur aus dem validierten Datum. Die FIT-Datei enthält keine Freitexte. Der FIT-Encoder prüft jeden Wert auf den Bereich des Basistyps und wirft `RangeError` (z. B. Sessions 1970–9999), die App fängt das ab („Garmin-Export fehlgeschlagen“). Der CSV-Export schützt gegen Formel-Injektion nach dem OWASP-Muster (`= + - @ Tab CR`) und maskiert Trennzeichen und Anführungszeichen. Siehe N3. |
| Lieferkette | `package.json`, Repo-Inhalt, `npm test` | Keine Laufzeit- und keine Dev-Abhängigkeiten. Ohne Abhängigkeiten gibt es kein Lockfile und nichts zu prüfen. `npm audit` wurde deshalb nicht im Repo ausgeführt, in meinem Werkzeugordner meldete `npm i playwright` 0 Schwachstellen. Keine gebündelten Bibliotheken (`legal.js: OPEN_SOURCE = []`). `npm test`: 83/83 bestanden. Playwright für e2e ist nicht deklariert und nicht gepinnt (nur optional, Hinweis in N5). |
| Repo / Deployment | `git log --all` (Autor- und Committer-Identitäten, Nachrichten), Secret-Muster über alle Revisionen (`ghp_`, `github_pat_`, `AKIA…`, Private Keys, `token`/`secret`/`password`/`api_key`), alle jemals versionierten Pfade, PNG-Metadaten-Chunks, `gh api` für Pages, Branch-Schutz und Secret-Scanning | Keine Treffer für Secrets. Commits nur mit `Claude <noreply@anthropic.com>` und der GitHub-noreply-Adresse. Kein Klarname in Historie oder Nachrichten. Die einzige Mailadresse ist die vorgesehene Kontaktadresse in `legal.js` (und der e2e-Test dazu). Icons enthalten keine Text- oder EXIF-Chunks. Secret Scanning und Push Protection sind aktiv. Pages: „Deploy from a branch“ `main` `/`, HTTPS erzwungen. **Es gibt keinen GitHub-Actions-Workflow**, daher entfallen Rechte und Pinning (laut Spez nur bei Build nötig). Siehe N5 und N6. |
| Clickjacking | App in einem iframe auf fremder Origin (127.0.0.1:8767) geladen | Framing ist möglich, siehe N1. |

## Nicht geprüft (mit Grund)

- **WebKit / echtes iPhone (Safari, Home-Bildschirm):** Ich habe nur Chromium installiert und getestet. Die XSS-Abwehr beruht auf DOM-APIs und hängt nicht vom Browser ab. Speicher-Partitionierung, Löschen von Daten nach 7 Tagen (ITP) und Quota-Verhalten unter iOS sind aber ungeprüft.
- **Quota-Fehler dynamisch:** `Storage.overrideQuotaForOrigin` (CDP) hat in Headless-Chromium nicht gegriffen, es wurde weiter gespeichert. Das Verhalten ist nur per Code-Review belegt (Transaktionen, Meldung über `queueSave`, `confirmImport`, `finishLiveNow`).
- **Ausgelieferte Seite:** `https://xandl-droste.github.io/training/` liefert derzeit 404 (`main` enthält nur `README.md`). Die echten Pages-Header (Cache-Control für `sw.js`, CDN) ließen sich für die App nicht prüfen. Beobachtet habe ich nur die Header der 404-Seite (kein `X-Frame-Options`, keine `frame-ancestors`).
- **SW-Update mit echter neuer Version im Browser:** Geprüft nur per Code-Review und über das vorhandene `offline.e2e`. Kein eigener Zwei-Versionen-Test.
- **Firefox:** nicht getestet.

## Findings

Kritisch: 0 · Hoch: 0 · Mittel: 1 · Niedrig: 9

### Kritisch

Keine.

### Hoch

Keine.

### Mittel

#### M1: Gemeinsame Origin `xandl-droste.github.io`: andere Seiten derselben Origin können Trainingsdaten lesen und ändern und den App-Cache vergiften (dauerhaftes XSS)

- **Fundstelle:** Architektur/Deployment. `training/sw.js:61-73` liefert ungeprüft aus `caches` (Cache-first). `training/src/storage.js:54-63` lädt IndexedDB-Inhalte ohne erneute Validierung.
- **Nachstellen:** App unter `/training/` laden (SW aktiv). In einem zweiten Tab `http://127.0.0.1:8766/` (Root-Seite, **außerhalb** des SW-Scopes) öffnen und `caches.open('training-pwa-…')` und dann `cache.put('/training/src/legal.js', new Response(<veränderter Code>))` ausführen. Danach `/training/#info` in einem neuen Tab öffnen. Der veränderte Code läuft und der Marker „POISONED-BY-OTHER-PAGE“ wird angezeigt. Dieselbe Seite sieht auch `indexedDB.databases()` → `training-pwa` und kann sie lesen und schreiben.
- **Beschreibung:** CacheStorage und IndexedDB sind pro Origin getrennt, nicht pro Pfad. Bei GitHub Pages teilen sich die User-Site (`<owner>.github.io`) und **alle Project-Sites** des Kontos (`<owner>.github.io/<repo>`) eine Origin (Quelle: GitHub Docs, „What is GitHub Pages?“, https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages, „Default site location“). Der SW-Scope `/training/` schützt nur vor dem Abfangen von Requests, nicht vor Zugriff auf Cache und Datenbank.
- **Auswirkung:** Heute ist die Root-Seite statisch und ohne Skript. `docs/prototyp.html` hat Inline-Skript, aber keine Eingabequellen. Akut ist es daher nicht ausnutzbar. Sobald aber auf demselben Konto irgendeine Project-Site mit JavaScript veröffentlicht wird (eigener Code, eine npm-Abhängigkeit, ein CDN-Skript oder eine XSS dort), kann sie: (a) alle Trainingsdaten auslesen und wegschicken (die Meta-CSP der App gilt dort nicht), (b) gespeicherte Stände ändern oder löschen, (c) App-Dateien im Cache ersetzen. Weil der SW Cache-first ausliefert, bleibt der eingeschleuste Code bis zum nächsten Deployment aktiv, auch offline. Er läuft dann im Kontext der App und umgeht damit die Behauptungen „keine Datenübertragung“ und „keine externen Requests“.
- **Empfehlung:** (1) Auf diesem GitHub-Konto keine weiteren Pages-Projekte mit JavaScript veröffentlichen, und das in README/CLAUDE.md als Regel festhalten. Alternativ die App unter einer eigenen Origin betreiben (eigenes Konto oder eigene Organisation, oder eine Custom Domain/Subdomain nur für die App). (2) Defense in depth: Im SW beim Ausliefern die Integrität prüfen, also beim `install` SHA-256-Hashes aller Precache-Dateien aus `update-sw.mjs` mitliefern und im `fetch` bei Abweichung aus dem Netz laden bzw. Cache verwerfen. Das hilft nur gegen Cache-Manipulation, nicht gegen Zugriff auf IndexedDB. (3) Geladene Stände (`loadState`) durch denselben Validator schicken und bei Fehlern sauber melden statt abzustürzen.
- **Sicherheit der Einschätzung:** hoch für den Mechanismus (lokal nachgestellt, GitHub-Doku bestätigt die URL-Struktur). Mittel für die Eintrittswahrscheinlichkeit, denn sie hängt davon ab, was künftig auf dem Konto veröffentlicht wird.

### Niedrig

#### N1: Framing / Clickjacking nicht unterbunden

- **Fundstelle:** `training/index.html:6` (Meta-CSP ohne Framing-Schutz, der dort auch nicht wirken würde), Hosting.
- **Nachstellen:** Seite auf fremder Origin mit `<iframe src="http://127.0.0.1:8766/training/">`. Die App lädt und ist bedienbar.
- **Beschreibung:** `frame-ancestors` wird im `<meta>`-Element nicht unterstützt (MDN, https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/frame-ancestors: „This directive is not supported in the `<meta>` element.“). `X-Frame-Options` geht nur als Header. GitHub Pages erlaubt keine eigenen Response-Header (beobachtet: keine solchen Header auf der Pages-Antwort).
- **Auswirkung:** Gering. In Chromium und Safari ist Speicher in Drittanbieter-Frames partitioniert, die eingebettete App sah nur das leere Onboarding statt der echten Daten. Destruktive Aktionen brauchen zwei Taps oder einen Dateidialog. Ein Angreifer könnte aber die echte App-Oberfläche in eine Täuschungsseite einbetten, etwa um einen präparierten Plan „öffnen“ zu lassen.
- **Empfehlung:** Framing-Schutz per JS ganz am Anfang von `app.js`: `if (window.top !== window.self) { document.documentElement.replaceChildren(); throw new Error('Framing nicht erlaubt'); }`. Wichtig ist, nichts zu rendern, solange die App eingebettet ist. Optional einen Link zum direkten Öffnen anbieten. Im Bericht festhalten, dass ein echter Header-Schutz auf GitHub Pages nicht möglich ist, sondern nur mit einem anderen Hoster oder CDN davor.
- **Sicherheit:** hoch (nachgestellt).

#### N2: Quadratische Laufzeit im Validator bei `rirTargets` → UI friert ein (Self-DoS mit präparierter Datei)

- **Fundstelle:** `training/src/model/validate.js:216`. Dort wird `expectObject(..., Object.keys(raw.rirTargets))` aufgerufen, und `validate.js:114` prüft jeden Schlüssel mit `allowed.includes(k)`. Das ergibt O(n²).
- **Nachstellen:** Plan mit 150 000 Schlüsseln in `rirTargets` (1,9 MB) importieren. Der Hauptthread blockiert ca. 10 s (Browser). In Node brauchten 200 000 Schlüssel 18,8 s. Bis zur 5-MB-Grenze sind deutlich längere Blockaden zu erwarten (hochgerechnet, nicht gemessen).
- **Auswirkung:** Die App hängt, bis die Prüfung fertig ist. Danach wird korrekt abgelehnt und nichts gespeichert. Kein Datenverlust.
- **Empfehlung:** Für `rirTargets` keine Allowlist aus den eigenen Schlüsseln bauen. Stattdessen vorab die Schlüsselzahl begrenzen (z. B. `Object.keys(o).length > LIMITS.maxWeeks` → Fehler). Allgemein eine Obergrenze für Schlüssel pro Objekt in `checkStructure` setzen (z. B. 200) und `allowed` als `Set` führen.
- **Sicherheit:** hoch (gemessen).

#### N3: App kann Dateien erzeugen, die der eigene Validator ablehnt (Backup nicht wieder einlesbar)

- **Fundstelle:** `training-file.js:27` und `:66` (Revision +1 ohne Obergrenze), `progression.js:77` mit `live.js:184-191` (Steigerungsvorschlag umgeht den Clamp aus `updateSet`), `training-file.js:64` (Merge ohne Grenze für Sessions). Die Grenzen stehen in `validate.js:30-33`.
- **Nachstellen (Node, Roundtrip `serialize` → `parseImportText`):** (a) Datei mit `revision: 1e9` importieren und eine Änderung machen. Der Export hat `revision 1000000001` und wird abgelehnt. (b) Letztes Training 1000 kg mit allen Wiederholungen, Steigerung übernehmen ergibt 1002,5 kg. Der Export wird abgelehnt („kg muss zwischen 0 und 1000 sein“). (c) Zwei Stände mit gleicher `fileId` und je 5000 unterschiedlichen Sessions zusammenführen ergibt 10 000 Sessions. Der Export wird abgelehnt.
- **Auswirkung:** Die exportierte Datei, laut Spezifikation „die Wahrheit“, ließe sich nicht wieder importieren. Ein Angreifer bräuchte dafür eine präparierte Datei (Fall a, c). Fall b ist praktisch unrealistisch. Wiederherstellen ginge nur durch Handbearbeitung des JSON.
- **Empfehlung:** Invariante „jeder Export besteht `validateTrainingFile`“ erzwingen: vor `exportTrainingFile` validieren und bei Fehlern klar melden. `bumpRevision` bei `maxRevision` deckeln oder die Grenze großzügig an `Number.MAX_SAFE_INTEGER` anlehnen. `applyIncrease` auf `maxKg` begrenzen. Merge-Ergebnis gegen `maxHistory` prüfen und den Import dann mit Meldung abbrechen. Dazu einen Unit-Test für den Roundtrip an den Grenzen.
- **Sicherheit:** hoch (reproduziert).

#### N4: `currentTheme()` defekt: registriert bei jedem Aufruf einen `hashchange`-Listener und liefert `undefined`

- **Fundstelle:** `training/src/app.js:49-56`, eingeführt in `1aa0014` (Schritt 6):
  ```js
  return window.addEventListener('hashchange', () => { … openInfo(); });
  matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  ```
- **Nachstellen:** Leerer Speicher, App öffnen: `<html data-theme="undefined">`, `<meta name="theme-color" content="undefined">`, 2 `hashchange`-Listener (CDP `DOMDebugger.getEventListeners`). Nach zweimal Menü öffnen und schließen sind es 8.
- **Auswirkung:** Vor allem ein Funktionsfehler: Im Onboarding fehlt das Theme, und neue Stände bekommen über `createTrainingFile(..., { settings: { theme: undefined } })` das Feld `theme: undefined`. Sicherheitsrelevant ist nur das unbegrenzte Anwachsen der Listener (Speicher, mehrfaches `openInfo`). Das Öffnen von `#info` per Hash-Wechsel funktioniert außerdem nur, solange kein Theme gespeichert ist.
- **Empfehlung:** Den Listener einmal auf Modulebene registrieren und `currentTheme()` wieder auf `return matchMedia(…).matches ? 'light' : 'dark';` setzen. Einen Unit- oder e2e-Test auf `data-theme` im leeren Zustand ergänzen.
- **Sicherheit:** hoch (Code und Browser).

#### N5: Branch-Schutz nur als Konvention, Playwright-Version nicht festgelegt

- **Fundstelle:** GitHub-Einstellungen (`gh api …/branches/main` → `protected: false`, keine Rulesets). `CLAUDE.md` („Kein Force-Push auf `main` oder `develop`“). `package.json` (e2e lädt `playwright` ohne Version).
- **Auswirkung:** Was auf `main` landet, wird sofort ausgeliefert. Ein versehentlicher Force-Push oder ein Löschen des Branches ist technisch nicht verhindert. Bei der e2e-Prüfung kommt eine beliebige Playwright-Version zum Einsatz (keine Laufzeitwirkung auf die App).
- **Empfehlung:** Ruleset für `main` und `develop` anlegen: Force-Push und Löschen blockieren, für `main` lineare Historie nicht erzwingen (Merge-Commits sind gewollt). Optional signierte Commits. Für e2e eine getestete Playwright-Version im README nennen (z. B. `npx playwright@<version>`), ohne sie zur Abhängigkeit zu machen.
- **Sicherheit:** hoch.

#### N6: Ganzes Repo wird auf derselben Origin ausgeliefert (inkl. `docs/prototyp.html` mit `innerHTML` und Inline-Skript ohne CSP)

- **Fundstelle:** Pages-Quelle `main` `/` (README „Hosting“). `docs/prototyp.html:66-150`. Außerdem `tests/`, `scripts/`, `CLAUDE.md`, `docs/spezifikation.md`.
- **Beschreibung:** Neben der App werden alle Repo-Dateien veröffentlicht. Der Prototyp rendert per `innerHTML`, hat aber nur statische Dummy-Daten und keine Eingabequellen (kein `location`, `postMessage` oder Datei-Input). Er ist aktuell nicht ausnutzbar (geprüft per Code-Review).
- **Auswirkung:** Gering, weil das Repo ohnehin öffentlich ist. Jede künftige Änderung an solchen Nebendateien läuft aber auf derselben Origin wie die App (siehe M1) und ohne CSP.
- **Empfehlung:** `docs/prototyp.html` beim Merge nach `main` nicht ausliefern (z. B. nach dem Review löschen oder in einen nicht ausgelieferten Branch verschieben). Alternativ eine Meta-CSP `default-src 'none'; script-src 'none'` hinzufügen, das nimmt dem Prototyp aber die Klickbarkeit. Langfristig nur `index.html`, `root.css` und `training/` ausliefern (z. B. über einen schlanken Pages-Workflow mit `permissions: contents: read, pages: write, id-token: write` und per SHA gepinnten Actions).
- **Sicherheit:** hoch für den Ist-Zustand.

#### N7: Aktueller Plan wird ungeschützt in den KI-Prompt eingefügt (Prompt-Injection)

- **Fundstelle:** `training/src/agent-prompt.js:131-132` (`'```json', JSON.stringify(currentPlan, null, 2), '```'`).
- **Beschreibung:** Texte aus einem importierten Plan (Namen, Cues, Warm-up, bis 500 Zeichen) landen wörtlich im Prompt, den die Nutzerin oder der Nutzer in einen KI-Agenten kopiert. JSON.stringify maskiert keine Backticks, ein Text mit ```` ``` ```` beendet also den Codeblock, und folgende Anweisungen stehen als Prompt-Text da.
- **Auswirkung:** Gering. Relevant nur, wenn ein Plan aus fremder Quelle stammt. Der Agent könnte dann z. B. abweichende Anweisungen befolgen. Im Browser selbst ist das ohne Wirkung.
- **Empfehlung:** Einen längeren, eindeutigen Zaun verwenden (z. B. ```` ```` ```` mit vier Backticks, und Backtick-Folgen in den Daten entfernen oder ersetzen). Im Prompt-Text ausdrücklich sagen, dass der folgende Plan nur Daten sind und keine Anweisungen.
- **Sicherheit:** mittel.

#### N8: CSP-Härtung möglich (unnötige Quellen, Trusted Types)

- **Fundstelle:** `training/index.html:6`.
- **Beschreibung:** `img-src 'self' data: blob:` erlaubt `data:` und `blob:`. Im Code gibt es keine solchen Bilder (`blob:` dient nur dem Download-Link, das ist eine Navigation und kein Bild). Trusted Types sind nicht aktiv. Sie würden das bestehende Verbot von `innerHTML` und Co. browserseitig erzwingen.
- **Auswirkung:** Keine direkte Lücke. Es fehlt nur eine zusätzliche Absicherung gegen künftige Regressionen.
- **Empfehlung:** `img-src 'self'` und dazu `require-trusted-types-for 'script'; trusted-types 'none'` ergänzen. Laut CSP-Spezifikation werden in Meta-Tags nur `frame-ancestors`, `report-uri` und `sandbox` ignoriert (MDN, https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/require-trusted-types-for: Baseline 2026). Danach `npm run e2e` in Chromium und WebKit laufen lassen. Die App nutzt keine TT-pflichtigen Senken, das sollte also ohne Codeänderung gehen. Nicht getestet.
- **Sicherheit:** mittel (Verträglichkeit von TT nicht getestet).

#### N9: Alte Trainingsstände bleiben dauerhaft in IndexedDB, Inhalte werden beim Laden nicht geprüft

- **Fundstelle:** `training/src/storage.js:65-70` und `:120-126` (bei „switch“/„Neu beginnen“ bleibt der bisherige Stand in `files`, so auch der UI-Text in `app.js:310`, `:317`). `storage.js:54-63` (keine Validierung beim Laden).
- **Auswirkung:** Es gibt keine Möglichkeit in der App, gespeicherte Stände zu löschen. Daten sammeln sich an und belegen Quota, und man kann sie nur über die Browser-Einstellungen entfernen (Datenschutz: Datensparsamkeit, Löschbarkeit). Manipulierte oder beschädigte Datensätze (siehe M1, oder nach einem Schema-Wechsel) können den Start stören. Das Rendering bleibt XSS-sicher.
- **Empfehlung:** Im Menü „Gespeicherte Stände verwalten / Browserdaten löschen“ anbieten, mit Hinweis auf vorheriges Sichern. `loadState` durch `validateTrainingFile` schicken und bei Fehlern Onboarding plus Import-Hinweis zeigen.
- **Sicherheit:** hoch (Code), Auswirkung gering.

## Hinweise ohne Finding (geprüft, in Ordnung mit Restrisiko)

- **CSV:** Führende Leerzeichen (`" =1+1"`) und vollbreites `＝` werden nicht mit `'` versehen. Nach OWASP (https://owasp.org/www-community/attacks/CSV_Injection) gilt der Schutz für `= + - @ Tab CR`, der hier umgesetzt ist. Ob Tabellenprogramme mit „Leerzeichen trimmen“ beim Import solche Werte als Formel deuten, habe ich nicht getestet.
- **Fehlermeldungen** enthalten unbekannte Schlüssel ungekürzt (1-MB-Schlüssel → 1-MB-Meldung, als Text gerendert). Darstellbar und ungefährlich, Kürzen auf ca. 80 Zeichen wäre sauberer.
- **SW-Install** nutzt `cache: 'reload'`. Das umgeht den Browser-Cache, nicht aber den Pages-CDN-Cache (`max-age=600`). Direkt nach einem Deployment könnte theoretisch ein gemischter Stand gecacht werden. Nicht beobachtet und ohne Sicherheitswirkung. Die Hash-Prüfung aus M1 (2) würde das ebenfalls abfangen.

## Reproduktion

Die Skripte liegen außerhalb des Repos und werden mit `PLAYWRIGHT_BROWSERS_PATH=/private/tmp/claude-502/security-review/browsers` ausgeführt:
- `/private/tmp/claude-502/security-review/scripts/validator-fuzz.mjs`: Fuzzing des Validators (Node)
- `/private/tmp/claude-502/security-review/scripts/roundtrip.mjs`: Export/Import an den Grenzen (N3)
- `/private/tmp/claude-502/security-review/scripts/browser.mjs [--bypass-csp]`: Netzwerk, XSS, Speicher, Exporte
- `/private/tmp/claude-502/security-review/scripts/browser2.mjs`: Import-Atomarität, Prototype Pollution, Größe, O(n²), Theme-Bug, gelöschte Daten
- `/private/tmp/claude-502/security-review/scripts/browser3.mjs`: SW-Cache, Offline, Cache-Poisoning von außerhalb des Scopes, Framing (braucht zusätzlich den Server auf 8767 aus `/private/tmp/claude-502/security-review/attacker/`)
