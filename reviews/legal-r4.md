# Review Runde 4: Recht und Compliance (Österreich/EU)

Reviewer 2, frische Instanz. Stand: Commit `f0fb7c1` (Zwischenstand vor den Fixes aus Runde 4, im öffentlichen Repo nicht auffindbar), Version 2.0.0, geprüft am 2026-11-23. Vergleich mit 1.0.1 (`62b944b`) über `git diff 62b944b..f0fb7c1`.
Kein Ersatz für anwaltliche Beratung. Jede Aussage ist gekennzeichnet als **eindeutig**, **wahrscheinlich** oder **unklar, anwaltlich klären**, mit Rechtsquelle.
Persönliche Daten werden in diesem Bericht nicht zitiert. Verwiesen wird nur auf die „Betreiberangaben in legal.js“.

## Geprüfte Punkte

| Punkt | Wie geprüft | Ergebnis |
|---|---|---|
| Änderungen 2.0 mit rechtlicher Bedeutung | `git diff 62b944b..f0fb7c1` (41 Dateien), insbesondere `app.js` (Coach-Sheet, Agent-Sheet), `model/coach-export.js`, `agent-prompt.js`, `views/rpe.js`, `views/archive.js`, `storage.js`, `views/plan.js`, README, CHANGELOG, Spezifikation | Neu sind RIR, RPE und Notiz pro Training, Export für Coach, Archiv und eine Trainingsdatei pro Durchgang. Keine neue Datenübertragung durch die App. `info.js` und `legal.js` sind gegenüber 1.0.1 unverändert. |
| Offenlegung § 25 MedienG | `training/src/views/info.js`, `training/src/legal.js` (Werte gelesen, hier nicht zitiert), Browser-Test der Info-Seite (Chromium, 375 × 630) | Name, Wohnort und Kontakt sind eingetragen, keine Platzhalter. Der Abschnitt „Betreiber / Offenlegung (§ 25 MedienG)“ wird gerendert. |
| Auffindbarkeit | `index.html` (Startseite verlinkt `./training/#info`), Menü (`app.js:307`), `<noscript>` in `training/index.html` | Unverändert gegenüber Runde 3. Ohne JavaScript nicht abrufbar (N3). |
| ECG § 5 | Rechtliche Einordnung | Wahrscheinlich nicht anwendbar (Einschätzung 2). |
| „keine Cookies“, „kein Tracking“, „keine externen Requests“, „nicht an den Betreiber übertragen“ | Eigenes Playwright-Skript (Chromium): Startseite, Plan öffnen, ein komplettes Training im Fokus, Info-Seite, Export für Coach. Dazu `context.cookies()`, `document.cookie`, `localStorage`, `sessionStorage`, Cache Storage, IndexedDB (Schlüssel) ausgelesen; Code-Suche nach `fetch`, `XMLHttpRequest`, `sendBeacon`, `WebSocket`, `EventSource`, `document.cookie`, `localStorage`; CSP in `training/index.html` | 0 Cookies, `localStorage` und `sessionStorage` leer, ein Cache `training-pwa-…`, eine IndexedDB `training-pwa` mit Store `files` (nur die aktive Trainingsdatei) und `kv` (`activeFileId`, `stamp`; dazu je nach Zustand `live`, `lastExport:<id>`). Alle 37 Requests gingen an 127.0.0.1:8782, kein externer Request. `connect-src 'none'`. Einziges `fetch` im Service Worker (`training/sw.js:104`, `:123`), gleiche Origin. Behauptungen belegt (Chromium). |
| Browser-Prüfungen des Projekts | `tests/e2e/archiv.e2e.mjs`, `rir.e2e.mjs`, `durchgang.e2e.mjs`, `info.e2e.mjs` gegen Port 8782 (Chromium) | Alle grün, je „externe Requests: keine“. `archiv.e2e.mjs` belegt zusätzlich: Eine im Archiv geöffnete Datei verändert den Browserspeicher nicht und ist nach Neuladen weg. |
| Unit-Tests | `npm test` | 178/178 bestanden. |
| Einwilligungs-Banner (§ 165 Abs. 3 TKG 2021) | Rechtliche Einordnung der gefundenen Speicherzugriffe | Nicht nötig (Einschätzung 5). |
| Datenschutzinformation | `info.js:21–34` gegen Art. 13 DSGVO und gegen das Verhalten von 2.0 | Inhaltlich weiter zutreffend. Nicht auf 2.0 nachgeführt (N1). Formale Lücke aus Runde 3 offen (N4). |
| Export für Coach | `model/coach-export.js`, `app.js:375–391`, erzeugter Text im Browser angesehen | Enthält Plan, Datum, Einheit, Sätze, RIR, RPE, Notizen pro Training und pro Übung, Varianten, Dateiname. Keine IDs außer Übungs-IDs, keine Zeitstempel, keine Betreiber- oder Gerätedaten. Weitergabe nur durch Tap auf „Teilen“ oder „Kopieren“. Hinweis „Was du dem KI-Dienst gibst, geht an dessen Anbieter, auch deine Notizen. Die Rückmeldungen sind keine medizinische Beratung.“ steht im Sheet (`app.js:385`). Siehe N2. |
| Agent-Prompt mit Ergebnissen | `agent-prompt.js` (Diff), `app.js:346–372` | Jetzt mit RIR, weiterhin ohne Notizen. Hinweis darunter nennt RIR nicht (N1). |
| RPE und RIR | `views/rpe.js`, Spezifikation Abschnitt 0 und 5 | Freiwillig, startet ohne Wert („keine Angabe“). Wörter einer 0–10-Skala, kein Markenname in der UI. Siehe N7. |
| Archiv | `views/archive.js`, `app.js:1150–1200`, e2e | Datei nur im Arbeitsspeicher, nichts gespeichert. |
| Speicherbegrenzung (2.0) | `storage.js`, Spezifikation Abschnitt 2, `durchgang.e2e.mjs` | Im Browser liegt nur die aktive Trainingsdatei. Alte Dateien werden nach Sicherung entfernt bzw. zum Sichern oder Verwerfen angeboten. Datenschutzfreundlich. |
| Gesundheits- und Haftungshinweise | Onboarding (`app.js:323`), Agent-Sheet (`app.js:361`), Coach-Sheet (`app.js:385`), Plan-Tab (`views/plan.js:32`), Info-Seite (`info.js:37`) | Hinweis an fünf Stellen, neu im Coach-Sheet. Keine Heils- oder Präventionsversprechen gefunden. |
| Lizenzen | `LICENSE`, `package.json`, `OPEN_SOURCE` in `legal.js` (leer), Info-Seite „Keine eingebunden.“, `garmin/categories.js`, Icons angesehen | MIT, keine gebündelten Fremdbibliotheken, keine Fonts. Icon: generische Hantel. FIT-Lizenz siehe N5. |
| Marken | Suche nach Garmin, Apple, iPhone, Borg, CR-10 in `training/`, README, Spezifikation | Garmin nur beschreibend („Für Garmin exportieren“, „In Garmin Connect importieren“). Apple/iPhone nur in README mit Hinweis auf fehlende Verbindung. „CR-10“ nur in Code-Kommentar, Spezifikation und Commit-Nachricht (N7). |
| Öffentliches Repo, Historie, Metadaten | `git log --all` (Autoren, Committer), Suche nach Klarname, Vorname, Wohnort und Mailadresse über Arbeitsbaum (ohne `node_modules`, `.claude/worktrees`) und über `git log --all -p` sowie alle Commit-Nachrichten; `.gitignore`; `git ls-files` | Autoren nur `noreply`-Adressen (Betreiber und Claude). Klarname, Wohnort und Mailadresse nur in `training/src/legal.js`, auch in der Historie (dort nur der Commit mit `legal.js`). Der Nachname steckt im Kontonamen (bekannt, Entscheidung des Betreibers). Spezifikation nutzt Platzhalter. `.claude/worktrees/` und `test-results/` sind ignoriert. Neu: Name des privaten WIP-Repos und Session-Links (N6). |

## Nicht geprüft (mit Grund)

- **WebKit:** Playwright-WebKit ist in dieser Umgebung nicht installiert (`Executable doesn't exist`). Cookies, Speicher und Netzwerk nur in Chromium geprüft. Ein echtes iPhone stand nicht zur Verfügung.
- **Live-Seite `xandl-droste.github.io`:** Der Proxy dieser Sitzung lässt den Host nicht zu (HTTP 403). Response-Header und ausgelieferte Dateien sind daher nicht live geprüft. 2.0 ist laut `docs/stand.md` noch nicht ausgeliefert.
- **RIS (Rechtsinformationssystem):** Host nicht erreichbar. Gesetzestexte nach Kenntnis und den in Runde 3 zitierten RIS-Fundstellen, nicht erneut abgerufen.
- **GitHub-Einstellungen (Wiki, Issues), PR-Refs im öffentlichen Repo:** nicht abgefragt. Geprüft wurde der lokale Klon mit beiden Remotes.
- **Garmin-FIT-Lizenztext im Wortlaut:** nicht erneut abgerufen (in Runde 3 HTTP 403). Unverändert offen (N5).
- **Inhalt der `Claude-Session`-Links:** nicht aufgerufen (Anmeldung nötig).
- **Lizenzbedingungen von BorgPerception:** nur Markeneintrag gefunden, keine Lizenzbedingungen (N7).

## Rechtliche Einschätzungen (ohne Befund)

1. **§ 25 MedienG, kleine Website:** Website (§ 1 Abs. 1 Z 5a lit. b MedienG) ohne Inhalt, der die öffentliche Meinungsbildung beeinflussen kann. Nach § 25 Abs. 5 genügen Name und Wohnort des Medieninhabers. Beides steht auf der Info-Seite (Betreiberangaben in legal.js). 2.0 ändert daran nichts, die Funktionen bleiben ohne redaktionellen Inhalt. **Wahrscheinlich ausreichend.** Ein Impressum nach § 24 MedienG gilt nur für Medienwerke. **Eindeutig.** Quelle: §§ 24, 25 MedienG (RIS: https://www.ris.bka.gv.at/NormDokument.wxe?Abfrage=Bundesnormen&Gesetzesnummer=10000719&Paragraf=25).
2. **ECG § 5:** Gilt für Dienste der Informationsgesellschaft, die in der Regel gegen Entgelt erbracht werden (§ 3 Z 1 ECG). Unentgeltlich, ohne Werbung, Verkauf oder Spenden. **Wahrscheinlich nicht anwendbar.** Quelle: §§ 3, 5 ECG; EuGH C-291/13 (Papasavvas).
3. **DSGVO für die Website anwendbar** (öffentlich, keine Haushaltsausnahme). **Eindeutig.** Quelle: Art. 2 Abs. 2 lit. c DSGVO; EuGH C-101/01 (Lindqvist).
4. **Trainingsdaten inkl. RPE, RIR und Notizen:** bleiben auf dem Gerät, der Betreiber erhält sie nicht (Netzwerkprotokoll). Der Betreiber ist für diese lokale Verarbeitung **wahrscheinlich** nicht Verantwortlicher, die Frage nach Gesundheitsdaten (Art. 9) stellt sich für ihn daher **wahrscheinlich** nicht. Der Nutzer verarbeitet seine eigenen Daten im persönlichen Bereich. Quelle: Art. 2 Abs. 2 lit. c, Art. 4 Nr. 7 DSGVO.
5. **Kein Einwilligungs-Banner nötig:** IndexedDB (aktive Trainingsdatei, laufendes Training, Datum der letzten Sicherung, Schreibmarke) und Cache Storage (App-Dateien) sind für den ausdrücklich gewünschten Offline-Dienst unbedingt erforderlich. Keine Cookies, keine Dritten. 2.0 speichert eher weniger als 1.x. **Wahrscheinlich** keine Einwilligung nötig. Quelle: § 165 Abs. 3 TKG 2021 (Art. 5 Abs. 3 RL 2002/58/EG); EDSA Leitlinien 2/2023 zu Art. 5 Abs. 3.
6. **Hosting und Drittlandtransfer:** Text unverändert. Das EU-U.S. Data Privacy Framework gilt weiter, das Rechtsmittel gegen das Urteil des EuG (T-553/23, Latombe) ist beim EuGH anhängig (C-703/25 P). Der Satz „ist nach dem EU-U.S. Data Privacy Framework zertifiziert“ ist **wahrscheinlich** derzeit korrekt. Die Rollenverteilung GitHub/Betreiber bei den Zugriffsprotokollen bleibt **unklar, anwaltlich klären** (Art. 4 Nr. 7, 26, 28 DSGVO; EuGH C-40/17 Fashion ID). Quellen: Durchführungsbeschluss (EU) 2023/1795; https://iapp.org/news/a/european-general-court-dismisses-latombe-challenge-upholds-eu-us-data-privacy-framework; https://www.wilmerhale.com/en/insights/blogs/wilmerhale-privacy-and-cybersecurity-law-blog/20251201-european-court-of-justice-to-review-challenge-to-eu-us-data-privacy-framework; https://eur-lex.europa.eu/eli/C/2025/6610/oj.
7. **Medizinprodukt:** RIR und RPE sind Selbstauskünfte zur Trainingssteuerung, ohne Diagnose, Therapie oder Überwachung einer Krankheit. Sie fließen nicht in den Gewichtsvorschlag. **Wahrscheinlich** kein Medizinprodukt. Quelle: Art. 2 Nr. 1 und ErwG 19 VO (EU) 2017/745 (Software für Lebensstil und Wohlbefinden); MDCG 2019-11.
8. **KI-Verordnung:** Die App enthält kein KI-System, sie erzeugt nur Texte, die der Nutzer selbst an einen KI-Dienst gibt. **Wahrscheinlich** keine Pflichten aus der KI-VO. Quelle: Art. 3 Nr. 1, Art. 2 VO (EU) 2024/1689.
9. **Produkthaftung, Cyber Resilience Act:** Die neue Produkthaftungsrichtlinie gilt für Produkte, die ab dem 09.12.2026 in Verkehr gebracht werden. Wird 2.0 danach veröffentlicht, greift trotzdem die Ausnahme für freie und quelloffene Software außerhalb einer Geschäftstätigkeit. Der CRA erfasst nur Bereitstellung im Rahmen einer Geschäftstätigkeit. **Wahrscheinlich** beides nicht anwendbar. Quellen: Art. 2 Abs. 2 RL (EU) 2024/2853; Art. 3 Nr. 22, ErwG 18 VO (EU) 2024/2847.
10. **Haftung:** Unentgeltlich, privat, kein mitgelieferter Plan. Der Coach-Export liefert nur Daten, die Bewertung macht ein KI-Dienst nach Wahl des Nutzers, mit Hinweis „keine medizinische Beratung“. **Wahrscheinlich** geringes Risiko. Quelle: § 1300 ABGB.
11. **Marken:** Garmin und Garmin Connect nur zur Angabe des Exportformats, keine Logos. **Wahrscheinlich** zulässig. Quelle: Art. 14 Abs. 1 lit. c VO (EU) 2017/1001; § 10 Abs. 3 MSchG; EuGH C-228/03 (Gillette).
12. **Eigene Lizenz:** MIT, Rechteinhaber als GitHub-Konto (§ 12 Abs. 2 UrhG). **Wahrscheinlich** passend. Schutzfähigkeit des überwiegend KI-erzeugten Codes **unklar, anwaltlich klären** (§ 1 Abs. 1 UrhG), praktisch ohne Folgen.

## Findings

### Kritisch

Keine.

### Hoch

Keine.

### Mittel

Keine.

### Niedrig

#### N1: Datenschutztext und Hinweise nicht auf 2.0 nachgeführt

- **Fundstelle:** `training/src/views/info.js:31–32` (Abschnitt „Exportierte Dateien“), `training/src/app.js:368` (Hinweis unter „Mit Plan und letzten Ergebnissen kopieren“).
- **Beschreibung:** Die Info-Seite nennt als Weitergabewege nur „Teilen-Menü, Dateien-App, optional Garmin Connect“. Der Export für Coach und der Agent-Prompt (beides Weitergabe an KI-Dienste, auch per Kopieren über die Zwischenablage, also ohne Datei) fehlen. Der Hinweis beim Agent-Prompt zählt „Gewichte, Wiederholungen, Daten“ auf. Seit 2.0 gehört auch der RIR dazu, und „Daten“ ist mehrdeutig (gemeint sind Datumsangaben, siehe schon Runde 3, Beobachtung 1).
- **Auswirkung:** Kein Pflichtverstoß, weil der Betreiber diese Daten nicht verarbeitet und die Hinweise direkt an den Buttons stehen. Die Info-Seite beschreibt aber nicht mehr alle Wege, auf denen Daten das Gerät verlassen.
- **Empfehlung:** In `info.js` den Abschnitt erweitern, z. B. „Exportierte oder kopierte Daten (Teilen-Menü, Dateien-App, Zwischenablage, optional Garmin Connect oder ein KI-Dienst deiner Wahl über ‚Export für Coach‘ und den Agent-Prompt) liegen in deiner Verantwortung.“ Hinweis in `app.js:368`: „Die Ergebnisse (Gewichte, Wiederholungen, RIR, Datum) …“. Änderung am Info-Text nur mit Zustimmung des Betreibers (Spezifikation Abschnitt 6).
- **Sicherheit:** Befund **eindeutig**. Keine Pflichtverletzung: **wahrscheinlich**. Quelle: Art. 4 Nr. 7, Art. 12 Abs. 1, Art. 13 DSGVO (Transparenz).

#### N2: Export für Coach gibt alle Notizen weiter, Hinweis nennt den möglichen Gesundheitsbezug nicht

- **Fundstelle:** `training/src/model/coach-export.js` (Notiz pro Training und pro Übung im Log), `training/src/app.js:385`.
- **Beschreibung:** Der Agent-Prompt lässt Notizen bewusst weg (`agent-prompt.js`, Kommentar zu `resultLines`). Der Export für Coach nimmt sie dagegen vollständig auf, zusammen mit RPE und RIR. Notizen enthalten im Training oft Angaben wie Schmerzen oder Verletzungen. Solche Angaben sind Gesundheitsdaten, und der EuGH legt den Begriff weit aus. Der Hinweis im Sheet sagt „auch deine Notizen“, aber nicht, dass darin Gesundheitsangaben stehen können. Eine Möglichkeit, ohne Notizen zu exportieren, gibt es nicht.
- **Auswirkung:** Für den Betreiber **wahrscheinlich** keine Rechtsfolge, denn die Weitergabe macht der Nutzer selbst. Für den Nutzer ein Risiko, mehr preiszugeben als beabsichtigt, zumal die Vorschau lang ist und Notizen darin leicht übersehen werden.
- **Empfehlung:** Hinweis ergänzen, z. B. „… auch deine Notizen. Sie können Angaben zu Beschwerden oder Verletzungen enthalten. Prüfe den Text vor dem Teilen.“ Optional einen Schalter „ohne Notizen“ anbieten (Datenminimierung nach dem Vorbild des Agent-Prompts).
- **Sicherheit:** Gesundheitsbezug von Notizen: **wahrscheinlich**. Keine Pflicht des Betreibers: **wahrscheinlich**. Quellen: Art. 4 Nr. 15, Art. 9, Art. 25 DSGVO; EuGH C-184/20 (OT), C-21/23 (Lindenapotheke).

#### N3: Offenlegung und Datenschutz weiter nur mit JavaScript abrufbar (offen aus Runde 3, N2)

- **Fundstelle:** `index.html:17` verlinkt `./training/#info`. `training/index.html` zeigt ohne JS nur „Diese App braucht JavaScript.“
- **Beschreibung:** Unverändert. In `reviews/umsetzung-r3.md` als „später“ markiert.
- **Auswirkung:** Gering. Wer die App nutzen kann, hat JS.
- **Empfehlung:** Wie in Runde 3: statische Seite beim Deploy aus `legal.js` erzeugen, oder mindestens den `<noscript>`-Text ergänzen. Alternativ bewusst so lassen und das festhalten.
- **Sicherheit:** **Wahrscheinlich.** Quelle: § 25 Abs. 1 MedienG; Art. 12 Abs. 1 DSGVO.

#### N4: Widerspruchsrecht nicht getrennt hervorgehoben, Art. 13 Abs. 2 lit. e fehlt (offen aus Runde 3, N3)

- **Fundstelle:** `training/src/views/info.js:34` (Rechte in einem Satz), `info.js:27`, `:30` (Rechtsgrundlage Art. 6 Abs. 1 lit. f).
- **Beschreibung:** Unverändert. In `reviews/umsetzung-r3.md` als „später“ markiert mit dem Vermerk, die Änderung stehe in `legal.js`. Der Text steht aber in `info.js`, nicht in `legal.js`. Die Regel in `CLAUDE.md` (nur der Betreiber ändert) betrifft nur die Betreiberangaben.
- **Auswirkung:** Formale Lücke, geringes Risiko.
- **Empfehlung:** Eigener Absatz „Widerspruch“ (Art. 21 DSGVO) und im Hosting-Absatz „Ohne diese Verbindungsdaten kann die Seite nicht ausgeliefert werden.“ Textänderung mit Zustimmung des Betreibers.
- **Sicherheit:** **Wahrscheinlich.** Quellen: Art. 21 Abs. 4, Art. 13 Abs. 2 lit. b und e DSGVO.

#### N5: Reichweite der Garmin-FIT-Lizenz weiter ungeklärt (offen aus Runde 3)

- **Fundstelle:** `training/src/garmin/fit.js`, `training/src/garmin/categories.js`, `README.md` (Abschnitt Garmin).
- **Beschreibung:** Unverändert. 2.0 bietet den Garmin-Export zusätzlich im Archiv an, für beliebige geöffnete Trainingsdateien. Das ändert an der Lizenzfrage nichts.
- **Auswirkung:** Sehr geringes Risiko für ein privates, unentgeltliches Projekt.
- **Empfehlung:** Lizenztext einmal vollständig lesen und das Ergebnis mit Datum in `docs/stand.md` festhalten.
- **Sicherheit:** **Unklar, anwaltlich klären.** Quellen: § 1 UrhG; §§ 76c ff. UrhG; FIT Protocol License (Garmin/ANT).

#### N6: Name des privaten WIP-Repos und Session-Links könnten beim Übertrag öffentlich werden

- **Fundstelle:** `docs/stand.md:29` (Zeile „Wo der Code liegt“ mit Name des privaten Repos), `docs/stand.md:48` (Vermerk, die Zeile vor der Übergabe zu entfernen); Commit-Nachrichten aller 2.0-Commits mit `Claude-Session: https://claude.ai/code/session_…`.
- **Beschreibung:** Der Übertrag ins öffentliche Repo ist per `git merge --squash` geplant. `git merge --squash` schreibt alle Nachrichten der zusammengefassten Commits in die vorgeschlagene Commit-Nachricht (`SQUASH_MSG`). Wird sie unverändert übernommen, landen die Session-Links und Zwischenstände („WIP“, „Merge branch …“) im öffentlichen Repo. Die Zeile in `stand.md` ist schon als zu entfernen vermerkt.
- **Auswirkung:** Kein Rechtsverstoß. Ob die Session-Links Inhalte (ggf. mit persönlichen Angaben) öffentlich machen, ist nicht geprüft (Anmeldung nötig). Der Name des privaten Repos verrät seine Existenz.
- **Empfehlung:** Beim Übertrag die Squash-Nachricht neu schreiben (nur Inhalt der Version, Attribution nach Wunsch des Betreibers). Die Zeile in `stand.md` wie vermerkt entfernen. Danach im öffentlichen Repo `git log -p | grep` auf `-wip` und `claude.ai/code/session_` laufen lassen.
- **Sicherheit:** Befund **eindeutig** (Verhalten von `git merge --squash`, Inhalt von `stand.md`). Keine Rechtsfolge: **wahrscheinlich**. Quelle: keine Rechtsnorm, `CLAUDE.md` (Persönliche Daten, öffentliches Repo).

#### N7: Bezeichnung „CR-10-Skala“ für die RPE-Wörter

- **Fundstelle:** `training/src/views/rpe.js:5` (Kommentar), `docs/spezifikation.md:224`, Commit `d9080fa`.
- **Beschreibung:** Die App zeigt zu den Werten 0–10 deutsche Wörter (Ruhe, sehr leicht, leicht, moderat, etwas schwer, schwer, sehr schwer, maximal). Die Doku nennt das „Wörter der CR-10-Skala“. Die CR10-Skala stammt von Gunnar Borg. BorgPerception AB hält die Marke „BORG CR SCALE“ und vergibt Lizenzen für die Skala. In der UI steht weder „Borg“ noch „CR10“. Die angezeigten Wörter sind kurze Allerweltsbegriffe in eigener Übersetzung, ähnlich der in der Sportwissenschaft verbreiteten Session-RPE nach Foster.
- **Auswirkung:** Gering. Einzelne kurze Wörter erreichen **wahrscheinlich** keine Werkhöhe. Die Nennung in Code-Kommentar und Doku ist keine markenmäßige Benutzung im geschäftlichen Verkehr. Ob die Zuordnung von Wörtern zu Zahlen als Ganzes geschützt ist, lässt sich ohne die Lizenzbedingungen nicht sicher sagen.
- **Empfehlung:** In der UI wie bisher keinen Skalennamen verwenden. In Spezifikation und Kommentar neutral formulieren („RPE 0–10 mit eigenen Wörtern“). Die Wörter nicht wörtlich aus einer veröffentlichten Borg-Fassung übernehmen.
- **Sicherheit:** Werkhöhe einzelner Wörter: **wahrscheinlich** nicht gegeben. Schutz der Skala als Ganzes: **unklar, anwaltlich klären**. Quellen: § 1 UrhG; Art. 9 VO (EU) 2017/1001; Markeneintrag https://trademarkdir.com/trademark/borg-cr-scale-86080523, https://trademarks.justia.com/owners/borgperception-ab-4795998.

## Weitere Beobachtungen ohne Handlungsbedarf

1. **Datenminimierung in 2.0 ist gut gelöst:** RPE startet ohne Wert, RIR ohne Antippen bleibt leer, Startwerte (`carryOver`) erscheinen nicht im Coach-Export, der Coach-Export lässt IDs, Zeitstempel und Einstellungen weg. Im Browser liegt nur noch die aktive Trainingsdatei (Art. 5 Abs. 1 lit. c und e, Art. 25 DSGVO).
2. **Archiv:** Nur im Arbeitsspeicher, belegt durch `archiv.e2e.mjs`. Keine Speicherung fremder Dateien.
3. **Datenschutztext „Damit die App offline funktioniert, legt dein Browser … deinen Trainingsstand lokal ab“:** stimmt mit 2.0 überein.
4. **Onboarding „Es wird nichts hochgeladen.“** (`app.js:318`): stimmt mit dem Netzwerkprotokoll überein.
5. **Spezifikation Abschnitt 6** nutzt für Name, Wohnort und Kontakt Platzhalter, die Regel aus `CLAUDE.md` ist eingehalten (Runde 3, N4 erledigt). In der Git-Historie dieses Klons stehen die Betreiberangaben nur in `legal.js` (Runde 3, N1 durch Neuanlage erledigt).

## Zusammenfassung

| Schwere | Anzahl |
|---|---|
| Kritisch | 0 |
| Hoch | 0 |
| Mittel | 0 |
| Niedrig | 7 (N1–N7, davon N3–N5 offen aus Runde 3) |

Punkte mit „unklar, anwaltlich klären“:
- Einschätzung 6: Rollenverteilung GitHub / Betreiber bei den Pages-Zugriffsprotokollen (Art. 4 Nr. 7, 26, 28 DSGVO).
- Einschätzung 12: Urheberrechtsschutz für KI-erzeugten Code und damit Reichweite der MIT-Lizenz (§ 1 UrhG).
- N5: Reichweite der Garmin-FIT-Lizenz für einen eigenen Encoder mit Profilnummern (§ 1, §§ 76c ff. UrhG).
- N7: Schutz der Borg-CR10-Skala als Ganzes (Zuordnung Wörter zu Zahlen) gegenüber den eigenen RPE-Wörtern (§ 1 UrhG, Marke „BORG CR SCALE“).
