# Review Runde 5: Recht und Compliance (Österreich/EU)

Reviewer 2, frische Instanz. Stand: Commit `f2cbaf7` (Arbeitsstand 3.0.0 „in Arbeit“), geprüft am 2026-11-23. Vergleich mit dem Stand nach 2.0 über `git diff 2feefdd..f2cbaf7` (24 Dateien).
Kein Ersatz für anwaltliche Beratung. Jede Aussage ist gekennzeichnet als **eindeutig**, **wahrscheinlich** oder **unklar, anwaltlich klären**, mit Rechtsquelle.
Persönliche Daten werden in diesem Bericht nicht zitiert. Verwiesen wird nur auf die „Betreiberangaben in legal.js“. Auch der Name des privaten Zwischen-Repos wird hier nicht genannt.

## Geprüfte Punkte

| Punkt | Wie geprüft | Ergebnis |
|---|---|---|
| Änderungen 3.0 mit rechtlicher Bedeutung | `git diff 2feefdd..f2cbaf7`, insbesondere `model/activities.js`, `views/activity.js`, `views/history.js`, `views/archive.js`, `model/coach-export.js`, `agent-prompt.js`, `app.js`, README, CHANGELOG, Spezifikation, Entwurf, `docs/begriffe.md` | Neu sind andere Trainings (Trainingsart als Freitext, Datum, Dauer, RPE, Notiz, Woche, `createdAt`), im Verlauf, Archiv, Coach-Export und zusammengefasst im Agent-Prompt. Keine neue Datenübertragung durch die App. `info.js` und `legal.js` sind gegenüber 2.0 unverändert (letzte Änderungen in `f00f8c7` bzw. `aa3dbad`). |
| Offenlegung § 25 MedienG | `training/src/views/info.js`, `training/src/legal.js` (Werte gelesen, hier nicht zitiert), `tests/e2e/info.e2e.mjs` gegen Port 8772 (Chromium) | Name, Wohnort und Kontakt eingetragen, keine Platzhalter, Abschnitt wird gerendert. Prüfung grün, keine externen Requests. |
| ECG § 5 | Rechtliche Einordnung | Unverändert wahrscheinlich nicht anwendbar (Einschätzung 2). |
| „keine Cookies“, „kein Tracking“, „nicht an den Betreiber übertragen“, „Es wird nichts hochgeladen“ | Eigenes Playwright-Skript (Chromium, 375 × 630): Plan öffnen, komplettes Training im Fokus, anderes Training mit präparierter Trainingsart (HTML, Backtick) und Gesundheits-Notiz eintragen, Export für Coach öffnen, Agent-Prompt „Mit Plan und letzten Ergebnissen kopieren“ (Zwischenablage ausgelesen). Danach `context.cookies()`, `document.cookie`, `localStorage`, `sessionStorage`, Cache Storage, IndexedDB ausgelesen | 38 Requests, alle an 127.0.0.1:8772, kein externer. 0 Cookies, `localStorage`/`sessionStorage` leer, ein Cache `training-pwa-…`, eine IndexedDB `training-pwa` mit `files` (nur die aktive Trainingsdatei, jetzt mit `activities`) und `kv` (`activeFileId`, `stamp`). Behauptungen belegt (Chromium). |
| Browser-Prüfungen des Projekts | `anderes-training.e2e.mjs`, `info.e2e.mjs`, `archiv.e2e.mjs` gegen Port 8772 | Alle grün, je ohne externe Requests. |
| Unit-Tests | `npm test` | 199/199 bestanden. |
| Einwilligungs-Banner (§ 165 Abs. 3 TKG 2021) | Gefundene Speicherzugriffe | Keine neuen Speicherorte, andere Trainings liegen in derselben Trainingsdatei. Weiter nicht nötig (Einschätzung 5). |
| Datenschutzinformation | `info.js:17–34` gegen das Verhalten von 3.0 | Inhaltlich weiter zutreffend. Zweckangabe nennt nur Krafttraining (N1). |
| Agent-Prompt mit anderen Trainings | `agent-prompt.js` (`activitySummaryLines`), `app.js:352–378`, kopierter Prompt | Nur Trainingsart, Anzahl, Dauer- und RPE-Spanne der letzten 4 Wochen, ohne Notizen, ohne IDs, ohne Zeitstempel. Hinweis unter dem Button nennt „andere Trainings der letzten Wochen“. RIR fehlt im Hinweis weiter (N2). |
| Export für Coach mit anderen Trainings | `model/coach-export.js`, `app.js:381–398`, erzeugter Text | Zeile „Datum Trainingsart · W1 · 60 min · RPE 6“, darunter die Notiz. Ohne ID, `createdAt` und Einstellungen. Hinweis „auch deine Notizen“ steht im Sheet (`app.js:391`). |
| Löschen und Korrigieren anderer Trainings | `model/activities.js` (`deleteActivity`, `updateActivity`), `app.js` (`deleteActivitySheet`) | Löschen entfernt den Eintrag mit Inhalt, in `deletedSessionIds` bleibt nur die zufällige ID (gegen Wiederkehr beim Zusammenführen). Mit Rückfrage. Datensparsam. |
| Archiv | `views/archive.js` (Diff), `archiv.e2e.mjs` | Unverändert nur im Arbeitsspeicher; neu nur die Zählung anderer Trainings. |
| Gesundheits- und Haftungshinweise | Onboarding (`app.js:328`), Agent-Sheet (`app.js:367`), Coach-Sheet (`app.js:391`), Plan-Tab (`views/plan.js:32`), Info-Seite (`info.js:37`), Sheet „Anderes Training“ | Hinweise unverändert vorhanden. Das neue Sheet enthält keine Gesundheitsfrage außer der freiwilligen RPE (Spezifikation Abschnitt 0 erlaubt das ab 3.0). Keine Heils- oder Präventionsversprechen. |
| Lizenzen | `LICENSE`, `package.json`, `OPEN_SOURCE` in `legal.js` (leer), Diff auf neue Abhängigkeiten | MIT, keine gebündelten Fremdbibliotheken, keine neuen Assets. |
| Marken | Suche nach Garmin, Apple, iPhone, Strava, Polar, Suunto, Watch, Fitbit, Borg, CR-10 in allen hinzugefügten Zeilen sowie in `training/`, README, Spezifikation | Garmin nur beschreibend („kein Garmin-Export“, „Garmin Connect“ im Entwurf). README sagt neutral „Das macht die Uhr.“ „Borg“/„CR-10“ nirgends mehr (Runde 4 N7 erledigt). Keine Logos. |
| Öffentliches Repo, Historie, Metadaten | `git log --all` (Autoren, Committer), Suche nach Klarname, Namensbestandteilen, Wohnort und Mailadresse (aus `legal.js` gelesen, nicht ausgegeben) über Arbeitsbaum und `git log --all -p`; neue Doku (`docs/entwurf-andere-trainingsarten.md`, `begriffe.md`, `wishlist.md`) auf persönliche Angaben | Autoren nur `noreply`-Adressen. Treffer außerhalb von `legal.js` nur über den Kontonamen (bekannt, Entscheidung des Betreibers). In der Historie stehen die Angaben nur im Commit mit `legal.js`. Die neue Doku nutzt Beachvolleyball nur als Beispiel, keine Angaben zu Gewohnheiten des Betreibers. Session-Links und Name des privaten Repos siehe N5. |
| Datenschutz-Framework USA (Hosting-Text) | Web-Recherche | Rechtsmittel C-703/25 P weiter anhängig, kein Urteil gefunden (Einschätzung 6). |

## Nicht geprüft (mit Grund)

- **WebKit / echtes iPhone:** Laut Auftrag ist nur Chromium vorinstalliert. Cookies, Speicher und Netzwerk nur in Chromium geprüft.
- **Live-Seite:** 3.0 ist nicht ausgeliefert, geprüft wurde der lokale Stand. Response-Header von GitHub Pages nicht abgerufen.
- **RIS:** Gesetzestexte nach Kenntnis und den in früheren Runden zitierten RIS-Fundstellen, nicht erneut abgerufen.
- **Garmin-FIT-Lizenztext im Wortlaut:** nicht erneut abgerufen, 3.0 ändert am FIT-Export nichts (N4).
- **Inhalt der `Claude-Session`-Links:** nicht aufgerufen (Anmeldung nötig).
- **GitHub-Einstellungen des öffentlichen Repos** (Wiki, Issues, PR-Refs): nicht abgefragt; geprüft wurde der lokale Klon.

## Rechtliche Einschätzungen (ohne Befund)

1. **§ 25 MedienG, kleine Website:** Website ohne Inhalt, der die öffentliche Meinungsbildung beeinflussen kann; Name und Wohnort genügen (§ 25 Abs. 5). 3.0 bringt keinen redaktionellen Inhalt. **Wahrscheinlich ausreichend.** Impressum nach § 24 nur für Medienwerke: **eindeutig**. Quelle: §§ 1 Abs. 1 Z 5a, 24, 25 MedienG (RIS: https://www.ris.bka.gv.at/NormDokument.wxe?Abfrage=Bundesnormen&Gesetzesnummer=10000719&Paragraf=25).
2. **ECG § 5:** unentgeltlich, ohne Werbung, Verkauf oder Spenden. **Wahrscheinlich nicht anwendbar.** Quelle: §§ 3 Z 1, 5 ECG; EuGH C-291/13 (Papasavvas).
3. **DSGVO für die Website anwendbar** (öffentlich, keine Haushaltsausnahme). **Eindeutig.** Quelle: Art. 2 Abs. 2 lit. c DSGVO; EuGH C-101/01 (Lindqvist).
4. **Andere Trainings inkl. Trainingsart, RPE und Notiz:** bleiben auf dem Gerät, der Betreiber erhält sie nicht (Netzwerkprotokoll). Freitexte wie „Physiotherapie“ oder „Knie schmerzt“ können Gesundheitsdaten sein, aber nur in der Hand des Nutzers. Der Betreiber ist dafür **wahrscheinlich** nicht Verantwortlicher, Art. 9 DSGVO trifft ihn daher **wahrscheinlich** nicht. Quelle: Art. 2 Abs. 2 lit. c, Art. 4 Nr. 7 und 15, Art. 9 DSGVO.
5. **Kein Einwilligungs-Banner nötig:** Speicherzugriffe (IndexedDB mit aktiver Trainingsdatei und Schreibmarke, Cache Storage mit App-Dateien) sind für den gewünschten Offline-Dienst unbedingt erforderlich, keine Cookies, keine Dritten, 3.0 fügt keinen neuen Speicherort hinzu. **Wahrscheinlich** keine Einwilligung nötig. Quelle: § 165 Abs. 3 TKG 2021 (Art. 5 Abs. 3 RL 2002/58/EG); EDSA Leitlinien 2/2023.
6. **Hosting und Drittlandtransfer:** Der Angemessenheitsbeschluss zum EU-U.S. Data Privacy Framework gilt weiter; das Rechtsmittel gegen EuG T-553/23 (Latombe) ist als C-703/25 P beim EuGH anhängig, ein Urteil war nicht auffindbar. Der Satz „ist nach dem EU-U.S. Data Privacy Framework zertifiziert“ ist **wahrscheinlich** korrekt. Die Rollenverteilung GitHub/Betreiber bei den Zugriffsprotokollen bleibt **unklar, anwaltlich klären** (Art. 4 Nr. 7, 26, 28 DSGVO; EuGH C-40/17 Fashion ID). Quellen: Durchführungsbeschluss (EU) 2023/1795; [EUR-Lex C/2025/6610](https://eur-lex.europa.eu/eli/C/2025/6610/oj); [WilmerHale, 2025-12-01](https://www.wilmerhale.com/en/insights/blogs/wilmerhale-privacy-and-cybersecurity-law-blog/20251201-european-court-of-justice-to-review-challenge-to-eu-us-data-privacy-framework); [heise](https://heise.de/-10965203).
7. **Medizinprodukt:** Andere Trainings sind ein Tagebuch (Art, Dauer, Selbsteinschätzung), ohne Auswertung, Diagnose oder Therapie, und ändern keine Gewichte. **Wahrscheinlich** kein Medizinprodukt. Quelle: Art. 2 Nr. 1, ErwG 19 VO (EU) 2017/745; MDCG 2019-11.
8. **KI-Verordnung:** Die App enthält kein KI-System, sie erzeugt Text, den der Nutzer selbst weitergibt. **Wahrscheinlich** keine Pflichten. Quelle: Art. 2, Art. 3 Nr. 1 VO (EU) 2024/1689.
9. **Produkthaftung, Cyber Resilience Act:** Wird 3.0 nach dem 09.12.2026 veröffentlicht, gilt die neue Produkthaftungsrichtlinie grundsätzlich, aber mit der Ausnahme für freie und quelloffene Software außerhalb einer Geschäftstätigkeit. Der CRA erfasst nur Bereitstellung im Rahmen einer Geschäftstätigkeit. **Wahrscheinlich** beides nicht anwendbar. Quellen: Art. 2 Abs. 2 RL (EU) 2024/2853; Art. 3 Nr. 22, ErwG 18 VO (EU) 2024/2847.
10. **Haftung:** Unentgeltlich, privat, kein mitgelieferter Plan; der Agent-Prompt bittet die KI nur, die Belastung zu berücksichtigen, Hinweise „keine medizinische Beratung“ stehen an den Weitergabe-Stellen. **Wahrscheinlich** geringes Risiko. Quelle: § 1300 ABGB.
11. **Marken:** Garmin nur zur Angabe des Exportformats bzw. zur Abgrenzung, keine Logos. **Wahrscheinlich** zulässig. Quelle: Art. 14 Abs. 1 lit. c VO (EU) 2017/1001; § 10 Abs. 3 MSchG; EuGH C-228/03 (Gillette).
12. **Eigene Lizenz:** MIT, Rechteinhaber als GitHub-Konto. **Wahrscheinlich** passend. Schutzfähigkeit des überwiegend KI-erzeugten Codes **unklar, anwaltlich klären** (§ 1 Abs. 1 UrhG), praktisch ohne Folgen.
13. **RPE-Wörter:** Nach Runde 4 nur noch eigene Formulierungen ohne Skalennamen (`views/rpe.js:5`). Kurze Allerweltswörter erreichen **wahrscheinlich** keine Werkhöhe. Ob eine Zuordnung von Wörtern zu Zahlen als Ganzes geschützt sein kann, bleibt **unklar, anwaltlich klären**, praktisch sehr geringes Risiko. Quelle: § 1 UrhG.

## Findings

### Kritisch

Keine.

### Hoch

Keine.

### Mittel

Keine.

### Niedrig

#### N1: Zweckangabe auf der Info-Seite nennt nur Krafttraining

- **Fundstelle:** `training/src/views/info.js:17` („… zum persönlichen Protokollieren von Krafttraining“), gleichlautend `docs/spezifikation.md:277`.
- **Beschreibung:** Ab 3.0 protokolliert die App auch andere Trainings (Beachvolleyball, Laufen u. Ä.) mit RPE und Notiz. Der Zweck auf der Info-Seite ist damit unvollständig. Der Text ist laut Spezifikation Abschnitt 6 wörtlich vorgegeben und nur mit Zustimmung des Betreibers zu ändern.
- **Auswirkung:** Gering. Die Datenverarbeitung durch den Betreiber (nur Hosting-Protokolle und E-Mail) ändert sich nicht. Für die Einordnung als „kleine Website“ nach § 25 Abs. 5 MedienG zählt nur, dass kein meinungsbildender Inhalt dazukommt, und das bleibt so. Die Zweckangabe ist aber nicht mehr ganz zutreffend.
- **Empfehlung:** Mit Zustimmung des Betreibers in `info.js` und Spezifikation z. B. „… zum persönlichen Protokollieren von Krafttraining und anderen Trainings“.
- **Sicherheit:** Befund **eindeutig**. Rechtsfolge: **wahrscheinlich** keine. Quelle: Art. 5 Abs. 1 lit. a, Art. 12 Abs. 1 DSGVO (Transparenz); § 25 Abs. 5 MedienG.

#### N2: Hinweis unter „Mit Plan und letzten Ergebnissen kopieren“ nennt RIR nicht (Rest aus Runde 4, N1)

- **Fundstelle:** `training/src/app.js:374`.
- **Beschreibung:** Der Hinweis lautet „Die Ergebnisse (Gewichte, Wiederholungen, Daten, andere Trainings der letzten Wochen) gehen dann ebenfalls an den Anbieter des KI-Dienstes.“ Die neue Ergänzung für andere Trainings ist zutreffend (geprüft am kopierten Prompt: Trainingsart, Anzahl, Dauer- und RPE-Spanne, keine Notizen). Der Prompt enthält aber auch den RIR je Hauptübung (`resultLines`, seit 2.0), und „Daten“ ist weiter mehrdeutig (gemeint: Datumsangaben). In `umsetzung-r4.md` wurde N1 wegen der Info-Seite abgelehnt, der Teil zum Hinweis-Text am Button blieb unbeantwortet.
- **Auswirkung:** Gering, der Nutzer gibt selbst weiter. Der Hinweis ist aber die einzige Stelle, an der vor dem Kopieren steht, was im Prompt landet.
- **Empfehlung:** „Die Ergebnisse (Gewichte, Wiederholungen, RIR, Datum…, andere Trainings der letzten Wochen mit Trainingsart, Dauer und RPE) …“. Kein Info-Seiten-Text betroffen, daher ohne Zustimmungsvorbehalt aus Abschnitt 6 änderbar.
- **Sicherheit:** Befund **eindeutig**. Keine Pflicht des Betreibers: **wahrscheinlich**. Quelle: Art. 4 Nr. 7, Art. 12 Abs. 1 DSGVO.

#### N3: Offenlegung, Datenschutz und Widerspruch (offen aus Runde 3 und 4)

- **Fundstelle:** `training/index.html:25` (`<noscript>` nur „Diese App braucht JavaScript.“); `training/src/views/info.js:34` (Widerspruch nicht getrennt hervorgehoben), `info.js:27` (kein Satz zu Art. 13 Abs. 2 lit. e).
- **Beschreibung:** Unverändert. In `umsetzung-r4.md` als „Entscheidung Betreiber“ geführt.
- **Auswirkung:** Formale Lücken, geringes Risiko.
- **Empfehlung:** Wie in Runde 4 (statische Seite oder `<noscript>`-Text; eigener Absatz „Widerspruch“ nach Art. 21 Abs. 4 DSGVO; „Ohne diese Verbindungsdaten kann die Seite nicht ausgeliefert werden.“). Alternativ die Entscheidung so festhalten.
- **Sicherheit:** **Wahrscheinlich.** Quelle: § 25 Abs. 1 MedienG; Art. 12 Abs. 1, Art. 13 Abs. 2 lit. b und e, Art. 21 Abs. 4 DSGVO.

#### N4: Reichweite der Garmin-FIT-Lizenz (offen seit Runde 3)

- **Fundstelle:** `training/src/garmin/fit.js`, `training/src/garmin/categories.js`.
- **Beschreibung:** Unverändert, 3.0 ändert am FIT-Export nichts (kein Export anderer Trainings).
- **Auswirkung:** Sehr geringes Risiko für ein privates, unentgeltliches Projekt.
- **Empfehlung:** Lizenztext einmal vollständig lesen und das Ergebnis mit Datum in `docs/stand.md` festhalten.
- **Sicherheit:** **Unklar, anwaltlich klären.** Quellen: § 1 UrhG; §§ 76c ff. UrhG; FIT Protocol License.

#### N5: Session-Links und Hinweis auf das private Repo vor dem Übertrag entfernen (Fortsetzung Runde 4, N6)

- **Fundstelle:** Alle 10 Commits seit `2feefdd` tragen `Claude-Session: https://claude.ai/code/session_…`; `docs/stand.md:29` nennt Name und Branch des privaten Repos, `docs/stand.md:31` vermerkt die Pflicht, das vor der Übergabe zu entfernen.
- **Beschreibung:** Für ein privates Zwischen-Repo in Ordnung. Der Ablauf ist in `stand.md` beschrieben und wurde bei 2.0 laut `stand.md:84` eingehalten. Hier nur als Erinnerung, weil 3.0 nun vor der Übergabe steht.
- **Auswirkung:** Kein Rechtsverstoß. Ohne Bereinigung würden Session-Links und der Name des privaten Repos öffentlich (Regel „Persönliche Daten“ in `CLAUDE.md`).
- **Empfehlung:** Beim Squash-Merge die Nachricht neu schreiben, Zeilen 29 und 31 in `stand.md` entfernen, danach im öffentlichen Repo `git log -p` auf den Repo-Namen und `claude.ai/code/session_` durchsuchen.
- **Sicherheit:** Befund **eindeutig**. Keine Rechtsfolge: **wahrscheinlich**. Quelle: `CLAUDE.md` (Persönliche Daten).

## Weitere Beobachtungen ohne Handlungsbedarf

1. **Datenminimierung bei anderen Trainings ist gut gelöst:** Der Agent-Prompt fasst nur zusammen (keine Notizen, keine Einzeldaten), der Coach-Export lässt ID, `createdAt` und Einstellungen weg, kein Garmin-Export, Felder sind freiwillig bis auf Trainingsart, Datum und Dauer, Löschen entfernt den Inhalt (Art. 5 Abs. 1 lit. c, Art. 25 DSGVO).
2. **Export für Coach mit Notizen anderer Trainings:** Runde 4 N2 (Notizen können Gesundheitsangaben enthalten) wurde vom Betreiber abgelehnt; das gilt jetzt auch für die Notizen und die frei gewählte Trainingsart anderer Trainings (geprüft mit „Physiotherapie“ / „Knie schmerzt nach Sprung“: beides steht im Export). Der Hinweis „auch deine Notizen“ deckt das ab, der Nutzer sieht den vollständigen Text vor dem Teilen. Keine neue Bewertung.
3. **Freitext Trainingsart im Prompt:** Präparierte Trainingsart mit HTML und Backtick erscheint im Prompt als JSON-Text, Backticks maskiert, also als Daten gekennzeichnet; in der UI nur als Text gerendert. Für die rechtliche Bewertung unkritisch (Sicherheitsfragen siehe Reviewer 1).
4. **Onboarding „Es wird nichts hochgeladen.“** (`app.js:323`) und Datenschutztext „In der App“ (`info.js:25`) stimmen mit dem Netzwerkprotokoll von 3.0 überein.
5. **Spezifikation Abschnitt 6** nutzt weiter Platzhalter für Name, Wohnort und Kontakt.

## Zusammenfassung

| Schwere | Anzahl |
|---|---|
| Kritisch | 0 |
| Hoch | 0 |
| Mittel | 0 |
| Niedrig | 5 (N1, N2 neu bzw. Rest; N3–N5 offen aus früheren Runden) |

Punkte mit „unklar, anwaltlich klären“:
- Einschätzung 6: Rollenverteilung GitHub / Betreiber bei den Pages-Zugriffsprotokollen (Art. 4 Nr. 7, 26, 28 DSGVO).
- Einschätzung 12: Urheberrechtsschutz für KI-erzeugten Code und damit Reichweite der MIT-Lizenz (§ 1 UrhG).
- Einschätzung 13: Schutz einer Zuordnung von Wörtern zu RPE-Zahlen als Ganzes (§ 1 UrhG), praktisch sehr geringes Risiko.
- N4: Reichweite der Garmin-FIT-Lizenz für einen eigenen Encoder mit Profilnummern (§ 1, §§ 76c ff. UrhG).
