# Änderungen

Versionen nach dem Schema MAJOR.MINOR.PATCH (Regeln in `CLAUDE.md`). Jede Version ist ein Tag `vX.Y.Z` auf `main`.

## 3.0.0

Neues Dateiformat (Schema 3, siehe `docs/entwurf-andere-trainingsarten.md`). Dateien aus 1.x und 2.x werden weiter gelesen, Dateien aus 3.0 sind für 2.x nicht lesbar. Plandateien bleiben unverändert.

- Trainingsdatei: andere Trainings (`activities`, z. B. „Beachvolleyball · 90 min · RPE 6“) mit Trainingsart, Datum, Dauer, RPE und Notiz. Sie zählen nicht für die Woche und ändern weder Vorbelegung noch Steigerung. Zusammenführen und Löschen wie bei Trainings.
- „Anderes Training eintragen“ im Heute-Tab und im Verlauf: Sheet mit Trainingsart (mit Vorschlägen), Datum und Dauer nebeneinander, RPE und Notiz. Verlauf und Archiv zeigen andere Trainings mit Detailansicht, im Verlauf mit „Korrigieren“ und „Training löschen“.
- Export für Coach: andere Trainings im Log. Agent-Prompt „Mit Plan und letzten Ergebnissen“: Zusammenfassung der anderen Trainings der letzten 4 Wochen.
- Backup-Status zählt andere Trainings mit.
- Behoben: Lange Wörter ohne Leerzeichen in Überschriften (z. B. ein Planname) verbreiterten die Seite, die Tab-Leiste rutschte dann aus dem Bild.
- Behoben: Nach dem Eintippen eines Werts wirkte der erste Tap auf einen Button (z. B. „Satz fertig“) mit dem Finger nicht. −/+ direkt nach dem Eintippen rechnet jetzt vom eingetippten Wert.
- „Training beenden?“ und „Anderes Training eintragen“: Hauptaktionen stehen fest unten im Sheet. Ein Tap neben das Sheet verwirft keine Eingaben mehr.
- Import-Vorschau und Archiv zählen andere Trainings mit („2 Krafttrainings · 1 anderes Training“), „1 Training“ statt „1 Trainings“.
- Hinweis beim Prompt mit Ergebnissen nennt RIR und die anderen Trainings. Tab-Taste behält nach einer Eingabe den Fokus. RPE-Regler ohne Wert besser sichtbar.
- Info-Seite: Zweck nennt jetzt Krafttraining und andere Trainings.
- −/+ direkt nach dem Eintippen zeigt den neuen Wert auch im Feld an, Werte ab 1000 werden richtig gelesen. Import-Vorschau meldet abweichenden Inhalt bei gleichem Stand-Zähler.
- Review Runden 5 bis 7 (je vier Reviewer, Runde 7 ohne kritische oder hohe Findings): Antworten in `reviews/umsetzung-r5.md` bis `reviews/umsetzung-r7.md`.

## 2.0.0

Neues Dateiformat (Schema 2, siehe `docs/entwurf-2.0.md`). Dateien und Pläne aus 1.x werden weiter gelesen, Dateien aus 2.0 sind für 1.x nicht lesbar.

- Plan: optionales Feld `main` für Hauptübungen.
- Training: RIR nach dem letzten Satz einer Hauptübung (`rirLast`), RPE und Notiz zum ganzen Training, Name von Übung und Variante zum Zeitpunkt des Trainings.
- Trainingsdatei: Anlagedatum (`createdAt`), Verweis auf den Vorgänger (`previous`) und Startwerte aus dem Vorgänger (`carryOver`). Der Dateiname enthält das Anlagedatum und 4 Zeichen der Datei-ID, damit „Ersetzen“ nie die Sicherung einer anderen Trainingsdatei trifft.
- Training: Tag „Haupt“, RIR-Abfrage nach dem letzten Satz einer Hauptübung, RPE (Schieberegler) und Notiz beim Beenden, Korrektur im Verlauf.
- Plan-Tab: „Export für Coach“ (schlanker Text mit Plan und allen Trainings, Teilen als `.md` oder Kopieren). Der CSV-Export entfällt.
- Agent-Prompt: Feld `main` im Schema, RIR in den letzten Ergebnissen.
- Eine Trainingsdatei pro Durchgang: „Plan erneut starten“ und der neue Plan als „Nachfolger“ (statt „Von vorn“) legen eine neue Trainingsdatei mit Verweis und Startwerten an. Vorher wird gesichert, danach liegt nur die aktive Trainingsdatei im Browser. Ältere Trainingsdateien im Browser werden beim Start entfernt bzw. zum Sichern angeboten.
- Neuer Tab „Archiv“: eine ältere Trainingsdatei oder Plandatei nur lesend ansehen (Trainings, Graph, Plan), mit Export für Coach und Garmin-Export. Die aktive Trainingsdatei bleibt unberührt, nichts wird gespeichert.
- Wechsel der Trainingsdatei geschützt: kein Löschen, wenn ein anderes Fenster Neueres gespeichert hat; nach einer Sicherung per Download fragt die App nach, bevor die bisherige Datei den Browser verlässt. Pro Auswahl wird nur ein Plan geöffnet.
- Review Runde 4 (vier Reviewer, keine kritischen oder hohen Findings): Antworten in `reviews/umsetzung-r4.md`.
- Behoben: Gewählte Chips (z. B. Varianten) waren ohne sichtbaren Hintergrund.

## 1.0.1

Export (Garmin, Sicherung, CSV) legt unter iOS beim Sichern in „Dateien“ keine zusätzliche Textdatei mit dem Dateinamen mehr an.

## 1.0.0

Erste Version mit Versionsnummer: Stand nach Review Runde 3 und Neuanlage des Repos. Die Version steht auf der Info-Seite.
