# Umsetzung: Reviews der Testfahrt-Fixes

Vier frische Reviewer (Security, Legal, iOS/UX, Code-Qualität) haben den Stand von `feature/testfahrt-bugs` gegenüber `develop` geprüft. Keiner meldet kritische oder hohe Findings. Security und Legal melden keine Findings.

| Finding | Umgang |
|---|---|
| Code-Qualität M1: Pause nach dem letzten Satz nur beim Abhaken beendet | Behoben. `dropRestIfDone` in `model/live.js`, gilt für Abhaken, Überspringen und Satz entfernen. Unit-Test für „Später“, Überspringen und Entfernen |
| iOS/UX M-1: Umschalter direkt unter „Weiter“ | Behoben. Umschalter links in der unteren Zeile, unter der Zeit (nicht antippbar). e2e prüft, dass er nicht unter „Weiter“/„Abschließen“ liegt |
| iOS/UX M-2: nach dem letzten Satz ragt die Leiste rechts hinaus | Behoben. Bei „alles erledigt“ entfällt die Zeit, Spalte 1 ist `minmax(0, 1fr)`. e2e prüft die Breite direkt nach dem letzten Satz |
| iOS/UX N-1: Tippflächen | Behoben. Umschalter-Tippfläche 44 × 45, „Abschließen“ wieder 48 px |
| iOS/UX N-2: „Als Nächstes“ bei ≤ 330 px halbiert | Behoben durch die neue untere Zeile (volle Breite abzüglich Umschalter) |
| iOS/UX N-3: Fokus nach Touch im Verlauf | Teilweise: Tastatur setzt den Touch-Zustand zurück. Das `<select>` beim Wechsel nicht zu ersetzen, bleibt offen. Prüfung mit VoiceOver am Gerät (Checkliste) |
| iOS/UX N-4: Ansagen | Behoben. Ansage „Ansicht Liste/Fokus“ beim Umschalten und „Alle Sätze erledigt, unten Abschließen“ nach dem letzten Satz. Doppeltes `aria-label` der Karte entfernt |
| Code-Qualität N1: verstreute `.rest`-Regeln | Behoben, Regeln zusammengeführt |
| Code-Qualität N2: Tippfläche hängt am Innenabstand | Durch die neue Lage entschärft (nach oben und unten erweitert). Kopplung per Variable nicht umgesetzt |
| Code-Qualität N3 / Security H1: `lastPointerType` bleibt stehen | Behoben (`keydown` setzt zurück), Kommentar korrigiert |
| Code-Qualität N4: Tests für „Später“/Übersprungen | Behoben (siehe M1) |
| Code-Qualität N5: feste Wartezeiten im e2e | Teilweise: Meldung, wenn nicht alle Sätze abhakbar sind. Gemeinsame Konstante nicht umgesetzt |
| Code-Qualität Hinweise | `?.` bei `warmupToggle` entfernt, Kommentar zum `toggle`-Event, `scrollToActiveSetOnce`, `restBar` mit Standard-Ansicht |
| iOS/UX Hinweis: Spezifikation | Nachgezogen (Pausentimer, Abschluss, Umschalter, Warm-up) |

Offen für das echte iPhone: Checkliste in `reviews/testfahrt-ios-ux.md`.
