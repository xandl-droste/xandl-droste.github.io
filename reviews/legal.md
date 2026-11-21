# Review Recht und Compliance (Österreich/EU), Runde 1

Stand: `develop` @ 09a1a72, geprüft am 15.11.2026. `main` enthält noch nur den Initial-Commit (README), die App ist also noch nicht veröffentlicht.

Dieser Bericht ist **keine anwaltliche Beratung**. Jede Einschätzung trägt eine der Kennzeichnungen **eindeutig**, **wahrscheinlich** oder **unklar, anwaltlich klären** und nennt die Rechtsquelle.

## Geprüfte Punkte

| Punkt | Wie geprüft |
|---|---|
| Offenlegung nach § 25 MedienG, Anwendbarkeit von § 5 ECG | Gesetzestext im RIS gelesen, `training/src/legal.js` und `training/src/views/info.js` gelesen, Info-Seite im Browser geöffnet (Chromium/Playwright, 375 × 630) |
| Erreichbarkeit der Info-Seite | Browser: Onboarding, Tabs Heute, Verlauf und Plan, laufendes Training, Menü, Direktlink `#info`, ohne JavaScript, Startseite der Domain |
| Seitentext gegen tatsächliches Verhalten | Browser: alle Requests mitgeschnitten (61 Requests, alle auf eigener Origin, keine externen), Cookies im Context (keine), `document.cookie` (leer), keine `Set-Cookie`-Antworten, localStorage/sessionStorage (leer), IndexedDB (`training-pwa`), Cache Storage (ein eigener Cache). Code: `fetch` nur in `training/src/app.js:191` (GET auf den mitgelieferten Beispielplan) und im Service Worker (`training/sw.js:72`, nur eigene Origin). Kein `sendBeacon`, `XMLHttpRequest`, `WebSocket` und keine Analytics. CSP in `training/index.html:6` mit `connect-src 'self'`. Stichprobe auf einer fremden `*.github.io`-Seite: GitHub Pages setzt keine Cookies |
| DSGVO und Datenschutzinformation | Info-Text gegen Art. 13 DSGVO abgeglichen. GitHub-Doku zu Pages und GitHub-Datenschutzerklärung gelesen (Quellen unten) |
| Einwilligung für Speicherzugriff (§ 165 Abs. 3 TKG 2021) | Gesetzestext im RIS. Browser: was nach dem ersten Laden ohne Nutzeraktion gespeichert wird |
| Lizenzen | `package.json` (keine Abhängigkeiten, kein Lockfile), `training/src/**` (nur eigener Code, nichts aus Fremdquellen eingebunden), `legal.js` `OPEN_SOURCE = []`. FIT-Encoder `training/src/garmin/fit.js` und `session-fit.js` gelesen: eigener Encoder, nur Enum-Nummern aus dem FIT-Profil. Icons angesehen (eigene, schlichte Hantel-Grafik). Systemfont, keine eingebundenen Schriften. `docs/prototyp.html` ohne externe Ressourcen |
| Marken | `grep` nach Garmin, Apple, iPhone und Safari in `training/`, README und Prototyp. Icons angesehen. FIT-Datei: `manufacturer = development (255)`, gibt sich also nicht als Garmin-Gerät aus |
| Gesundheits- und Haftungshinweise | Info-Text, Seed-Plan (`training/plans/seed.plan.json`, alle `name`/`cue`), Agent-Prompt (`training/src/agent-prompt.js`), UI-Texte |
| Öffentliches Repo und persönliche Daten | `git log --all` (Autor und Committer aller Commits, Commit-Texte), `git grep` über alle Revisionen nach Mailadressen, Ortsnamen, Telefonnummern, Home-Pfaden und Klarnamen-Bestandteilen. Dazu Manifest, README, `index.html` und PNG-Metadaten der Icons. `spike/test.fit` (Strings und Header) |

## Nicht geprüfte Punkte

- **Safari/WebKit:** Der Browser-Test lief nur mit Chromium. Die vorhandenen WebKit-Builds passten nicht zur Playwright-Version. Speicher- und Netzwerkverhalten ist aber im Code plattformunabhängig, darum ist das Risiko gering.
- **Live-Site auf GitHub Pages:** Nicht abgerufen. Die App ist noch nicht auf `main`, und Requests mit dem Repo-Namen sollten nicht an Dritte gehen. Ob `*.github.io` Cookies setzt, wurde stellvertretend an einer fremden `github.io`-Seite geprüft (keine `Set-Cookie`-Header).
- **Server-Logs von GitHub (Inhalt, Speicherdauer):** Nicht einsehbar. Bekannt ist nur, was GitHub dokumentiert.
- **Herkunft der Icons und des Prototyps:** Aus dem Repo geht nicht hervor, wie sie entstanden sind. Die Grafik ist schlicht und generisch, darum ist das Risiko gering. Geprüft ist nur, dass sie kein fremdes Logo zeigen.
- **Vollständiger Wortlaut der aktuellen Garmin-FIT-Lizenz:** Nur in Auszügen recherchiert (siehe N5).

## Ergebnisse ohne Befund (geprüft)

- **„Keine Cookies“, „kein Tracking“, „keine Analyse-Dienste“, „Trainingsdaten werden nicht an den Betreiber übertragen“:** Durch Browser-Test und Code **belegt**. Die App macht nur GET-Requests auf die eigene Origin, um App-Dateien und den Beispielplan zu laden. Nutzerdaten verlassen das Gerät nur per Export oder Teilen, das der Nutzer selbst auslöst.
- **Cookie- oder Einwilligungs-Banner nach § 165 Abs. 3 TKG 2021:** **Wahrscheinlich nicht nötig.** Die App nutzt IndexedDB (Trainingsstand, Einstellungen) und Cache Storage mit Service Worker (Offline-Betrieb). Beides ist schon nach dem ersten Laden ohne Nutzeraktion angelegt (im Browser beobachtet). § 165 Abs. 3 TKG und die EDPB Guidelines 2/2023 erfassen auch solchen lokalen Speicher. Die Ausnahme „unbedingt erforderlich, damit der vom Nutzer ausdrücklich gewünschte Dienst zur Verfügung gestellt werden kann“ greift aber, weil lokales Speichern und Offline-Betrieb der Kern der aufgerufenen App sind. Es gibt keine Drittanbieter, keine Wiedererkennung und keine Reichweitenmessung. Quelle: § 165 Abs. 3 TKG 2021, Art. 5 Abs. 3 RL 2002/58/EG.
- **§ 5 ECG:** **Wahrscheinlich nicht anwendbar.** Ein „Dienst der Informationsgesellschaft“ ist ein Dienst, der „in der Regel gegen Entgelt“ erbracht wird (§ 3 Z 1 ECG). Die Seite ist rein privat, ohne Werbung, ohne Entgelt und ohne wirtschaftliche Tätigkeit. Falls doch einmal Werbung, Spenden oder ein Bezug zu einer Erwerbstätigkeit dazukommen, wird § 5 ECG relevant. Dann bräuchte es zusätzlich eine geografische Anschrift.
- **Umfang der Offenlegung:** **Wahrscheinlich** reicht die Kurzform nach § 25 Abs. 5 MedienG (Name und Wohnort), weil die Seite keinen meinungsbildenden Inhalt hat. Die Struktur des Texts („Medieninhaber und Betreiber: Name, Wohnort, Österreich“) passt dazu. Eine Website ist ein periodisches elektronisches Medium (§ 1 Abs. 1 Z 5a lit. b MedienG). Für Websites gilt § 25, nicht § 24. Zu den Platzhaltern siehe H1.
- **Lizenzen gebündelter Komponenten:** **Eindeutig** werden keine Fremdbibliotheken, Fremdschriften oder Fremd-Assets ausgeliefert. Der Eintrag „Keine eingebunden“ auf der Info-Seite stimmt also.
- **Marken:** **Wahrscheinlich zulässig.** „Garmin“ und „Garmin Connect“ erscheinen nur beschreibend: Button „Für Garmin exportieren“ (`training/src/views/history.js:103`), Hinweis-Meldungen (`training/src/app.js:655–661`), Datenschutztext. „Apple“ und „iPhone“ stehen nur im README, das einen Hinweis „keine Verbindung zu diesen Unternehmen“ hat. Es gibt keine Logos, und die Icons sind eigene Hantel-Grafiken. Die Verwendung, um den Zweck einer Funktion anzugeben (Kompatibilität), ist gedeckt. Quelle: Art. 14 Abs. 1 lit. c UMV (VO (EU) 2017/1001), § 10 Abs. 3 MSchG. `apple-touch-icon` und `apple-mobile-web-app-*` sind technische Bezeichner, keine Markennutzung.
- **Commits:** **Eindeutig** in Ordnung. Alle Commits haben als Autor und Committer entweder eine neutrale Identität mit Anthropic-noreply-Adresse oder (beim Initial-Commit) die GitHub-noreply-Adresse des Kontos. Commit-Texte enthalten keine Namen, Orte oder Mailadressen.
- **Manifest, `index.html`, Icons, `spike/test.fit`:** Keine persönlichen Daten. PNGs ohne Text-Metadaten, FIT mit Seriennummer 1 und ohne Freitexte.
- **Seed-Plan:** Die Hinweise (`cue`) beschreiben nur die Ausführung („3 s absenken“, „Intensität 80 %“). Es gibt keine Heilversprechen und keine Aussagen zu Diagnosen oder Therapie.

## Findings

### Kritisch

Keine.

### Hoch

#### H1: Offenlegung ist mit Platzhaltern unvollständig, und die Repo-Regel steht im Zielkonflikt mit § 25 MedienG

- **Fundstelle:** `training/src/legal.js:4–5` (`NAME = '[NAME]'`, `WOHNORT = '[WOHNORT]'`), `CLAUDE.md` Abschnitt „Persönliche Daten“ („Platzhalter … werden nicht ersetzt“, „keine Klarnamen, Wohnorte … in Code“), `tests/e2e/info.e2e.mjs:13` (prüft, dass genau `[NAME], [WOHNORT]` angezeigt wird).
- **Beschreibung:** Die Info-Seite zeigt derzeit „Medieninhaber und Betreiber: [NAME], [WOHNORT], Österreich“. Sobald `develop` nach `main` gemergt wird, ist die Website öffentlich und braucht eine vollständige Offenlegung. GitHub Pages liefert direkt aus dem Repo aus. Name und Wohnort müssen deshalb im öffentlichen Repo und in dessen Git-Historie stehen. Das widerspricht der Regel in `CLAUDE.md`. Der e2e-Test schlägt außerdem fehl, sobald die Platzhalter ersetzt sind.
- **Auswirkung:** Fehlt die Offenlegung, ist das eine Verwaltungsübertretung mit Geldstrafe bis 20.000 € (§ 27 Abs. 1 MedienG). Ein Pseudonym oder eine reine Mailadresse genügt nicht. **Eindeutig:** Platzhalter erfüllen § 25 MedienG nicht. Quelle: § 25 Abs. 1 und 5, § 27 MedienG.
- **Empfehlung:**
  1. Vor dem ersten Merge nach `main` echten Namen und Wohnort eintragen. Für § 25 Abs. 5 genügt beim Wohnort **wahrscheinlich** die Gemeinde, eine Straßenadresse ist nicht nötig.
  2. Die Regel in `CLAUDE.md` bewusst entscheiden und anpassen, etwa so: „Klarname und Wohnort stehen ausschließlich in `training/src/legal.js` (für § 25 MedienG nötig)“.
  3. Wer den Namen nicht in der Git-Historie haben will, kann statt „Deploy from a branch“ einen GitHub-Actions-Deploy nutzen. Der Workflow setzt `legal.js` aus Repository-Variablen zusammen. Der Name steht dann auf der Website, aber nicht in Commits. Der Preis dafür ist ein Workflow mit gepinnten Actions.
  4. Den e2e-Test so ändern, dass er nur prüft, dass die Werte aus `legal.js` angezeigt werden, statt die Platzhalter fest zu erwarten.
  5. Bis dahin `main` nicht veröffentlichen, oder Pages erst nach dem Eintragen einschalten.
- **Sicherheit der Einschätzung:** Pflicht und Strafrahmen eindeutig. Dass der Ort ohne Straße reicht: wahrscheinlich.

### Mittel

#### M1: Die Datenschutzinformation erfüllt Art. 13 DSGVO nicht vollständig

- **Fundstelle:** `training/src/views/info.js:20` (Abschnitt „Datenschutz“).
- **Beschreibung:** Der Text sagt ehrlich, was die App tut (siehe „ohne Befund“). Es fehlen aber Pflichtangaben für die Verarbeitungen, die tatsächlich stattfinden:
  1. **Hosting über GitHub Pages:** GitHub dokumentiert: „the visitor's IP address is logged and stored for security purposes“. Das passiert bei jedem Aufruf, auch bei Update-Prüfungen des Service Workers.
  2. **Kontakt per E-Mail:** Der Betreiber verarbeitet Absenderadresse und Inhalt, über einen Mail-Provider.

  Es fehlen: Name und Anschrift des Verantwortlichen (heute nur Platzhalter, und kein Verweis auf die Offenlegung), Zwecke und Rechtsgrundlage (z. B. Art. 6 Abs. 1 lit. f DSGVO für Hosting und Sicherheit, für E-Mail-Anfragen lit. f bzw. b), Empfänger (GitHub Inc., USA) und Drittlandübermittlung (GitHub ist laut eigener Erklärung nach dem EU-U.S. Data Privacy Framework zertifiziert), Speicherdauer oder deren Kriterien, Betroffenenrechte (Art. 15–21) und das Beschwerderecht bei der österreichischen Datenschutzbehörde (Art. 77).
- **Auswirkung:** Die Haushaltsausnahme des Art. 2 Abs. 2 lit. c DSGVO greift **wahrscheinlich nicht**, weil die Seite für jeden im Internet abrufbar ist (EuGH C-101/01 *Lindqvist*, Rn. 47; C-212/13 *Ryneš*). Ob der Betreiber für die Server-Logs von GitHub (mit)verantwortlich ist, ist **unklar, anwaltlich klären**: GitHub bezeichnet sich als eigener Verantwortlicher, die Auswahl des Hosters spricht für eine gewisse Mitverantwortung (vgl. EuGH C-210/16 *Wirtschaftsakademie*, C-40/17 *Fashion ID*). Für den E-Mail-Kontakt ist der Betreiber **eindeutig** Verantwortlicher. Das praktische Risiko ist gering, weil es kein Tracking und keine Datensammlung gibt. Eine unvollständige Information nach Art. 13 kann aber nach Art. 83 Abs. 5 lit. b DSGVO sanktioniert werden. Die DSB arbeitet meist auf Beschwerde.
- **Empfehlung:** Den Datenschutzabschnitt in `legal.js` bzw. `info.js` um einen kurzen, konfigurierbaren Block ergänzen. Die Vorgabe in Spezifikation Abschnitt 6 („Text wörtlich so übernehmen“) bewusst vom Betreiber ändern lassen. Vorschlag für die Inhalte:
  - „Verantwortlich: siehe Offenlegung oben.“
  - „Hosting: GitHub Inc., USA (EU-U.S. Data Privacy Framework). GitHub protokolliert beim Aufruf die IP-Adresse zu Sicherheitszwecken. Rechtsgrundlage: berechtigtes Interesse am sicheren Betrieb der Seite (Art. 6 Abs. 1 lit. f DSGVO). Speicherdauer: laut GitHub-Datenschutzerklärung“, mit Link auf die GitHub-Datenschutzerklärung.
  - „E-Mail-Anfragen: Wir verarbeiten Adresse und Inhalt nur zur Beantwortung und löschen sie danach.“
  - „Deine Rechte: Auskunft, Berichtigung, Löschung, Einschränkung, Widerspruch, Datenübertragbarkeit. Beschwerde bei der Österreichischen Datenschutzbehörde (dsb.gv.at).“
- **Sicherheit der Einschätzung:** Fehlende Elemente gegenüber Art. 13: eindeutig. Anwendbarkeit auf den Betreiber: wahrscheinlich. Rolle bei den GitHub-Logs: unklar, anwaltlich klären.

### Niedrig

#### N1: Der Text zum Hosting ist ungenau („kann … verarbeiten“, „keinen Einfluss“)

- **Fundstelle:** `training/src/views/info.js:20`.
- **Beschreibung:** Laut GitHub-Doku wird die IP-Adresse bei jedem Aufruf protokolliert und gespeichert, nicht nur möglicherweise. „Auf diese Verarbeitung habe ich keinen Einfluss“ stimmt für die Details, aber der Betreiber hat den Hoster gewählt und kann die Seite abschalten. Die „Datenschutzerklärung von GitHub“ wird nur genannt, nicht verlinkt.
- **Auswirkung:** Kleine Abweichung zwischen Text und Wirklichkeit (Transparenzgebot, Art. 5 Abs. 1 lit. a und Art. 12 Abs. 1 DSGVO). **Wahrscheinlich** ohne praktische Folgen.
- **Empfehlung:** Statt „kann … verarbeiten“ etwa „GitHub protokolliert beim Aufruf technisch bedingt Verbindungsdaten (z. B. IP-Adresse) zu Sicherheitszwecken“. Die GitHub-Datenschutzerklärung als Link angeben (`rel="noopener"`, Referrer ist schon per Meta unterdrückt). Lässt sich mit M1 zusammen erledigen.
- **Sicherheit der Einschätzung:** wahrscheinlich.

#### N2: Der Info-Link fehlt im laufenden Training, und seine Beschriftung nennt weder Impressum noch Offenlegung

- **Fundstelle:** `training/src/app.js:164` (Beschriftung „Info & Datenschutz“), `training/src/app.js:688` (kein Footer-Link auf dem Bildschirm `live`). Nachstellen: Beispielplan laden → „Training starten“ → kein Link unten, die Info ist nur über das Menü erreichbar (im Browser bestätigt).
- **Beschreibung:** § 25 Abs. 1 MedienG verlangt, dass die Angaben auf einer Website „ständig leicht und unmittelbar auffindbar“ sind. Die Info ist überall in höchstens zwei Taps erreichbar, im Training nur über das Menü (dort heißt der Eintrag „Info, Impressum & Datenschutz“). Der Footer-Link heißt nur „Info & Datenschutz“. Nutzer und Behörden suchen erfahrungsgemäß nach „Impressum“ oder „Offenlegung“.
- **Auswirkung:** **Wahrscheinlich ausreichend**, weil der Menüeintrag die Begriffe enthält und überall erreichbar ist. Das Restrisiko ist gering.
- **Empfehlung:** Den Footer-Link „Impressum & Datenschutz“ nennen, falls es die Breite zulässt. Die Ausnahme im Training ist aus UX-Gründen vertretbar. Sie ist in `docs/stand.md` dokumentiert und sollte so bleiben.
- **Sicherheit der Einschätzung:** wahrscheinlich.

#### N3: Die Offenlegung ist nur mit JavaScript sichtbar, die Startseite der Domain hat keine eigene

- **Fundstelle:** `training/index.html:24` (`<noscript>` zeigt nur „Diese App braucht JavaScript.“), `index.html:17` (Link auf `./training/#info`). Nachstellen: Seite mit deaktiviertem JavaScript öffnen und `training/#info` aufrufen. Ergebnis: nur der noscript-Hinweis (im Browser bestätigt).
- **Beschreibung:** Die Startseite `https://<konto>.github.io/` ist selbst eine Website, verweist für die Offenlegung aber auf eine Seite, die ohne JavaScript leer bleibt. Dazu kommt, dass GitHub Pages bei „Deploy from a branch“ das ganze Repo ausliefert (`docs/`, `tests/`, `CLAUDE.md` …). Das gehört alles zur selben Website.
- **Auswirkung:** Gering. Eine Offenlegung, die nur mit JavaScript sichtbar ist, gilt **wahrscheinlich** noch als „auffindbar“, ist aber angreifbar. **Unklar, anwaltlich klären**, falls man ganz sicher gehen will.
- **Empfehlung:** Eine kleine statische Seite `impressum.html` im Repo-Root (ohne JS) mit denselben Angaben anlegen. Startseite und `<noscript>` darauf verlinken. Die Angaben sollten trotzdem aus einer Quelle kommen, z. B. per `npm run sw`-Skript erzeugen oder bewusst als zweite gepflegte Stelle dokumentieren.
- **Sicherheit der Einschätzung:** wahrscheinlich bzw. unklar wie angegeben.

#### N4: Das Repo hat keine Lizenz

- **Fundstelle:** README.md, Abschnitt „Hinweise“ („Lizenz: noch nicht festgelegt“). Es gibt keine `LICENSE`-Datei. `docs/stand.md` nennt MIT als Vorschlag.
- **Beschreibung:** Ohne Lizenz gilt urheberrechtlich „alle Rechte vorbehalten“. Dritte dürfen den Code nach den GitHub Terms of Service (Abschnitt D.5) nur auf GitHub ansehen und forken, nicht weiterverwenden.
- **Auswirkung:** Kein Risiko für den Betreiber, nur Unklarheit für Dritte. Wie weit überwiegend KI-generierter Code nach § 1 UrhG geschützt ist (eigentümliche geistige Schöpfung eines Menschen), ist **unklar, anwaltlich klären**. Eine Lizenzangabe schadet aber nicht.
- **Empfehlung:** `LICENSE` mit **MIT** für Code und Seed-Plan anlegen (kurz, verträglich, keine Pflichten außer dem Lizenzhinweis). Alternativ Code MIT und Texte/Dokumente CC BY 4.0. Den Lizenzhinweis im README nennen. In der App ist keine Angabe nötig, solange `OPEN_SOURCE` leer ist.
- **Sicherheit der Einschätzung:** eindeutig, dass derzeit keine Lizenz vorliegt. Schutzfähigkeit von KI-Code: unklar, anwaltlich klären.

#### N5: Der eigene FIT-Encoder und die Garmin-FIT-Protokolllizenz

- **Fundstelle:** `training/src/garmin/fit.js`, `training/src/garmin/session-fit.js:13–34` (Nummern aus dem FIT-Profil, „SDK 21.221“), `spike/test.fit`.
- **Beschreibung:** Der Encoder ist selbst geschrieben. Es wurde kein SDK-Code übernommen, verwendet werden nur das öffentlich dokumentierte Dateiformat und einzelne Enum-Werte (Kategorienummern). Garmin stellt Protokoll und SDK unter eine eigene „FIT Protocol License“, die sich auf die „Licensed Technology“ bezieht. Laut Recherche ist sie gebührenfrei und nicht exklusiv, und Änderungen sind erlaubt, solange die Interoperabilität erhalten bleibt. Ob schon die bloße Umsetzung des Formats ohne SDK-Code dieser Lizenz unterliegt, ist offen. Reine Schnittstellen- und Formatangaben sind urheberrechtlich **wahrscheinlich** nicht geschützt (vgl. EuGH C-406/10 *SAS Institute*, Rn. 39–46, zu Funktionalität und Dateiformaten).
- **Auswirkung:** Gering für ein privates, nicht kommerzielles Projekt. Erzeugte Dateien halten sich an das Protokoll (`manufacturer = development`).
- **Empfehlung:** Die aktuelle FIT-Lizenz auf der Download-Seite des FIT SDK einmal vollständig lesen und das Ergebnis in `docs/stand.md` festhalten. Im README einen Satz ergänzen: „FIT-Encoder eigenständig implementiert nach der öffentlichen FIT-Protokollbeschreibung, kein Garmin-SDK-Code enthalten.“ Kein SDK-Code ins Repo kopieren.
- **Sicherheit der Einschätzung:** unklar, anwaltlich klären (Reichweite der Garmin-Lizenz). Urheberrechtlicher Schutz von Formatangaben: wahrscheinlich nicht.

#### N6: Der KI-Prompt fragt nach Beschwerden, und der Gesundheitshinweis steht nur auf der Info-Seite

- **Fundstelle:** `training/src/agent-prompt.js:115` („… Einschränkungen und Beschwerden …“), `training/src/app.js:247` (Erklärtext im Sheet „Plan mit KI“), `training/src/views/info.js:23` (Hinweis).
- **Beschreibung:** Der Prompt fordert die Nutzerin oder den Nutzer auf, einem KI-Dienst eigener Wahl Beschwerden zu nennen, also möglicherweise Gesundheitsdaten nach Art. 9 DSGVO. Die KI erzeugt daraus einen Plan, den die App ungeprüft anzeigt. Der Hinweis „keine medizinische oder therapeutische Beratung“ steht nur auf der Info-Seite. Im Sheet „Plan mit KI“ und im Onboarding gibt es keinen Hinweis. Die App selbst gibt keine medizinischen Ratschläge (Seed-Plan geprüft).
- **Auswirkung:** Der Betreiber verarbeitet diese Daten nicht. Die Weitergabe an den KI-Dienst entscheidet der Nutzer selbst, darum besteht **wahrscheinlich** keine datenschutzrechtliche Verantwortung des Betreibers. Ein haftungsrelevanter Eindruck („die App plant mein Reha-Training“) ist bei einem unentgeltlichen Privatprojekt **wahrscheinlich** gering. Ein „keine Gewähr“-Ausschluss wirkt bei grober Fahrlässigkeit oder Personenschäden ohnehin nur begrenzt (§ 1295 ff. ABGB, § 6 Abs. 1 Z 9 KSchG analog). Genaue Reichweite: **unklar, anwaltlich klären**.
- **Empfehlung:** Im Sheet „Plan mit KI“ unter dem Erklärtext einen Satz ergänzen, etwa: „Was du dem KI-Dienst erzählst, geht an dessen Anbieter. Der erzeugte Plan ist nicht geprüft und keine medizinische Beratung. Bei Beschwerden ärztlich oder physiotherapeutisch abklären.“ Optional dieselbe Kurzform im Onboarding.
- **Sicherheit der Einschätzung:** wahrscheinlich bzw. unklar wie angegeben.

#### N7: Das öffentlich ausgelieferte Repo enthält persönliche Gewohnheiten, und die Kontaktadresse steht an mehreren Stellen

- **Fundstelle:** `docs/spezifikation.md` Abschnitte 0 und 4 (persönliche Angaben des Betreibers (in der neuen Historie entfernt)). Die Kontaktadresse steht außer in `training/src/legal.js:6` auch in `docs/spezifikation.md:227` und `tests/e2e/info.e2e.mjs:13`. Bei „Deploy from a branch“ werden diese Dateien auch über GitHub Pages ausgeliefert.
- **Beschreibung:** Name, Wohnort und private Mailadresse stehen nicht unerlaubt im Repo. Die Kontaktadresse ist die vorgesehene öffentliche Kontaktadresse, der GitHub-Benutzername ist Teil von Domain und Adresse. Sobald aber der Klarname in der Offenlegung steht (H1), lässt sich der Name mit diesen Angaben zu einem Profil verbinden. Dass die Kontaktadresse mehrfach vorkommt, widerspricht der Vorgabe „an EINER Stelle“ (Spezifikation Abschnitt 6). Ändert der Betreiber die Adresse, bleiben alte Kopien stehen.
- **Auswirkung:** Kein Rechtsverstoß. Der Betreiber veröffentlicht eigene Daten selbst, die Haushaltsausnahme ist hier nicht einschlägig, weil es seine eigenen Daten sind. Es ist ein Privatsphäre-Risiko. **Wahrscheinlich.**
- **Empfehlung:** Bewusst entscheiden, ob `docs/spezifikation.md` mit diesen Angaben öffentlich bleiben soll. Sonst die Details neutralisieren. Wahlweise per Actions-Deploy (siehe H1) nur `index.html`, `root.css` und `training/` ausliefern. Im e2e-Test die Adresse aus `legal.js` importieren statt sie zu wiederholen.
- **Sicherheit der Einschätzung:** wahrscheinlich.

## Zusammenfassung der Schwere

| Schwere | Anzahl |
|---|---|
| kritisch | 0 |
| hoch | 1 (H1) |
| mittel | 1 (M1) |
| niedrig | 7 (N1–N7) |

## Punkte „unklar, anwaltlich klären“

- M1: Ist der Betreiber für die IP-Protokollierung durch GitHub Pages (mit)verantwortlich?
- N3: Reicht eine Offenlegung, die nur mit JavaScript sichtbar ist, für „ständig leicht und unmittelbar auffindbar“?
- N4: Wie weit ist überwiegend KI-generierter Code urheberrechtlich geschützt?
- N5: Wie weit reicht die Garmin-FIT-Protokolllizenz bei eigenem Encoder ohne SDK-Code?
- N6: Wie weit wirkt der Haftungsausschluss bei einem unentgeltlichen Angebot?

## Quellen

- MedienG (§ 1 Abs. 1 Z 5a, §§ 24, 25, 27), RIS: https://www.ris.bka.gv.at/GeltendeFassung.wxe?Abfrage=Bundesnormen&Gesetzesnummer=10000719
- ECG (§ 3 Z 1 und 2, § 5), RIS: https://www.ris.bka.gv.at/GeltendeFassung.wxe?Abfrage=Bundesnormen&Gesetzesnummer=20001703
- TKG 2021 § 165, RIS: https://www.ris.bka.gv.at/NormDokument.wxe?Abfrage=Bundesnormen&Gesetzesnummer=20011678&Paragraf=165
- DSGVO (VO (EU) 2016/679), Art. 2, 5, 6, 12, 13, 77, 83, EUR-Lex: https://eur-lex.europa.eu/eli/reg/2016/679/oj
- EDPB Guidelines 2/2023 on Technical Scope of Art. 5(3) of ePrivacy Directive: https://www.edpb.europa.eu/our-work-tools/documents/public-consultations/2023/guidelines-22023-technical-scope-art-53-eprivacy_en
- GitHub Docs, „About GitHub Pages“ (IP-Protokollierung): https://docs.github.com/en/pages/getting-started-with-github-pages/about-github-pages
- GitHub General Privacy Statement (Data Privacy Framework, Verantwortlicher): https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement
- GitHub Terms of Service, Abschnitt D.5: https://docs.github.com/en/site-policy/github-terms/github-terms-of-service
- FIT Protocol License (Garmin/ANT): https://thisisant.developer.garmin.com/pages/developer/ant/licensing/flexible-and-interoperable-data-transfer-fit-protocol-license/index.html und FIT-SDK-Download: https://developer.garmin.com/fit/download
- Unionsmarkenverordnung (VO (EU) 2017/1001) Art. 14; MSchG § 10 Abs. 3
- EuGH C-101/01 *Lindqvist*; C-212/13 *Ryneš*; C-210/16 *Wirtschaftsakademie*; C-40/17 *Fashion ID*; C-406/10 *SAS Institute*
