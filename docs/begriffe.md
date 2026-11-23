# Begriffe

Verbindliche Begriffe für Spezifikation, Entwürfe, Code-Kommentare, UI-Texte und Gespräche über die App. Gilt ab Version 2.0 (siehe `docs/entwurf-2.0.md`). Wo der Code aus historischen Gründen andere Namen nutzt, steht das in der Spalte „im Code“.

Grundregel: **Ein Begriff, eine Bedeutung.** Insbesondere heißt „Training“ immer eine einzelne absolvierte Einheit, nie die Datei.

## Plan und Aufbau

| Begriff | Englisch (im Gespräch) | Bedeutung | im Code |
|---|---|---|---|
| **Plan** | plan | Die Vorlage vom KI-Agenten: Wochen, RIR-Ziele, Deload, Einheiten, Übungen, Vorgaben. Die App liest ihn, ändert ihn aber nie. | `plan` |
| **Plandatei** | plan file | Eine Datei, die nur einen Plan enthält (`plan.json`). Kommt vom KI-Agenten. | — |
| **Einheit** | workout (template) | Ein Trainingstag im Plan, z. B. „E1 Einheit 1 (schwer)“. Vorlage, noch nichts absolviert. | `plan.sessions[]`, `sessionKey` |
| **Block** | block | Eine Einzelübung oder ein Superset innerhalb einer Einheit. | `blocks[]` |
| **Übung** | exercise | Eine Übung im Plan mit stabiler id (z. B. `back-squat`). Verlauf, Gewichte und Graphen hängen an der id. | `exercises[]`, `exerciseId` |
| **Hauptübung** | main exercise | Übung mit `main: true` im Plan. Nach ihrem letzten Satz fragt die App nach dem RIR. | `main` |
| **Variante** | variant | Wählbare Ausführung einer Übung, z. B. Leg Curl A/B. | `variants[]`, `variantId` |
| **Vorgabe** | target | Was der Plan für eine Übung in einer Woche vorsieht: Sätze × Wiederholungen bzw. Haltezeit. Gilt pro Woche, `byWeek` überschreibt. | `sets`, `repsMin`, `repsMax`, `durationSec` |
| **Woche** | week | Planwoche 1 bis `plan.weeks`. | `week`, `currentWeek` |
| **Deload-Woche** | deload week | Woche mit weniger Sätzen und weniger Gewicht laut `plan.deload`. | `deload` |
| **RIR-Ziel** | RIR target | Angestrebte Wiederholungen im Tank für eine Woche, z. B. „2–3“. | `plan.rirTargets` |

## Durchgeführtes Training

| Begriff | Englisch (im Gespräch) | Bedeutung | im Code |
|---|---|---|---|
| **Training** | workout | Eine tatsächlich absolvierte Einheit mit Datum, Dauer und Sätzen. | `sessions[]` (oberste Ebene) |
| **laufendes Training** | running workout | Ein begonnenes, noch nicht beendetes Training. Liegt nur im Browserspeicher. | `live` |
| **Satz** | set | Ein protokollierter Satz: Gewicht, Wiederholungen oder Sekunden, erledigt ja/nein. Alle protokollierten Sätze sind Arbeitssätze, Aufwärmsätze werden nicht erfasst. | `sets[]` |
| **letzter Satz** | last set | Der letzte Satz einer Übung in einem Training. Nur nach ihm wird bei Hauptübungen der RIR erfragt. | — |
| **RIR** | RIR | Wiederholungen im Tank nach dem letzten Satz einer Hauptübung: 0, 1, 2, 3 oder 4+ (gespeichert als 4). | `rirLast` |
| **RPE** | session RPE | Wie hart das ganze Training war, 0 bis 10. | `rpe` |
| **Notiz** | note | Freitext. Es gibt die Notiz pro Übung und die Notiz pro Training. Wenn nicht klar ist, welche gemeint ist, immer dazusagen. | `blocks[].note`, `note` |
| **Verlauf** | history | Alle Trainings eines Durchgangs (Tab „Verlauf“). | `sessions` |

## Dateien und Durchgänge

| Begriff | Englisch (im Gespräch) | Bedeutung | im Code |
|---|---|---|---|
| **Durchgang** | run | Ein Durchlauf durch einen Plan von Woche 1 bis zur letzten Woche. Ab 2.0: eine Trainingsdatei = ein Durchgang. Nicht „Zyklus“ (das meint in der Trainingslehre etwas anderes). | `progress.cycle` (alt, ab 2.0 immer 1) |
| **Trainingsdatei** | training file | Die Datei `<planname>-<JJJJ-MM-TT>.training.json`: der Plan (einmal), der Fortschritt und alle Trainings eines Durchgangs. Für sich allein wiederherstellbar. | `file`, `fileId` |
| **Trainingsstand** | training state | Inhalt der aktiven Trainingsdatei, wie ihn die App gerade hält. Bestehender UI-Begriff. | `S.file` |
| **aktive Trainingsdatei** | active training file | Die eine Trainingsdatei, mit der die App gerade arbeitet. Nur sie liegt im Browserspeicher. | `activeFileId` |
| **Vorgänger / Nachfolger** | predecessor / successor | Verweis einer Trainingsdatei auf die Trainingsdatei des vorherigen Durchgangs (gleicher Plan noch einmal oder Folgeplan). | `previous` |
| **Startwerte** | starting values | Letzte Leistung pro Übung aus dem Vorgänger, damit Vorbelegung und Steigerungsvorschlag im neuen Durchgang funktionieren. Erscheinen nicht im Verlauf. | `carryOver` |
| **Browserspeicher** | browser storage | Arbeitsstand der App auf dem Gerät (IndexedDB). Hält nur die aktive Trainingsdatei, das laufende Training und das Datum der letzten Sicherung. | IndexedDB |
| **Dateien** | Files app | Die Dateien-App auf dem iPhone bzw. iCloud Drive. Einzige dauerhafte Ablage. | — |

## Aktionen und Exporte

| Begriff | Englisch (im Gespräch) | Bedeutung |
|---|---|---|
| **Sichern** | back up | Die aktive Trainingsdatei über das Teilen-Menü in Dateien ablegen („Als Datei sichern“, „Gesamtstand sichern“). |
| **gesichert / nicht gesichert** | backed up / not backed up | Ob der Stand der Trainingsdatei seit der letzten Änderung exportiert wurde. |
| **Öffnen** | open | Eine Plandatei oder Trainingsdatei aus Dateien in die App holen („Plan öffnen“). Macht sie zur aktiven Trainingsdatei bzw. legt eine an. |
| **Ansehen im Archiv** | view in archive | Eine Datei im Tab „Archiv“ nur lesend anzeigen. Wird nicht aktiv und nicht gespeichert. |
| **Anpassen** | adjust | Neuer Plan für den laufenden Durchgang: gleiche Trainingsdatei, Plan ersetzt, erledigte Trainings bleiben unverändert. |
| **Nachfolger** | successor | Neuer Plan als nächster Durchgang: neue Trainingsdatei mit Vorgänger und Startwerten. |
| **Ganz neu** | start fresh | Neuer Plan ohne Bezug: neue Trainingsdatei ohne Vorgänger und ohne Startwerte. |
| **Plan erneut starten** | restart plan | Gleicher Plan noch einmal: neue Trainingsdatei mit Vorgänger und Startwerten. |
| **Woche wiederholen** | repeat week | Frühere Trainings zählen nicht mehr für den Abschluss der aktuellen Woche. Gleiche Trainingsdatei. |
| **Agent-Prompt** | AI prompt | Text für einen KI-Agenten, der einen Plan erstellt oder anpasst. Ergebnis ist eine Plandatei. |
| **Coach-Export** | coach export | Schlanker Text (`.md`) mit Plan und Verlauf einer Trainingsdatei für einen KI-Coach, der bewertet. Ergebnis sind Rückmeldungen, keine Plandatei. |
| **Garmin-Export** | Garmin export | `.fit`-Datei für ein einzelnes Training. Einbahnstraße zu Garmin Connect. |
| **KI-Agent / KI-Coach** | AI agent / AI coach | Externe KI. Der Agent erstellt und ändert Pläne, der Coach bewertet Trainings. Kann dieselbe KI sein, die Rolle ergibt sich aus dem Text, den man ihr gibt. |

## Nicht verwenden

- „Zyklus“, „cycle“ → **Durchgang**
- „Session“ in UI und Doku → **Training** (im Code bleibt `sessions`)
- „Training“ für die Datei → **Trainingsdatei**
- „Plan-Einheit“ → **Einheit**
- „Aufwärmsatz“ als erfasster Satz → gibt es nicht
