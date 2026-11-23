# Änderungen

Versionen nach dem Schema MAJOR.MINOR.PATCH (Regeln in `CLAUDE.md`). Jede Version ist ein Tag `vX.Y.Z` auf `main`.

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
