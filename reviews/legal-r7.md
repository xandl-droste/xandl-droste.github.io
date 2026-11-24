# Review Runde 7: Recht und Compliance (Österreich/EU)

Reviewer 2, frische Instanz. Geprüft am 2026-11-24, Stand Commit `6ad6a6a` (Version 3.0.0, `CHANGELOG.md` „in Arbeit“). Die Änderungen seit dem Stand von Runde 6 habe ich mit `git diff 32a6680..HEAD` verglichen (19 Dateien, davon 9 unter `training/`).
Dieser Bericht ersetzt keine anwaltliche Beratung. Jede Aussage ist als **eindeutig**, **wahrscheinlich** oder **unklar, anwaltlich klären** gekennzeichnet und nennt ihre Rechtsquelle.
Persönliche Daten zitiere ich nicht, ich verweise nur auf die „Betreiberangaben in legal.js“. Name und Branches des privaten Zwischen-Repos nenne ich ebenfalls nicht.

## Geprüfte Punkte

| Punkt | Wie geprüft | Ergebnis |
|---|---|---|
| Änderungen seit Runde 6 mit rechtlicher Bedeutung | Diff von `app.js`, `model/validate.js`, `model/activities.js`, `model/training-file.js`, `views/activity.js`, `views/history.js`, `views/live.js`, `css/app.css`, `sw.js`, `CHANGELOG.md`, `docs/stand.md` | Keine rechtlich relevante Änderung. Die Änderungen betreffen Stepper (± vom getippten Wert), das Abschluss-Sheet (Buttons fest unten), Texte der Import-Vorschau, das Zusammenführen und das Bereinigen der Trainingsart im Validator. Es gibt keine neue Datenübertragung, keinen neuen Speicherort und keinen neuen Hinweistext zu Datenschutz oder Gesundheit. `info.js`, `legal.js`, `index.html`, `manifest.webmanifest`, `README.md` und `LICENSE` sind unverändert. |
| Offenlegung nach § 25 MedienG | `training/src/views/info.js:18–20`. Werte in `legal.js` per Skript nur auf Platzhalter geprüft, nicht ausgegeben. Info-Seite im Browser geöffnet. | Name, Wohnort und Kontakt sind gesetzt, keine Platzhalter. Die Überschrift „Betreiber / Offenlegung (§ 25 MedienG)“ wird gerendert. Auf der Seite steht „Version 3.0.0“. Der Link „Impressum & Datenschutz“ steht auf „Heute“, die Startseite der Domain (`index.html:18`) verweist auf die Info-Seite. |
| ECG § 5 | Rechtliche Einordnung | Wie bisher **wahrscheinlich** nicht anwendbar (Einschätzung 2). |
| Aussagen „keine Cookies“, „kein Tracking“, „nicht an den Betreiber übertragen“ | Eigenes Playwright-Skript (Chromium, 375 × 630, Touch, `de-AT`) gegen 127.0.0.1:8772. Ablauf: Plan öffnen, komplettes Training im Fokus, anderes Training „Physiotherapie“ mit der Notiz „Knie schmerzt“ eintragen (Speichern per `tap()`), Agent-Sheet öffnen, „Mit Plan und letzten Ergebnissen kopieren“, Zwischenablage auslesen, „Export für Coach“ kopieren und auslesen, Info-Seite. Danach `context.cookies()`, `document.cookie`, `localStorage`, `sessionStorage`, Cache Storage, IndexedDB und Service-Worker-Registrierungen ausgelesen. | 115 Requests, alle an 127.0.0.1:8772, kein externer Request. 0 Cookies, `localStorage` und `sessionStorage` leer. Ein Cache `training-pwa-…`, ein Service Worker mit Scope `/training/`. Eine IndexedDB `training-pwa` mit `files` (genau eine Datei, die aktive Trainingsdatei) und `kv` (`activeFileId`, `stamp`). CSP `connect-src 'none'` (`index.html:6`). Die Aussagen sind damit in Chromium belegt. Code-Suche: Einzige externe Adresse ist der Link auf die Datenschutzerklärung von GitHub (`info.js:7`), der nur auf Tap öffnet (`rel="noopener noreferrer"`). |
| Agent-Prompt gegen Hinweistext | Gleiches Skript, Hinweis `app.js:396` | Der Prompt enthält pro Übung Gewicht, Wiederholungen, Datum und „obere Grenze“, die anderen Trainings nur zusammengefasst (`"Physiotherapie": 1× · 60 min`). Die Notiz „Knie schmerzt“ ist **nicht** enthalten. Der Hinweis nennt Gewichte, Wiederholungen, RIR, Datum und die anderen Trainings der letzten 4 Wochen. Er passt. |
| Export für Coach gegen Hinweistext | Gleiches Skript, Hinweis `app.js:413` | Der Export enthält die Notiz „Knie schmerzt“, aber keine UUIDs und keine Zeitstempel. Der Hinweis sagt ausdrücklich „auch deine Notizen“ und „keine medizinische Beratung“. Er passt. |
| Einwilligungs-Banner (§ 165 Abs. 3 TKG 2021) | Speicherzugriffe siehe oben | Kein neuer Speicherort, ein Banner ist weiter nicht nötig (Einschätzung 5). |
| Datenschutzinformation | `info.js:21–34` gegen das Verhalten | Inhaltlich zutreffend. Offen bleiben die Zweckangabe (N1) und die formalen Punkte aus N2. |
| Gesundheits- und Haftungshinweise | `app.js:350`, `app.js:389`, `app.js:413`, `views/plan.js:32`, `info.js:37`, `README.md:124`; Texte im Browser gelesen | Alle Hinweise sind vorhanden und an den Stellen sichtbar, an denen Daten an KI-Dienste gehen. Keine neuen Gesundheitsabfragen, keine Heilversprechen. |
| Lizenzen | `LICENSE` (MIT), `package.json` (keine Abhängigkeiten, `license: MIT`), `OPEN_SOURCE` in `legal.js` (leer), Info-Seite („Keine eingebunden.“), `README.md:51` zum FIT-Encoder | Unverändert. Keine gebündelten Fremdbibliotheken, keine neuen Assets. |
| Marken | `grep` nach Garmin, Apple, iPhone in `training/` und README | Nur beschreibend („Für Garmin exportieren“, „In Garmin Connect importieren“). `README.md:125` enthält den Hinweis, dass keine Verbindung zu den Unternehmen besteht. Keine Logos. Keine neuen Fundstellen. |
| Öffentliches Repo, Historie, Metadaten | Autoren und Committer über `git log --all`. Skript liest die Betreiberangaben aus `legal.js`, gibt sie nicht aus und sucht damit (ganz und in Namensteilen) im Arbeitsbaum (`git grep`), in der Historie (`git log --all -S`), in Commit-Nachrichten und in Autor/Committer. Zusätzlich Suche nach Hinweisen auf das private Repo und nach Session-Links. | Nur `noreply`-Adressen (Betreiberkonto und Claude). Klarname, Wohnort und Mailadresse stehen nur in `legal.js` und in der Historie nur im Commit `aa3dbad`, der `legal.js` anlegt. Treffer außerhalb davon entstehen nur über den Kontonamen (bekannt, Entscheidung des Betreibers). Alle 6 Commits seit `32a6680` tragen Session-Links. Hinweise auf das private Repo: siehe N4. |
| Unit-Tests | `npm test` | 207/207 bestanden. |
| Datenschutz-Framework USA (Hosting-Text, `info.js:27`) | Web-Recherche | Das Rechtsmittel C-703/25 P gegen EuG T-553/23 ist weiter anhängig. Ein Urteil, ein Schlussantrag oder ein Verhandlungstermin war nicht auffindbar (Einschätzung 6). |

## Nicht geprüft (mit Grund)

- **WebKit und echtes iPhone:** Nur Chromium ist installiert. Cookies, Speicher und Netzwerk habe ich deshalb nur in Chromium geprüft.
- **Live-Seite und Response-Header von GitHub Pages:** 3.0 ist noch nicht ausgeliefert, geprüft habe ich den lokalen Stand.
- **Aktuelle DPF-Zertifizierung von GitHub und Wortlaut der GitHub-Datenschutzerklärung:** Die Hosts `www.dataprivacyframework.gov` und `docs.github.com` sind in dieser Sitzung nicht erreichbar (Netzwerkbeschränkung der Sitzung). Der Satz „ist nach dem EU-U.S. Data Privacy Framework zertifiziert“ ist deshalb in dieser Runde nicht neu belegt. Vor der Auslieferung einmal auf der DPF-Liste nachsehen.
- **RIS:** Die Gesetzestexte habe ich nicht erneut abgerufen. Grundlage sind die in früheren Runden zitierten Fundstellen.
- **Garmin-FIT-Lizenztext im Wortlaut:** nicht erneut gelesen, der FIT-Export ist seit Runde 5 unverändert.
- **Inhalt der `Claude-Session`-Links:** nicht aufgerufen, dafür ist eine Anmeldung nötig.
- **GitHub-Einstellungen des öffentlichen Repos** (Wiki, Issues, PR-Refs, Rulesets): nicht abgefragt.

## Rechtliche Einschätzungen (ohne Befund)

Gegenüber Runde 6 inhaltlich unverändert, gegen den aktuellen Stand erneut nachvollzogen.

1. **§ 25 MedienG, kleine Website:** Kein Inhalt, der die öffentliche Meinungsbildung beeinflussen kann, daher genügen Name und Wohnort (§ 25 Abs. 5). **Wahrscheinlich ausreichend.** Ein Impressum nach § 24 ist nur für Medienwerke nötig, hier also nicht: **eindeutig**. Quelle: §§ 1 Abs. 1 Z 5a, 24, 25 MedienG ([RIS](https://www.ris.bka.gv.at/NormDokument.wxe?Abfrage=Bundesnormen&Gesetzesnummer=10000719&Paragraf=25)).
2. **ECG § 5:** Unentgeltlich, keine Werbung, keine Verkaufsangebote, keine Spendenaufrufe. **Wahrscheinlich nicht anwendbar.** Quelle: §§ 3 Z 1, 5 ECG; EuGH C-291/13 (Papasavvas).
3. **DSGVO für die Website:** Öffentlich abrufbar, die Haushaltsausnahme greift nicht. DSGVO anwendbar: **eindeutig**. Quelle: Art. 2 Abs. 2 lit. c DSGVO; EuGH C-101/01 (Lindqvist).
4. **Trainingsdaten auf dem Gerät:** Auch Freitexte, die Gesundheitsdaten sein können (z. B. „Physiotherapie“, „Knie schmerzt“). Der Betreiber erhält sie nicht, das Netzwerkprotokoll zeigt keine externen Requests. Für diese Daten ist er **wahrscheinlich** nicht Verantwortlicher, Art. 9 DSGVO trifft ihn deshalb **wahrscheinlich** nicht. Quelle: Art. 4 Nr. 7 und 15, Art. 9 DSGVO.
5. **Kein Einwilligungs-Banner:** IndexedDB (aktive Trainingsdatei) und Cache Storage (App-Dateien) sind für den gewünschten Offline-Dienst unbedingt erforderlich, es gibt keine Cookies und keine Dritten. Einwilligung **wahrscheinlich** nicht nötig. Quelle: § 165 Abs. 3 TKG 2021 (Art. 5 Abs. 3 RL 2002/58/EG); EDSA-Leitlinien 2/2023.
6. **Hosting und Drittlandtransfer:** Der Angemessenheitsbeschluss zum Data Privacy Framework gilt weiter, das Rechtsmittel C-703/25 P ist anhängig. Der Satz zur Zertifizierung ist **wahrscheinlich** korrekt (in dieser Runde nicht neu belegt, siehe oben). Die Rollenverteilung zwischen GitHub und dem Betreiber bei den Zugriffsprotokollen ist **unklar, anwaltlich klären**. Quellen: Art. 4 Nr. 7, 26, 28 DSGVO; EuGH C-40/17 (Fashion ID); Durchführungsbeschluss (EU) 2023/1795; [EUR-Lex C/2025/6610](https://eur-lex.europa.eu/eli/C/2025/6610/oj); [WilmerHale, 2025-12-01](https://www.wilmerhale.com/en/insights/blogs/wilmerhale-privacy-and-cybersecurity-law-blog/20251201-european-court-of-justice-to-review-challenge-to-eu-us-data-privacy-framework); [Digital Policy Alert](https://digitalpolicyalert.org/event/35459-latombe-filed-appeal-against-general-court-dismissal-of-challenge-to-european-unionunited-states-data-protection-framework-adequacy-decision-in-latombe-v-commission).
7. **Medizinprodukt:** Tagebuch ohne Diagnose, Therapie oder medizinische Auswertung. **Wahrscheinlich** kein Medizinprodukt. Quelle: Art. 2 Nr. 1, ErwG 19 VO (EU) 2017/745; MDCG 2019-11.
8. **KI-Verordnung:** Kein KI-System in der App, sie erzeugt nur Text, den der Nutzer selbst weitergibt. **Wahrscheinlich** keine Pflichten. Quelle: Art. 2, Art. 3 Nr. 1 VO (EU) 2024/1689.
9. **Produkthaftung und Cyber Resilience Act:** Freie Software außerhalb einer Geschäftstätigkeit. **Wahrscheinlich** beides nicht anwendbar. Quellen: Art. 2 Abs. 2 RL (EU) 2024/2853; Art. 3 Nr. 22, ErwG 18 VO (EU) 2024/2847.
10. **Haftung:** Unentgeltlich, privat, kein mitgelieferter Plan, Hinweis „keine medizinische Beratung“ an allen Weitergabestellen. **Wahrscheinlich** geringes Risiko. Quelle: § 1300 ABGB.
11. **Marken:** Nur beschreibend, keine Logos, Hinweis auf fehlende Verbindung. **Wahrscheinlich** zulässig. Quelle: Art. 14 Abs. 1 lit. c VO (EU) 2017/1001; § 10 Abs. 3 MSchG; EuGH C-228/03 (Gillette).
12. **Eigene Lizenz MIT, Rechteinhaber das GitHub-Konto:** **Wahrscheinlich** passend. Ob der überwiegend KI-erzeugte Code urheberrechtlich geschützt ist: **unklar, anwaltlich klären** (praktisch folgenlos). Quelle: § 1 Abs. 1 UrhG.
13. **RPE-Wörter:** Kurze Allerweltswörter erreichen **wahrscheinlich** keine Werkhöhe. Schutz der Zuordnung Wörter–Zahlen als Ganzes: **unklar, anwaltlich klären** (Risiko sehr gering). Quelle: § 1 UrhG.

## Findings

### Kritisch

Keine.

### Hoch

Keine.

### Mittel

Keine.

### Niedrig

#### N1: Zweckangabe auf der Info-Seite nennt nur Krafttraining (offen seit Runde 5)

- **Fundstelle:** `training/src/views/info.js:17`, gleichlautend `docs/spezifikation.md:277`.
- **Beschreibung:** Unverändert, in `reviews/umsetzung-r6.md` als „Entscheidung Betreiber“, in `docs/stand.md:51` als offen geführt. Ab 3.0 protokolliert die App auch andere Trainings mit Dauer, RPE und Notiz.
- **Auswirkung:** Gering. Die Verarbeitung durch den Betreiber ändert sich nicht, die Einordnung nach § 25 Abs. 5 MedienG bleibt gleich. Die Zweckangabe ist aber unvollständig.
- **Empfehlung:** Vor der Auslieferung von 3.0 entscheiden, z. B. „… zum persönlichen Protokollieren von Krafttraining und anderen Trainings“, mit derselben Änderung in der Spezifikation. Lässt der Betreiber den Text, die Entscheidung in `docs/stand.md` als „entschieden“ festhalten.
- **Sicherheit:** Befund **eindeutig**, Rechtsfolgen **wahrscheinlich** keine. Quelle: Art. 5 Abs. 1 lit. a, Art. 12 Abs. 1 DSGVO; § 25 Abs. 5 MedienG.

#### N2: `<noscript>`-Text und Hinweise zu Widerspruch und Bereitstellungspflicht (offen seit Runde 3)

- **Fundstelle:** `training/index.html:25`; `training/src/views/info.js:27` und `:34`.
- **Beschreibung:** Unverändert, „Entscheidung Betreiber“. Ohne JavaScript ist die Offenlegung nicht sichtbar (die Startseite der Domain verlinkt nur auf `training/#info`, das ebenfalls JavaScript braucht). Das Widerspruchsrecht wird nicht getrennt hervorgehoben. Ein Satz nach Art. 13 Abs. 2 lit. e DSGVO fehlt.
- **Auswirkung:** Formale Lücken mit geringem Risiko.
- **Empfehlung:** Wie in den Runden 4 bis 6. Mindestens die Entscheidung des Betreibers in `docs/stand.md` festhalten, damit der Punkt nicht in jeder Runde wiederkehrt.
- **Sicherheit:** **Wahrscheinlich.** Quelle: § 25 Abs. 1 MedienG; Art. 12 Abs. 1, Art. 13 Abs. 2 lit. b und e, Art. 21 Abs. 4 DSGVO.

#### N3: Reichweite der Garmin-FIT-Lizenz (offen seit Runde 3)

- **Fundstelle:** `training/src/garmin/fit.js`, `training/src/garmin/categories.js`, `README.md:51`.
- **Beschreibung:** Unverändert. Eigener Encoder mit Nummern aus dem FIT-Profil, laut README ohne SDK-Code.
- **Auswirkung:** Sehr geringes Risiko für ein privates, unentgeltliches Projekt.
- **Empfehlung:** Lizenztext einmal vollständig lesen und das Ergebnis mit Datum in `docs/stand.md` festhalten.
- **Sicherheit:** **Unklar, anwaltlich klären.** Quellen: § 1 UrhG; §§ 76c ff. UrhG; FIT Protocol License.

#### N4: Hinweise auf das private Zwischen-Repo in `docs/stand.md` und `reviews/`, Session-Links in Commits (Fortsetzung Runde 6 N5)

- **Fundstelle:** `docs/stand.md:29` (Name und Branch des privaten Repos) und `:31` (Vermerk zur Bereinigung); `reviews/code-qualitaet-r5.md:4`, `reviews/security-r5.md:3` (Branchname der Cloud-Sitzung); neu `reviews/security-r6.md:3` und `:79` („privates WIP-Repo“). Alle 6 Commits seit `32a6680` tragen `Claude-Session`-Links.
- **Beschreibung:** Der Widerspruch zwischen `docs/stand.md:31` („Branchnamen des privaten Repos auch aus `reviews/` entfernen“) und Spezifikation Abschnitt 9 („Berichte nicht umschreiben“) ist weiter nicht entschieden (`docs/stand.md:51`, `reviews/umsetzung-r6.md`). Mit jeder Runde kommen Berichte mit solchen Verweisen dazu.
- **Auswirkung:** Kein Rechtsverstoß, Branch- und Repo-Namen sind keine personenbezogenen Daten über den bekannten Kontonamen hinaus. Ohne Entscheidung droht beim Übertrag entweder ein Verstoß gegen die eigene Übergaberegel oder gegen „Berichte nicht umschreiben“.
- **Empfehlung:** Vor der Übergabe eine der beiden Regeln ausdrücklich anpassen (z. B. „Schwärzen von Branch- und Repo-Namen gilt nicht als Umschreiben“ oder „Verweise in Berichten bleiben stehen“). Danach wie bei 2.0: Squash mit eigener Commit-Nachricht ohne Session-Links, Zeilen 29 und 31 in `stand.md` entfernen, im öffentlichen Repo `git log -p` nach `-wip` und `claude.ai/code/session_` durchsuchen. Der Hinweis in `CLAUDE.md` (Attribution mit Session-Link) gilt nur für dieses Zwischen-Repo und darf nicht in die öffentlichen Commits durchschlagen.
- **Sicherheit:** Befund **eindeutig**, Rechtsfolgen **wahrscheinlich** keine. Quelle: `CLAUDE.md` (Abschnitt „Persönliche Daten“), `docs/spezifikation.md` Abschnitt 9.

## Weitere Beobachtungen ohne Handlungsbedarf

1. **Bereinigung der Trainingsart im Validator** (`model/validate.js:441`, `:596`): Importierte Trainingsarten werden wie in der App bereinigt. Coach-Export und Prompt zeigen dadurch, was der Nutzer sieht. Das stützt die Transparenz der Weitergabe (Art. 5 Abs. 1 lit. a DSGVO).
2. **Zusammenführen mit Vorrang des Gewinners** (`model/training-file.js`): Rechtlich neutral, verhindert aber, dass eine präparierte ältere Datei lokale Einträge verdrängt (Integrität, Art. 5 Abs. 1 lit. f DSGVO, hier nur sinngemäß, da der Betreiber für die Gerätedaten wahrscheinlich nicht verantwortlich ist).
3. **„Training verwerfen“ getrennt von „Beenden und speichern“** (`app.js:1192–1196`): Rechtlich neutral, verringert das Risiko versehentlichen Datenverlusts.
4. **Die Spezifikation (Abschnitt 6)** nutzt weiter Platzhalter für die Betreiberangaben, wie vorgesehen.

## Zusammenfassung

| Schwere | Anzahl |
|---|---|
| Kritisch | 0 |
| Hoch | 0 |
| Mittel | 0 |
| Niedrig | 4 (N1 bis N4, alle aus früheren Runden offen, keines neu durch Änderungen seit Runde 6) |

Punkte mit „unklar, anwaltlich klären“:
- Einschätzung 6: Rollenverteilung zwischen GitHub und Betreiber bei den Pages-Zugriffsprotokollen (Art. 4 Nr. 7, 26, 28 DSGVO).
- Einschätzung 12: Urheberrechtsschutz für überwiegend KI-erzeugten Code und damit Reichweite der MIT-Lizenz (§ 1 UrhG).
- Einschätzung 13: Schutz einer Zuordnung von Wörtern zu RPE-Zahlen als Ganzes (§ 1 UrhG).
- N3: Reichweite der Garmin-FIT-Lizenz für den eigenen Encoder mit Profilnummern (§ 1, §§ 76c ff. UrhG).

Quellen der Web-Recherche: [EUR-Lex C/2025/6610](https://eur-lex.europa.eu/eli/C/2025/6610/oj), [WilmerHale](https://www.wilmerhale.com/en/insights/blogs/wilmerhale-privacy-and-cybersecurity-law-blog/20251201-european-court-of-justice-to-review-challenge-to-eu-us-data-privacy-framework), [Digital Policy Alert](https://digitalpolicyalert.org/event/35459-latombe-filed-appeal-against-general-court-dismissal-of-challenge-to-european-unionunited-states-data-protection-framework-adequacy-decision-in-latombe-v-commission), [IAPP](https://iapp.org/news/a/european-general-court-dismisses-latombe-challenge-upholds-eu-us-data-privacy-framework).
