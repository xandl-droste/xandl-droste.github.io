# Entwurf 2.0: Hauptübungen, RIR, Coach-Export, eine Datei pro Durchgang, Archiv

Stand: abgestimmt, noch nicht umgesetzt. Die Entscheidungen aus der Abstimmung stehen in Abschnitt 7. Begriffe wie in `docs/begriffe.md`.

Ziel: Die App bleibt ein Werkzeug zum Dokumentieren. Planänderungen passieren außerhalb, durch einen KI-Agenten. Neu sind Rückmeldungen zur Anstrengung (RIR, RPE), ein schlanker Export für einen KI-Coach, je eine Datei pro Durchgang eines Plans und ein Archiv zum Ansehen alter Dateien.

Nicht Teil dieser Version: Aufwärmsätze (bleiben bewusst ohne Tracking), Planbearbeitung in der App, andere Trainingsarten (z. B. Beachvolleyball, siehe 2.4), CSV-Export (entfällt).

---

## 1. Feature A: Hauptübungen, RIR und RPE

### 1.1 Hauptübungen

- Neues optionales Feld pro Übung im Plan: `"main": true`. Fehlt es, ist die Übung keine Hauptübung.
- Das Feld pflegt nur der KI-Agent. Schema-Text und Beispielplan im Agent-Prompt erklären es: „Hauptübung: Nach dem letzten Satz fragt die App, wie viele Wiederholungen noch gegangen wären (RIR).“
- Die App kommt mit Plänen mit und ohne das Feld zurecht und ändert den Plan nie.
- Anzeige: kleiner Tag „Haupt“ an der Übung im Training (Liste und Fokus) und im Plan-Tab.

### 1.2 RIR nach dem letzten Satz

- Nur bei Hauptübungen, nur nach dem letzten Satz der Übung.
- Eingabe über Chips `0 · 1 · 2 · 3 · 4+`, daneben das Ziel der Woche aus `plan.rirTargets` (z. B. „Ziel 2–3“).
- Ort: in der Pausenleiste unten, während der Pause nach dem letzten Satz („Back Squat · RIR? 0 1 2 3 4+ · Ziel 2“). Folgt keine Pause (letzte Übung), stehen die Chips in der Karte der Übung.
- Überspringen heißt einfach weitermachen, ohne Extra-Tap. Dann wird nichts gespeichert.
- Rückgängig: Wird der letzte Satz zurückgenommen, entfällt auch sein RIR-Wert.
- Gespeichert pro Übung im Training: `"rirLast": 0–4` (4 bedeutet „4+“). Fehlt das Feld, gibt es keinen Wert.
- Im Verlauf korrigierbar (Chips in der Detailansicht).
- Verwendung: Coach-Export und Agent-Prompt („Mit Plan und letzten Ergebnissen kopieren“, z. B. `· RIR 2 (Ziel 2–3)`).
- Keine Verwendung: Garmin-Export, Gewichtsvorschlag (die doppelte Progression bleibt unverändert).

### 1.3 RPE und Notiz pro Training

- Beim Beenden fragt der bestehende Bestätigungsdialog: „Wie hart war die Einheit insgesamt?“ mit Chips `0–10`. Überspringbar.
- Gespeichert pro Training: `"rpe": 0–10`. Im Verlauf korrigierbar.
- Der Feldname ist bewusst allgemein, damit spätere andere Trainingsarten (Datum, Dauer, RPE) dasselbe Feld nutzen können.
- Im selben Dialog ein optionales Notizfeld für das ganze Training: `"note"` (Freitext, wie die Notizen pro Übung begrenzt). Im Verlauf korrigierbar. Die Notizen pro Übung bleiben.

### 1.4 Anpassung der Spezifikation

Die Nicht-Ziele in `docs/spezifikation.md` („keine Gesundheits- oder Gefühlsabfragen“, „Keine Gesundheits- oder Gefühlsabfrage“ beim Abschluss) werden so geändert, dass RIR nach dem letzten Satz einer Hauptübung und RPE ausdrücklich erlaubt sind. Weitere Abfragen bleiben ausgeschlossen.

---

## 2. Coach-Export

### 2.1 Zweck

Ein schlanker Text für einen KI-Coach, der das Training bewertet. Er ersetzt nicht die `.training.json` (Backup) und nicht den Agent-Prompt (Planänderungen). Für Planänderungen nimmt man die Vorschläge des Coaches in den bestehenden Weg „Plan mit KI erstellen oder anpassen“ mit, denn der schlanke Export reicht nicht, um eine vollständige `plan.json` zu bauen.

### 2.2 Inhalt

Immer die ganze Datei, also der ganze Durchgang (siehe 3). Kein Zeitraum zur Auswahl, kein Zustand „seit dem letzten Export“.

- Kopf: Planname, aktuelle Woche, Vorgänger (Planname und Dateiname), Legende.
- Abschnitt Plan: RIR-Ziele pro Woche (gleiche Folgewochen zusammengefasst), Deload-Regel, pro Einheit jede Übung mit id, Name, „[H]“ bei Hauptübungen und Vorgabe über die Wochen (gleiche Folgewochen zusammengefasst).
- Abschnitt Log: neuestes Training zuerst. Pro Training eine Kopfzeile (Datum, Einheit, Woche, Dauer, RPE, Deload), darunter die Notiz zum Training, falls vorhanden, danach eine Zeile pro Übung mit erledigten Sätzen, RIR mit Ziel, Variante und Notiz. Übersprungene Übungen: „übersprungen“.
- Schreibweise: `kg×Wdh`, Dezimalpunkt (`72.5`), `BW` für Körpergewicht, `BW+10` mit Zusatzgewicht, `20s` für Haltezeit, `/S` für pro Seite.
- Weggelassen: `fileId`, `revision`, Trainings-IDs, Zeitstempel pro Satz, `settings`, `progress`-Interna, Garmin-Felder, Inkremente, Cues, Warm-up-Text, nicht erledigte Sätze.

Beispiel:

```
# Training · Ganzkörper 7 Wochen · aktuell Woche 3/7
Vorgänger: Ganzkörper 6 Wochen (ganzkoerper-6-wochen-2026-09-01.training.json)
Legende: kg×Wdh · BW = Körpergewicht · s = Sekunden · /S = pro Seite · [H] = Hauptübung · @ = RIR nach letztem Satz (Ziel)

## Plan
RIR-Ziel: W1 3 · W2 2–3 · W3 2 · W4–6 1–2 · W7 3–4 (Deload: −1 Satz, 80 %)
E1 Einheit 1 (schwer)
 back-squat  Back Squat [H]  3×5
 pull-up     Klimmzug [H]  3×6–8
 rdl         RDL [H]  W1 3×6 · W2 3×7 · W3 3×8 · W4–6 wie W1–3

## Log
2026-11-15 E1 W1 · 82 min · RPE 7
 Notiz: schlecht geschlafen
 Back Squat  70×5, 72.5×5, 72.5×5 @2 (Ziel 3)
 Klimmzug  BW×6, 6, 6 (Band grün) @2 (Ziel 3)
 Tibialis-Raise  übersprungen
 RDL  80×6, 80×6, 80×6 · Notiz: Griff rutscht
```

Größe zum Vergleich: ein Training braucht in der `.training.json` rund 4.000 Zeichen, im Coach-Export etwa 400 bis 600.

### 2.3 Auslieferung

- Button „Export für Coach“ im Plan-Tab, an der Stelle des bisherigen CSV-Exports. Außerdem im Archiv (siehe 4).
- „Teilen“ als `.md`-Datei über das Teilen-Menü (Hauptaktion), „Kopieren“ als zweite Möglichkeit.
- Hinweis wie beim Agent-Prompt: Die Daten gehen an den Anbieter des KI-Dienstes.
- Daten aus Plan und Notizen werden als Daten gekennzeichnet (wie beim Agent-Prompt), Backticks können keinen Codeblock beenden.

### 2.4 Später: andere Trainingsarten

Nicht Teil dieser Version. Das Format ist so angelegt, dass später Einträge wie „2026-11-18 Beachvolleyball · 90 min · RPE 6“ im selben Log stehen können.

### 2.5 CSV-Export

Entfällt. Button, `training/src/model/csv.js` und zugehörige Tests werden entfernt.

---

## 3. Feature B: eine Datei pro Durchgang

### 3.1 Grundsatz

- Eine `.training.json` enthält genau einen Durchgang eines Plans: den Plan (einmal) und die Trainings dieses Durchgangs.
- Jede Datei ist für sich vollständig und allein wiederherstellbar.
- Ein Nachfolger (gleicher Plan noch einmal oder neuer Plan) bekommt eine neue Datei mit Verweis auf die vorherige.

### 3.2 Neue und geänderte Felder

Datei (oberste Ebene):

```json
{
  "schemaVersion": 2,
  "fileId": "UUID",
  "createdAt": "ISO-8601",
  "previous": { "fileId": "UUID", "fileName": "ganzkoerper-6-wochen-2026-09-01.training.json", "planName": "Ganzkörper 6 Wochen" },
  "carryOver": [
    { "exerciseId": "back-squat", "date": "2026-10-30", "variantId": null,
      "plannedSets": 3, "repsMax": 5,
      "sets": [ { "kg": 80, "reps": 5, "sec": null } ] }
  ],
  "...": "übrige Felder wie bisher"
}
```

- `createdAt`: Zeitpunkt, zu dem die Datei angelegt wurde. Fehlt bei alten Dateien.
- `previous`: optional. Gesetzt von der App, nie vom KI-Agenten.
- `carryOver`: optional. Startwerte aus dem Vorgänger, siehe 3.4.

Block eines Trainings: zusätzlich `"name"` (Übungsname zum Zeitpunkt des Trainings) und `"variantName"`. Damit bleibt ein Training lesbar, auch wenn die Übung später aus dem Plan fliegt. Alte Trainings ohne diese Felder bekommen den Namen beim Lesen aus dem Plan.

### 3.3 Abläufe

| Aktion | Ergebnis |
|---|---|
| „Plan erneut starten“ | Neue Datei mit demselben Plan, `previous` = bisherige Datei, `carryOver` aus der bisherigen Datei |
| Neuer Plan → „Anpassen“ | Gleiche Datei. Der Plan wird ersetzt, erledigte Trainings bleiben unverändert |
| Neuer Plan → „Nachfolger“ (neu) | Neue Datei mit dem neuen Plan, `previous` = bisherige Datei, `carryOver` für Übungen, die in beiden Plänen vorkommen |
| Neuer Plan → „Ganz neu“ | Neue Datei ohne `previous` und ohne `carryOver` |
| „Von vorn“ | Entfällt (ersetzt durch „Nachfolger“) |
| „Woche wiederholen“ | Unverändert |

`progress.cycle` wird in neuen Dateien nicht mehr hochgezählt. Alte Dateien mit mehreren Durchgängen bleiben gültig und werden nicht automatisch aufgeteilt.

### 3.4 Startwerte (`carryOver`)

Vorbelegung und Steigerungsvorschlag hängen am Verlauf. Eine neue Datei hätte keinen und würde ohne Gewichte starten. Deshalb übernimmt die neue Datei beim Anlegen pro Übung (nur ids, die im neuen Plan vorkommen) die letzte Leistung außerhalb eines Deloads aus der bisherigen Datei: Datum, Variante, damals gültige Vorgabe und erledigte Sätze.

Die Progressionsregel und die Vorbelegung nutzen `carryOver`, solange es für eine Übung in der Datei noch kein eigenes Training gibt. `carryOver` erscheint nicht im Verlauf und nicht im Coach-Export.

### 3.5 Browserspeicher

Regel: Die App zeigt nichts an, was nicht gesichert und aus Dateien wiederherstellbar ist.

- Im Browserspeicher liegt nur die aktive Datei (plus laufendes Training und Datum des letzten Exports).
- Bevor eine andere Datei aktiv wird (Nachfolger, „Ganz neu“, „Plan erneut starten“, Öffnen einer anderen `.training.json`), muss die bisherige gesichert sein. Ist sie es nicht, bietet die App zuerst „Als Datei sichern“ an. Abbrechen bricht den Wechsel ab.
- Nach dem Wechsel wird die bisherige Datei aus dem Browserspeicher gelöscht. Sie lebt nur noch in Dateien.
- Einzige Ausnahme von der Regel bleibt die Zeit zwischen einem Training und der nächsten Sicherung. Sie ist wie bisher als „nicht gesichert“ markiert.
- Alte Dateien, die heute schon unsichtbar im Browserspeicher liegen (nach „Ganz neu“), werden beim ersten Start von 2.0 entfernt, falls sie gesichert sind. Ungesicherte bietet die App einmalig zum Sichern an, bevor sie entfernt werden.

### 3.6 Dateinamen

Bisher: `<planname>.training.json`. Bei „Plan erneut starten“ hätte die neue Datei denselben Namen, und „Ersetzen“ im Teilen-Menü würde die alte Sicherung überschreiben. Neu: `<planname>-<JJJJ-MM-TT>.training.json` mit dem Datum aus `createdAt`. Alte Dateien ohne `createdAt` behalten den bisherigen Namen.

---

## 4. Feature C: Archiv

- Vierter Tab „Archiv“: Heute · Verlauf · Plan · Archiv.
- Dort öffnet man eine Datei aus Dateien: eine alte `.training.json` oder eine reine `plan.json`. Immer nur eine Datei.
- Anzeige wie Verlauf und Plan-Tab: Plan mit Vorgaben pro Woche, Trainings mit Detailansicht, Graph pro Übung. Bei einer `plan.json` nur der Plan.
- Angezeigt wird auch der Vorgänger aus `previous`: Planname und Dateiname. Öffnen muss man ihn selbst (iOS erlaubt keinen Zugriff auf Dateien ohne Auswahl).
- Aktionen: „Export für Coach“ und „Für Garmin exportieren“ (pro Training). Sonst nur lesen: keine Korrekturen, kein Löschen, kein Übernehmen.
- Die Archiv-Datei berührt den aktiven Stand nicht: kein Zusammenführen, kein Wechsel, kein Speichern. Sie liegt nur im Arbeitsspeicher. Nach einem Neustart ist der Tab leer.
- Validierung wie beim Import (gleicher Validator, gleiche Grenzen). Dateien aus 1.x werden angezeigt.

---

## 5. Version und Kompatibilität

- Version 2.0.0, `SCHEMA_VERSION` 2. A, B und C kommen zusammen, damit es nur einen Major-Sprung gibt.
- Grund für Major: Der Validator lehnt unbekannte Felder ab. Dateien und Pläne aus 2.0 (z. B. mit `main`, `rirLast`, `rpe`, `previous`) sind für 1.x unlesbar.
- 2.0 liest alle Dateien und Pläne aus 1.x. Fehlende Felder gelten als nicht gesetzt. Exportiert wird immer im Format 2.
- Agent-Prompt: Schema-Text, Beispielplan (mit `main`) und Ergebniszeilen (mit RIR) werden angepasst. Ein Test prüft weiter, dass das Beispiel den Validator besteht.

---

## 6. Umsetzungsreihenfolge

Jeder Schritt mit Tests, `npm test` grün, Zwischenstand auf dem WIP-Branch.

1. Datenmodell: Validator für Schema 2, Lesen von 1.x, neue Felder, Namen in den Blöcken der Trainings, `carryOver` in Vorbelegung und Progression.
2. Feature A in der UI: Tag „Haupt“, RIR-Chips, RPE im Abschluss-Dialog, Korrektur im Verlauf.
3. Coach-Export, CSV-Export entfernen, Agent-Prompt anpassen.
4. Feature B: Abläufe aus 3.3, Sichern vor dem Wechsel, Aufräumen des Browserspeichers, Dateinamen.
5. Feature C: Archiv-Tab.
6. Spezifikation, README, `CHANGELOG.md`, Version 2.0.0, `npm run sw`, Browser-Prüfung.

---

## 7. Entscheidungen aus der Abstimmung

1. **Notiz pro Training:** ja, im Abschluss-Dialog neben der RPE (1.3).
2. **Reihenfolge im Log:** neuestes Training zuerst (2.2).
3. **Auslieferung des Coach-Exports:** „Teilen“ als `.md` plus „Kopieren“, Button im Plan-Tab und im Archiv (2.3).
4. **Dateinamen:** `<planname>-<JJJJ-MM-TT>.training.json` (3.6).
5. **Name des Tabs:** „Archiv“ (4).
6. **Ungesicherte alte Dateien im Browserspeicher:** beim Umstieg auf 2.0 einmalig zum Sichern anbieten, bevor sie entfernt werden (3.5).
