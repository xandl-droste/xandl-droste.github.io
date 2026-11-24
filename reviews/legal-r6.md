# Review Runde 6: Recht und Compliance (Österreich/EU)

Reviewer 2, frische Instanz. Geprüft am 2026-11-23, Stand Commit `32a6680` (Version 3.0.0, `CHANGELOG.md` „in Arbeit“). Die Änderungen seit dem Bericht aus Runde 5 habe ich mit `git diff 8405d39..HEAD` verglichen (20 Dateien, davon 13 mit Code, Tests oder Service Worker).
Dieser Bericht ersetzt keine anwaltliche Beratung. Jede Aussage ist als **eindeutig**, **wahrscheinlich** oder **unklar, anwaltlich klären** gekennzeichnet und nennt ihre Rechtsquelle.
Persönliche Daten zitiere ich nicht. Ich verweise nur auf die „Betreiberangaben in legal.js“. Name und Branches des privaten Zwischen-Repos nenne ich ebenfalls nicht.

## Geprüfte Punkte

| Punkt | Wie geprüft | Ergebnis |
|---|---|---|
| Änderungen seit Runde 5 mit rechtlicher Bedeutung | Diff von `app.js`, `model/activities.js`, `model/validate.js`, `model/coach-export.js`, `model/training-file.js`, `views/activity.js`, `views/archive.js`, `docs/stand.md`, `docs/begriffe.md` | Rechtlich relevant ist nur der neue Hinweistext am Agent-Prompt (`app.js:392`, Runde 5 N2). Alle übrigen Änderungen betreffen Bedienung (Tap, Sheet, Fokus), Datenqualität (unsichtbare Zeichen in der Trainingsart, Sortierung) und Zählung. Es gibt keine neue Datenübertragung und keinen neuen Speicherort. `info.js` und `legal.js` sind unverändert. |
| Offenlegung nach § 25 MedienG | `training/src/views/info.js:18–20`. Werte in `legal.js` gelesen, hier nicht zitiert. Info-Seite im Browser geöffnet. | Name, Wohnort und Kontakt sind eingetragen, keine Platzhalter mehr. Die Überschrift „§ 25 MedienG“ wird gerendert, die Version „3.0.0“ steht auf der Seite. |
| ECG § 5 | Rechtliche Einordnung | Wie bisher **wahrscheinlich** nicht anwendbar (Einschätzung 2). |
| Aussagen „keine Cookies“, „kein Tracking“, „nicht an den Betreiber übertragen“, „Es wird nichts hochgeladen“ | Eigenes Playwright-Skript in Chromium (375 × 630, Touch) gegen 127.0.0.1:8772. Ablauf: Plan öffnen, ein komplettes Training im Fokus, anderes Training „Physiotherapie“ mit der Notiz „Knie schmerzt“ eingetragen (Speichern per `tap()`), Agent-Sheet geöffnet, Hinweistexte gelesen, „Mit Plan und letzten Ergebnissen kopieren“ ausgeführt und die Zwischenablage ausgelesen, dann die Info-Seite geöffnet. Danach `context.cookies()`, `document.cookie`, `localStorage`, `sessionStorage`, Cache Storage, IndexedDB und Service-Worker-Registrierungen ausgelesen. | 114 Requests, alle an 127.0.0.1:8772, kein externer Request. 0 Cookies, `localStorage` und `sessionStorage` leer. Ein Cache `training-pwa-…`, ein Service Worker mit Scope `/training/`. Eine IndexedDB `training-pwa` mit den Stores `files` (genau eine Datei, die aktive Trainingsdatei mit `activities`) und `kv` (`activeFileId`, `stamp`). Die Aussagen sind damit in Chromium belegt. |
| Inhalt des kopierten Agent-Prompts gegen den Hinweis | Gleiches Skript, `agent-prompt.js:193–262` | Der Prompt enthält pro Übung Gewicht, Wiederholungen, Datum, „obere Grenze“ und RIR (falls erfasst). Andere Trainings stehen nur zusammengefasst darin (`"Physiotherapie": 1× · 60 min`). Die Notiz „Knie schmerzt“ ist nicht enthalten. Neuer Hinweis: „Die Ergebnisse (Gewichte, Wiederholungen, RIR und Datum, dazu die anderen Trainings der letzten 4 Wochen) gehen dann ebenfalls an den Anbieter des KI-Dienstes.“ Er passt zum Inhalt (`ACTIVITY_WEEKS` = 4). Runde 5 N2 ist erledigt. |
| Hinweise im Export für Coach | `app.js:404–416` | „Was du dem KI-Dienst gibst, geht an dessen Anbieter, auch deine Notizen.“ ist unverändert vorhanden. |
| Browser-Prüfungen des Projekts | `info.e2e.mjs`, `anderes-training.e2e.mjs`, `archiv.e2e.mjs` gegen Port 8772 | Alle grün, jeweils ohne externe Requests. |
| Unit-Tests | `npm test` | 205/205 bestanden. |
| Einwilligungs-Banner (§ 165 Abs. 3 TKG 2021) | Speicherzugriffe siehe oben | Es gibt keinen neuen Speicherort. Ein Banner ist weiter nicht nötig (Einschätzung 5). |
| Datenschutzinformation | `info.js:21–34` gegen das Verhalten | Inhaltlich zutreffend. Die Zweckangabe nennt weiter nur Krafttraining (N1). |
| Gesundheits- und Haftungshinweise | `app.js:346`, `app.js:385`, `app.js:409`, `views/plan.js:32`, `info.js:37`, `README.md:124` | Alle Hinweise sind vorhanden. Es gibt keine neuen Gesundheitsabfragen und keine Heilversprechen. |
| Lizenzen | `LICENSE` (MIT), `package.json` (keine Abhängigkeiten), `OPEN_SOURCE` in `legal.js` (leer), Info-Seite („Keine eingebunden.“) | Unverändert. Es gibt keine gebündelten Fremdbibliotheken und keine neuen Assets. |
| Marken | `git grep` nach Garmin, Apple, iPhone, Strava, Polar, Suunto, Borg und CR-10 in `training/`, README und CHANGELOG | Die Namen werden nur beschreibend verwendet. `README.md:125` enthält einen Hinweis, dass keine Verbindung zu den Unternehmen besteht. Keine Logos. Keine neuen Fundstellen. |
| Öffentliches Repo, Historie, Metadaten | Autoren und Committer über `git log --all`. Ein Skript liest die Betreiberangaben aus `legal.js`, gibt sie nicht aus und durchsucht damit Arbeitsbaum (`git grep`), Historie (`git log -S`) und Commit-Nachrichten. Zusätzlich Suche nach Session-Links und Hinweisen auf das private Repo. | Nur `noreply`-Adressen (Betreiberkonto und Claude). Klarname, Wohnort und Mailadresse stehen nur in `legal.js` und in der Historie nur im Commit `aa3dbad`, der `legal.js` anlegt. Treffer außerhalb davon kommen nur über den Kontonamen zustande (bekannt, Entscheidung des Betreibers). Alle 15 Commits seit `2feefdd` tragen Session-Links. Hinweise auf das private Repo stehen in `docs/stand.md` und neu auch in zwei Berichten aus Runde 5 (N5). |
| Datenschutz-Framework USA (Hosting-Text) | Web-Recherche | Das Rechtsmittel C-703/25 P ist weiter anhängig, ein Urteil habe ich nicht gefunden (Einschätzung 6). |

## Nicht geprüft (mit Grund)

- **WebKit und echtes iPhone:** Nur Chromium ist installiert. Cookies, Speicher und Netzwerk habe ich deshalb nur in Chromium geprüft.
- **Live-Seite und Response-Header von GitHub Pages:** 3.0 ist noch nicht ausgeliefert, geprüft habe ich den lokalen Stand.
- **RIS:** Die Gesetzestexte habe ich nicht erneut abgerufen. Grundlage sind die in früheren Runden zitierten Fundstellen.
- **Garmin-FIT-Lizenztext im Wortlaut:** nicht erneut gelesen. Seit Runde 5 hat sich am FIT-Export nichts geändert (N4).
- **Inhalt der `Claude-Session`-Links:** nicht aufgerufen, dafür ist eine Anmeldung nötig.
- **GitHub-Einstellungen des öffentlichen Repos** (Wiki, Issues, PR-Refs): nicht abgefragt.

## Rechtliche Einschätzungen (ohne Befund)

Gegenüber Runde 5 sind sie inhaltlich unverändert. Ich habe sie gegen den aktuellen Stand erneut nachvollzogen.

1. **§ 25 MedienG, kleine Website:** Die Seite hat keinen Inhalt, der die öffentliche Meinungsbildung beeinflussen kann. Name und Wohnort genügen daher (§ 25 Abs. 5). **Wahrscheinlich ausreichend.** Ein Impressum nach § 24 ist nur für Medienwerke nötig, also hier nicht: **eindeutig**. Quelle: §§ 1 Abs. 1 Z 5a, 24, 25 MedienG ([RIS](https://www.ris.bka.gv.at/NormDokument.wxe?Abfrage=Bundesnormen&Gesetzesnummer=10000719&Paragraf=25)).
2. **ECG § 5:** Die Seite ist unentgeltlich und hat keine Werbung, keine Verkaufsangebote und keine Spendenaufrufe. **Wahrscheinlich nicht anwendbar.** Quelle: §§ 3 Z 1, 5 ECG; EuGH C-291/13 (Papasavvas).
3. **DSGVO für die Website:** Die Seite ist öffentlich, die Haushaltsausnahme greift nicht. Die DSGVO ist anwendbar: **eindeutig**. Quelle: Art. 2 Abs. 2 lit. c DSGVO; EuGH C-101/01 (Lindqvist).
4. **Trainingsdaten auf dem Gerät:** Das schließt Freitexte ein, die Gesundheitsdaten sein können. Der Betreiber erhält diese Daten nicht, das Netzwerkprotokoll zeigt keine externen Requests. Für diese Daten ist er **wahrscheinlich** nicht Verantwortlicher, Art. 9 DSGVO trifft ihn deshalb **wahrscheinlich** nicht. Quelle: Art. 4 Nr. 7 und 15, Art. 9 DSGVO.
5. **Kein Einwilligungs-Banner:** Die Speicherzugriffe (IndexedDB mit der aktiven Trainingsdatei, Cache Storage mit den App-Dateien) sind für den gewünschten Offline-Dienst unbedingt erforderlich. Es gibt keine Cookies und keine Dritten. Eine Einwilligung ist daher **wahrscheinlich** nicht nötig. Quelle: § 165 Abs. 3 TKG 2021 (Art. 5 Abs. 3 RL 2002/58/EG); EDSA-Leitlinien 2/2023.
6. **Hosting und Drittlandtransfer:** Der Angemessenheitsbeschluss zum Data Privacy Framework gilt weiter. Das Rechtsmittel gegen EuG T-553/23 (Latombe) ist als C-703/25 P beim EuGH anhängig. Ein Urteil oder ein Verhandlungstermin war nicht auffindbar. Der Satz zur Zertifizierung auf der Info-Seite ist **wahrscheinlich** korrekt. Die Rollenverteilung zwischen GitHub und dem Betreiber bei den Zugriffsprotokollen ist **unklar, anwaltlich klären**. Quellen: Art. 4 Nr. 7, 26, 28 DSGVO; EuGH C-40/17 (Fashion ID); Durchführungsbeschluss (EU) 2023/1795; [EUR-Lex C/2025/6610](https://eur-lex.europa.eu/eli/C/2025/6610/oj); [WilmerHale, 2025-12-01](https://www.wilmerhale.com/en/insights/blogs/wilmerhale-privacy-and-cybersecurity-law-blog/20251201-european-court-of-justice-to-review-challenge-to-eu-us-data-privacy-framework); [heise](https://heise.de/-10965203).
7. **Medizinprodukt:** Die App ist ein Tagebuch ohne Diagnose, Therapie oder Auswertung zu medizinischen Zwecken. **Wahrscheinlich** kein Medizinprodukt. Quelle: Art. 2 Nr. 1, ErwG 19 VO (EU) 2017/745; MDCG 2019-11.
8. **KI-Verordnung:** Die App enthält kein KI-System, sie erzeugt nur Text, den der Nutzer selbst weitergibt. **Wahrscheinlich** keine Pflichten. Quelle: Art. 2, Art. 3 Nr. 1 VO (EU) 2024/1689.
9. **Produkthaftung und Cyber Resilience Act:** Freie und quelloffene Software außerhalb einer Geschäftstätigkeit ist von der neuen Produkthaftungsrichtlinie ausgenommen. Der CRA erfasst nur die Bereitstellung im Rahmen einer Geschäftstätigkeit. **Wahrscheinlich** ist beides nicht anwendbar. Quellen: Art. 2 Abs. 2 RL (EU) 2024/2853; Art. 3 Nr. 22, ErwG 18 VO (EU) 2024/2847.
10. **Haftung:** Die App ist unentgeltlich und privat und liefert keinen Plan mit. An allen Stellen, an denen Daten weitergegeben werden, steht „keine medizinische Beratung“. **Wahrscheinlich** geringes Risiko. Quelle: § 1300 ABGB.
11. **Marken:** Die Namen werden nur beschreibend verwendet, es gibt keine Logos und einen Hinweis, dass keine Verbindung zu den Unternehmen besteht. **Wahrscheinlich** zulässig. Quelle: Art. 14 Abs. 1 lit. c VO (EU) 2017/1001; § 10 Abs. 3 MSchG; EuGH C-228/03 (Gillette).
12. **Eigene Lizenz MIT, Rechteinhaber ist das GitHub-Konto:** **Wahrscheinlich** passend. Ob der überwiegend KI-erzeugte Code urheberrechtlich geschützt ist, bleibt **unklar, anwaltlich klären**. Praktisch hat das keine Folgen. Quelle: § 1 Abs. 1 UrhG.
13. **RPE-Wörter:** Kurze Allerweltswörter erreichen **wahrscheinlich** keine Werkhöhe. Ob eine Zuordnung von Wörtern zu Zahlen als Ganzes geschützt sein kann, bleibt **unklar, anwaltlich klären**. Das Risiko ist praktisch sehr gering. Quelle: § 1 UrhG.

## Findings

### Kritisch

Keine.

### Hoch

Keine.

### Mittel

Keine.

### Niedrig

#### N1: Zweckangabe auf der Info-Seite nennt nur Krafttraining (offen aus Runde 5, N1)

- **Fundstelle:** `training/src/views/info.js:17`, gleichlautend `docs/spezifikation.md:277`. Im Browser angezeigt: „… zum persönlichen Protokollieren von Krafttraining.“
- **Beschreibung:** Unverändert. In `reviews/umsetzung-r5.md` steht der Punkt als „Entscheidung Betreiber“, in `docs/stand.md` als offen. Ab 3.0 protokolliert die App auch andere Trainings mit RPE und Notiz.
- **Auswirkung:** Gering. Die Verarbeitung durch den Betreiber ändert sich nicht, und die Einordnung nach § 25 Abs. 5 MedienG bleibt dieselbe. Die Zweckangabe ist aber unvollständig.
- **Empfehlung:** Vor der Auslieferung von 3.0 entscheiden. Vorschlag: „… zum persönlichen Protokollieren von Krafttraining und anderen Trainings“, mit derselben Änderung in der Spezifikation.
- **Sicherheit:** Der Befund ist **eindeutig**. Rechtsfolgen hat er **wahrscheinlich** keine. Quelle: Art. 5 Abs. 1 lit. a, Art. 12 Abs. 1 DSGVO; § 25 Abs. 5 MedienG.

#### N2: `<noscript>`-Text und Hinweis zum Widerspruch (offen seit Runde 3)

- **Fundstelle:** `training/index.html:25`; `training/src/views/info.js:27` und `info.js:34`.
- **Beschreibung:** Unverändert und als „Entscheidung Betreiber“ geführt. Ohne JavaScript ist die Offenlegung nicht sichtbar. Das Widerspruchsrecht wird nicht getrennt hervorgehoben. Ein Satz nach Art. 13 Abs. 2 lit. e DSGVO fehlt, also etwa, dass die Seite ohne die Verbindungsdaten nicht ausgeliefert werden kann.
- **Auswirkung:** Formale Lücken mit geringem Risiko.
- **Empfehlung:** Wie in Runde 4 und 5 vorgeschlagen. Alternativ die Entscheidung des Betreibers ausdrücklich in `docs/stand.md` unter „Bereits entschieden“ festhalten, damit der Punkt nicht in jeder Runde wiederkehrt.
- **Sicherheit:** **Wahrscheinlich.** Quelle: § 25 Abs. 1 MedienG; Art. 12 Abs. 1, Art. 13 Abs. 2 lit. b und e, Art. 21 Abs. 4 DSGVO.

#### N3: Reichweite der Garmin-FIT-Lizenz (offen seit Runde 3)

- **Fundstelle:** `training/src/garmin/fit.js`, `training/src/garmin/categories.js`.
- **Beschreibung:** Unverändert. Der eigene Encoder verwendet Nummern aus dem FIT-Profil. Laut README enthält er keinen SDK-Code.
- **Auswirkung:** Sehr geringes Risiko für ein privates, unentgeltliches Projekt.
- **Empfehlung:** Den Lizenztext einmal vollständig lesen und das Ergebnis mit Datum in `docs/stand.md` festhalten.
- **Sicherheit:** **Unklar, anwaltlich klären.** Quellen: § 1 UrhG; §§ 76c ff. UrhG; FIT Protocol License.

#### N4: Hinweistext am Agent-Prompt (Runde 5, N2): erledigt, hier nur zur Nachverfolgung

- **Fundstelle:** `training/src/app.js:392`.
- **Beschreibung:** Der neue Text nennt RIR und Datum und, falls vorhanden, die anderen Trainings der letzten 4 Wochen. Im Browser habe ich ihn gegen den kopierten Prompt geprüft: Er passt, Notizen gehen nicht mit. Dass auch die frei gewählte Trainingsart mitgeht (zum Beispiel „Physiotherapie“), ist durch „die anderen Trainings“ ausreichend gedeckt.
- **Auswirkung:** Keine.
- **Empfehlung:** Keine Änderung nötig. Ich führe den Punkt nur auf, damit der Abschluss von Runde 5 N2 belegt ist. Er zählt nicht in der Summe.
- **Sicherheit:** **Eindeutig** (Befund). Quelle: Art. 12 Abs. 1 DSGVO.

#### N5: Spuren des privaten Zwischen-Repos jetzt auch in `reviews/` (Fortsetzung Runde 4 N6 und Runde 5 N5)

- **Fundstelle:** `docs/stand.md:29` und `:31`. Neu: `reviews/code-qualitaet-r5.md:4` und `:95` sowie `reviews/security-r5.md:3` nennen den Arbeitsbranch der Cloud-Sitzung bzw. den Branch des privaten Repos und sprechen vom „privaten WIP-Repo“. Außerdem tragen alle 15 Commits seit `2feefdd` `Claude-Session`-Links.
- **Beschreibung:** `docs/stand.md:31` verlangt vor der Übergabe ausdrücklich: „Branchnamen des privaten Repos auch aus `reviews/` entfernen“. Die Spezifikation verlangt in Abschnitt 9 dagegen: „Berichte nicht umschreiben.“ Für die Berichte aus Runde 5 (und für diesen) widersprechen sich die beiden Regeln. Die Berichte enthalten keine personenbezogenen Daten über den bekannten Kontonamen hinaus. Sie verraten aber, dass ein privates Zwischen-Repo existiert und wie die Arbeitsbranches heißen.
- **Auswirkung:** Es liegt kein Rechtsverstoß vor, die Branchnamen sind keine personenbezogenen Daten. Kommt der Text ohne Bereinigung ins öffentliche Repo, verstößt das aber gegen die eigene Übergaberegel. Löscht oder bearbeitet jemand die Stellen aus Versehen, verstößt das gegen „Berichte nicht umschreiben“.
- **Empfehlung:** Vor der Übergabe entscheiden. Entweder die Branchnamen in den Berichten stehen lassen, weil sie unkritisch sind, und `docs/stand.md:31` entsprechend anpassen. Oder ausdrücklich festhalten, dass das Schwärzen von Branch- und Repo-Namen nicht als „Umschreiben“ gilt. Danach wie vermerkt die Squash-Nachricht neu schreiben, die Zeilen 29 und 31 in `stand.md` entfernen und im öffentlichen Repo `git log -p` nach `-wip` und `claude.ai/code/session_` durchsuchen.
- **Sicherheit:** Der Befund ist **eindeutig**. Rechtsfolgen hat er **wahrscheinlich** keine. Quelle: `CLAUDE.md` (Abschnitt „Persönliche Daten“), `docs/spezifikation.md` Abschnitt 9.

## Weitere Beobachtungen ohne Handlungsbedarf

1. **Datenqualität der Trainingsart:** Steuer-, Bidi- und unsichtbare Zeichen werden beim Eintragen entfernt (`model/activities.js:19`) und beim Import abgelehnt (`model/validate.js:432`). Dadurch zeigen Coach-Export und Prompt, was der Nutzer sieht. Das unterstützt die Transparenz der Weitergabe (Art. 5 Abs. 1 lit. a DSGVO).
2. **Korrigieren ohne Änderung erhöht die Revision nicht mehr** (`model/activities.js:70`). Rechtlich neutral.
3. **Ein Tap auf den Hintergrund verwirft keine Eingaben mehr** (`app.js:263`). Rechtlich neutral, schützt aber vor Datenverlust.
4. **Die Spezifikation (Abschnitt 6)** nutzt weiter Platzhalter für die Betreiberangaben, wie es sein soll.

## Zusammenfassung

| Schwere | Anzahl |
|---|---|
| Kritisch | 0 |
| Hoch | 0 |
| Mittel | 0 |
| Niedrig | 4 (N1, N2, N3, N5; N4 ist nur der Nachweis, dass Runde 5 N2 erledigt ist, und zählt nicht) |

Punkte mit „unklar, anwaltlich klären“:
- Einschätzung 6: Rollenverteilung zwischen GitHub und Betreiber bei den Pages-Zugriffsprotokollen (Art. 4 Nr. 7, 26, 28 DSGVO).
- Einschätzung 12: Urheberrechtsschutz für KI-erzeugten Code und damit Reichweite der MIT-Lizenz (§ 1 UrhG).
- Einschätzung 13: Schutz einer Zuordnung von Wörtern zu RPE-Zahlen als Ganzes (§ 1 UrhG).
- N3: Reichweite der Garmin-FIT-Lizenz für den eigenen Encoder mit Profilnummern (§ 1, §§ 76c ff. UrhG).

Quellen der Web-Recherche: [EUR-Lex C/2025/6610](https://eur-lex.europa.eu/eli/C/2025/6610/oj), [WilmerHale](https://www.wilmerhale.com/en/insights/blogs/wilmerhale-privacy-and-cybersecurity-law-blog/20251201-european-court-of-justice-to-review-challenge-to-eu-us-data-privacy-framework), [heise](https://heise.de/-10965203), [IAPP](https://iapp.org/news/a/european-general-court-dismisses-latombe-challenge-upholds-eu-us-data-privacy-framework).
