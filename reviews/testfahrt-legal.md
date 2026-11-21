# Review: Legal (Testfahrt-Fixes)

Reviewer: Legal (Recht und Compliance AT/EU), frische Instanz. Gegenstand: uncommittete Änderungen auf `feature/testfahrt-bugs` gegenüber `develop` (`git diff develop`, 9 Dateien, +153/−29). Geprüft am 2026-11-17, nur lesend. Kein Ersatz für anwaltliche Beratung. Die Aussagen sind wie folgt gekennzeichnet: **eindeutig**, **wahrscheinlich** oder **unklar, anwaltlich klären**.

## Geprüfte Punkte

| Punkt | Wie geprüft | Ergebnis |
|---|---|---|
| Neue Datenverarbeitung / Speicherung | Diff von `training/src/app.js`, `training/src/model/live.js`, `training/src/views/live.js` gelesen; `updateSettings` (app.js:260–268) und `training-file.js:29` nachgesehen | Neue Zustände `S.warmupOpen`, `S.scrollToActive` und `lastPointerType` liegen nur im Arbeitsspeicher (app.js:56–57, 75–76). Kein neuer Speicherzugriff. Der Umschalter in der Leiste schreibt `settings.view` über den bestehenden Pfad `updateSettings`. Diese Einstellung gibt es schon und sie wird im Menü genauso gesetzt. `toggleSet` setzt nach dem letzten Satz `rest = null`. Das ändert nur einen Wert in einem schon gespeicherten Feld, es kommt keine neue Datenkategorie dazu. **Eindeutig** keine neue Verarbeitung. |
| Erfassung von Eingabeverhalten | `pointerdown`-Listener (app.js:75–76) | Der Listener merkt sich nur den letzten `pointerType` (`touch`/`mouse`/`pen`) in einer Modulvariable. Der Wert wird nicht gespeichert und nicht übertragen und dient nur dazu, ein Auswahlfeld nach Touch nicht wieder zu fokussieren. Das ist kein Tracking. **Eindeutig.** |
| Speicherzugriff nach § 165 Abs. 3 TKG 2021 | Diff durchsucht nach `localStorage`, `sessionStorage`, `indexedDB`, `cookie`, `caches`, `storage` | Keine neuen Zugriffe. Die Einschätzung aus legal-r2 (Ausnahme „unbedingt erforderlich“, kein Banner nötig) gilt **wahrscheinlich** unverändert. |
| Netzwerk / externe Requests | Diff durchsucht nach `fetch`, `http`, `XMLHttpRequest`, `sendBeacon`, `WebSocket` | Neu sind keine Requests. Die einzige URL im Diffumfeld ist der SVG-Namespace in `dom.js:3`, den es schon gab und der keinen Request auslöst. Die Aussage „kein Tracking, keine Datenübertragung“ auf der Info-Seite bleibt zutreffend. **Eindeutig** (Code-Ebene). |
| Abweichung von Datenschutzhinweisen / Info-Seite | `git diff develop --name-only` geprüft | `training/src/views/info.js`, `training/src/legal.js`, Manifest, README und LICENSE sind nicht geändert. Der Hash von `info.js` in `sw.js` ist unverändert. **Eindeutig** keine Abweichung. |
| Persönliche Daten in Code, Tests, Kommentaren | Diff durchsucht nach Mailadressen (`@`), Namen, Orten und lokalen Pfaden | Keine Funde. Die Testdaten stammen aus dem Seed-Plan (Übungsnamen). **Eindeutig.** |
| Test-Artefakte | `tests/e2e/helpers.mjs:17,35`, `.gitignore` | Der neue Screenshot `12-umschalter-liste` geht nach `test-results/shots`. `test-results/` steht in `.gitignore`, die Bilder zeigen nur Seed-Daten. **Eindeutig** kein Repo-Eintrag. |
| Commit-Identität für den späteren Commit | `git config user.email`, letzter Commit auf `develop` | Die konfigurierte Adresse ist eine GitHub-`noreply`-Adresse, so wie es CLAUDE.md verlangt. **Eindeutig.** |
| Rendering / Injektionsweg (rechtlich nur am Rande) | `dom.js:9–37` (`h`, `setProps`); neue Props `open`, `ontoggle`, `data-fid` | Alles läuft über `setAttribute`/`addEventListener`/Textknoten. Es gibt kein `innerHTML`. Die neuen Icons sind statische SVG-Pfade. |
| Gesundheits- / Haftungstexte | Neue UI-Texte in `views/live.js:176–180` („Alle Sätze erledigt“, „Stark. Unten mit „Abschließen“ beenden und sichern.“) | Es sind reine Bedienhinweise ohne medizinische Aussage. **Eindeutig** unbedenklich. |
| Lizenz / Fremdcode | Neue Icon-Pfade `dom.js:43–45` | Die Pfade sind trivial geometrisch (Linien, Punkte, abgerundetes Rechteck). Daran entsteht **wahrscheinlich** kein urheberrechtlicher Schutz (Schöpfungshöhe nach § 1 UrhG fehlt). Hinweise auf eine übernommene Icon-Bibliothek gibt es nicht. Neue Abhängigkeiten gibt es nicht. |
| Konsistenz Service Worker | SHA-256 der 5 geänderten App-Dateien mit `HASHES` in `training/sw.js` verglichen | Alle 5 Hashes stimmen. Es gibt nichts Rechtliches, aber keine ungeprüften Dateien gehen in den Offline-Cache. |

## Nicht geprüft (mit Grund)

- **Browser-Test (Netzwerkprotokoll, Speicher, Cookies):** Ich habe die App nicht gestartet, die Prüfung ist reine Code-Analyse. Die Änderungen berühren weder Netzwerk noch Speicher-APIs, ein Laufzeittest hätte also kaum etwas Neues gezeigt. Den vollständigen Laufzeitbeleg liefert legal-r2.
- **Echtes iPhone / Safari:** nicht verfügbar. Rechtlich ohne Bedeutung für diesen Diff.
- **Git-Historie und Live-Stand:** gehören nicht zum Prüfgegenstand (nur uncommittete Änderungen). Offene Punkte aus legal-r2 (z. B. M1 Live-Stand, N1 Hosting-Absatz) habe ich hier nicht neu bewertet.
- **Web-Recherche:** nicht nötig, weil keine neue Rechtsfrage entsteht.

## Findings

### Kritisch

Keine.

### Hoch

Keine.

### Mittel

Keine.

### Niedrig

Keine.

## Hinweise ohne Finding

1. **Nur flüchtige Zustände:** `S.warmupOpen` und `S.scrollToActive` sind als „nur im Speicher“ kommentiert (app.js:56–57) und gehen bei einem Neuladen verloren. Für den Datenschutz ist das günstig. Sollte der Warm-up-Zustand später doch in der Trainingsdatei oder in IndexedDB landen, wäre auch das eine funktional nötige Speicherung ohne Einwilligungspflicht. **Wahrscheinlich**, Quelle: § 165 Abs. 3 TKG 2021.
2. **`pointerdown`-Listener:** Er ist harmlos, solange `lastPointerType` weder gespeichert noch exportiert noch in Logs geschrieben wird. Wird er künftig erweitert (z. B. Zeitstempel, Koordinaten), sollte die Info-Seite nochmals abgeglichen werden.
3. **Testdaten:** Die neuen Tests (`tests/live.test.js:59–76`, `tests/e2e/training.e2e.mjs`) nutzen nur Seed-Daten und feste Zeitstempel (`T0`), keine echten Trainingsdaten des Betreibers. Das sollte beim Committen so bleiben. Auch die Screenshots unter `test-results/` gehören nicht ins Repo (derzeit per `.gitignore` sichergestellt).
4. **Gesamtergebnis:** Die Änderungen sind rein funktional und betreffen Bedienung und Darstellung. Sie bringen keine neue Verarbeitung personenbezogener Daten, keine neuen Speicherzugriffe und keine externen Requests. Sie ändern weder die Offenlegung noch den Datenschutztext und fügen keine persönlichen Daten ins Repo ein. Aus Sicht Legal spricht nichts gegen den Squash-Merge nach `develop`. **Eindeutig** auf Code-Ebene.
