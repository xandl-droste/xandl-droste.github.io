# Review Runde 3: Recht und Compliance (Österreich/EU)

Reviewer 2, frische Instanz. Stand: Branch `develop`, Commit `62ce59a`, geprüft am 2026-11-21. Live-Stand: `main` (`28d0dfc`), ausgeliefert über GitHub Pages.
Kein Ersatz für anwaltliche Beratung. Jede Aussage ist gekennzeichnet als **eindeutig**, **wahrscheinlich** oder **unklar, anwaltlich klären**, mit Rechtsquelle.
Persönliche Daten werden in diesem Bericht nicht zitiert, nur Fundstelle und Art.

## Geprüfte Punkte

| Punkt | Wie geprüft | Ergebnis |
|---|---|---|
| Offenlegung § 25 MedienG | Code (`training/src/legal.js`, `training/src/views/info.js`), Browser-Test (Chromium und WebKit, Playwright, 375 × 630), Live-Abruf von `info.js` und `legal.js` | Name und Wohnort sind eingetragen, keine Platzhalter. Text wird gerendert, auch offline. Live-Dateien sind identisch mit `main`. |
| Auffindbarkeit der Offenlegung | Browser-Test: Onboarding, Heute, Verlauf, Plan, laufendes Training, Menü; Startseite `index.html` | Link „Impressum & Datenschutz“ auf Onboarding, Heute, Verlauf und Plan (je 1). Im laufenden Training kein Footer-Link, aber „Info“ im Menü. Startseite verlinkt `./training/#info`. |
| ECG § 5 | Rechtliche Einordnung | Wahrscheinlich nicht anwendbar (Einschätzung 3). |
| „keine Cookies“ | `context.cookies()`, `document.cookie` nach Durchlauf (Plan öffnen, Training starten, 3 Sätze abhaken, Info), Chromium und WebKit; Response-Header der Live-Seite per `curl` | Keine Cookies, kein `Set-Cookie` vom Hoster. Belegt. |
| „kein Tracking“, „keine Datenübertragung an den Betreiber“ | Netzwerkprotokoll (Chromium 65, WebKit 31 Requests), Code-Suche nach `fetch`, `XMLHttpRequest`, `sendBeacon`, `WebSocket`, `EventSource`; CSP in `training/index.html` | 0 externe Requests. `connect-src 'none'`. Einziges `fetch` steht im Service Worker (`training/sw.js:94`, `:113`) und lädt App-Dateien derselben Origin. Belegt. |
| Lokale Speicherung | IndexedDB, localStorage, sessionStorage, Cache Storage im Browser ausgelesen; `training/src/storage.js` | IndexedDB `training-pwa`, ein Cache `training-pwa-…`, localStorage und sessionStorage leer. `navigator.storage.persist()` wird angefragt (`storage.js:100–103`, `app.js:1146`). Deckt sich mit dem Datenschutztext. |
| Einwilligungs-Banner (TKG) | Rechtliche Einordnung anhand der gefundenen Speicherzugriffe | Nicht nötig (Einschätzung 6). |
| Datenschutzinformation Art. 13 DSGVO | `info.js:20–33` gegen Art. 13 Abs. 1 und 2 und Art. 21 Abs. 4 abgeglichen; GitHub General Privacy Statement (Stand 27.04.2026) und GitHub-Pages-Doku abgerufen | Weitgehend vollständig und zutreffend. Formale Lücke siehe N3. |
| Neue Funktionen seit Runde 2 (Schritt 9, Testfahrt, Variante im Titel, Körpergewicht) | `app.js:296–352` (KI-Sheet, Prompt mit Ergebnissen), `agent-prompt.js`, `garmin/session-fit.js`, `export.js`, `views/history.js` | Keine neue Datenübertragung durch die App. Prompt mit Ergebnissen geht nur per Kopieren/Teilen durch den Nutzer an den KI-Dienst, Hinweis steht darunter (`app.js:348`). Notizen werden nicht übernommen. FIT-Datei ohne Freitexte, Dateiname nur aus dem Datum. |
| Gesundheits- und Haftungshinweise | Info-Seite, Onboarding (`app.js:306`), KI-Sheet (`app.js:341`), Plan-Tab (`views/plan.js:30`), Beispiel im Agent-Prompt | Hinweis an vier Stellen. Keine Heils- oder Präventionsversprechen gefunden. |
| Lizenzen | `LICENSE`, `package.json`, `OPEN_SOURCE` in `legal.js`, Kopfzeilen `training/src/garmin/*.js`, README; Suche nach `url(`, `@font-face`, externen URLs in CSS und `docs/prototyp.html` | MIT, keine gebündelten Fremdbibliotheken, keine Fonts, keine Fremd-Assets. GitHub meldet `license: MIT`. FIT siehe N5. |
| Marken | Suche nach Garmin, Apple, iPhone, iOS, Safari in `training/`, README; Icons angesehen, PNG-Chunks geprüft | Nur beschreibende Nennung („Für Garmin exportieren“, „In Garmin Connect importieren“). Icons: generische Hantel, keine Metadaten-Chunks (nur `IHDR`, `IDAT`, `IEND`). README enthält einen Hinweis auf fehlende Verbindung zu den Unternehmen. |
| Öffentliches Repo, Git-Historie, Metadaten | `git log --all` (Autor, Committer, Nachrichten); `git grep` über alle 82 Dateien und über jede Revision aller Refs nach Klarname, Vorname, Wohnort, Mailadresse; `git log -S` nach Stichwörtern der persönlichen Angaben und `/Users/`; `gh api` für Repo-Beschreibung, Topics, Profil, PR #1, Refs; ausgeliefertes Verzeichnis live geprüft | Commits nur mit `noreply`-Adressen (Betreiber und Claude). Klarname und Wohnort nur in `legal.js`, in keiner Commit-Nachricht. Mailadresse zusätzlich in `docs/spezifikation.md` (N4) und historisch in `tests/e2e/info.e2e.mjs` (4 Revisionen). Persönliche Angaben in der Historie (N1). Repo ohne Beschreibung und Topics, Profil ohne Namen. `docs/`, `reviews/`, `README.md`, `CLAUDE.md` liefern live 404. |

## Nicht geprüft (mit Grund)

- **Echtes iPhone / Safari:** Cookies, Speicher und Netzwerk wurden in Chromium und Playwright-WebKit geprüft, nicht auf einem Gerät. Safari-eigenes Verhalten (ITP, Löschen nach 7 Tagen) war nicht verfügbar.
- **Live-App im Browser durchgeklickt:** Live geprüft wurden nur Header und Dateiinhalte per `curl` (identisch mit `main`). Der Browser-Durchlauf lief lokal gegen `develop` (`python3 -m http.server` auf 127.0.0.1). `develop` hat gegenüber `main` zwei Commits mehr. `info.js`, `legal.js` und `index.html` sind in beiden gleich.
- **Server-Logs von GitHub:** Was GitHub speichert und wie lange, lässt sich von außen nicht prüfen. Grundlage sind die öffentlichen Aussagen von GitHub.
- **Eintrag von GitHub auf dataprivacyframework.gov:** nicht direkt abgerufen. Geprüft ist die Aussage im GitHub General Privacy Statement.
- **Wortlaut der Garmin-FIT-Lizenz:** Die Lizenzseite lieferte HTTP 403, die Download-Seite HTTP 404. Nur Sekundärquellen (N5).
- **Links `Claude-Session: https://claude.ai/code/session_…` in 8 Commit-Nachrichten:** nicht aufgerufen (brauchen eine Anmeldung). Ob dort etwas öffentlich ist, ist nicht geprüft (Beobachtung 4).
- **GitHub-Actions-Logs und Pages-Artefakte:** nicht geöffnet. Sie enthalten nach dem Workflow nur Testausgaben bzw. die ohnehin öffentliche App.
- **Wiki und Issues:** Beide sind auf GitHub aktiviert (`has_wiki`, `has_issues`), Inhalte nicht geprüft.

## Rechtliche Einschätzungen (ohne Befund)

1. **§ 25 MedienG, kleine Website:** Die Seite ist eine Website (§ 1 Abs. 1 Z 5a lit. b MedienG) ohne Inhalt, der die öffentliche Meinungsbildung beeinflussen kann. Damit gilt § 25 Abs. 5: anzugeben sind Name und Wohnort des Medieninhabers. Beides steht auf der Info-Seite. Eine Straßenadresse ist nicht nötig. **Wahrscheinlich ausreichend.** Quelle: § 25 Abs. 1, 2 und 5 MedienG (RIS, https://www.ris.bka.gv.at/NormDokument.wxe?Abfrage=Bundesnormen&Gesetzesnummer=10000719&Paragraf=25). Ein Impressum nach § 24 MedienG gilt nur für Medienwerke, nicht für Websites. **Eindeutig.**
2. **Auffindbarkeit (§ 25 Abs. 1 MedienG, „ständig leicht und unmittelbar auffindbar“):** Link auf allen Bildschirmen außer im laufenden Training, dort im Menü. Offline verfügbar. **Wahrscheinlich ausreichend.** Einschränkung ohne JavaScript siehe N2.
3. **ECG § 5:** Gilt für Diensteanbieter eines „Dienstes der Informationsgesellschaft“, also eines in der Regel gegen Entgelt erbrachten Dienstes (§ 3 Z 1 ECG). Die App ist unentgeltlich, ohne Werbung, Verkauf oder Spenden. **Wahrscheinlich nicht anwendbar.** Käme Werbung oder ein Spendenlink dazu, wären die vollen Angaben nötig, u. a. eine geografische Anschrift. Quelle: §§ 3, 5 ECG; EuGH C-291/13 (Papasavvas).
4. **DSGVO anwendbar:** Eine öffentlich zugängliche Website fällt nicht unter die Haushaltsausnahme. **Eindeutig.** Quelle: Art. 2 Abs. 2 lit. c DSGVO; EuGH C-101/01 (Lindqvist).
5. **Trainingsdaten in der App:** Sie bleiben auf dem Gerät, der Betreiber erhält sie nicht (Netzwerkprotokoll). Für diese lokale Verarbeitung ist der Betreiber **wahrscheinlich** nicht Verantwortlicher, daher stellt sich für ihn auch die Frage nach Gesundheitsdaten (Art. 9 DSGVO) **wahrscheinlich** nicht. Quelle: Art. 4 Nr. 7 DSGVO. Dasselbe gilt für den Prompt mit Ergebnissen und den Garmin-Export: Die Weitergabe macht der Nutzer selbst, der Hinweis darauf steht in der App. **Wahrscheinlich** ausreichend.
6. **Kein Einwilligungs-Banner nötig:** Die App nutzt IndexedDB (Trainingsstand, Einstellungen, letztes Exportdatum) und Cache Storage (App-Dateien). Keine Cookies, keine Dritten. Beides ist für den vom Nutzer ausdrücklich gewünschten Dienst (Offline-Trainingsprotokoll) unbedingt erforderlich. **Wahrscheinlich** keine Einwilligung nötig. Quelle: § 165 Abs. 3 TKG 2021 (Umsetzung von Art. 5 Abs. 3 RL 2002/58/EG); EDSA Leitlinien 2/2023 zum technischen Anwendungsbereich von Art. 5 Abs. 3 (erfasst auch IndexedDB, daher ist die Ausnahme der richtige Prüfweg); Art.-29-Gruppe WP 194 (Einstellungen der Benutzeroberfläche sind ausgenommen). Das Kopieren des Prompts in die Zwischenablage löst nur ein Tap des Nutzers aus.
7. **Hosting-Absatz:** Die Aussagen „GitHub protokolliert … die IP-Adresse … für die Sicherheit“ und „nennt keine feste Speicherdauer“ decken sich mit der GitHub-Doku („the visitor's IP address is logged and stored for security purposes“) und dem Privacy Statement vom 27.04.2026 (nur allgemeine Kriterien, keine Frist für Pages). **Eindeutig** belegt. Quellen: https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages; https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement. Wer für diese Protokolle Verantwortlicher ist (GitHub allein, gemeinsam mit dem Betreiber oder GitHub als Auftragsverarbeiter), ist **unklar, anwaltlich klären**. Quelle: Art. 4 Nr. 7, Art. 26, Art. 28 DSGVO; EuGH C-40/17 (Fashion ID). Der Text nennt beide Sichtweisen und ist damit für ein privates Projekt **wahrscheinlich** ausreichend.
8. **Drittlandtransfer:** GitHub erklärt die Zertifizierung nach dem EU-U.S. Data Privacy Framework. Das EuG hat den Angemessenheitsbeschluss am 03.09.2025 bestätigt (T-553/23, Latombe), das Rechtsmittel beim EuGH (C-703/25 P) ist anhängig. Der Text ist derzeit **wahrscheinlich** korrekt. Fällt der Beschluss, muss der Absatz angepasst werden. Quellen: Durchführungsbeschluss (EU) 2023/1795; https://iapp.org/news/a/european-general-court-dismisses-latombe-challenge-upholds-eu-us-data-privacy-framework; https://www.wilmerhale.com/en/insights/blogs/wilmerhale-privacy-and-cybersecurity-law-blog/20251201-european-court-of-justice-to-review-challenge-to-eu-us-data-privacy-framework.
9. **Medizinprodukt:** Die App protokolliert Training und schlägt nach einer festen Regel Gewichte vor. Sie hat keine medizinische Zweckbestimmung. **Wahrscheinlich** kein Medizinprodukt. Quelle: Art. 2 Nr. 1 VO (EU) 2017/745 (MDR).
10. **Produkthaftung, Cyber Resilience Act:** Die neue Produkthaftungsrichtlinie erfasst Software, gilt für ab dem 09.12.2026 in Verkehr gebrachte Produkte und nimmt freie und quelloffene Software aus, die außerhalb einer Geschäftstätigkeit bereitgestellt wird. Der CRA erfasst nur Bereitstellung im Rahmen einer Geschäftstätigkeit. **Wahrscheinlich** beides nicht anwendbar. Quellen: Art. 2 Abs. 2 RL (EU) 2024/2853; Art. 3 Nr. 22 und ErwG 18 VO (EU) 2024/2847.
11. **Haftung allgemein:** Unentgeltliche, private Bereitstellung. Für einen Rat haftet man nach § 1300 ABGB bei unentgeltlicher Auskunft grundsätzlich nur bei wissentlich falschem Rat. Kein Plan wird mitgeliefert, Pläne erzeugt der Nutzer mit einem KI-Dienst seiner Wahl. **Wahrscheinlich** geringes Risiko. Der Satz „keine Gewähr“ hat begrenzte Wirkung, schadet aber nicht. Quelle: § 1300 ABGB.
12. **Marken:** Nennungen von Garmin und Garmin Connect dienen dem Hinweis auf den Zweck (Export-Format). Keine Logos, kein Markenname im App-Namen, Manifest oder Icon. Die `apple-*`-Meta-Tags sind technisch. **Wahrscheinlich** zulässig. Quellen: Art. 14 Abs. 1 lit. c VO (EU) 2017/1001; § 10 Abs. 3 MSchG; EuGH C-228/03 (Gillette). Ein Hinweis zur fehlenden Verbindung steht im README, nicht in der App. Er ist rechtlich **wahrscheinlich** nicht nötig.
13. **Eigene Lizenz:** MIT für Code, Beispielplan und Doku, Rechteinhaber als GitHub-Account (Pseudonym, zulässig nach § 12 Abs. 2 UrhG). Keine Fremdkomponenten, `OPEN_SOURCE = []` und „Keine eingebunden.“ stimmen. **Wahrscheinlich** passend. Der Großteil des Codes ist laut Commit-Autor von einer KI erzeugt. Ob daran Urheberrecht entsteht, hängt vom menschlichen Anteil ab (§ 1 Abs. 1 UrhG: eigentümliche geistige Schöpfung). **Unklar, anwaltlich klären.** Praktisch ohne Folgen: Die MIT-Lizenz erlaubt ohnehin fast alles, und ohne Schutz wäre die Nutzung ebenfalls frei.

## Findings

### Kritisch

Keine.

### Hoch

Keine.

### Mittel

Keine.

### Niedrig

#### N1: Persönliche Angaben weiter in der öffentlichen Git-Historie, App ist jetzt live

- **Fundstelle:** `docs/spezifikation.md` und der damalige Seed-Plan in den Commits `7c00163`, `6ddc93d`, `006b358` (entfernt in `2e7f125`). Erreichbar über `develop`, `main` und `refs/pull/1/head` auf GitHub. Art: persönliche Angaben des Betreibers (in der neuen Historie entfernt). Ergänzend nennt `docs/stand.md:33` konkrete Tage, an denen der Betreiber im Studio getestet hat.
- **Beschreibung:** Name und Wohnort stehen in `legal.js`, der Benutzername des Kontos enthält zusätzlich den Nachnamen. Die Angaben lassen sich so einer bestimmten Person in einer bestimmten Stadt zuordnen. Seit dem 17.11.2026 ist die App live und verlinkt, das Repo ist damit leichter auffindbar. Laut `docs/stand.md` tendiert der Betreiber zum Neuanlegen des Repos, die Freigabe steht aus.
- **Auswirkung:** Kein Rechtsverstoß (eigene Daten, selbst veröffentlicht). Ein Privatsphäre-Risiko bleibt (vorhersagbare Abwesenheit).
- **Empfehlung:** Die offene Entscheidung treffen. Wenn neu angelegt wird: den vorbereiteten Ablauf aus `docs/stand.md` nutzen und danach `git log --all -S` für die Stichwörter laufen lassen, auch über `refs/pull/*`. Die Testtage in `docs/stand.md` dabei allgemein formulieren („nach der ersten Testfahrt“).
- **Sicherheit der Einschätzung:** Befund **eindeutig** (`git log --all -S`, `gh api …/git/refs`). Kein Verstoß: **wahrscheinlich**. Quelle: Art. 2 Abs. 2 lit. c, Art. 4 Nr. 1 DSGVO.

#### N2: Offenlegung und Datenschutz nur mit JavaScript abrufbar

- **Fundstelle:** `index.html:18` verlinkt `./training/#info`. Die Seite entsteht nur per JS (`training/src/views/info.js`). `training/index.html` zeigt ohne JS nur „Diese App braucht JavaScript.“
- **Beschreibung:** Ohne JavaScript, für einfache Crawler und für Prüfwerkzeuge sind Offenlegung und Datenschutzinformation nicht lesbar. In Runde 2 abgelehnt, weil eine statische Seite die Angaben ein zweites Mal im Repo bräuchte (Regel in `CLAUDE.md`).
- **Auswirkung:** Gering. Wer die App nutzen kann, hat JS und erreicht die Seite. Die Startseite der Domain ist ohne JS nutzbar und führt zu einem leeren Bildschirm.
- **Empfehlung:** Eine Lösung, die die Regel einhält: Der Pages-Workflow erzeugt beim Deploy aus `legal.js` eine statische `impressum.html` (z. B. ein kleines Node-Skript im Schritt „Nur die App zusammenstellen“). Im Repo stehen die Angaben dann weiter nur in `legal.js`. Mindestens den `<noscript>`-Text um einen Hinweis auf die Info-Seite ergänzen. Alternativ bewusst so lassen.
- **Sicherheit:** **Wahrscheinlich** (ob eine JS-Pflicht beanstandet würde, ist nicht entschieden). Quelle: § 25 Abs. 1 MedienG; Art. 12 Abs. 1 DSGVO (leicht zugängliche Form).

#### N3: Widerspruchsrecht nicht getrennt hervorgehoben, Pflicht zur Bereitstellung nicht genannt

- **Fundstelle:** `training/src/views/info.js:33` (Rechte in einem Satz), `info.js:26` und `:29` (Rechtsgrundlage Art. 6 Abs. 1 lit. f).
- **Beschreibung:** Beide Verarbeitungen des Betreibers (Hosting-Protokolle, E-Mail) stützen sich auf berechtigtes Interesse. Dann muss auf das Widerspruchsrecht „ausdrücklich“ und „von anderen Informationen getrennt“ hingewiesen werden. Der Text nennt es nur in einer Aufzählung mit den anderen Rechten. Außerdem fehlt die Angabe, ob die Bereitstellung der Daten erforderlich ist und was passiert, wenn man sie nicht bereitstellt (hier: ohne IP-Adresse kein Seitenabruf).
- **Auswirkung:** Formale Lücke, praktisch geringes Risiko.
- **Empfehlung:** Eigener kurzer Absatz, z. B. „Widerspruch: Du kannst der Verarbeitung auf Grundlage berechtigter Interessen jederzeit widersprechen (Art. 21 DSGVO), formlos an …“. Im Hosting-Absatz ergänzen: „Ohne diese Verbindungsdaten kann die Seite nicht ausgeliefert werden.“ Textänderung nur mit Zustimmung des Betreibers (Spezifikation Abschnitt 6).
- **Sicherheit:** **Wahrscheinlich.** Quellen: Art. 21 Abs. 4, Art. 13 Abs. 2 lit. b und e DSGVO.

#### N4: Kontaktadresse steht auch in der Spezifikation, entgegen `CLAUDE.md`

- **Fundstelle:** `docs/spezifikation.md:243` (Art: Mailadresse des Betreibers, wörtlich), in 39 Revisionen der Historie. Bis zu einer früheren Version stand sie auch in `tests/e2e/info.e2e.mjs` (4 Revisionen, im aktuellen Baum entfernt).
- **Beschreibung:** `CLAUDE.md` sagt, die Betreiberangaben stehen ausschließlich in `training/src/legal.js` und werden nicht an andere Stellen kopiert, „auch nicht in … Doku“. Die Spezifikation führt die Adresse trotzdem als Wert. Runde 2 hat das als „absichtlich“ gewertet. Der Wortlaut der Regel deckt das nicht.
- **Auswirkung:** Rechtlich ohne Folgen, die Adresse ist ohnehin auf der Info-Seite öffentlich. Aber zwei Stellen müssen bei einer Änderung gepflegt werden, und die Regel ist nicht mehr eindeutig.
- **Empfehlung:** In der Spezifikation das Muster `KONTAKT_MAIL = "[KONTAKT_MAIL]"` wie bei Name und Wohnort verwenden, oder `CLAUDE.md` um diese Ausnahme ergänzen. Die Historie dabei nicht umschreiben (es sei denn, N1 wird umgesetzt).
- **Sicherheit:** Befund **eindeutig**. Keine Rechtsfolge: **wahrscheinlich**. Quelle: keine Rechtsnorm, interne Regel (`CLAUDE.md`).

#### N5: Reichweite der Garmin-FIT-Lizenz weiter ungeklärt

- **Fundstelle:** `training/src/garmin/fit.js:1–6`, `training/src/garmin/categories.js` (32 Hauptkategorien mit Nummer und Name aus dem FIT-Profil), `training/src/garmin/session-fit.js`, `README.md:37`.
- **Beschreibung:** Der Encoder ist eigener Code, kein SDK-Code gefunden. Er nutzt Nummern und Bezeichner aus dem FIT-Profil. Garmin stellt SDK und Protokoll unter einer eigenen Lizenz bereit, u. a. mit der Pflicht, nicht von den Protokolldefinitionen abzuweichen, und mit Einschränkungen bei der Weitergabe der „Licensed Technology“. Ob diese Lizenz eine Implementierung bindet, die das SDK nie heruntergeladen hat, ist offen. Neu seit Runde 2: Die ganze Kategorienliste steht im Code und im Agent-Prompt. Einzelne Zahlen und kurze technische Bezeichner sind **wahrscheinlich** nicht urheberrechtlich geschützt. 32 Einträge sind **wahrscheinlich** kein wesentlicher Teil der Profil-Datenbank. Außerdem fällt in `fit.js:6` auf: `PROFILE_VERSION = 2132` („21.32“), während `categories.js:1` und `docs/stand.md` „SDK 21.221“ nennen. Das ist technisch, zeigt aber, dass die Quelle nicht sauber dokumentiert ist.
- **Auswirkung:** Sehr geringes Risiko für ein privates, unentgeltliches Projekt.
- **Empfehlung:** Den aktuellen Lizenztext einmal vollständig lesen (Download des SDK oder Anfrage bei Garmin) und das Ergebnis mit Datum in `docs/stand.md` festhalten. Quelle und Version der Profilnummern an einer Stelle einheitlich nennen.
- **Sicherheit:** **Unklar, anwaltlich klären** (Reichweite der Garmin-Lizenz). Quellen: § 1 UrhG; §§ 76c ff. UrhG (Datenbankschutz); FIT Protocol License: https://thisisant.developer.garmin.com/pages/developer/ant/licensing/flexible-and-interoperable-data-transfer-fit-protocol-license/index.html (Abruf am 2026-11-21: HTTP 403); Garmin-Forum zur Lizenz: https://forums.garmin.com/developer/fit-sdk/b/news-announcements/posts/fit-sdk-license-agreement-updates.

## Weitere Beobachtungen ohne Handlungsbedarf

1. **Hinweis beim Prompt mit Ergebnissen** (`app.js:348`): „Die Ergebnisse (Gewichte, Wiederholungen, Daten) …“. Gemeint sind Datumsangaben. „Daten“ ist mehrdeutig, „Datum“ wäre klarer. Der Hinweis selbst ist vorhanden und steht wie verlangt unter dem Button. Der Prompt fragt den KI-Dienst nach „Einschränkungen und Beschwerden“. Das sind ggf. Gesundheitsdaten, die der Nutzer selbst eingibt. Der Satz „Was du dem KI-Dienst erzählst, geht an dessen Anbieter“ (`app.js:341`) deckt das ab.
2. **Onboarding-Satz „Es wird nichts hochgeladen.“** (`app.js:301`): Stimmt mit dem Netzwerkprotokoll überein.
3. **README:30** beschreibt noch „Historie behalten“. Die App bietet inzwischen „Anpassen / Von vorn / Ganz neu“. Rechtlich ohne Bedeutung, aber die Doku stimmt nicht mehr mit dem Verhalten überein.
4. **Commit-Nachrichten** enthalten in 8 Fällen einen Link `Claude-Session: https://claude.ai/code/session_…`. Nicht geprüft, ob die Sitzungen öffentlich einsehbar sind. Wenn ja, wären Gesprächsverläufe (ggf. mit persönlichen Angaben) erreichbar. Der Betreiber sollte das in seinem Konto prüfen.
5. **Commit-Autor „Claude“** mit `noreply@anthropic.com` in 26 Commits: keine personenbezogenen Daten.
6. **Wiki und Issues** sind auf GitHub aktiviert. Dritte könnten dort Inhalte (auch persönliche Daten) einstellen, für die der Betreiber dann als Repo-Inhaber zuständig wäre. Wenn nicht gebraucht, abschalten. **Wahrscheinlich** ohne Rechtsfolge, solange leer.
7. **Link zum GitHub Privacy Statement** (`info.js:27`) öffnet mit `rel="noopener noreferrer"` erst nach Antippen, erzeugt also beim Laden keinen externen Request (Netzwerkprotokoll).

## Zusammenfassung

| Schwere | Anzahl |
|---|---|
| Kritisch | 0 |
| Hoch | 0 |
| Mittel | 0 |
| Niedrig | 5 (N1–N5) |

Punkte mit „unklar, anwaltlich klären“:
- Einschätzung 7: Rollenverteilung GitHub / Betreiber bei den Pages-Zugriffsprotokollen (Art. 4 Nr. 7, 26, 28 DSGVO).
- Einschätzung 13: Urheberrechtsschutz für KI-erzeugten Code und damit Reichweite der MIT-Lizenz (§ 1 UrhG).
- N5: Reichweite der Garmin-FIT-Lizenz für einen eigenen Encoder mit Profilnummern.
