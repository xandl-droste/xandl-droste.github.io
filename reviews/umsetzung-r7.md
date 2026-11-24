# Umsetzung der Reviews, Runde 7 (Version 3.0, andere Trainings)

Antworten auf `security-r7.md`, `legal-r7.md`, `ios-ux-r7.md` und `code-qualitaet-r7.md`. Die Berichte selbst bleiben unverändert (Ausnahme laut Entscheidung des Betreibers vom 2026-11-24: Verweise auf das private Repo werden vor der Übergabe ins öffentliche Repo entfernt).

Kein Reviewer meldet kritische oder hohe Findings. Damit ist die Review-Phase für 3.0 abgeschlossen (Runde 7 war für 3.0 die dritte und laut Spezifikation Abschnitt 9 letzte Runde).

Status: **behoben**, **teilweise** (mit Rest), **abgelehnt** (mit Grund), **kein Handlungsbedarf**, **später** oder **Entscheidung Betreiber**.

Geprüft nach den Fixes:
- `npm test`: 211/211 bestanden (neu: Tausendertrenner, Import-Vorschau bei gleicher Revision und wegfallenden Einträgen, Trainingsart nur aus unsichtbaren Zeichen und mit Kombinationszeichen am Anfang, Coach-Export ohne unsichtbare Zeichen).
- `npm run e2e` in Chromium: alle zehn Prüfungen ohne Probleme. Neu in `anderes-training.e2e.mjs`: ± bei fokussiertem Feld (Anzeige stimmt), ± bei 1000 kg.
- WebKit war in dieser Umgebung nicht verfügbar.

## iOS, Barrierefreiheit und Bedienbarkeit

| Finding | Status und Umsetzung |
|---|---|
| M-1: Fokus bleibt beim Tap auf −/+ im Feld, das Feld zeigt den alten Wert | **Behoben.** Der −/+-Handler liest den Wert aus dem Feld, verlässt es dann (`blur`) und setzt erst danach den neuen Wert. `render()` schreibt dadurch keinen getippten Text mehr zurück. Gilt für alle Stepper und die Dauer im Sheet. Browser-Test mit Klick ohne Fokuswechsel. |
| N-1: Feste Aktionen belegen im Querformat zu viel Höhe | **Behoben.** Bei einer Höhe bis 420 px stehen die Aktionen normal im Fluss statt fest unten. |
| N-2: „Training verwerfen“ vor „Beenden und speichern“, „Abbrechen“ in der Rückfrage schließt auch den Abschluss-Dialog | **Teilweise.** „Abbrechen“ in der Rückfrage kehrt jetzt zu „Training beenden?“ zurück. Die Lesereihenfolge bleibt: Die Hauptaktionen stehen bewusst fest unten (Runde 6 N-1), „Training verwerfen“ ist davon getrennt und hat eine eigene Rückfrage. Prüfpunkt mit VoiceOver: Checkliste Punkt 6. |

## Code-Qualität

| Finding | Status und Umsetzung |
|---|---|
| N1: −/+ setzt Werte ab 1000 auf 0 (Tausendertrenner) | **Behoben.** `parseNum` ignoriert Leerraum einschließlich geschütztem Leerzeichen, liest also die eigene Anzeige („1 000“). Unit-Test und Browser-Test (1000 kg, dann −0,5). |
| N2: Gleiche Revision, anderer Inhalt: „Entspricht dem gespeicherten Stand“ | **Behoben.** `mergeTrainingFiles` meldet `differs`, die Vorschau sagt: „Gleicher Stand-Zähler wie im Browser, aber ein anderer Inhalt … Der Stand im Browser bleibt, Abweichungen aus dieser Datei werden nicht übernommen.“ Ein automatisches Zusammenführen geänderter Einzelwerte gibt es weiterhin nicht (Regel: höhere Revision gewinnt). Unit-Test. |
| N3: Trainingsart nur aus unsichtbaren Zeichen: allgemeine Meldung | **Behoben.** Die Prüfung im Sheet nutzt dieselbe Bereinigung wie das Modell und meldet die fehlende Trainingsart. Unit-Test. |
| N4: Wartbarkeit | **Behoben**: Grenzwerte in `live.js` und `maxlength` der Notizen aus `LIMITS`; Option `render: 'afterTap'` entfernt; Toast nutzt `cleanActivityType`; Kommentar in `storage.js` korrigiert; „Plan-Einheit“ in Kommentaren durch „Einheit“ ersetzt. |
| N5: Testlücken | **Teilweise.** Tests für N1–N3 ergänzt (siehe oben). Browser-Test für den Wechsel der aktiven Trainingsdatei mit zwei Fenstern: **später**; die Logik ist unverändert seit 2.0 und dort per Unit-Test (`tests/switch.test.js`) und `durchgang.e2e.mjs` abgedeckt. |

## Security

| Finding | Status und Umsetzung |
|---|---|
| N1: Gewinnt die Datei, fallen lokale Einträge still weg | **Teilweise.** Einträge, die wegen gelöschter IDs der Datei wegfallen, zählt die Vorschau jetzt mit („… gelöschte(s) Training(s) werden entfernt“). Ein lokaler Eintrag mit derselben ID wie in der Datei wird durch die Fassung der Datei ersetzt; das ist die vorgesehene Regel „höhere Revision gewinnt“, und die Vorschau sagt „Die Datei ist neuer … und wird übernommen“. Unit-Test. |
| N2: Rest unsichtbarer Zeichen; Plan, Übungsnamen und Notizen im Coach-Export | **Behoben** für die Trainingsart (zusätzlich private Zeichen, einzelne Surrogate, Nichtzeichen; kein Kombinationszeichen am Anfang) und den Coach-Export (`cleanText` entfernt dieselben Zeichen aus Plan, Namen und Notizen). Im Validator bleiben Plan- und Übungsnamen sowie Notizen bewusst Freitext: Die App zeigt sie nur per `textContent`, Bidi-Zeichen können dort die Anzeige, aber nichts anderes verändern. **Abgelehnt** für diesen Teil. |
| N3: Zeitstempel ohne Bereichsgrenze | **Später** (unverändert). |
| N4: „Export fehlgeschlagen“ bei vollem Speicher | **Später** (unverändert). |
| N5: Session-Links in Commits | **Kein Handlungsbedarf jetzt**, wird beim Übertrag ins öffentliche Repo erledigt. |
| N6: `main` ohne Pull-Request-Pflicht | **Entscheidung Betreiber** (unverändert). |
| N7: Gemeinsame Origin | **Kein Handlungsbedarf** (unverändert). |

## Recht und Compliance

| Finding | Status und Umsetzung |
|---|---|
| N1: Zweckangabe auf der Info-Seite | **Behoben** (Entscheidung Betreiber, 2026-11-24): „… zum persönlichen Protokollieren von Krafttraining und anderen Trainings“, auch in Spezifikation Abschnitt 6. Der Reviewer hat noch den Stand davor gesehen. |
| N2: `<noscript>`, Widerspruch, Art. 13 Abs. 2 lit. e | **Entscheidung Betreiber** (unverändert seit Runde 4). |
| N3: Reichweite der Garmin-FIT-Lizenz | **Kein Handlungsbedarf** („unklar, anwaltlich klären“). |
| N4: Verweise auf das private Repo, Session-Links | **Entscheidung Betreiber** (2026-11-24): Verweise werden vor der Übergabe auch aus den Berichten entfernt. Session-Links fallen mit dem Squash-Commit weg. Steht in `docs/stand.md`. |

Punkte mit „unklar, anwaltlich klären“ (aus `legal-r7.md`): Rollenverteilung GitHub/Betreiber bei Zugriffsprotokollen (Art. 4 Nr. 7, 26, 28 DSGVO), Schutz von überwiegend KI-erzeugtem Code und Reichweite der MIT-Lizenz (§ 1 UrhG), Schutz einer Wort-Zuordnung zur RPE-Skala (§ 1 UrhG), Reichweite der Garmin-FIT-Lizenz (§ 1, §§ 76c ff. UrhG). Nicht neu belegt in dieser Runde: ob GitHub derzeit nach dem Data Privacy Framework zertifiziert ist (die Hosts waren aus der Sitzung nicht erreichbar).
