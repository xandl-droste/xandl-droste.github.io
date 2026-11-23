# Wunschliste

Ideen für spätere Versionen, gesammelt an einer Stelle. Was gerade umgesetzt wird, steht in `docs/stand.md`. Was bewusst nicht gebaut wird, steht unter „Nicht-Ziele“ in `docs/spezifikation.md`. Begriffe wie in `docs/begriffe.md`.

Neue Wünsche hier eintragen. Wird einer umgesetzt, wandert er nach `docs/stand.md` (bzw. in einen Entwurf) und wird hier gestrichen.

## Als Nächstes

- **Andere Trainingsarten** (z. B. „Beachvolleyball · 90 min · RPE 6“) im selben Log wie die Krafttrainings. Ausgangspunkt: `docs/entwurf-2.0.md`, Abschnitt 2.4. Das Format von 2.0 ist darauf vorbereitet.

## Ideen

- **Querformat im Fokus-Modus:** zweispaltiges Layout, damit „Satz fertig“ und der Timer ohne Scrollen sichtbar sind. Bisher nicht beauftragt, die Spezifikation verlangt Hochformat.
- **Klimmzug mit Unterstützung als Variante im Plan:** Ansatz steht schon fest: zwei Varianten („frei“ / „unterstützt“) im Plan, die unterstützte Variante geht als Garmin `bandAssistedPullUp` (Nummer prüfen) ohne Gewicht in den Export. Nur diese zwei Zustände: keine Unterstützung in kg, keine Schrittweite, keine Steigerung. Grund: Das Satzgewicht im FIT-Format kann nicht negativ sein, und Garmin versteht Gewicht als Zusatzlast.
- **Pause beim Seitenwechsel im Halte-Countdown einstellbar:** heute fest 5 s (`HOLD_SWITCH_SEC` in `training/src/model/live.js`).
- **Alte Trainingsstände im Menü löschbar** (Security N9): seit 2.0 liegt nur noch die aktive Trainingsdatei im Browserspeicher. Prüfen, ob der Wunsch damit erledigt ist.

## Aus Reviews zurückgestellt

Kleinere Punkte, in den Reviews als „später“ markiert. Details in `reviews/umsetzung-r3.md` und `reviews/umsetzung-r4.md`.

- Bedienung (iOS/UX R3): aufklappbare Karten mit Zeichen (N-4), Tab „Verlauf“ aus der Detailansicht (N-5), Kontrast der Ränder (N-6), „Beenden“ bei 250 px Breite (N-7), `inert` bei offenen Sheets (N-8).
- Offenlegung auch ohne JavaScript, als statische Seite beim Deploy (Legal R3 N2).
- Vorschau, wenn mehrere Pläne auf einmal ausgewählt werden (Code-Qualität R3 N5).
- Meldung „Export fehlgeschlagen“ bei vollem Speicher, obwohl die Datei ankommt (Security R3 N3, R4 N5).
- Zeitstempel ohne Bereichsgrenze, nur mit präparierter Datei (Security R3 N5, R4 N4).
