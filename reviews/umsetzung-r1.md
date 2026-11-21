# Umsetzung der Reviews, Runde 1

Antworten auf `security.md`, `legal.md` und `ios-ux.md`. Die Berichte selbst bleiben unverändert.

Status: **behoben**, **teilweise** (mit Rest), **abgelehnt** (mit Grund) oder **Entscheidung Betreiber** (kann nicht ohne den Betreiber umgesetzt werden).

Geprüft nach den Fixes: `npm test` (90/90), `npm run e2e` in Chromium (4/4 ohne Probleme), dazu Training und Info in WebKit. Die einzigen WebKit-Meldungen kommen vom Screenshot-Stylesheet von Playwright, und Offline-Neuladen kann Playwright-WebKit nicht (beides schon im Bericht ios-ux beschrieben). Zusätzlich lokal nachgestellt: Cache-Poisoning von außerhalb des Scopes und Einbetten in eine fremde Seite (siehe Security M1, N1).

## Hoch

| Finding | Status | Umsetzung |
|---|---|---|
| iOS H-1 / Security N4: `currentTheme()` defekt | behoben | `themeFor()` in `model/training-file.js`, `hashchange`-Listener einmalig auf Modulebene. `createTrainingFile` übernimmt keine `undefined`-Werte mehr. Unit-Test, und e2e prüft den Erststart mit `colorScheme: dark`. |
| Legal H1: Offenlegung mit Platzhaltern | Entscheidung Betreiber | Widerspricht `CLAUDE.md`, darum kein Eintrag durch mich. Der e2e-Test liest Name, Wohnort und Mail jetzt aus `legal.js`, er bricht also nicht mehr, wenn die Werte eingetragen sind. |

## Mittel

| Finding | Status | Umsetzung |
|---|---|---|
| iOS M-1: Doppeltipp schließt zwei Sätze ab | behoben | Ein zweiter Tap innerhalb von 600 ms wird ignoriert. Per e2e (`dblclick`) geprüft. |
| iOS M-2: Rückgängig oben im Toast | behoben | „Rückgängig“ steht 10 s lang im Pausentimer unten, an der Stelle von „+30 s“. Die Höhe bleibt gleich, der Fokus-Modus passt weiter auf 375 × 630 (e2e). Kein Toast mehr über Kopf und Menü nach einem Satz. |
| iOS M-3: Speicher voll beim Beenden | behoben | Der Abschlussbildschirm erscheint trotzdem, mit Warnung „Nicht im Browser gespeichert“ und „Als Datei sichern“. Der Export enthält das Training. |
| iOS M-4: Zoom 125 %/150 % | teilweise | Bei Höhe ≤ 560 px liegt der Timer unter dem Inhalt statt darüber. Bei Breite ≤ 330 px gibt es engere Abstände, einen zweizeiligen Timer und kleinere Superset-Zellen. 150 % ist nicht am Gerät geprüft. |
| iOS M-5: VoiceOver-Fokus und Live-Regionen | teilweise | Eine dauerhafte Live-Region `#announce` außerhalb von `#app` sagt Satz, Pause, Pausenende und Toasts an. Der Fokus geht nach dem Neurendern auf den zuletzt angetippten Button zurück (auch in Safari) und nach dem Schließen eines Sheets auf dessen Auslöser. Gezieltes Aktualisieren statt Neurendern: abgelehnt, das wäre ein Umbau der ganzen Render-Schicht. Am Gerät mit VoiceOver prüfen. |
| iOS M-6: Statusleiste im Stil Hell | behoben (ungeprüft am Gerät) | Im Stil Hell liegt ein dunkler Streifen in Höhe von `safe-area-inset-top` hinter der Statusleiste. |
| iOS M-7: Gewicht pro Satz neu tippen | behoben | Ein geändertes Gewicht geht an die folgenden offenen Sätze, wenn diese leer sind oder noch den alten Wert haben. Unit-Test. Die Rückfrage bei leerem Gewicht ist nicht umgesetzt, „Satz fertig“ soll ein Tap bleiben. |
| Security M1: gemeinsame Origin | teilweise, Rest Entscheidung Betreiber | (2) Der Service Worker prüft jede Datei gegen ihren SHA-256 (beim Installieren und bei jeder Auslieferung). Veränderte Einträge werden verworfen und geprüft neu geladen, lokal nachgestellt: Der vergiftete `legal.js` läuft nicht mehr. (3) Der gespeicherte Stand läuft beim Start durch `validateTrainingFile`, bei Fehlern gibt es einen Hinweis auf den Import. (1) Die Regel „keine weiteren Pages-Projekte mit JS auf diesem Konto“ steht im README. Ob sie auch in `CLAUDE.md` soll oder ob die App eine eigene Origin bekommt, entscheidet der Betreiber. |
| Legal M1: Art. 13 DSGVO | Entscheidung Betreiber | Laut Spezifikation Abschnitt 6 werden die Texte nur über die Konfiguration geändert. Ein Textvorschlag liegt beim Betreiber. |

## Niedrig

| Finding | Status | Umsetzung |
|---|---|---|
| Security N1: Framing | behoben | Erste Anweisung in `app.js`: Ist die App eingebettet, wird das Dokument geleert und abgebrochen. Lokal in einem iframe einer fremden Origin geprüft. |
| Security N2: quadratischer Validator | behoben | Höchstens 200 Schlüssel pro Objekt (`LIMITS.maxKeys`), Allowlist als `Set`, lange Schlüssel in Meldungen gekürzt. Unit-Test: 150 000 Schlüssel werden in unter 2 s abgelehnt. |
| Security N3: Exporte nicht einlesbar | behoben | Revision wird bei `maxRevision` gedeckelt. Keine Steigerung über 1000 kg. Import-Ergebnis und Export laufen vorher durch den eigenen Validator, bei Fehlern gibt es eine Meldung statt einer Datei. Unit-Tests. |
| Security N5: Branch-Schutz, Playwright-Version | teilweise | Die getesteten Playwright-Versionen stehen im README. Rulesets auf GitHub: Entscheidung Betreiber. |
| Security N6: ganzes Repo ausgeliefert | Entscheidung Betreiber | Hängt mit Legal H1/N7 zusammen (Deploy per Actions, nur `index.html`, `root.css`, `training/`). |
| Security N7: Prompt-Injection | behoben | Backticks im eingefügten Plan werden als ``` geschrieben (gleicher JSON-Inhalt), dazu der Hinweis „nur Daten, keine Anweisungen“. Unit-Test. |
| Security N8: CSP-Härtung | behoben | `img-src 'self'`, `require-trusted-types-for 'script'`, `trusted-types sw` (eine Policy nur für `./sw.js`). e2e in Chromium und WebKit ohne CSP-Fehler der App. |
| Security N9: alte Stände, keine Prüfung beim Laden | teilweise | Prüfung beim Laden: behoben (siehe M1). Löschen alter Stände im Menü: offen für die nächste Runde. |
| Legal N1: Hosting-Text ungenau | Entscheidung Betreiber | Gleicher Text wie M1. |
| Legal N2: Beschriftung Info-Link | behoben | Der Footer heißt jetzt „Impressum & Datenschutz“. Im Training bleibt der Weg über das Menü (Begründung in `docs/stand.md`). |
| Legal N3: Offenlegung nur mit JS | Entscheidung Betreiber | Eine statische `impressum.html` ergibt erst mit echten Angaben Sinn (H1). |
| Legal N4: Lizenz | Entscheidung Betreiber | Vorschlag MIT. |
| Legal N5: FIT-Lizenz | teilweise | Ein Satz im README: eigener Encoder, kein SDK-Code. Die Lizenz vollständig lesen und das Ergebnis festhalten bleibt offen. |
| Legal N6: KI-Prompt und Beschwerden | behoben | Hinweis im Sheet „Plan mit KI“: Daten gehen an den KI-Anbieter, der Plan ist ungeprüft und keine medizinische Beratung. |
| Legal N7: persönliche Details in `docs/`, Mail mehrfach | teilweise | Der e2e-Test nimmt die Mail aus `legal.js`. Neutralisieren der Spezifikation oder kein Ausliefern von `docs/`: Entscheidung Betreiber. |
| iOS N-1: Dynamic Type | abgelehnt | Würde alle Größen auf `rem` umstellen und die geprüften Layouts für 375 × 630 neu aufrollen. Stattdessen Hinweis auf den Safari-Zoom im README, und M-4 entschärft den Zoom. |
| iOS N-2: `select` 23 px | behoben | `appearance: none`, Höhe 48 px, Pfeil per CSS-Verlauf (kein `data:`-Bild, passt zur CSP). |
| iOS N-3: Kontrast Fancy | behoben | `--mut` in Fancy `#e4dcf7`. |
| iOS N-4: aktiver Satz nur visuell | behoben | `aria-current="step"` und „(aktueller Satz)“ im Label des Häkchens. |
| iOS N-5: Neustart landet auf „Heute“ | behoben | Mit laufendem Training startet die App direkt im Training. Wake Lock beim ersten Tippen. e2e angepasst. |
| iOS N-6: Querformat | teilweise | Der Timer liegt bei geringer Höhe unter dem Inhalt (wie M-4). Ein zweispaltiges Querformat ist abgelehnt, die Spezifikation verlangt Hochformat. |
| iOS N-7: Overscroll auf `html` | behoben | `overscroll-behavior-y: none` auf `html` und `body`. |
| iOS N-8: Download gilt als gesichert | teilweise | Die Meldung beim Download bittet jetzt, die Datei zu prüfen. Weiter als gesichert verbucht: Eine Rückfrage nach jedem Export kostet einen Tap und hilft wenig. |
| iOS N-9: Fokus bei Dialogen, veraltetes Sheet | behoben | Fokus zurück zum Auslöser beim Schließen. `render()` nach „plan.json jetzt öffnen“. Eine Fokusfalle mit Tab ist nicht umgesetzt, Escape und der Klick daneben schließen. |
| iOS N-10: kein Signal am Pausenende | behoben | Der Timer wird 60 s lang in Akzentfarbe mit „Los!“ hervorgehoben, und die Live-Region sagt „Pause vorbei“. Ein Ton ist nicht umgesetzt. |
| iOS N-11: gemischte Begriffe | teilweise | Die Oberfläche sagt durchgängig „Training“ statt „Session“. „Deload“, „RIR“, „Superset“ und „Warm-up“ bleiben, sie stammen aus der Spezifikation und sind im Studio üblich. |
