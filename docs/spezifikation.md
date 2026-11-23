# Prompt für Claude Code: Trainings-PWA (lokal, offline, iPhone)

## 0. Auftrag in Kürze

Baue eine leichtgewichtige PWA, mit der ich meinen Krafttrainingsplan Einheit für Einheit abarbeite und protokolliere. Die UI ist auf Deutsch. Referenzgerät ist ein iPhone 13 mini (375 × 812 pt, in Safari ca. 630 pt sichtbare Höhe), installiert über "Zum Home-Bildschirm". Die App muss vor allem auf kleinen Handys gut bedienbar sein.

Die App macht genau eines: den geplanten Trainingsplan abarbeitbar machen und die Ergebnisse speichern.

**Nicht-Ziele (bitte nicht einbauen):** keine Sonderlogik für Körperwerte, kein Tracking einzelner Übungen außerhalb der Sätze, keine Gesundheits- oder Gefühlsabfragen (Ausnahmen ab 2.0, beide freiwillig: RIR nach dem letzten Satz einer Hauptübung und RPE des ganzen Trainings), kein Backend, keine Accounts, kein Auto-Sync.

**Visuelle Vorlage:** Unter `docs/prototyp.html` liegt ein klickbarer Prototyp. Er zeigt Layout, Ablauf, den Stil-Umschalter und das Menü. Übernimm Aufbau und Look, aber nicht den Code: Der Prototyp nutzt `innerHTML` und Dummy-Daten. Fehlt die Datei, frag mich danach, bevor du mit der UI (Schritt 2) beginnst. Schritt 1 kannst du ohne sie erledigen.

**Begriffe (damit nichts verwechselt wird):** Ab Version 2.0 gilt `docs/begriffe.md`. Die folgenden drei Punkte sind der ursprüngliche Stand.
- *Plan-Einheit* = Vorlage im Plan (`plan.sessions[]`, z. B. `E1`).
- *Training* (früher „Session“) = ein tatsächlich absolviertes Training in der Historie (`sessions[]` auf oberster Ebene der Datei). Verbindliche Begriffe: `docs/begriffe.md`.
- *Block* = eine einzelne Übung oder ein Superset innerhalb einer Einheit.

**Vorrang bei Widersprüchen:** Abschnitt 1 (harte Rahmenbedingungen) geht vor allem anderen, dann 2 (Datenmodell), dann die übrigen Abschnitte. Findest du einen echten Widerspruch, entscheide dich für die Lesart, die Abschnitt 1 und 2 am besten erfüllt, und nenn ihn im Schrittbericht.

---

## 1. Harte Rahmenbedingungen

- Kein Backend, keine Accounts, keine Analytics, keine Cookies, keine externen Requests, keine CDN-Abhängigkeiten. Alles wird lokal gebündelt. Nach dem ersten Laden ist die App vollständig offline nutzbar (Service Worker, Web App Manifest).
- Hosting als statische Dateien über GitHub Pages, auch unter einem Unterpfad. Alle Pfade sind relativ, auch Service-Worker-Scope und `start_url`, damit die App unter jeder Adresse läuft (GitHub-Pages-Unterpfad oder localhost).
- Bevorzugt Vanilla JS (ES Modules) oder Preact, kein schwerer Build. Falls ein Build nötig ist: minimal mit Vite. Das Ergebnis landet in dem Repo-Ordner, den GitHub Pages ausliefert (z. B. per GitHub Actions). Der Workflow hat minimale `permissions` und gepinnte Action-Versionen (Commit-SHA).
- Der Arbeitsstand liegt in IndexedDB. Beim Start `navigator.storage.persist()` anfragen. iOS Safari hat keine File System Access API. Dateien kommen deshalb nur per Import (`<input type="file">`) herein und gehen nur per Export hinaus (Web Share API mit Datei, Fallback Download-Link). Keinen Auto-Sync vortäuschen.
- Daten aus Importdateien und Nutzereingaben (Übungsnamen, Notizen, Plan-Texte) werden nur mit `textContent` oder sicherem Templating gerendert, nie mit `innerHTML`, `insertAdjacentHTML`, `eval` oder `new Function`.
- Content-Security-Policy per `<meta>`-Tag (kein `unsafe-eval`, kein `unsafe-inline` ohne schriftliche Begründung im Code), Referrer-Policy per Meta.
- Zahlenfelder mit `inputmode="decimal"`. Inputs mit mindestens 16 px Schriftgröße (kein Zoom-Sprung). Systemfont. Safe-Area-Insets beachten.
- Manifest, `apple-touch-icon`, `apple-mobile-web-app-capable`, `theme-color`. Screen Wake Lock ist aktiv, solange ein Training läuft, und wird nach der Rückkehr in die App (`visibilitychange`) neu angefordert.
- Timer rechnen mit Zeitstempeln, nicht mit Intervallzählern, damit sie nach App-Wechsel oder Sperrbildschirm korrekt weiterlaufen.
- Barrierefreiheit von Anfang an: `aria-label` und Rollen für Icon-Buttons, sichtbarer Fokus, Zustände nicht nur über Farbe, `prefers-reduced-motion` beachten, Kontraste WCAG AA in allen drei Stilen.

---

## 2. Datenmodell: eine Datei als Wahrheit

Ab 2.0 gibt es pro Durchgang eines Plans eine Trainingsdatei mit dem Namensmuster `<planname>-<JJJJ-MM-TT>.training.json` (Datum der Anlage, `createdAt`). Der Name wird aus dem Plannamen bereinigt erzeugt (nur sichere Zeichen). Dateien aus 1.x ohne `createdAt` heißen `<planname>.training.json`. Begriffe: `docs/begriffe.md`, Entwurf mit allen Entscheidungen: `docs/entwurf-2.0.md`.

```json
{
  "schemaVersion": 2,      // 1.x-Dateien (1) werden gelesen und als 2 weitergeführt
  "fileId": "UUID",
  "revision": 0,
  "updatedAt": "ISO-8601",
  "createdAt": "ISO-8601",                                                         // ab 2.0, optional: Anlage der Datei
  "previous": { "fileId": "UUID", "fileName": "…-2026-09-01.training.json", "planName": "…" },   // optional: Vorgänger
  "carryOver": [ { "exerciseId": "back-squat", "date": "YYYY-MM-DD", "variantId": null,
                   "plannedSets": 3, "repsMax": 5, "sets": [ { "kg": 85, "reps": 5, "sec": null } ], "note": "" } ],  // optional: Startwerte
  "plan": { "... siehe Plan-Schema in Abschnitt 3 ..." },
  "settings": { "theme": "dark", "view": "list", "sound": "loud" },   // sound optional: off | quiet | loud, fehlt = loud
  "progress": { "currentWeek": 1, "status": "active", "cycle": 1, "repeatFrom": "ISO-8601" },   // cycle, repeatFrom optional
  "sessions": [
    {
      "id": "UUID",
      "date": "YYYY-MM-DD",
      "sessionKey": "E1",
      "week": 1,
      "cycle": 1,          // optional, fehlt = Durchgang 1
      "deload": true,      // optional, nur in Deload-Wochen
      "startedAt": "ISO-8601",
      "endedAt": "ISO-8601",
      "rpe": 7,            // optional (ab 2.0): wie hart war das ganze Training, 0–10
      "note": "",          // optional (ab 2.0): Notiz zum ganzen Training
      "blocks": [
        { "exerciseId": "back-squat", "name": "Back Squat", "variantId": null, "variantName": null,   // Namen optional (ab 2.0)
          "rirLast": 2,    // optional (ab 2.0): RIR nach dem letzten Satz einer Hauptübung, 0–4 (4 = „4+“)
          "plannedSets": 3, "repsMax": 5,   // optional: beim Start gültige Vorgabe (bei Haltezeit durationSec statt repsMax)
          "sets": [ { "kg": 80, "reps": 5, "sec": null, "done": true, "doneAt": "2026-03-05T07:12:40Z" } ],   // doneAt optional
          "note": "" }
      ]
    }
  ],
  "deletedSessionIds": [ "UUID" ]   // optional: gelöschte Trainings
}
```

Regeln:

- Plan und Historie sind strukturell getrennt. `plan` gehört dem Agenten und wird von der App nie verändert. `sessions`, `progress` und `settings` gehören der App. Ein neu importierter Plan darf die Historie nicht löschen.
- IndexedDB ist nur der Arbeitsstand. Bei jedem Trainingsende und bei jeder relevanten Änderung wird `revision` erhöht und `updatedAt` gesetzt.
- Autosave nach jedem Satz. App-Neustart, Tab-Wechsel oder App-Beenden dürfen das laufende Training nicht verlieren. Ein unterbrochenes Training wird beim nächsten Start zum Fortsetzen angeboten.
- `currentWeek` wird aus den Trainings abgeleitet: Eine Woche ist fertig, wenn alle Plan-Einheiten dieser Woche absolviert sind. Es zählen nur beendete Trainings des aktuellen Durchgangs (`progress.cycle`, fehlt = 1), die nach `progress.repeatFrom` begonnen wurden und bei denen mindestens die Hälfte aller Sätze erledigt ist (Nenner: alle Sätze der Training, auch die übersprungener Übungen). Der Wert kann manuell gesetzt werden. Die Woche rückt nur vor, nie zurück.
- Durchgänge (ab 2.0): Eine Trainingsdatei enthält genau einen Durchgang. „Plan erneut starten“ legt eine neue Trainingsdatei mit demselben Plan an, mit Verweis auf die bisherige (`previous`) und Startwerten daraus (`carryOver`: pro Übung des neuen Plans die letzte Leistung außerhalb eines Deloads mit der damals gültigen Vorgabe). Vorbelegung und Steigerungsvorschlag nutzen die Startwerte, solange es für eine Übung noch kein eigenes Training gibt. Startwerte erscheinen nicht im Verlauf und nicht im Coach-Export. Dateien aus 1.x mit mehreren Durchgängen (`cycle`) bleiben gültig und werden nicht aufgeteilt. „Woche wiederholen“ setzt `repeatFrom` auf jetzt, ältere Trainings zählen dann nicht mehr für den Abschluss.
- Browserspeicher (ab 2.0): Dort liegt nur die aktive Trainingsdatei (plus laufendes Training und Stand der letzten Sicherung). Bevor eine andere Trainingsdatei aktiv wird (Nachfolger, „Ganz neu“, „Plan erneut starten“, andere `.training.json`), muss die bisherige gesichert sein: Ist sie es nicht, kommt zuerst „Erst sichern“ („Als Datei sichern und weiter“ oder „Abbrechen“). Danach wird sie im selben Schreibvorgang aus dem Browser entfernt. Ältere Trainingsdateien im Browser (aus 1.x) werden beim Start entfernt, wenn sie gesichert sind; ungesicherte bietet die App bei jedem Start zum Sichern an (Sichern, Verwerfen mit Rückfrage, Später).
- Jedes Training speichert beim Start ihren Durchgang, in Deload-Wochen `deload: true` und pro Block die damals gültige Vorgabe (`plannedSets`, `repsMax` bzw. `durationSec`). Ältere Trainings ohne diese Felder: Durchgang 1, Deload und Vorgabe aus dem aktuellen Plan.
- Beendete Trainings lassen sich im Verlauf korrigieren (Werte, Notiz) und löschen. Gelöschte Trainings-IDs stehen in `deletedSessionIds` (begrenzt, älteste fallen heraus), damit sie beim Zusammenführen mit älteren Dateien nicht zurückkommen.
- Die zuletzt exportierte `revision` und das Datum des letzten Exports speichert die App lokal (IndexedDB). Sie gehören nicht in die exportierte Datei.
- Abschluss: Nach der letzten Planwoche erscheint der Dialog "Plan abgeschlossen", `status` wird auf `completed` gesetzt und der Export als Archiv angeboten.

### Import

- Zwei Dateitypen: reine `plan.json` (vom Agenten) und `.training.json` (Gesamtstand). Mehrfachauswahl ist erlaubt.
- Eine `plan.json` legt eine neue `.training.json` mit leerer Historie an. Der Import einer `.training.json` stellt alles wieder her, auch bei leerem Browserspeicher.
- Abgleich bei gleicher `fileId`: Die höhere `revision` gewinnt. Fehlen in der Datei Trainings, die lokal vorhanden sind, werden sie per Trainings-ID zusammengeführt. `deletedSessionIds` beider Stände werden vereinigt, diese Trainings fallen heraus.
- Nach jedem Import wird `progress` aus der Historie neu abgeleitet (ohne Dialog „Plan abgeschlossen“).
- Vor dem Übernehmen gibt es immer eine Vorschau mit Bestätigung: Planname, Anzahl Einheiten und Übungen, bei Trainings deren Anzahl und Zeitraum. Nie stumm überschreiben.
- Neuer Plan bei vorhandener Trainingsdatei, drei Möglichkeiten (ab 2.0): „Anpassen“ (gleiche Trainingsdatei, Plan ersetzt, gleiche Woche, begrenzt auf die Wochen des neuen Plans, erledigte Trainings bleiben unverändert; deren Übungs- und Variantennamen werden vorher festgehalten), „Nachfolger“ (neue Trainingsdatei ab Woche 1 mit Verweis und Startwerten, ersetzt „Von vorn“) und „Ganz neu“ (neue Trainingsdatei ohne Verweis und ohne Startwerte). Vorbelegt ist „Nachfolger“, wenn der Plan abgeschlossen ist, sonst „Anpassen“. Die Zuordnung läuft über `exerciseId`. Bei „Anpassen“ und „Nachfolger“ zeigt die Vorschau in einer Zeile, wie der neue Plan zur Historie passt, z. B. „9 Übungen mit Verlauf · 4 neu · 3 nicht mehr im Plan“ (eindeutige Übungs-IDs: im neuen Plan mit erledigtem Satz im Verlauf, im neuen Plan ohne Verlauf, mit Verlauf im aktuellen, aber nicht im neuen Plan). Teile mit 0 entfallen, ohne Historie entfällt die Zeile. Nach dem Übernehmen nennt ein Hinweis die Übungs-IDs aus der Historie, die im neuen Plan fehlen.
- Validierung gegen das Schema (handgeschriebener Validator oder lokal gebündelte Bibliothek). Fehler werden mit Pfad und Klartext gemeldet, z. B. `plan.sessions[1].blocks[2].exercises[0]: repsMax fehlt`. Bei einem Fehler wird der Import abgebrochen, nichts wird halb gespeichert (eine Transaktion). Zusätzlich: Größen- und Tiefenlimits, Schutz vor den Schlüsseln `__proto__`, `constructor` und `prototype`, unsinnige Zahlen ablehnen (negativ, NaN, unrealistisch groß). Die konkreten Grenzwerte legst du fest und dokumentierst sie im Code.

### Export

- Nach jedem Training: Teilen-Menü mit der `.training.json` und dem Hinweis "In Dateien sichern, bei Rückfrage Ersetzen wählen". Primär `navigator.share({files})`, Fallback Download. Ein Abbruch im Teilen-Menü gilt nicht als Export.
- Nicht gesicherte Änderungen (`revision` größer als zuletzt exportiert) werden im Verlauf markiert, und beim Start erinnert die App dezent daran. Ebenso nach 7 Tagen ohne Export.
- „Export für Coach“ (ab 2.0, ersetzt den CSV-Export): schlanker Markdown-Text mit dem Plan (Vorgaben pro Woche, RIR-Ziele, Deload, Hauptübungen) und allen Trainings der Trainingsdatei, neuestes zuerst (Sätze, RIR mit Ziel, RPE, Notizen, Varianten, übersprungene Übungen). Ohne technische Felder (IDs außer Übungs-IDs im Planteil, Zeitstempel, Einstellungen, Startwerte). Teilen als `<trainingsdatei>-coach.md` oder Kopieren. Plan und Trainings sind als Daten gekennzeichnet, Backticks und Zeilenumbrüche aus Namen und Notizen werden entschärft. Hinweis, dass die Daten an den Anbieter des KI-Dienstes gehen.
- Die App darf keinen stillen Export vortäuschen. Der Export bleibt klar: ein Button, ein Tap im Teilen-Menü.

---

## 3. Plan-Schema (Entwurf, du darfst verbessern)

```
plan: {
  name, version, language: "de",
  weeks: 7,
  rirTargets: { "1": "3", "2": "2-3", "3": "2", "4": "1-2", "5": "1-2", "6": "1-2", "7": "3-4" },
  deload: { weeks: [7], setsDelta: -1, loadFactor: 0.8 },
  sessions: [
    { key, name, suggestedDay, warmup: [ "Text", ... ],
      blocks: [
        { type: "single" | "superset",
          exercises: [   // bei "superset" genau 2, abwechselnd a/b
            { id, name,
              sets, repsMin, repsMax, durationSec,
              unit: "kg" | "s" | "bodyweight",
              perSide: false,
              restSec, incrementKg, cue,
              main,                                 // optional (ab 2.0): Hauptübung, nach dem letzten Satz RIR-Abfrage
              variants: [ { id, name, cue } ],      // optional, Auswahl vor dem Training
              garminCategory, garminSubcategory,    // optional, Zahlen aus dem FIT-Profil
              byWeek: { "3": { sets, repsMin, repsMax, durationSec, cue } } }  // Überschreibungen
          ] }
      ] }
  ]
}
```

Hinweise zum Schema:
- Wenn du das Schema verbesserst, halte die Änderungen an EINER Stelle fest (Schema-Datei oder Validator) und nutze genau dieses Schema auch im Agent-Prompt (Abschnitt 5, Onboarding). App, Validator, Seed-Plan und Agent-Prompt dürfen nicht auseinanderlaufen.
- Der Seed-Plan braucht Wochen-Überschreibungen, in denen eine Übung von Haltezeit auf Wiederholungen wechselt (Hüftbeuger-Knieheben), und Intensitätsangaben pro Woche (Pogo, Approach). Das Schema muss beides abbilden können, z. B. über `unit` in `byWeek` und `cue`.

Regeln:
- **Doppelte Progression, nicht fix pro Woche:** Haben beim letzten Mal außerhalb eines Deloads alle Sätze die obere Wiederholungsgrenze erreicht, schlägt die App `+incrementKg` vor (per Tap übernehmen). Danach wird wieder am unteren Ende begonnen. Die Grenze ist die beim letzten Mal gültige Vorgabe (im Block gespeichert, sonst aus dem Plan), inklusive `byWeek`. Hebt der Plan in der aktuellen Woche `repsMax` gegenüber dem letzten Mal an, gibt es keinen Vorschlag (erst die Wiederholungen steigern). Das Inkrement ist pro Übung konfigurierbar (Standard Unterkörper 2,5 kg, Oberkörper 1–2,5 kg).
- **Vorbelegung:** Gewicht von der letzten Leistung außerhalb eines Deloads (gibt es keine, von irgendeiner). Wiederholungen vom letzten Mal, begrenzt auf `repsMin`–`repsMax` der Woche, ohne Vorwert `repsMin`. Haltezeit: die der Woche, wenn sie sich gegenüber der letzten Vorgabe geändert hat, sonst die vom letzten Mal. „Letztes Mal“ zeigt die Leistung, aus der vorbelegt wurde.
- **Deload-Woche:** pro Übung ein Satz weniger, Gewichtsvorschlag ca. 80 % des letzten Arbeitsgewichts außerhalb eines Deloads, keine Steigerung.
- **Übungstypen:** Gewicht × Wiederholungen, Haltezeit in Sekunden, Körpergewicht (optional mit Zusatzgewicht), einseitig (pro Seite).

---

## 4. Seed-Plan (Beispielplan für die Tests)

Liefere den folgenden Plan als gültige `plan.json` im Repo mit. Er muss durch den eigenen Validator laufen (Unit-Test).

Zwei Ganzkörper-Einheiten pro Woche: Einheit 1 (schwer) und Einheit 2 (elastisch). Der umgesetzte Plan liegt in `tests/fixtures/beispielplan.plan.json`. Er dient den Tests und wird nicht mit der App ausgeliefert (Entscheidung des Betreibers nach Review Runde 2). In der App gibt es keinen „Beispielplan laden“ mehr.

**Warm-up (beide Einheiten, ca. 10 Min, nur als Info-Text ohne Tracking):** World's Greatest Stretch 5×/Seite · 90/90 Hip Switches 8× · Glute Bridge 10× · Thoracic Extension (Bank/Rolle) 6–8× · danach Aufwärmsätze der ersten Übung. Kein statisches Dehnen vor dem Training.

**Einheit 1 (schwer)**
1. Trap Bar Jump: 3×4, leicht, maximal explosiv, jede Wiederholung mit Reset, Pause 150 s
2. Back Squat: 3×5, Pause 180 s
3. Superset: a) Klimmzug 3×6–8 · b) Tibialis-Raise 3×12
4. RDL: 3×6–8, Pause 150 s
5. Superset: a) Schulterdrücken sitzend mit Lehne 3×8 · b) Copenhagen Plank 2×20 s pro Seite
6. Superset: a) Wadenheben stehend 3×8–12, schwer · b) Hüftbeuger-Knieheben (Band/Kabel) 2×8 pro Seite, Stufen laut Wochentabelle

**Einheit 2 (elastisch)**
1. Superset: a) Pogo Jumps 2×6–10 · b) Approach Jump 3×3, maximal, Pause 120 s
2. Med-Ball-Rotationswurf: 3×4 pro Seite
3. Bulgarian Split Squat: 3×6–8 pro Seite
4. Hip Thrust: 3×8
5. Leg Curl, Variante A Slider oder B Stability Ball: 3×6–8 (Variante wählbar, auch im Wechsel testen)
6. Superset: a) Rudern Kabel sitzend 3×8–10 · b) Landmine-Drücken 2×8 pro Seite
7. Superset: a) Pallof Press 2×10 pro Seite · b) Außenrotation Band/Kabel 2×12 pro Seite
8. Superset: a) Hüftbeuger-Knieheben 2×8 pro Seite · b) Wadenheben sitzend 2×12

Wo keine Pause angegeben ist, wählst du einen sinnvollen `restSec`-Wert und dokumentierst ihn im Plan.

**Hüftbeuger-Knieheben** hat eine Zeit- bzw. Wiederholungsvorgabe pro Woche. Vorgaben (`byWeek`):
W1–2: 3× 15 s halten · W3: 2×8, 3 s absenken · W4: 2×8, 3 s absenken + 2 s halten · W5–6: 2×8, 4 s absenken + 2 s halten · W7: wie W5, ggf. leichter.

**7-Wochen-Progression (RIR = Wiederholungen im Tank), umzusetzen über `rirTargets` und `byWeek`:**

| Woche | RIR | RDL | Split Squat | Leg Curl | Pogo | Approach (Intensität) | Wadenheben stehend |
|---|---|---|---|---|---|---|---|
| 1 | 3 | 3×6 | 3×6 | 3×6 | 2×6 (70–80 %) | 3×3 (80 %) | 3×8 |
| 2 | 2–3 | 3×7 | 3×7 | 3×7 | 2×6 (80 %) | 3×3 (85 %) | 3×10 |
| 3 | 2 | 3×8 | 3×8 | 3×8 | 2×8 (90 %) | 3×3 (90 %) | 3×12 |
| 4 | 1–2 | 3×6 | 3×6 | 3×8 | 2×8 | 3×3 (95 %) | 3×8 |
| 5 | 1–2 | 3×7 | 3×7 | 3×8 | 2×10 | 3×3 (max.) | 3×10 |
| 6 | 1–2 | 3×8 | 3×8 | 3×8–10 | 2×10 | 3×3 (max.) | 3×12 |
| 7 | 3–4 | Deload: je Übung 1 Satz weniger, Gewicht ca. 80 % |||||

**Trainingstage:** Hinweise zu Tagen und Abständen stehen als Text im Plan (`suggestedDay`). Die App erzwingt sie nicht.

---

## 5. UX

**Navigation:** Bottom-Tabbar **Heute · Verlauf · Plan · Archiv** (Archiv ab 2.0). Oben rechts ein kleines Menü-Symbol (Burger), das über dem Inhalt schwebt und keine eigene Zeile belegt. Es öffnet ein Sheet mit **Stil** (Hell, Dunkel, Fancy), **Ansicht im Training** (Liste, Fokus), **Signalton** (Aus, Leise, Laut; gilt für das Pausenende und den Halte-Countdown; Leise und Laut spielen beim Wählen einmal zur Probe) und **Info**. Stil, Ansicht und Ton werden in `settings` gespeichert (ohne neue Revision). Standard: Dunkel und Liste. Auf jedem Bildschirm steht unten ein dezenter Link "Impressum & Datenschutz" (nach Review Runde 1 umbenannt, damit Offenlegung und Impressum leicht auffindbar sind).

**Onboarding (kein Plan gespeichert):** Zwei Wege: "Plan öffnen" (Dateiauswahl, `accept=".json"`) und "Neuen Plan erstellen". Letzteres zeigt einen vorgefertigten Agent-Prompt mit "Kopieren" und "Teilen". Derselbe Prompt ist später unter Plan > "Plan mit KI erstellen/anpassen" abrufbar. Der Prompt ist als Template im Code hinterlegt und enthält:
1. Rolle: erfahrener Kraft- und Athletiktrainer. Der Agent berät mich ZUERST und stellt gezielt Fragen (Ziele, Zeit pro Woche, Erfahrung, Equipment, Einschränkungen, Sportart, Tagesstruktur). Erst nach meiner Bestätigung erzeugt er den Plan.
2. Ausgabe: genau EINE gültige JSON-Datei `plan.json`, nur der Inhalt in einem Codeblock, ohne Kommentare.
3. Das vollständige Plan-Schema mit Typen, Pflichtfeldern und erlaubten Werten (identisch mit dem Validator, siehe 3).
4. Eine vollständige Beispieldatei mit Superset, einseitiger Übung, Haltezeit-Übung, Variante und `byWeek`-Überschreibung. Die Beispieldatei muss den eigenen Validator bestehen (Unit-Test).
5. Hinweise: stabile, eindeutige IDs, Zahlen als Zahlen, Deutsch für Namen und Hinweise, Einheiten in kg und Sekunden.

Mit gespeichertem Plan gibt es zusätzlich "Mit aktuellem Plan kopieren (zum Anpassen)" und, sobald es Verlauf gibt, "Mit Plan und letzten Ergebnissen kopieren". Steht der aktuelle Plan im Prompt, gelten ID-Regeln: Übungen, die bleiben, behalten ihre id (Verlauf, Gewichte und Graphen hängen daran), neue Übungen bekommen neue ids, eine bestehende id nie für eine andere Übung, Ziele ändern und Übungen austauschen ist erlaubt. Die Ergebnisse stehen nach dem Plan, eine Zeile pro Übung des Plans mit Verlauf: id, Name, letztes Arbeitsgewicht × Wiederholungen (bzw. Haltezeit oder Wiederholungen bei Körpergewicht), Datum und ob die obere Wiederholungsgrenze in allen Sätzen erreicht wurde, jeweils aus dem letzten Training außerhalb des Deloads. Ohne Notizen. Plan und Ergebnisse sind als reine Daten gekennzeichnet, Backticks darin können den Codeblock nicht beenden. Unter dem Button steht, dass die Ergebnisse an den Anbieter des KI-Dienstes gehen.

**Heute:** Karte "Nächste Einheit" mit Name, "Woche X von Y" (Y = `plan.weeks`), RIR-Ziel, Anzahl Blöcke, geschätzter Dauer und Start-Button. Dazu eine Zeile mit dem letzten beendeten Training: Einheit und wie lange her ("heute", "gestern", "vor N Tagen", Kalendertage in lokaler Zeit), ohne beendetes Training keine Zeile. Bei abgeschlossenem Plan stattdessen die Karte "Plan abgeschlossen" mit "Als Datei sichern" (Archiv), "Nächsten Plan mit KI erstellen" (öffnet den Agent-Prompt) und "Plan erneut starten". Die Formel für die Dauer-Schätzung legst du fest und dokumentierst sie. Darunter der Backup-Status: "Alle Trainings gesichert" oder "1 Training noch nicht gesichert" mit Button.

**Live-Training:**
- Kopf: Titel, Fortschritt ("x von y Sätzen") und daneben "Beenden" als Textlink (spart eine Zeile).
- Der Pausentimer klebt unten am Bildschirm und ist immer sichtbar: Sekunden, "+30 s", "Weiter". Er startet nach einem Satz automatisch mit der `restSec` der Übung, außer es ist danach kein Satz mehr offen (auch nach Überspringen oder Satz entfernen endet eine laufende Pause dann). Sind alle Sätze erledigt, zeigt er statt "Weiter" den Knopf "Abschließen" (der einzige Abschluss-Knopf neben "Beenden" im Kopf; die Karte "Alle Sätze erledigt" hat keinen eigenen). In seiner unteren Zeile sitzt links ein Umschalter Liste/Fokus (gleiche Einstellung wie im Menü), damit die Ansicht auch weit unten in der Liste mit einem Tap wechselt. Nach dem Wechsel zur Liste steht der aktuelle Satz im sichtbaren Bereich. Am Pausenende vibriert das Gerät (wo unterstützt) und es ertönt ein kurzer Ton (Web Audio, keine Datei, Stufe laut `settings.sound`), aber nicht, wenn die App erst lange danach wieder geöffnet wird. iOS erlaubt Ton erst nach einem Tap, der Ton wird deshalb beim Abschließen eines Satzes, beim Starten und beim Ändern der Einstellung freigeschaltet. Fehler beim Ton bleiben still.
- **Ansicht Liste (Standard):** Oben ein aufklappbares Warm-up, das offen bleibt, bis man es selbst zuklappt. Pro Übung eine Karte, pro Satz eine große Zeile (mindestens 56 px) mit "Gewicht × Wdh.", vorausgefüllt mit den Werten vom letzten Mal. Ein Tap auf den Check schließt den Satz ab. Der aktive Satz ist hervorgehoben. Ist die Progressionsregel erfüllt, erscheint der Button "Alle Wdh. geschafft: +X kg vorschlagen" (X = `incrementKg` der Übung, z. B. 2,5). Zum Ändern öffnet ein Tap auf die Zahl einen Stepper bzw. die numerische Eingabe. Gewicht: `−2,5` `−0,5` Wert `+0,5` `+2,5` in einer Zeile (für alle Übungen gleich, nie unter 0; bei Körpergewicht-Übungen nur Wiederholungen, außer es ist schon ein Zusatzgewicht eingetragen), Wiederholungen ±1, Haltezeit ±5 s. `incrementKg` bestimmt nur den Steigerungsvorschlag. Dieselben Stepper gelten im Fokus und beim Korrigieren im Verlauf.
- **Supersets:** eine Karte mit Tabelle (Spalten a/b, Zeilen = Sätze), abwechselnd abzuarbeiten. Der Timer zeigt, zu welcher Übung als Nächstes gewechselt wird.
- **Ansicht Fokus:** ein Satz pro Bildschirm, große −/+-Stepper für Gewicht und Wiederholungen, großer Button "Satz fertig" (mindestens 64 px), Info "Letztes Mal" und Ziel.
- Varianten (z. B. Leg Curl A/B) werden vor dem ersten Satz ausgewählt. Die gewählte Variante steht im Titel der Übung (z. B. „Leg Curl · A: Slider“). Außerdem: Übung überspringen, Notiz pro Übung, Satz hinzufügen und entfernen. Ein abgeschlossener Satz lässt sich rückgängig machen (Schutz gegen Fehltaps).
- **Später:** Im Optionen-Sheet einer Übung (⋯, beide Ansichten) stellt "Später" den ganzen Block zurück (Einzelübung oder Superset), z. B. wenn das Gerät belegt ist. Seine offenen Sätze werden übergangen, solange andere offen sind, danach kommen zurückgestellte Blöcke in Plan-Reihenfolge dran. "Jetzt machen" oder ein erledigter Satz des Blocks hebt das auf. Die Liste zeigt den Tag "später". Gespeichert wird das nur im laufenden Training (`deferred`, Block-Nummern), nicht in der fertigen Training.
- **Halten:** Für Haltezeit-Übungen startet "Halten starten" (Fokus und aktiver Satz in der Liste) einen Countdown: 5 s Vorlauf ("Gleich geht’s los"), dann die Sekunden des Satzes, bei `perSide` Seite 1, 5 s "Seite wechseln", Seite 2. Ton (laut Einstellung) und Vibration bei Beginn und Ende jedes Haltens. Gerechnet wird aus Zeitstempeln. Am Ende wird der Satz wie mit dem Haken abgeschlossen (Pause und Rückgängig wie gewohnt), "Abbrechen" lässt ihn offen. Der Countdown liegt nur im Speicher. Im Fokus ersetzt seine Anzeige den Stepper, damit nichts höher wird.
- **Notiz vom letzten Mal:** Die Notiz der Leistung, die "Letztes Mal" liefert, steht als "Notiz letztes Mal: …" in der Karte, im Fokus einzeilig gekürzt und vollständig im Optionen-Sheet. Leere Notizen zeigen nichts.
- **Hauptübungen und RIR (ab 2.0):** Übungen mit `main: true` tragen den Tag „Haupt“. Nach dem letzten Satz einer Hauptübung fragt die App „Wie viele Wiederholungen wären noch gegangen?“ mit Chips 0 · 1 · 2 · 3 · 4+ und dem RIR-Ziel der Woche: während der Pause danach in der Pausenleiste (anstelle von „Als Nächstes“), sonst in der Karte bzw. im Fokus nach der letzten Übung. Nicht antippen heißt keine Angabe. Ein wieder geöffneter oder hinzugefügter Satz entfernt den Wert. Verwendet nur für Coach-Export und Agent-Prompt, nicht für Garmin und nicht für den Gewichtsvorschlag.
- Abschluss: Bestätigungsdialog mit freiwilliger RPE des ganzen Trainings (Schieberegler 0–10, startet ohne Wert, Wörter von „Ruhe“ bis „maximal“, „Zurücksetzen“) und Notiz zum Training (ab 2.0), dann Dauer, Zusammenfassung, Export-Button "Als Datei sichern" (Hauptaktion), darunter "Für Garmin exportieren" für das eben beendete Training. Keine weiteren Gesundheits- oder Gefühlsabfragen.

**Verlauf:** Liste der Trainings mit Status "gesichert" bzw. "nicht gesichert", Detailansicht, pro Übung ein einfacher Verlaufsgraph (Gewicht des Top-Satzes) als eigenes SVG ohne Chart-Bibliothek. In der Detailansicht der Button "Für Garmin exportieren" (siehe 7). Dort lassen sich die Werte jedes Satzes (Stepper wie im Training) und die Notiz pro Übung korrigieren, und "Training löschen" entfernt die Training nach Bestätigung. Die aktuelle Woche wird dabei nicht zurückgesetzt.

**Plan:** Plan ansehen (mit Vorgänger, falls vorhanden), aktuelle Woche manuell setzen, Plan öffnen, "Plan mit KI erstellen/anpassen", Gesamtstand sichern, "Export für Coach". Ist die gewählte Woche im aktuellen Durchgang schon geschafft, gibt es einen kurzen Hinweis und "Woche wiederholen". Bei abgeschlossenem Plan (auch auf "Heute") "Plan erneut starten" mit Bestätigung.

**Verlauf (ab 2.0 zusätzlich):** RPE, Notiz zum Training und RIR je Hauptübung werden angezeigt und lassen sich korrigieren. Namen von Übung und Variante kommen aus dem Training, sonst aus dem Plan.

**Archiv (ab 2.0):** Vierter Tab, auch vom Startbildschirm ohne Plan erreichbar. Öffnet eine Trainingsdatei oder Plandatei nur lesend (geprüft wie beim Import, nie gespeichert, nach einem Neustart leer, die aktive Trainingsdatei bleibt unberührt). Zeigt Datei- und Planname, Anzahl Trainings, Vorgänger, die Trainings mit Graph und Detailansicht (ohne Korrekturen und Löschen) und den Plan mit Wochenwahl. Aktionen: „Export für Coach“ und „Für Garmin exportieren“. Immer nur eine Datei.

**Training beenden:** Ist weniger als die Hälfte der Sätze erledigt, sagt der Bestätigungsdialog, dass die Einheit in dieser Woche offen bleibt.

**Kleine Handys (iPhone 13 mini als Referenz):**
- Unter 400 px Breite kompaktere Abstände und Schriften: Überschrift ca. 22 px, Stepper 52 px, Haupt-Button mindestens 64 px.
- Touch-Ziele überall mindestens 44 px, Haupt-Aktionen 48 px oder mehr.
- Im Fokus-Modus passen Stepper, "Satz fertig" und Pausentimer bei 375 × 630 pt ohne Scrollen auf einen Bildschirm.
- Einhändig bedienbar, wichtige Aktionen im unteren Drittel.

**Stile (Farbvariablen, alles über CSS Custom Properties):**
- Hell: Hintergrund `#f4f6f4`, Karte `#ffffff`, Text `#14201b`, Gedämpft `#55635c`, Akzent `#0F6E56`, Linie `#d9e0dc`.
- Dunkel (Standard): Hintergrund `#0f1412`, Karte `#19201d`, Zeile `#1f2a25`, Text `#f2f5f3`, Gedämpft `#9aa8a2`, Akzent `#3ddc97` (Text auf Akzent `#0f1412`), Linie `#2a3530`.
- Fancy: Verlauf `160deg` von `#2a1457` über `#4b1d6b` nach `#0f3a5a`, Glas-Karten (`rgba(255,255,255,.12)` mit Blur), Akzent-Verlauf `#ffd166` → `#ff7ad9`, größere Radien.
- Hoher Kontrast. Ist noch nichts gespeichert, dient `prefers-color-scheme` als Vorbelegung.

---

## 6. Info-Seite (Impressum & Datenschutz)

Statische Seite, offline verfügbar, erreichbar über das Menü und über den Link unten auf jedem Bildschirm (auch im Onboarding). Gleiche Stile wie die App, Touch-Ziele mindestens 48 px, Zurück-Button oben.

Die Angaben des Betreibers stehen an EINER Stelle im Code (z. B. `legal.js`):
- `NAME = "[NAME]"`
- `WOHNORT = "[WOHNORT]"`
- `KONTAKT_MAIL = "[KONTAKT_MAIL]"`

Name und Wohnort trage ich selbst ein (erledigt). Nicht erfinden, nicht ändern und nicht an andere Stellen kopieren. Im folgenden Text werden `{NAME}`, `{WOHNORT}` und `{KONTAKT_MAIL}` zur Laufzeit aus `legal.js` eingesetzt.

Text (Deutsch, wörtlich so übernehmen):

**Überschrift:** Info, Impressum & Datenschutz

**Zweck dieser Seite:** Diese Web-App ist ein rein privates, nicht kommerzielles Projekt zum persönlichen Protokollieren von Krafttraining. Mit der Seite werden keine wirtschaftlichen, politischen, weltanschaulichen oder sonstigen Interessen verfolgt. Es gibt keine Werbung, keine Verkaufsangebote, keine Spendenaufrufe und keine redaktionellen Inhalte.

**Betreiber / Offenlegung (§ 25 MedienG):** Medieninhaber und Betreiber: {NAME}, {WOHNORT}, Österreich. Kontakt: {KONTAKT_MAIL}

**Datenschutz:** Die App speichert deine Trainingsdaten ausschließlich lokal auf deinem Gerät (Browserspeicher) und in Dateien, die du selbst exportierst. Es gibt kein Benutzerkonto, kein Backend, keine Cookies, kein Tracking und keine Analyse-Dienste. Deine Trainingsdaten werden nicht an den Betreiber übertragen. Die Seite wird über GitHub Pages ausgeliefert. Beim Aufruf kann der Hosting-Anbieter technisch bedingt Verbindungsdaten (z. B. IP-Adresse) verarbeiten. Auf diese Verarbeitung habe ich keinen Einfluss, Näheres steht in der Datenschutzerklärung von GitHub. Exportierte Dateien (Teilen-Menü, Dateien-App, optional Garmin Connect) liegen in deiner Verantwortung. Anfragen zum Datenschutz: {KONTAKT_MAIL}.

**Hinweis:** Die Inhalte sind keine medizinische oder therapeutische Beratung. Bei Beschwerden oder Verletzungen bitte eine Ärztin, einen Arzt oder Physiotherapeutin bzw. Physiotherapeuten fragen. Für Richtigkeit und Vollständigkeit kann keine Gewähr übernommen werden.

**Open-Source-Komponenten:** Wird beim Build automatisch aus den gebündelten Bibliotheken erzeugt (Name, Lizenz). Bleibt leer, wenn keine eingebunden sind.

Die Texte werden nur über die Konfiguration verändert, nicht automatisch. Der Datenschutzabschnitt wurde nach Review Runde 1 mit Zustimmung des Betreibers um Art.-13-Angaben erweitert. Maßgeblich ist `training/src/views/info.js`.

---

## 7. Garmin-Export (optional, pro Workout)

- In der Verlaufs-Detailansicht eines Trainings und auf dem Bildschirm "Training abgeschlossen" gibt es den Button "Für Garmin exportieren". Erst dann wird die `.fit`-Datei aus der gespeicherten Training erzeugt und über das Teilen-Menü angeboten. Das JSON bleibt die Wahrheit. FIT ist eine Einbahnstraße und wird von der App nie gelesen.
- FIT-Inhalt: `sport = training`, `sub_sport = strength_training`. Pro Satz eine Set-Nachricht (Garmin-Kategorie und -Unterkategorie, Wiederholungen, Gewicht, Dauer, Startzeit), Pausen als Rest-Sets, eine Session-Nachricht mit Summen (Dauer, Sätze, Wiederholungen). Kein Puls.
- Encoder lokal im Repo, kein CDN: entweder das Garmin FIT SDK für JavaScript lokal bündeln (Lizenz vorher prüfen und im Schrittbericht nennen) oder ein eigener kleiner Binär-Encoder (Header, Definition- und Data-Messages, CRC). Für den Encoder gibt es Unit-Tests (mindestens CRC und Header).
- Plan-Schema: pro Übung optional `garminCategory` und `garminSubcategory`. Fallback: nächstliegende Kategorie, sonst "other". Squat und RDL passen, Exoten wie Pogo Jumps oder Tibialis-Raise landen vermutlich unter "other". Der Agent-Prompt enthält die Tabelle der Hauptkategorien (Nummer und Name), damit die KI `garminCategory` für jede Übung setzen kann; `garminSubcategory` nur, wenn sicher bekannt. IDs möglichst nach dem englischen Übungsnamen.
- **Spike zuerst und dann warten:** Erzeuge vor der restlichen Garmin-Arbeit eine minimale Test-`.fit` mit 3 Sätzen einer Übung und leg sie ins Repo (z. B. `spike/test.fit`). Ich lade sie in Garmin Connect (Web, Import) hoch und melde dir, was angezeigt wird. Das ist ein echter Blocker: Mapping und restliche Garmin-Arbeit erst nach meiner Rückmeldung. Bis dahin ist der Garmin-Button ausgeblendet, und du arbeitest mit den übrigen Schritten weiter.
- Markennamen (Garmin, Garmin Connect) nur sachlich verwenden, keine Logos.

---

## 8. Arbeitsweise

Arbeite in Schritten. Nach jedem Schritt meldest du kurz:
- was jetzt läuft,
- wie ich es teste (konkreter Befehl oder Klickpfad),
- welche Entscheidungen du selbst getroffen hast (z. B. Grenzwerte, Schema-Änderungen, Pausenwerte) und welche Widersprüche dir aufgefallen sind.

Rückfragen nur bei echten Blockern. Echte Blocker sind ausdrücklich: fehlender Prototyp vor Schritt 2 und die Garmin-Rückmeldung nach dem Spike.

Tests: Richte einen einzigen Testbefehl ein (z. B. `npm test` mit `node:test` oder Vitest). Alle Tests müssen lokal und offline laufen.

1. Datenmodell, Schema, Validator, Seed-Plan. Unit-Tests für: Datenmodell, Validator (gültige und ungültige Dateien inkl. Prototype Pollution und Limits), Merge-Logik beim Import, Progressionsregel, Deload, Wochen-Ableitung, Seed-Plan und Beispieldatei des Agent-Prompts bestehen den Validator.
2. Live-Training (Liste, Supersets, Fokus, Timer, Autosave, Wake Lock, Rückgängig).
3. Verlauf (Liste, Detail, SVG-Graph).
4. Onboarding, Import, Export, Backup-Hinweise, Menü mit Stilen.
5. PWA, Offline, Service Worker (mit klarem Update-Verhalten, kein hängender alter Stand), Manifest, Icons.
6. Info-Seite.
7. Garmin-Spike, dann warten auf meine Rückmeldung, danach Mapping.
8. Abschluss-Prüfung (siehe 9).

Außerdem: README mit Hosting-Anleitung (GitHub Pages, Workflow), Installation auf dem iPhone, Backup-Workflow und dem Hinweis, dass der Datei-Export die Absicherung gegen verlorene Browserdaten ist. Die Datei-Exporte sind die Wahrheit: Die App muss einen leeren Zustand durch erneuten Import vollständig wiederherstellen können. Keine persönlichen Daten (Name, Wohnort) in README, Manifest, Commits oder Metadaten.

---

## 9. Abschluss-Prüfung durch unabhängige Spezial-Instanzen

Wenn die App fertig ist und alle Tests laufen, starte vier Reviewer als getrennte Subagents mit frischem Kontext, parallel (Reviewer 4 Code-Qualität seit Runde 3, in die Spezifikation aufgenommen für 2.0).

Jeder Reviewer bekommt NUR: Repo-Pfad, diese Spezifikation, seine Rolle und das Ausgabeformat. Gib ihnen NICHT deine eigene Einschätzung (z. B. "ist sicher", "ist rechtlich in Ordnung"). Die Reviewer arbeiten lesend: keine Änderungen am Code, einzige Ausnahme ist ihre eigene Berichtsdatei unter `reviews/`. Sie dürfen die App lokal starten und testen und im Web recherchieren (mit Quellenangabe).

**Reviewer 1: IT-Security.** Prüfe die App als statische PWA ohne Backend. Mindestens:
- Netzwerk: nach dem Laden keine externen Requests (Browser-Test mit Netzwerkprotokoll, z. B. Playwright). Keine CDN-Skripte, Fonts oder Tracker.
- XSS: alle Stellen, an denen importierte Daten (Plan, Notizen, Übungsnamen) gerendert werden. `innerHTML`, `insertAdjacentHTML`, `eval` vermeiden bzw. begründen. Teste mit präparierten Importdateien (HTML/JS in Namen und Notizen).
- Import-Härtung: Schema-Validierung, Größen- und Tiefenlimits, Prototype Pollution, absurde Zahlen, kaputtes JSON. Import darf nie halb speichern.
- CSP (per Meta-Tag), Referrer-Policy, kein `unsafe-inline`/`unsafe-eval` ohne Begründung.
- Service Worker: Scope, Cache-Strategie, Update-Verhalten, Cache-Poisoning, keine Caches fremder Origins.
- Speicher: Was liegt in localStorage/IndexedDB, Verhalten bei Quota-Fehlern und gelöschten Daten.
- Export/FIT-Encoder: Eingabevalidierung, Überläufe, Dateinamen aus Nutzerdaten.
- Lieferkette: Abhängigkeiten, Lockfile, `npm audit` (falls Node), gepinnte Versionen, Lizenzen.
- Repo und Deployment: keine Secrets, Tokens oder persönlichen Daten im Repo und in der Git-Historie, GitHub-Actions-Workflow mit minimalen Rechten und gepinnten Actions-Versionen.
- Clickjacking/Framing: Einschränkungen von GitHub Pages benennen und passende Gegenmaßnahmen im Rahmen von Meta/JS.

**Reviewer 2: Recht und Compliance (Österreich/EU).** Du bist kein Ersatz für anwaltliche Beratung. Kennzeichne jede Aussage als "eindeutig", "wahrscheinlich" oder "unklar, anwaltlich klären" und nenne die Rechtsquelle. Prüfe:
- Impressum/Offenlegung: Reicht die Info-Seite für ECG § 5 (falls anwendbar) und § 25 MedienG (kleine Website)? Sind Name und Wohnort/Sitz vorhanden, sobald keine Platzhalter mehr drinstehen?
- Stimmt der Seitentext mit dem tatsächlichen Verhalten überein? Behauptungen wie "keine Cookies", "kein Tracking", "keine Datenübertragung" im Browser und im Code belegen oder widerlegen.
- DSGVO/Datenschutz: Welche personenbezogenen Daten verarbeiten App, Hoster (GitHub Pages) und Repo? Ist die Datenschutzinformation vollständig und ehrlich? Braucht es ein Cookie-/Einwilligungs-Banner (Speicherzugriff nach TKG)? Begründe, warum oder warum nicht.
- Lizenzen: alle gebündelten Bibliotheken und Assets (inkl. FIT-SDK-Code), Lizenzvereinbarkeit, nötige Hinweise. Eigene Lizenz fürs Repo vorschlagen.
- Marken: Verwendung von "Garmin", "Garmin Connect", "Apple", "iPhone" in UI, README, Icons. Keine Logos, keine Suggestion von Zugehörigkeit.
- Gesundheits- und Haftungshinweise: Gibt es Aussagen, die wie medizinische Beratung wirken? Ist der Hinweis ausreichend sichtbar?
- Öffentliches Repo: Stehen Name, Mailadresse oder Wohnort in Commits, README, Manifest oder Metadaten, wo sie nicht stehen sollen?

**Reviewer 3: iOS-Safari, Barrierefreiheit und Bedienbarkeit auf kleinen Displays.** Prüfe die App so, wie ich sie im Studio benutze: iPhone 13 mini (375 × 812 pt, in Safari ca. 630 pt sichtbare Höhe), einhändig, oft mit müden oder feuchten Händen, zwischen den Sätzen. Teste mit WebKit-Emulation (z. B. Playwright mit iPhone-Profil) und mit Code-Analyse. Nenne ausdrücklich, was sich nur auf einem echten iPhone prüfen lässt, und gib mir dafür eine Checkliste. Mindestens:
- Layout: alle Bildschirme bei 375 × 630 pt, Hell/Dunkel/Fancy, Dynamic Type bzw. größere Systemschrift, Querformat. Nichts abgeschnitten, kein horizontales Scrollen, Safe-Area-Insets (Notch, Home-Indikator) korrekt. Im Fokus-Modus passen Stepper, "Satz fertig" und Pausentimer ohne Scrollen auf einen Bildschirm.
- Touch: alle Ziele mindestens 44 px (Haupt-Aktionen 48 px oder mehr), genügend Abstand, keine versehentlichen Taps neben dem Timer, Satz-Abschluss ist rückgängig machbar (Tap-Fehler).
- iOS-Eigenheiten: Eingabefelder ohne Zoom (mindestens 16 px), Zahlen-Tastatur (`inputmode`), Tastatur verdeckt keine Felder oder Buttons, Overscroll/Pull-to-Refresh stört das Training nicht, Sticky-Elemente verhalten sich beim Wechsel der Adressleiste stabil.
- Standalone-Betrieb (Home-Bildschirm): Statusleiste, Start-Verhalten, Verhalten beim Wechsel in andere Apps und zurück, Timer läuft korrekt weiter (Zeitstempel statt Intervallzähler), Autosave übersteht App-Beenden, Wake Lock wird nach Rückkehr neu angefordert.
- Dateien: Import über die Dateien-App, Teilen-Menü mit Datei ("In Dateien sichern", Ersetzen), Fallback-Download, Verhalten bei Abbruch.
- Offline: Flugmodus-Test nach der ersten Ladung, Update-Verhalten des Service Workers (kein hängender alter Stand), Verhalten bei vollem Speicher oder gelöschten Browserdaten (Wiederherstellung per Import).
- Barrierefreiheit: Kontraste in allen drei Stilen (WCAG AA), VoiceOver-Beschriftungen (`aria-label`, Rollen, Fokus-Reihenfolge), Zustände nicht nur über Farbe, `prefers-reduced-motion`, Fokus-Sichtbarkeit.
- Bedienfluss: Wie viele Taps bis zum ersten Satz, pro Satz, bis zum Export? Wo gibt es Sackgassen, unklare Zustände oder Fehlermeldungen ohne Handlungsanweisung? Sind die Texte durchgängig auf Deutsch und verständlich?

**Reviewer 4: Code-Qualität.** Prüfe den Code lesend auf Korrektheit, Wartbarkeit und Übereinstimmung mit dieser Spezifikation und `CLAUDE.md`. Führe `npm test` und, wo möglich, die Browser-Prüfungen aus. Mindestens:
- Fachlogik gegen die Spezifikation: Datenmodell und Validator (inkl. Lesen älterer Schemaversionen), Wochen-Ableitung, Progression, Deload, Vorbelegung, Startwerte und Nachfolger, Import und Abgleich, Backup-Status, Korrigieren und Löschen, Exporte (JSON, Coach-Export, FIT).
- Zustand und Speicher: laufendes Training (Autosave, Wiederherstellen, Abschluss), Wettläufe zwischen Speichern und Neuzeichnen, Transaktionen in IndexedDB, Wechsel der aktiven Trainingsdatei, nichts wird halb gespeichert.
- Konsistenz: App, Validator, Agent-Prompt und Testfixture laufen nicht auseinander; Begriffe aus `docs/begriffe.md`.
- Wartbarkeit: tote oder doppelte Stellen, unklare Zuständigkeiten, Kommentare, die nicht mehr stimmen.
- Tests: Abdeckung der Fachlogik und der Abläufe, Lücken mit konkreten Testfällen benennen.
- Repo-Regeln aus `CLAUDE.md` (kein `innerHTML` für Daten, keine externen Requests, `npm run sw` aktuell, Version und Changelog).

**Ausgabe (alle Reviewer):** je ein Bericht in `reviews/security.md`, `reviews/legal.md`, `reviews/ios-ux.md` bzw. `reviews/code-qualitaet.md` (ab Runde 2 mit Rundennummer, z. B. `reviews/security-r2.md`, damit frühere Berichte erhalten bleiben).
- Am Anfang: Liste der geprüften Punkte und der Punkte, die nicht geprüft werden konnten (mit Grund).
- Findings nach Schwere (kritisch, hoch, mittel, niedrig), jeweils mit: Fundstelle (Datei:Zeile oder Schritte zum Nachstellen), Beschreibung, Auswirkung, konkreter Empfehlung, Sicherheit der Einschätzung.
- Nichts als "in Ordnung" melden, was nicht tatsächlich geprüft wurde.

**Ablauf nach den Reviews:**
1. Lies alle drei Berichte vollständig. Behebe alle kritischen und hohen Findings. Mittlere und niedrige: beheben oder begründet ablehnen. Berichte nicht umschreiben.
2. Starte nach den Fixes neue, frische Reviewer-Instanzen für einen zweiten Durchgang (die alten Kontexte nicht weiterführen).
3. Wiederhole das, bis keine kritischen oder hohen Findings mehr offen sind, höchstens 3 Runden. Bleibt etwas offen, melde es mir offen.
4. Abschlussbericht an mich:
   - pro Reviewer eine Zusammenfassung mit behobenen und offenen Punkten (abgelehnte mit Begründung),
   - ausdrücklich alle Punkte mit "unklar, anwaltlich klären",
   - die Checkliste der Punkte, die sich nur auf einem echten iPhone prüfen lassen.
