# Review Runde 2: Recht und Compliance (Österreich/EU)

Reviewer 2, frische Instanz. Stand: Branch `develop`, Commit `2e7f125`, geprüft am 2026-11-15.
Kein Ersatz für anwaltliche Beratung. Jede Aussage ist gekennzeichnet als **eindeutig**, **wahrscheinlich** oder **unklar, anwaltlich klären**, mit Rechtsquelle.
Persönliche Daten werden in diesem Bericht nicht zitiert, nur Fundstelle und Art.

## Geprüfte Punkte

| Punkt | Wie geprüft | Ergebnis |
|---|---|---|
| Offenlegung § 25 MedienG | Code (`training/src/legal.js`, `training/src/views/info.js`), Browser-Test (Chromium/Playwright 1.65, 375 × 630), Gesetzestext (RIS) | Name und Wohnort sind eingetragen (keine Platzhalter mehr), Text wird gerendert. Siehe unten. |
| Auffindbarkeit der Offenlegung | Browser-Test: Startseite, Onboarding, Tabs Heute/Verlauf/Plan, laufendes Training | Link „Impressum & Datenschutz“ auf Startseite, Onboarding und allen Tabs (je 1 Treffer). Im laufenden Training kein Footer-Link, aber Eintrag im Menü (2 Taps). |
| ECG § 5 | Rechtliche Einordnung | Wahrscheinlich nicht anwendbar (siehe Einschätzungen). |
| Seitentext vs. Verhalten: „keine Cookies“ | `context.cookies()` und `document.cookie` nach komplettem Durchlauf (Beispielplan laden, Training starten, Satz abschließen, Info); Response-Header von `xandl-droste.github.io` per `curl -I` | Keine Cookies im Browser, kein `Set-Cookie` vom Hoster. Behauptung belegt. |
| „kein Tracking / keine Datenübertragung an den Betreiber“ | Netzwerkprotokoll aller Requests (63 Requests, 36 verschiedene Pfade) + Code-Suche nach `fetch`, `XMLHttpRequest`, `sendBeacon`, `WebSocket`, `EventSource` | 0 externe Requests. Alle Requests sind GETs auf statische App-Dateien derselben Origin ohne Query-Parameter, keine Nutzerdaten in URLs. Einziges `fetch` in der App lädt `plans/seed.plan.json`. Behauptung belegt (lokal). |
| Lokale Speicherung | IndexedDB, localStorage, sessionStorage, Cache Storage im Browser ausgelesen | IndexedDB `training-pwa` (Stores `files`, `kv`), ein Cache `training-pwa-…` mit 33 App-Dateien, localStorage/sessionStorage leer. Deckt sich mit dem Datenschutztext. |
| Einwilligungs-Banner (TKG) | Rechtliche Einordnung anhand der gefundenen Speicherzugriffe | Nicht nötig (siehe Einschätzungen). |
| Datenschutzinformation Art. 13 DSGVO | Text auf der Info-Seite gegen Art. 13 Abs. 1 und 2 abgeglichen; GitHub-Doku und GitHub Privacy Statement gelesen | Weitgehend vollständig. Zwei Ungenauigkeiten (N1, N3). |
| Ausgelieferter Umfang | `.github/workflows/pages.yml`, `gh api …/pages`, `curl` auf die Live-Adresse | Workflow liefert nur `index.html`, `root.css`, `training/`. Live ist aber noch der alte Stand (M1). |
| Lizenzen | `LICENSE`, `package.json`, `OPEN_SOURCE` in `legal.js`, Kopfzeilen `training/src/garmin/*.js`, README | MIT, keine gebündelten Fremdbibliotheken, keine Laufzeit-Abhängigkeiten. FIT-Profilnummern siehe N5. |
| Marken | Suche nach Garmin/Apple/iPhone/Safari in `training/`, README, Icons angesehen | Nur beschreibende Nennung, keine Logos. Icons zeigen eine generische Hantel. |
| Gesundheits- und Haftungshinweise | Info-Seite, KI-Sheet (`training/src/app.js:277`), Seed-Plan (`training/plans/seed.plan.json`, alle `name`/`cue`/`suggestedDay`) | Keine Heil- oder Präventionsversprechen gefunden. Hinweis vorhanden, Sichtbarkeit siehe N4. |
| Öffentliches Repo und Git-Historie | `git log --all` (Autoren, Committer, Nachrichten), `git grep` im Baum, `git log -S` über die Historie für Klarname, Wohnort, Mail, Pfade mit Benutzernamen; Metadaten der PNG-Icons (`strings`) | Klarname und Wohnort nur in `training/src/legal.js` (gewollt). Commits nur mit `noreply`-Adressen. Keine lokalen Pfade/Benutzernamen. Historie siehe N6. |

## Nicht geprüft (mit Grund)

- **Echtes iPhone / Safari:** Cookies, Speicher und Netzwerk wurden nur in Chromium geprüft. Safari-spezifisches Verhalten (z. B. ITP, Teilen-Menü) war nicht verfügbar.
- **Live-App unter `/training/`:** liefert derzeit 404, weil `main` noch nicht aktualisiert ist. Geprüft wurde der lokale Stand von `develop`, ausgeliefert mit `python3 -m http.server` auf 127.0.0.1.
- **Server-Logs von GitHub:** Was GitHub tatsächlich speichert und wie lange, lässt sich von außen nicht prüfen. Grundlage sind die öffentlichen Aussagen von GitHub.
- **Eintrag von GitHub auf dataprivacyframework.gov:** nicht direkt abgerufen. Geprüft ist die Selbstauskunft im GitHub General Privacy Statement.
- **Vollständiger Wortlaut der Garmin-FIT-Lizenz:** Die Download-Seite war nicht abrufbar (HTTP 404). Nur Sekundärquellen und die FIT-Protocol-License-Seite per Suchergebnis (N5).
- **GitHub-Rulesets und Account-Profil:** nicht geprüft, nicht Teil des Prüfauftrags für Recht.

## Rechtliche Einschätzungen (ohne Befund)

1. **§ 25 MedienG, kleine Website:** Die App ist eine Website im Sinne von § 1 Abs. 1 Z 5a lit. b MedienG. Sie hat keinen Inhalt, der geeignet ist, die öffentliche Meinungsbildung zu beeinflussen. Damit gilt § 25 Abs. 5: anzugeben sind nur Name und Wohnort des Medieninhabers. Beides steht auf der Info-Seite (aus `legal.js`). Eine Straßenadresse ist nicht nötig. **Wahrscheinlich ausreichend.** Quelle: § 25 Abs. 1 und 5 MedienG (RIS, https://www.ris.bka.gv.at/NormDokument.wxe?Abfrage=Bundesnormen&Gesetzesnummer=10000719&Paragraf=25).
2. **„Ständig leicht und unmittelbar auffindbar“ (§ 25 Abs. 1 MedienG):** Link auf jeder Seite außer im laufenden Training, dort über das Menü in 2 Taps. Auf der Domain-Startseite ebenfalls verlinkt. **Wahrscheinlich ausreichend.** Einschränkung ohne JavaScript siehe N2.
3. **ECG § 5:** Pflichten treffen Diensteanbieter eines „Dienstes der Informationsgesellschaft“, also eines in der Regel gegen Entgelt erbrachten Dienstes (§ 3 Z 1 ECG). Die App ist unentgeltlich, ohne Werbung, ohne Verkauf, ohne Spenden. **Wahrscheinlich nicht anwendbar.** Würde sich das ändern (Werbung, Spendenlink, Verkauf), wären die vollen Angaben nach § 5 ECG nötig (u. a. geografische Anschrift). Quelle: §§ 3, 5 ECG; EuGH C-291/13 (Papasavvas) zur Entgeltlichkeit über Werbung.
4. **DSGVO anwendbar:** Eine öffentlich zugängliche Website fällt nicht unter die Haushaltsausnahme. **Eindeutig.** Quelle: Art. 2 Abs. 2 lit. c DSGVO, EuGH C-101/01 (Lindqvist). Eine Datenschutzinformation ist daher richtig.
5. **Trainingsdaten in der App:** Sie verbleiben auf dem Gerät, der Betreiber erhält sie nicht (Netzwerkprotokoll oben). Der Betreiber ist für diese lokale Verarbeitung **wahrscheinlich** nicht Verantwortlicher, weil er weder Zugriff hat noch Mittel der Verarbeitung im Einzelfall steuert. Damit stellt sich auch die Frage nach Gesundheitsdaten (Art. 9 DSGVO) für den Betreiber **wahrscheinlich** nicht. Quelle: Art. 4 Nr. 7 DSGVO.
6. **Kein Einwilligungs-Banner nötig:** Die App legt nur IndexedDB-Einträge (Trainingsstand) und Cache-Storage (App-Dateien für den Offline-Betrieb) an, keine Cookies, keine Drittanbieter. Beides ist unbedingt erforderlich, um den vom Nutzer ausdrücklich gewünschten Dienst (Offline-Trainingsprotokoll) bereitzustellen. **Wahrscheinlich** keine Einwilligung nötig. Quelle: § 165 Abs. 3 TKG 2021 (Umsetzung von Art. 5 Abs. 3 ePrivacy-RL 2002/58/EG); EDSA Leitlinien 2/2023 zum technischen Anwendungsbereich von Art. 5 Abs. 3 (erfasst auch Web Storage/IndexedDB, daher ist die Ausnahme der richtige Prüfweg). `navigator.storage.persist()` ändert daran nichts.
7. **Drittlandtransfer GitHub:** GitHub erklärt in seinem Privacy Statement die Zertifizierung nach dem EU-U.S. Data Privacy Framework. Der Text der Info-Seite ist insoweit **wahrscheinlich** korrekt. Quelle: https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement; Angemessenheitsbeschluss (EU) 2023/1795.
8. **Behauptung „GitHub protokolliert die IP-Adresse zur Sicherheit“:** Deckt sich mit der GitHub-Doku („the visitor's IP address is logged and stored for security purposes“). **Eindeutig** belegt. Quelle: https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages.
9. **Medizinprodukt:** Die App protokolliert Training, sie hat keine medizinische Zweckbestimmung (Diagnose, Therapie). **Wahrscheinlich** kein Medizinprodukt. Quelle: Art. 2 Nr. 1 VO (EU) 2017/745 (MDR).
10. **Marken:** „Für Garmin exportieren“, „In Garmin Connect importieren“ und die `apple-*`-Meta-Tags sind beschreibende bzw. technische Nennungen, keine Logos, keine Gestaltung, die Zugehörigkeit nahelegt. **Wahrscheinlich** zulässig. Quelle: Art. 14 Abs. 1 lit. c VO (EU) 2017/1001 (UMV), § 10 Abs. 3 MSchG.
11. **Eigene Lizenz:** MIT für Code, Seed-Plan und Doku, Rechteinhaber als GitHub-Account (Pseudonym). Keine gebündelten Fremdkomponenten, `OPEN_SOURCE = []` und „Keine eingebunden.“ stimmen. **Wahrscheinlich** passend. Hinweis: Die GitHub-API meldet für das Repo derzeit `license: null`, weil `LICENSE` noch nicht auf `main` liegt. Das erledigt sich mit dem nächsten Merge nach `main`.
12. **Haftung:** Unentgeltliche, private Bereitstellung. Eine Haftung für unrichtige Ratschläge trifft nach ABGB bei unentgeltlicher Auskunft grundsätzlich nur bei wissentlich falschem Rat bzw. eigenem Interesse. Der Seed-Plan enthält keine Heils- oder Präventionsversprechen. **Wahrscheinlich** geringes Risiko. Quelle: § 1300 ABGB. Der Satz „Für Richtigkeit und Vollständigkeit kann keine Gewähr übernommen werden“ hat begrenzte rechtliche Wirkung, schadet aber nicht.

## Findings

### Kritisch

Keine.

### Hoch

Keine.

### Mittel

#### M1: Live-Seite ist noch der alte Jekyll-Stand: Skript von einem fremden CDN, keine Offenlegung

- **Fundstelle:** `https://xandl-droste.github.io/` (live, abgerufen am 2026-11-15). Die Seite ist ein Jekyll-Build des ersten Commits (`5fedbda`, `origin/main`). Im HTML: `<script src="https://cdnjs.cloudflare.com/ajax/libs/anchor-js/4.1.0/anchor.min.js">`. `gh api repos/…/pages` meldet `build_type: workflow`, der neue Workflow lief aber noch nicht, weil `main` nicht aktualisiert ist. `/training/` liefert 404.
- **Beschreibung:** Öffentlich erreichbar ist derzeit eine Seite des Betreibers, die beim Aufruf ein Skript von cdnjs (Cloudflare) lädt und damit die IP-Adresse der Besucher an einen Dritten überträgt. Weder eine Datenschutzinformation noch eine Offenlegung sind verlinkt.
- **Auswirkung:** Datenübertragung an einen Dritten ohne Information und ohne erkennbare Rechtsgrundlage (vergleichbar mit der Rechtsprechung zu extern eingebundenen Google Fonts). Fehlende Offenlegung nach § 25 MedienG für diese Seite. Praktisches Risiko gering, weil die Seite fast leer ist, aber sie ist live.
- **Empfehlung:** `develop` wie geplant nach `main` mergen, damit der Workflow den neuen Stand ausliefert, und danach live prüfen: Startseite ohne externe Skripte, Link auf die Info-Seite, `/training/` erreichbar. Bis dahin alternativ Pages kurz deaktivieren.
- **Sicherheit der Einschätzung:** Befund **eindeutig** (live abgerufen). Rechtliche Bewertung **wahrscheinlich**. Quellen: Art. 6 Abs. 1, Art. 13 DSGVO; LG München I, Urteil vom 20.01.2022, 3 O 17493/20 (Google Fonts, deutsches Gericht, für Österreich nur Orientierung); § 25 Abs. 1, 5 MedienG.

### Niedrig

#### N1: Hosting-Absatz: Speicherdauer verweist ins Leere, Rolle von GitHub nicht eindeutig

- **Fundstelle:** `training/src/views/info.js:26`.
- **Beschreibung:** Der Text sagt „Wie lange GitHub diese Daten speichert, steht in der Datenschutzerklärung von GitHub“. Das GitHub General Privacy Statement nennt aber keine konkrete Frist für Zugriffsprotokolle von GitHub Pages bzw. für IP-Adressen von Besuchern (nur allgemein „as long as your account is active“ für Account-Daten). Außerdem stellt der Text die Verarbeitung als eigene des Betreibers dar („berechtigtes Interesse an einem sicheren Betrieb der Seite“), während GitHub laut eigener Doku die IP „for security purposes“ für eigene Zwecke speichert. Ob GitHub hier Auftragsverarbeiter, eigener Verantwortlicher oder gemeinsam Verantwortlicher ist, ist nicht geklärt.
- **Auswirkung:** Kleine Ungenauigkeit in der Art.-13-Information (Art. 13 Abs. 2 lit. a: Speicherdauer oder Kriterien). Kaum praktisches Risiko.
- **Empfehlung:** Satz ändern in etwa: „GitHub nennt dafür keine feste Speicherdauer. Nähere Angaben: GitHub General Privacy Statement.“ Optional ergänzen: „GitHub verarbeitet diese Daten auch für eigene Zwecke als eigener Verantwortlicher.“ (Textänderung nur mit Zustimmung des Betreibers, laut Spezifikation Abschnitt 6.)
- **Sicherheit:** Inhalt des GitHub-Statements **eindeutig** geprüft. Rollenverteilung GitHub/Betreiber: **unklar, anwaltlich klären**. Quellen: Art. 4 Nr. 7, Art. 13 Abs. 2 lit. a, Art. 26, Art. 28 DSGVO; EuGH C-40/17 (Fashion ID).

#### N2: Offenlegung und Datenschutz nur mit JavaScript erreichbar

- **Fundstelle:** `training/index.html` (`<noscript>` zeigt nur „Diese App braucht JavaScript.“), `index.html:18` verlinkt auf `./training/#info`, die Info-Seite wird von `training/src/views/info.js` per JS erzeugt.
- **Beschreibung:** Ohne JavaScript (oder für einfache Crawler) sind Name, Wohnort und Datenschutzinformation nicht abrufbar. In Runde 1 wurde das mit dem Hinweis vertagt, eine statische Seite ergebe erst mit echten Angaben Sinn. Die Angaben sind jetzt eingetragen.
- **Auswirkung:** „Ständig leicht und unmittelbar auffindbar“ ist für Besucher ohne JS nicht erfüllt. Gering, weil die App ohne JS ohnehin nichts anzeigt.
- **Empfehlung:** Eine statische Seite (z. B. `training/info.html` oder `impressum.html` im Root) mit demselben Text, ohne Skript, im Precache und auf der Startseite verlinkt. Damit die Angaben nur an einer Stelle gepflegt werden (Regel in `CLAUDE.md`), z. B. per `npm run sw`-ähnlichem Skript aus `legal.js` erzeugen und per Test auf Gleichheit prüfen, oder die Regel bewusst um diese eine Datei erweitern.
- **Sicherheit:** **Wahrscheinlich** (Pflicht zur Auffindbarkeit gilt allgemein, ob JS-Abhängigkeit beanstandet würde, ist nicht entschieden). Quelle: § 25 Abs. 1 MedienG.

#### N3: E-Mail-Absatz nennt den Mail-Anbieter nicht als Empfänger

- **Fundstelle:** `training/src/views/info.js:28–29`.
- **Beschreibung:** Anfragen per Mail laufen über den Mail-Anbieter der Kontaktadresse (Domain in `legal.js`). Der ist Empfänger bzw. Auftragsverarbeiter, wird aber nicht genannt.
- **Auswirkung:** Formale Lücke bei Art. 13 Abs. 1 lit. e DSGVO, praktisch unbedeutend.
- **Empfehlung:** Ergänzen: „Die Mails liegen beim Mail-Anbieter der Kontaktadresse.“ (Anbieter nennen, falls gewünscht.)
- **Sicherheit:** **Wahrscheinlich.** Quelle: Art. 13 Abs. 1 lit. e DSGVO.

#### N4: Gesundheitshinweis nur auf der Info-Seite und im KI-Sheet sichtbar

- **Fundstelle:** `training/src/views/info.js:35–36`; `training/src/app.js:277` (KI-Sheet); Onboarding „Beispielplan laden“ und Plan-Tab ohne Hinweis. Footer-Link heißt „Impressum & Datenschutz“, er deutet den Gesundheitshinweis nicht an.
- **Beschreibung:** Wer den Beispielplan lädt (Sprünge, schwere Grundübungen, Intensitätsangaben bis „Maximal“), sieht keinen Hinweis, dass der Plan keine Beratung ist. Medizinisch wirkende Aussagen wurden im Seed-Plan nicht gefunden.
- **Auswirkung:** Geringes Haftungsrisiko (unentgeltlich, siehe Einschätzung 12). Der Hinweis ist aber leicht zu übersehen.
- **Empfehlung:** Unter „Beispielplan laden“ bzw. oben im Plan-Tab eine Zeile wie im KI-Sheet: „Beispielplan, keine medizinische Beratung. Bei Beschwerden ärztlich oder physiotherapeutisch abklären.“
- **Sicherheit:** **Wahrscheinlich** ausreichend schon jetzt, Empfehlung dient der Vorsicht. Quelle: § 1300 ABGB.

#### N5: FIT-Profilnummern und Garmin-Lizenz nicht abschließend geklärt

- **Fundstelle:** `training/src/garmin/fit.js:3–6`, `training/src/garmin/session-fit.js:7–35`, `training/plans/seed.plan.json` (`garminCategory`/`garminSubcategory`), README Abschnitt „Export für Garmin Connect“.
- **Beschreibung:** Der Encoder ist eigener Code (kein SDK-Code gefunden, keine fremden Copyright-Kopfzeilen). Er nutzt einzelne Nummern aus dem FIT-Profil. Garmin stellt das FIT-Protokoll unter einer eigenen Lizenz bereit (u. a. Pflicht, nicht von den Protokolldefinitionen abzuweichen). Ob diese Lizenz für eine Implementierung ohne SDK-Code greift, ist offen. Einzelne Zahlenwerte sind **wahrscheinlich** nicht urheberrechtlich geschützt, und ein Dutzend Einträge ist **wahrscheinlich** kein wesentlicher Teil einer Datenbank.
- **Auswirkung:** Sehr geringes Risiko für ein privates, unentgeltliches Projekt.
- **Empfehlung:** Den aktuellen Lizenztext (FIT SDK License bzw. FIT Protocol License) einmal vollständig lesen und das Ergebnis in `docs/stand.md` festhalten. Im README ist der Satz „kein Code aus dem Garmin FIT SDK“ bereits vorhanden.
- **Sicherheit:** **Unklar, anwaltlich klären** (Reichweite der Garmin-Lizenz). Quellen: § 1 UrhG (Werkbegriff), §§ 76c ff. UrhG (Datenbankschutz); FIT Protocol License: https://thisisant.developer.garmin.com/pages/developer/ant/licensing/flexible-and-interoperable-data-transfer-fit-protocol-license/index.html; Garmin-Forum zur SDK-Lizenz: https://forums.garmin.com/developer/fit-sdk/b/news-announcements/posts/fit-sdk-license-agreement-updates.

#### N6: Git-Historie enthält persönliche Angaben, jetzt mit Klarname verknüpfbar

- **Fundstelle:** `docs/spezifikation.md` in Commit `7c00163` (und Folge-Commits bis vor `006b358`): Abschnitt 4 enthielt persönliche Angaben des Betreibers (in der neuen Historie entfernt). Im aktuellen Baum entfernt.
- **Beschreibung:** Seit dem Eintrag von Klarname und Wohnort in `training/src/legal.js` (Commit `460c2f3`) lassen sich diese Angaben in der öffentlichen Historie einer bestimmten Person in einer bestimmten Stadt zuordnen. Der Betreiber hat laut `docs/stand.md` entschieden, die Historie nicht umzuschreiben.
- **Auswirkung:** Kein DSGVO-Verstoß (eigene Daten des Betreibers, freiwillig veröffentlicht), aber ein Privatsphäre-Risiko (vorhersagbare Abwesenheit zu bestimmten Zeiten).
- **Empfehlung:** Entscheidung bewusst bestätigen. Wenn das Risiko nicht gewollt ist: Repo mit bereinigter Historie neu anlegen oder privat schalten und die App aus einem separaten öffentlichen Repo ausliefern.
- **Sicherheit:** Befund **eindeutig** (per `git log -S` geprüft). Bewertung als Risiko: **wahrscheinlich**.

## Weitere Beobachtungen ohne Handlungsbedarf

- `CLAUDE.md` erlaubt den Klarnamen jetzt ausdrücklich nur in `legal.js`. `docs/spezifikation.md` Abschnitt 6 zeigt weiterhin die Platzhalter-Schreibweise `[NAME]`/`[WOHNORT]` als Muster, sagt aber „(erledigt)“. Kein Widerspruch.
- Die Kontaktadresse steht absichtlich in `legal.js` und in `docs/spezifikation.md:227` (Spezifikation). `tests/e2e/info.e2e.mjs` liest Name, Wohnort und Mail aus `legal.js` und kopiert sie nicht.
- Der Link zum GitHub Privacy Statement öffnet mit `rel="noopener noreferrer"` erst nach Antippen, er erzeugt beim Laden keinen externen Request.
- Commit-Zeitstempel enthalten die Zeitzone (+0100). Kein zusätzlicher Personenbezug, weil der Wohnort ohnehin offengelegt ist.

## Zusammenfassung

| Schwere | Anzahl |
|---|---|
| Kritisch | 0 |
| Hoch | 0 |
| Mittel | 1 (M1) |
| Niedrig | 6 (N1–N6) |

Punkte mit „unklar, anwaltlich klären“: N1 (Rollenverteilung GitHub/Betreiber), N5 (Reichweite der Garmin-FIT-Lizenz).
