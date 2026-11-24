# Entwurf: andere Trainingsarten

Stand: abgestimmt (2026-11-23), alle Vorschläge angenommen, siehe Abschnitt 9. Begriffe wie in `docs/begriffe.md` (die neuen aus Abschnitt 1 stehen dort).

Ziel: Trainings, die nicht aus dem Plan kommen (z. B. „Beachvolleyball · 90 min · RPE 6“), stehen im selben Log wie die Krafttrainings. Der KI-Coach sieht damit die ganze Belastung einer Woche. Die App bleibt ein Werkzeug zum Dokumentieren: kein Tracking während des Sports, keine Auswertung, kein Ersatz für die Uhr.

Ausgangspunkt: `docs/entwurf-2.0.md`, Abschnitt 2.4, und `docs/wishlist.md`.

Nicht Teil dieses Vorhabens (Vorschlag): Timer oder Live-Erfassung, Puls, Distanz, Kalorien, Garmin-Export oder -Import, Pläne für andere Sportarten, Auswertungen und Graphen.

Die offenen Fragen sind mit **F1** bis **F12** nummeriert und am Ende in Abschnitt 8 gesammelt. Zu jeder steht ein Vorschlag.

---

## 1. Begriffe

Ein Volleyball-Abend ist eine „tatsächlich absolvierte Einheit mit Datum und Dauer“, aber ohne Einheit aus dem Plan und ohne Sätze. Vorschlag:

| Begriff | Englisch | Bedeutung | im Code |
|---|---|---|---|
| **Training** | workout | Bleibt der Oberbegriff: jedes absolvierte Training, mit oder ohne Plan. | — |
| **Krafttraining** | strength workout | Ein Training nach einer Einheit des Plans, mit Sätzen. Das, was die App heute kann. Nur nötig, wo der Unterschied zählt. | `sessions[]` |
| **anderes Training** | other workout | Ein Training ohne Einheit und ohne Sätze: Art, Datum, Dauer, RPE, Notiz. Wird nachträglich eingetragen. | `activities[]` (siehe F4) |
| **Trainingsart** | workout type | Freier Name eines anderen Trainings, z. B. „Beachvolleyball“, „Laufen“, „Mobility“. | `activities[].type` |

**F1 – Begriffe:** Passen „anderes Training“ und „Trainingsart“? Alternativen: „Aktivität“ (kurz, aber Garmin nennt jedes Training so, auch Krafttraining), „freies Training“ (klingt nach Krafttraining ohne Plan), „Sport“. Vorschlag: „anderes Training“ in Doku und Code-Kommentaren, im UI-Button „Anderes Training eintragen“.

---

## 2. Was erfasst wird

| Feld | Pflicht | Eingabe | Grenzen |
|---|---|---|---|
| Trainingsart | ja | Freitext mit Vorschlägen (F2) | 1–60 Zeichen |
| Datum | ja | Vorbelegt mit heute, änderbar (Nachtragen) | wie bei Trainings, nicht in der Zukunft |
| Dauer | ja | Minuten, Stepper ±5 plus Tastatur | 1–600 |
| RPE | nein | Schieberegler wie im Abschluss-Dialog, startet ohne Wert | 0–10 |
| Notiz | nein | Freitext | wie Notiz pro Training |

Die Dauer ist Pflicht, weil Dauer × RPE erst die Belastung ergibt, die ein Coach braucht. Die RPE bleibt freiwillig wie beim Krafttraining (Nicht-Ziel „keine Gefühlsabfragen“ mit der Ausnahme RPE).

**F2 – Trainingsart frei oder fest:** Vorschlag: Freitext, darunter Chips mit den Trainingsarten, die in der aktiven Trainingsdatei schon vorkommen (häufigste zuerst, höchstens 6). So schreibt man „Beachvolleyball“ nur einmal. Alternative: feste Liste in der App oder im Plan (der KI-Agent legt sie fest). Eine feste Liste passt nicht zu „keine Planbearbeitung in der App“ und macht das Planformat größer.

**F3 – Weitere Felder:** Uhrzeit, Ort, Intensität in Stufen, Puls, Distanz? Vorschlag: nein, alles andere gehört in die Notiz. Die Uhr zeichnet das ohnehin auf.

---

## 3. Datenmodell

### 3.1 Wo die Einträge liegen

Die anderen Trainings gehören zur aktiven Trainingsdatei, wie die Krafttrainings. Damit gilt alles aus 2.0 weiter: eine Datei pro Durchgang, für sich wiederherstellbar, Sichern wie gehabt, Archiv zeigt sie mit.

**F4 – Eigenes Feld oder in `sessions[]`:** Zwei Möglichkeiten:

- **(a) eigenes Feld `activities[]` (Vorschlag).** Alles, was heute über `sessions[]` läuft (Wochenzählung, Progression, Vorbelegung, Startwerte, Graphen, Garmin-Export, „Zuletzt“), bleibt unberührt. Nur Verlauf, Coach-Export, Agent-Prompt und Archiv mischen beide Listen nach Datum.
- **(b) in `sessions[]` mit `kind: "other"`**, ohne `sessionKey`, `week` und `blocks`. Eine Liste, aber jede Stelle, die heute über `sessions[]` läuft (rund 15 im Code), muss die anderen Trainings ausfiltern. Ein vergessener Filter wird zum Fehler in Progression oder Wochenzählung.

Format bei (a):

```json
"activities": [
  { "id": "UUID", "date": "2026-11-18", "type": "Beachvolleyball",
    "durationMin": 90, "rpe": 6, "note": "Turnier, 4 Spiele",
    "week": 3, "createdAt": "2026-11-18T21:40:00Z" }
]
```

- `id`: wie bei Trainings, für Korrigieren und Löschen. Gelöschte IDs gehen in das bestehende `deletedSessionIds` (Merge beim Import).
- `week`: die Planwoche zum Zeitpunkt des Eintrags, nur zur Einordnung im Coach-Export. Zählt nicht für den Abschluss der Woche (F5).
- `createdAt`: Reihenfolge innerhalb eines Tages und Merge.
- Neue Grenzen in `LIMITS`: höchstens 2000 Einträge, Trainingsart 60 Zeichen, Dauer 600 min.

### 3.2 Merge beim Import

Wie bei Trainings: Einträge mit gleicher `id` werden nicht doppelt übernommen, gelöschte bleiben gelöscht.

### 3.3 Nachfolger und Startwerte

Ein anderes Training bleibt in der Datei, in der es eingetragen wurde. Es geht nicht in `carryOver`. Die Vorschläge für Trainingsarten (F2) kommen nur aus der aktiven Datei. Startet man einen Nachfolger, tippt man „Beachvolleyball“ also einmal neu.

**F6 – Vorschläge über Durchgänge hinweg:** Reicht das? Alternative: die Trainingsarten des Vorgängers in die neue Datei übernehmen (kleines Feld, z. B. in `settings`). Vorschlag: zunächst nicht, nachrüsten ist einfach.

---

## 4. Bedienung

### 4.1 Eintragen

- Heute-Tab: unter den Einheiten ein zweiter, schlichterer Button „Anderes Training eintragen“.
- Verlauf: derselbe Button oben in der Liste (zum Nachtragen).
- Öffnet ein Sheet mit den Feldern aus Abschnitt 2, „Speichern“ und „Abbrechen“. Speichern erhöht die `revision` und markiert den Stand als „nicht gesichert“, wie nach einem Training.
- Während eines laufenden Trainings ist der Button nicht da.

**F7 – Ohne aktive Trainingsdatei:** Wer noch keinen Plan geöffnet hat, hat keine Trainingsdatei. Vorschlag: Eintragen geht nur mit aktiver Trainingsdatei (der Start ohne Plan zeigt den Button nicht). Alternative: eine Trainingsdatei ohne Plan anlegen. Das wäre ein neuer Dateityp mit vielen Folgefragen.

**F8 – Nur nachträglich oder auch „Starten“:** Vorschlag: nur nachträglich, kein Timer. Man trägt nach dem Sport Dauer und RPE ein. Ein Timer würde die App während des Sports offen halten (Wake Lock, Akku) und ist Aufgabe der Uhr.

### 4.2 Verlauf

- Andere Trainings stehen in derselben Liste, nach Datum sortiert, mit eigenem Kennzeichen (Trainingsart statt Einheit, z. B. „Beachvolleyball · 90 min“, ohne Wochenangabe).
- Detailansicht: Trainingsart, Datum, Dauer, RPE, Notiz, alles korrigierbar, „Löschen“ mit Rückfrage wie bei Trainings.
- Graphen pro Übung bleiben, wie sie sind. Keine Graphen für andere Trainings.

### 4.3 Archiv

Wie Verlauf, nur lesend.

### 4.4 Heute-Tab

**F5 – Einfluss auf Woche und „Zuletzt“:** Vorschlag: keiner. Ein anderes Training zählt nicht für den Abschluss der Woche, erscheint nicht in der „Zuletzt“-Zeile (die sagt, wann zuletzt Kraft trainiert wurde) und ändert keine Vorbelegung. Die App gibt keine Hinweise wie „gestern Volleyball, heute leichter“. Das bewertet der Coach.

---

## 5. Exporte

### 5.1 Coach-Export

Im Log nach Datum gemischt, neuestes zuerst, wie in `entwurf-2.0.md` 2.4 angelegt:

```
## Log
2026-11-18 Beachvolleyball · W3 · 90 min · RPE 6
 Notiz: Turnier, 4 Spiele
2026-11-17 E2 W3 · 64 min · RPE 7
 Back Squat  75×5, 75×5, 75×5 @2 (Ziel 2)
 ...
```

Die Trainingsart wird wie Notizen als Daten gekennzeichnet (Backticks können keinen Codeblock beenden). Die Legende bekommt den Zusatz „Zeilen ohne Einheit (E…) = anderes Training“.

### 5.2 Agent-Prompt

**F9 – Andere Trainings im Agent-Prompt:** Der Prompt enthält heute die letzten Ergebnisse pro Übung. Vorschlag: zusätzlich eine kurze Zusammenfassung der anderen Trainings der letzten 4 Wochen, z. B. „Beachvolleyball: 7× in 4 Wochen, meist 90 min, RPE 5–7“, damit der Agent den Plan um feste Sporttermine herum bauen kann. Alternative: gar nicht (dafür gibt es den Coach-Export) oder jede Zeile einzeln.

### 5.3 Garmin-Export

**F10 – Garmin:** Vorschlag: kein Garmin-Export für andere Trainings. Wer Volleyball mit der Uhr aufzeichnet, hat es schon in Garmin Connect. Ohne Uhr wäre ein FIT mit nur Dauer möglich (`sport` z. B. volleyball), aber dann bräuchte die App eine Zuordnung von Freitext zu Garmin-Sportarten.

---

## 6. Version und Kompatibilität

Der Validator von 2.0 lehnt unbekannte Felder ab. Eine Datei mit `activities` ist für 2.0 nicht lesbar. Laut `CLAUDE.md` („neue Exporte sind für alte Versionen unlesbar“) ist das ein Major-Sprung.

**F11 – Version:** Vorschlag: **3.0.0, `SCHEMA_VERSION` 3.** 3.0 liest alle Dateien aus 1.x und 2.x und schreibt immer Schema 3. Vorteil: 2.0 meldet bei einer neuen Datei sauber „Datei stammt aus einer neueren App-Version. Bitte die App aktualisieren.“ statt „unbekanntes Feld activities“. Der Plan und das Planformat für den KI-Agenten ändern sich nicht, Plandateien bleiben in beide Richtungen kompatibel.
Alternative 2.1.0: `activities` nur schreiben, wenn es Einträge gibt, `schemaVersion` bleibt 2. Dann wären nur Dateien mit anderen Trainings für 2.0 unlesbar, mit der unklaren Fehlermeldung. Das widerspricht der Regel in `CLAUDE.md`. Praktisch ist beides kaum relevant, weil der Service Worker alte App-Stände schnell ersetzt.

---

## 7. Umsetzungsreihenfolge

Jeder Schritt mit Tests, `npm test` grün, nach jedem Schritt committen, pushen und `docs/stand.md` nachführen.

1. Begriffe in `docs/begriffe.md`. Datenmodell: Validator Schema 3, `activities`, Grenzen, Merge, Löschen, Tests.
2. UI: Sheet „Anderes Training eintragen“ mit Vorschlägen, Button im Heute-Tab und im Verlauf.
3. Verlauf und Archiv: gemischte Liste, Detailansicht mit Korrektur und Löschen.
4. Coach-Export und Agent-Prompt.
5. Spezifikation, README, `CHANGELOG.md`, Version, `npm run sw`, Browser-Prüfung (neuer e2e-Test), danach Reviews (Spezifikation Abschnitt 9).

**F12 – Umfang der Reviews:** Vorschlag: volle Runde mit vier Reviewern wie bei 2.0, weil sich das Dateiformat ändert (Security: neue Freitexte im Import und im Export).

---

## 8. Offene Fragen (Übersicht)

| Nr. | Frage | Vorschlag |
|---|---|---|
| F1 | Begriffe | „anderes Training“, „Trainingsart“ |
| F2 | Trainingsart frei oder feste Liste | Freitext mit Vorschlägen aus der aktiven Datei |
| F3 | Weitere Felder (Uhrzeit, Puls, Distanz …) | nein, nur Notiz |
| F4 | Eigenes Feld oder in `sessions[]` | eigenes Feld `activities[]` |
| F5 | Zählt für Woche, „Zuletzt“, Vorbelegung | nein |
| F6 | Vorschläge über Durchgänge hinweg | zunächst nicht |
| F7 | Eintragen ohne aktive Trainingsdatei | nein |
| F8 | Nur nachträglich oder mit Timer | nur nachträglich |
| F9 | Im Agent-Prompt | Zusammenfassung der letzten 4 Wochen |
| F10 | Garmin-Export | nein |
| F11 | Version | 3.0.0, `SCHEMA_VERSION` 3 |
| F12 | Reviews | volle Runde, vier Reviewer |

## 9. Entscheidungen aus der Abstimmung

Betreiber, 2026-11-23: alle Vorschläge aus Abschnitt 8 angenommen.

1. **Begriffe:** „anderes Training“ und „Trainingsart“, „Krafttraining“ nur wo der Unterschied zählt (F1).
2. **Trainingsart:** Freitext mit bis zu 6 Vorschlägen aus der aktiven Trainingsdatei (F2).
3. **Felder:** nur Trainingsart, Datum, Dauer, RPE (freiwillig), Notiz (F3).
4. **Datenmodell:** eigenes Feld `activities[]` (F4).
5. **Kein Einfluss** auf Wochenabschluss, „Zuletzt“, Vorbelegung und Steigerung (F5).
6. **Vorschläge** nur aus der aktiven Trainingsdatei, nicht aus dem Vorgänger (F6).
7. **Eintragen** nur mit aktiver Trainingsdatei (F7), nur nachträglich, kein Timer (F8).
8. **Agent-Prompt:** Zusammenfassung der anderen Trainings der letzten 4 Wochen (F9).
9. **Kein Garmin-Export** für andere Trainings (F10).
10. **Version 3.0.0**, `SCHEMA_VERSION` 3 (F11).
11. **Reviews:** volle Runde mit vier Reviewern (F12).
