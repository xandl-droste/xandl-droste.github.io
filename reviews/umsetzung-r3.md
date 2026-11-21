# Umsetzung der Reviews, Runde 3

Antworten auf `security-r3.md`, `legal-r3.md`, `ios-ux-r3.md` und `code-qualitaet-r3.md`. Die Berichte selbst bleiben unverändert.

Status: **behoben**, **teilweise** (mit Rest), **abgelehnt** (mit Grund), **kein Handlungsbedarf**, **später** oder **Entscheidung Betreiber**.

Geprüft nach den Fixes:
- `npm test`: 144/144 bestanden.
- `npm run e2e` in Chromium: alle sechs Prüfungen ohne Probleme (neu: `speichern`).
- WebKit: `training`, `speichern`, `offline`, `info` ohne App-Fehler. Die Meldungen „Refused to apply a stylesheet“ treten in gleicher Zahl auch mit dem Stand vor den Fixes auf (info 3, offline 1), sie stammen nicht aus diesen Änderungen.

## Code-Qualität

| Punkt | Status | Umsetzung |
|---|---|---|
| H1 Beendetes Training kommt als laufend zurück | behoben | `finishLiveNow` setzt `S.live = null` vor dem Speichern und speichert über die Warteschlange; doppelter Abschluss gesperrt. `saveLive` bei `visibilitychange` und beim SW-Update läuft über die Warteschlange und prüft `S.live` erst beim Ausführen. `restoreLive` lehnt IDs aus der Historie ab, der Start verwirft solche Reste still. Abschluss ersetzt eine vorhandene ID statt sie doppelt anzuhängen (`model/finish.js`). Doppelte IDs werden beim Start repariert statt den Stand zu verwerfen. Nachgestellt wie im Bericht (0, 1, 3 ms): vorher in allen Läufen wieder laufend, jetzt in keinem, Chromium und WebKit. Neue Prüfung `tests/e2e/speichern.e2e.mjs`, Unit-Tests `tests/finish.test.js`. |
| M1 Agent-Prompt und Validator | behoben | Schema-Text nennt Format der Varianten-ID, „jede id nur einmal pro Einheit“, Längen (Name, Hinweis), Warm-up-Zeilen, Anzahl Varianten, RIR-Wochen und -Länge. Test prüft, dass die Grenzen im Text stehen und der Validator die Verstöße ablehnt. `garminCategory`: Der Validator bleibt großzügig (gespeicherte Stände sollen nicht an einer Nummer scheitern), der Export übernimmt aber nur bekannte Kategorien und fällt sonst auf Stichwort bzw. „unbekannt“ zurück. |
| M2 Korrekturen gelten als gesichert | behoben | Verlauf zeigt bei ungesicherten Änderungen ohne neue Trainings „Änderungen sind noch nicht als Datei gesichert.“. Das Tag „gesichert“ erscheint nur, wenn wirklich alles gesichert ist; ist unklar, welches Training geändert wurde, steht kein Tag. Start-Hinweis nach demselben Schema, mit Einzahl „1 Tag“. Test in `tests/weeks-backup.test.js`. |
| M3 Ablauf- und Speicherlogik ungetestet | teilweise | Abschluss und Wiederherstellen als reine Funktionen in `model/finish.js` mit Unit-Tests, Speicherprüfung (`isStale`) getestet, Browser-Prüfung für Wettlauf und zwei Fenster. Alle Schreibzugriffe laufen über die Warteschlange (Import bewusst mit `force`). Rest: `boot` und `confirmImport` bleiben in `app.js` ohne Unit-Test; e2e nicht in CI (Workflow bleibt minimal). |
| N1 Beenden-Dialog zählt anders | behoben | Hinweis nennt die Zahl, nach der gezählt wird („Nur 6 von 21 geplanten Sätzen erledigt (übersprungene Übungen zählen mit) …“). |
| N2 Wake Lock bleibt aktiv | behoben | Laufende Anfrage wird gemerkt, keine zweite parallel; ist das Training inzwischen beendet, wird der Lock sofort freigegeben. |
| N3 Doppelte Grenzwerte und Formatierer | später | Kein Fehlverhalten, Aufräumen ohne Testfahrt-Bezug. |
| N4 Veraltete Kommentare | später | wie N3. |
| N5 Vorschau bei mehreren Plänen | später | Seltener Ablauf (zwei Pläne in einer Auswahl), kein Datenverlust. |

## Security

| Punkt | Status | Umsetzung |
|---|---|---|
| M1 Zweite Instanz überschreibt beendete Trainings | behoben | Jede Schreibaktion setzt in IndexedDB einen neuen `stamp`. Eine Instanz schreibt nur, wenn der gespeicherte `stamp` noch ihr zuletzt gelesener oder geschriebener ist, sonst `StaleError` und der Hinweis „… in einem anderen Fenster neuer gespeichert … Bitte neu laden“ mit Knopf. Ausnahme: ausdrücklich bestätigter Import. Nachgestellt wie im Bericht: vorher Revision 1 → 0 und Training weg, jetzt bleibt es, das alte Fenster zeigt „Neu laden“. Ob Safari-Tab und Home-Bildschirm-App auf iOS denselben Speicher teilen, bleibt am Gerät offen. |
| N1 Alte Trainingsstände häufen sich | später | Bekannter Punkt (Runde 2, N9). |
| N2 CSV-Formel-Injektion bei Komma-Trennzeichen | behoben | Jedes Textfeld steht in Anführungszeichen, `'`-Präfix bleibt. Zahlen und leere Felder ohne. |
| N3 „Export fehlgeschlagen“ bei vollem Speicher | später | Nur die Meldung ist falsch, die Datei kommt an. |
| N4 Gemeinsame Origin | kein Handlungsbedarf | Durch Regel in `CLAUDE.md`, Prüfung beim Start und SW-Integritätsprüfung abgedeckt. |
| N5 Zeitstempel ohne Bereichsgrenze | später | Nur mit präparierter Datei, falscher Hinweistext, kein Datenverlust. |
| N6 Kontaktadresse in der Spezifikation | behoben (Repo) | Durch Platzhalter ersetzt. In der Git-Historie bleibt sie bis zur Neuanlage des Repos. |
| N7 GitHub-Einstellungen | Entscheidung Betreiber | Actions einschränken, Pull Request für `main` verlangen: Repo-Einstellungen, nicht im Code. |

## Recht

| Punkt | Status | Umsetzung |
|---|---|---|
| N1 Persönliche Angaben in der Git-Historie | Entscheidung Betreiber | Neuanlage des Repos ist geplant. |
| N2 Offenlegung nur mit JavaScript | später | Vorschlag (statische Seite beim Deploy) ist machbar, ändert den Workflow. |
| N3 Widerspruchsrecht, Art. 13 Abs. 2 lit. e | später | Textänderung in `legal.js`, die nur der Betreiber vornimmt. |
| N4 Kontaktadresse in der Spezifikation | behoben (Repo) | siehe Security N6. |
| N5 FIT-Lizenz und Versionsangaben | teilweise | Kommentar in `garmin/fit.js` erklärt die zwei Versionen (Profilversion im Dateikopf 21.32, Kategorie-Nummern aus SDK 21.221). Lizenzfrage bleibt „unklar, anwaltlich klären“. |

## iOS-Safari und Bedienbarkeit

| Punkt | Status | Umsetzung |
|---|---|---|
| M-1 Abstand Rückgängig–Weiter unter 400 px | behoben | `.card.rest { gap: 0 16px }` (Spezifität wie das Padding), gestapelte Knöpfe bei schmalen Breiten mit 8 px Zeilenabstand. Gemessen in WebKit: 16 px bei 375, 340, 320, 300 px. Prüfung in `training.e2e.mjs`. |
| M-2 Gewichtsfeld bei Zoom | behoben | Unter 340 px Breite steht das Feld über die ganze Breite, die vier Knöpfe darunter. Gemessen im Sheet: 280 px → 220 px Feldbreite, 250 px → 190 px (vorher 28 bzw. 0 px). README angepasst. Dynamic Type bleibt wie in Runde 2. |
| M-3 Kein Signal mit Stummschalter | Entscheidung Betreiber | Erst am Gerät prüfen (Checkliste), dann entscheiden. |
| N-1 1 px scrollbar | behoben | `.sr-only` mit `top/left: 0` und `margin: -1px`. Gemessen: 630 = 630. |
| N-2 „Als Nächstes“ beim Halten | behoben | Während des Haltens: „Halten“ statt „Bereit“, darunter „Halten läuft: …“. |
| N-3 Beschriftung vs. sichtbarer Text | behoben | „Weiter, Pause beenden“ und „+30 s, Pause verlängern“. |
| N-4 Aufklappbare Karten ohne Zeichen | später | |
| N-5 Tab „Verlauf“ aus der Detailansicht | später | |
| N-6 Kontrast der Ränder | später | |
| N-7 „Beenden“ bei 250 px | später | |
| N-8 `inert` bei offenen Sheets | später | aus Runde 2 offen |
| N-9 Querformat | abgelehnt | wie Runde 2 |
