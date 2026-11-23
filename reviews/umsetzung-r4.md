# Umsetzung der Reviews, Runde 4 (Version 2.0)

Antworten auf `security-r4.md`, `legal-r4.md`, `ios-ux-r4.md` und `code-qualitaet-r4.md`. Die Berichte selbst bleiben unverändert. Kein Reviewer meldet kritische oder hohe Findings, eine weitere Runde ist laut Spezifikation (Abschnitt 9) nicht nötig.

Status: **behoben**, **teilweise** (mit Rest), **abgelehnt** (mit Grund), **kein Handlungsbedarf**, **später** oder **Entscheidung Betreiber**.

Geprüft nach den Fixes:
- `npm test`: 183/183 bestanden (neu: `tests/switch.test.js`, Test für eindeutige Dateinamen).
- `npm run e2e` in Chromium: alle neun Prüfungen ohne Probleme. Neu geprüft: veraltetes zweites Fenster beim Wechsel, Rückfrage nach Sicherung per Download, RIR in der Liste ohne Sprung am Pausenende, Abstand der RIR-Chips im Fokus, 250 px Breite.
- WebKit war in dieser Umgebung nicht verfügbar (wie bei allen vier Reviewern). Was nur am iPhone prüfbar ist, steht in `ios-ux-r4.md`, Abschnitt „Checkliste“.

## Code-Qualität

| Finding | Status und Umsetzung |
|---|---|
| M1: Wechsel aus einem veralteten Fenster löscht die bisherige Datei | **Behoben.** Ein Wechsel schreibt nie mehr mit `force`. In derselben Transaktion prüft `storage.saveImported` den `stamp` und, dass die bisherige Datei im Browser keine höhere Revision hat als das Fenster kennt. Sonst wird nichts geschrieben, die App meldet „in einem anderen Fenster neuer gespeichert, bitte neu laden“. Browser-Test in `durchgang.e2e.mjs` (zwei Fenster). |
| M2: Dateinamen nicht eindeutig | **Behoben** (Entscheidung Betreiber): `<planname>-<JJJJ-MM-TT>-<4 Zeichen der fileId>.training.json`, bei Dateien aus 1.x ohne Datum `<planname>-<4 Zeichen>.training.json`. Unit-Test: Vorgänger und Nachfolger vom selben Tag sowie zwei 1.x-Dateien desselben Plans heißen verschieden. |
| M3: Öffnen einer Sicherung einer älteren Datei im Browser ersetzt diese ohne Abgleich | **Behoben.** Liegt die geöffnete Trainingsdatei als nicht aktive Datei im Browser, werden beide Stände zusammengeführt (`model/switch.js`, `mergeWithStored`). Weicht das Ergebnis von der Datei ab, gilt es nicht als gesichert. Die Vorschau sagt das. Unit-Test. |
| M4: Wechsel- und Aufräumlogik ungetestet, an der Warteschlange vorbei | **Behoben.** Entscheidungen in `model/switch.js` (`isSwitch`, `needsBackupFirst`, `classifyOtherFiles`, `mergeWithStored`) mit `tests/switch.test.js`. `switchToFile` schreibt über `queueSave` und ruft vorher `checkReimport` auf (gilt auch für „Plan erneut starten“). |
| N1: Mehrere Pläne in einer Auswahl | **Behoben**: Es wird nur noch ein Plan pro Auswahl angenommen, mit Hinweis. Mehrere Trainingsdateien bleiben möglich. |
| N2: RIR im Fokus bei Hauptübung ohne Pause | **Behoben.** Im Fokus steht die Frage in der Leiste, solange der zuletzt abgehakte Satz der letzte einer Hauptübung war, mit oder ohne Pause. |
| N3: Namen im Graphen aus dem Plan | **Behoben** für Auswahl und Beschriftung des Graphen (gespeicherter Name zuerst). `/S` und `BW` im Coach-Export für Übungen, die nicht mehr im Plan stehen: **abgelehnt**, bekannte Grenze (die Einheit steht nicht im Training). |
| N4: Coach-Export kennzeichnet Deload nur über das Feld | **Behoben** (`isDeloadSession`). |
| N5: Veraltete Kommentare und Doku | **Behoben**: Verweis in `agent-prompt.js`, Kommentar zu `screen`, `S.loadProblem` deklariert, Kommentar zu `force`, alte Entscheidung in `docs/stand.md`, „Session“ in Fließtext und UI-Zitaten der Spezifikation durch „Training“ ersetzt (Feldnamen und die FIT-Session-Nachricht bleiben). `CHANGELOG.md` ohne „in Arbeit“ beim Abschluss. |
| N6: Doppelte Hilfsfunktionen | **Behoben**: `localDate`, `fmtRir`, `fmtRirTarget` in `format.js`, `live.js` nutzt `LIMITS`. Coach-Export und Agent-Prompt formatieren RIR-Ziele gleich (Bindestrich nur zwischen Zahlen). |
| N7: Beschädigte ältere Dateien bleiben unangekündigt | **Behoben**: Doppelte Trainings werden vorher repariert. Was dann nicht lesbar ist, zeigt das Sheet beim Start als „nicht lesbar“ mit „Verwerfen“. Dateien aus einer neueren App-Version bleiben unangetastet. „Roh sichern“: **abgelehnt** (selten, eine unlesbare Datei ließe sich nicht wieder einlesen). |

## Security

| Finding | Status und Umsetzung |
|---|---|
| M1: Veraltete zweite Instanz löscht beim Wechsel | **Behoben**, siehe Code-Qualität M1. |
| N1: Löschen nach nicht überprüfbarer Sicherung | **Behoben** (Entscheidung Betreiber): Nach einer Sicherung per Download fragt die App „Liegt die Datei in Dateien bzw. im Download-Ordner?“ („Ja, weiter“ / „Abbrechen“), bevor die bisherige Datei den Browser verlässt. Gilt auch beim Sichern älterer Dateien beim Start. |
| N2: Coach-Export: Planname außerhalb der Daten-Codeblöcke | **Behoben**: Planname, Datei und Vorgänger stehen im Codeblock „Datei“, die Überschrift ist fest. |
| N3: Beschädigte ältere Dateien | **Behoben**, siehe Code-Qualität N7. |
| N4: Zeitstempel ohne Bereichsgrenze (R3) | **Später**, wie in Runde 3: Folgen nur in der Anzeige, kein Datenverlust. |
| N5: „Export fehlgeschlagen“ bei vollem Speicher (R3) | **Später.** Neue Folge in 2.0 („Erst sichern“ scheitert): Der Wechsel bleibt dann aus, die Daten bleiben im Browser. Kein Datenverlust, nur kein Wechsel möglich, bis Platz frei ist. |
| N6: `main` ohne Pull-Request-Pflicht (R3) | **Entscheidung Betreiber** (wie Runde 3). |
| N7: Gemeinsame Origin (R3) | **Kein Handlungsbedarf**, Regel in `CLAUDE.md`. |

## iOS und Bedienbarkeit

| Finding | Status und Umsetzung |
|---|---|
| M-1: Sprung am Pausenende in der Liste | **Behoben.** In der Liste steht die Frage in der Karte direkt nach dem letzten Satz (nicht erst am Pausenende), beantwortet nur noch als Zeile „RIR 2 · Ziel 3 · ändern“. Browser-Test misst die Position des aktiven Satzes vor und nach dem Pausenende. |
| M-2: RIR-Chips ohne Abstand zu „Rückgängig“/„Weiter“ | **Behoben** (Fokus): eigene Zeile, 8 px Abstand, Chips 44 px hoch. In der Liste stehen keine Chips mehr in der Leiste. Browser-Test misst den Abstand. |
| M-3: Leiste ohne Übungsname, „Als Nächstes“ entfällt | **Behoben**: Im Fokus nennt die Leiste die Übung („Back Squat · RIR? Ziel 3“). In der Liste bleibt „Als Nächstes“ in der Leiste. Im Fokus entfällt während der Frage „Als Nächstes“, der nächste Satz steht dort aber groß im Bildschirm. |
| M-4: RPE-Regler unter iOS | **Teilweise.** Ein Tipp setzt den Wert aus der Tippposition (kein stilles „5“ mehr), beim Wählen wird nichts neu gezeichnet, „Zurücksetzen“ verwaltet der Regler selbst. Ob Ziehen unter iOS zuverlässig geht (WebKit-Bug 266283), ist nur am Gerät prüfbar: Checkliste Punkt 4. Fällt es dort durch, kommen elf Chips zurück. |
| M-5: 150 % Zoom | **Behoben**: Tabs und RIR-Chips unter 330 px ohne Mindestbreite, Test bei 250 px. |
| M-6: Löschen nach Download-Fallback, „Erst sichern“ ohne Anleitung | **Behoben**: Rückfrage nach Download (siehe Security N1), „Erst sichern“ nennt „In Dateien sichern“ und „Ersetzen“. |
| N-1: Tap neben das Sheet verwirft RPE und Notiz | **Behoben**: Die Eingaben bleiben, bis das Training gespeichert oder verworfen ist. Die Höhe des Dialogs (575 px bei 552 px Platz) bleibt: Er scrollt, „Beenden und speichern“ ist ohne Scrollen sichtbar. |
| N-2: „Pause“ abgeschnitten | **Behoben**: Neben „Rückgängig“ entfällt das Wort, die Farbe der Zeit zeigt den Zustand. |
| N-3: „Ziel“ nur 11 px | **Behoben**: Die Frage steht jetzt in 13 px in einer Zeile, die tote Regel ist entfernt. |
| N-4: „Haupt“ nur über `title` erklärt | **Behoben**: Für VoiceOver „Hauptübung, nach dem letzten Satz kommt die RIR-Frage“ als versteckter Text, im Plan-Tab ein Satz zur Bedeutung. |
| Offen aus Runde 3 (M-3 Ton bei Stummschalter, N-4 bis N-8) | Wie in `umsetzung-r3.md` entschieden. |

## Recht und Compliance

| Finding | Status und Umsetzung |
|---|---|
| N1: Datenschutztext nicht auf 2.0 nachgeführt | **Abgelehnt** (Entscheidung Betreiber): Die App überträgt nichts. Die Weitergabe an einen KI-Dienst macht der Nutzer selbst, wie bei Garmin Connect. Die Info-Seite sagt bereits: „Was du an andere Dienste weitergibst, verarbeiten deren Anbieter nach ihren eigenen Bedingungen.“ Der Reviewer stuft eine Pflichtverletzung selbst als unwahrscheinlich ein. |
| N2: Coach-Export gibt Notizen weiter | **Abgelehnt** (Entscheidung Betreiber): Der Nutzer sieht den vollständigen Text vor dem Teilen, der Hinweis im Sheet nennt ausdrücklich „auch deine Notizen“. Keine Pflicht des Betreibers (Einschätzung des Reviewers). |
| N3: Offenlegung nur mit JavaScript (R3) | Wie in Runde 3: **Entscheidung Betreiber**. |
| N4: Widerspruchsrecht (R3) | Wie in Runde 3: **Entscheidung Betreiber** (Text in `info.js` nur mit Zustimmung). Korrektur zur Antwort in `umsetzung-r3.md`: Der Text steht in `training/src/views/info.js`, nicht in `legal.js`. |
| N5: Garmin-FIT-Lizenz (R3) | Wie in Runde 3: **unklar, anwaltlich klären**, keine Änderung. |
| N6: Name des privaten Repos, Session-Links beim Übertrag | **Behoben im Ablauf**: In `docs/stand.md` steht als Pflicht vor der Übergabe, die Zeile mit dem privaten Repo zu entfernen und die Commit-Nachricht beim Squash-Merge neu zu schreiben. |
| N7: „CR-10-Skala“ | **Behoben**: Der Name ist aus Spezifikation, Code-Kommentar und Arbeitsstand entfernt. Die Wörter sind eigene Formulierungen. |

## Punkte „unklar, anwaltlich klären“ (aus `legal-r4.md`)

1. Verantwortlichkeit für die Zugriffsprotokolle von GitHub Pages.
2. Urheberrecht an überwiegend KI-erzeugtem Code und Reichweite der MIT-Lizenz.
3. Reichweite der Garmin-FIT-Lizenz für einen eigenen Encoder mit Profilnummern.
4. Schutz einer Zuordnung von Wörtern zu RPE-Zahlen (nach Entfernen des Namens nur noch eigene Wörter).
