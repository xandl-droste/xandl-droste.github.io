// Live-Training: Liste, Bearbeiten, Autosave, Fokus passt auf 375×630, Stile, Abschluss, Verlauf.
import { launch, btn, setFocusView, runFocusSession, report, BASE, openTestPlan } from './helpers.mjs';

const { browser, page, problems, external, shot } = await launch();
const noHScroll = async (n) => { const w = await page.evaluate(() => document.documentElement.scrollWidth); if (w > 375) problems.push(`${n}: horizontales Scrollen (${w})`); };

await page.goto(BASE);
// Erststart: Stil folgt prefers-color-scheme (hier dunkel).
const first = await page.evaluate(() => [document.documentElement.dataset.theme, document.querySelector('meta[name="theme-color"]').content]);
if (first[0] !== 'dark' || first[1] !== '#0f1412') problems.push(`Erststart: Stil ${first.join(' / ')} statt dark`);
// Menü im Onboarding: Stil und Ansicht wirken sofort und werden beim ersten Plan übernommen.
await btn(page, 'Menü').click();
await btn(page, 'Fancy', true).click();
await btn(page, 'Fokus', true).click();
const onb = await page.evaluate(() => [document.documentElement.dataset.theme, document.querySelector('[data-fid="seg-Ansicht im Training-focus"]')?.getAttribute('aria-pressed')]);
if (onb.join() !== 'fancy,true') problems.push(`Onboarding-Menü: Stil/Ansicht ohne Wirkung (${onb.join()})`);
await btn(page, 'Schließen', true).click();
await openTestPlan(page);
await btn(page, 'Training starten').waitFor();
if ((await page.evaluate(() => document.documentElement.dataset.theme)) !== 'fancy') problems.push('Stil aus dem Onboarding nicht übernommen');
await btn(page, 'Menü').click();
if ((await page.locator('[data-fid="seg-Ansicht im Training-focus"]').getAttribute('aria-pressed')) !== 'true') problems.push('Ansicht aus dem Onboarding nicht übernommen');
await btn(page, 'Dunkel', true).click();
await btn(page, 'Liste', true).click();
await btn(page, 'Schließen', true).click();
await btn(page, 'Training starten').waitFor();
await shot('01-heute'); await noHScroll('Heute');
await btn(page, 'Training starten').click();
await btn(page, 'Beenden', true).waitFor();
await shot('02-liste'); await noHScroll('Liste');
await btn(page, /Trap Bar Jump, Satz 1 abschließen/).click();
// Abstand „Rückgängig“ – „Weiter“ im Timer: mindestens 16 px gegen Fehltaps (Review r3 iOS M-1).
const restGap = await page.evaluate(() => {
  const r = (t) => [...document.querySelectorAll('.rest button')].find((b) => b.textContent.trim().startsWith(t))?.getBoundingClientRect();
  const u = r('Rückgängig'); const n = r('Weiter');
  return u && n ? Math.round(n.left - u.right) : null;
});
if (restGap == null || restGap < 16) problems.push(`Timer: Abstand Rückgängig–Weiter ${restGap} px statt mindestens 16`);
await btn(page, /Back Squat, Satz 1: .* Ändern/).click();
await page.getByRole('textbox', { name: 'Gewicht in kg' }).fill('82,5');
await page.getByRole('textbox', { name: 'Gewicht in kg' }).press('Enter');
await btn(page, 'Gewicht um 2,5 kg erhöhen').click();
await shot('03-bearbeiten');
await btn(page, 'Fertig', true).click();
await page.getByRole('region', { name: /Superset Klimmzug/ }).scrollIntoViewIfNeeded();
await shot('04-superset');

await page.reload();
// Nach Neustart direkt im laufenden Training (kein Umweg über „Heute“).
await btn(page, 'Beenden', true).waitFor();
const kgText = await btn(page, /Back Squat, Satz 1:/).textContent();
if (!kgText.includes('85')) problems.push(`Autosave: 85 kg erwartet, gefunden "${kgText}"`);
if ((await btn(page, /Trap Bar Jump, Satz 1 wieder öffnen/).count()) !== 1) problems.push('Autosave: erledigter Satz fehlt');
// Warm-up bleibt offen, bis man es selbst zuklappt (auch wenn die App neu zeichnet, z. B. nach einem Satz).
await page.locator('details.warmup summary').click();
await btn(page, /Trap Bar Jump, Satz 2 abschließen/).click();
await page.locator('.rest').getByRole('button', { name: /^Rückgängig/ }).click();
if (!(await page.locator('details.warmup').evaluate((d) => d.open))) problems.push('Warm-up nach dem Neuzeichnen zugeklappt');
await page.locator('details.warmup summary').click();
if (await page.locator('details.warmup').evaluate((d) => d.open)) problems.push('Warm-up lässt sich nicht zuklappen');
await page.waitForTimeout(620); // Doppeltipp-Sperre nach dem Rückgängig abwarten
// Beenden ist auch am Ende der Liste erreichbar (ohne nach oben zu scrollen).
await btn(page, 'Training beenden', true).click();
await page.getByRole('heading', { name: 'Training beenden?' }).waitFor();
await btn(page, 'Weiter trainieren').click();
// Doppeltipp schließt nur einen Satz ab; Rückgängig steht im Timer.
const doneCount = async () => Number((await page.locator('.live-meta .mut').textContent()).match(/(\d+) von/)[1]);
const before = await doneCount();
await btn(page, /Back Squat, Satz 1 abschließen/).dblclick();
if ((await doneCount()) !== before + 1) problems.push(`Doppeltipp: ${await doneCount() - before} Sätze statt 1 abgeschlossen`);
await page.locator('.rest').getByRole('button', { name: /^Rückgängig/ }).click();
if ((await doneCount()) !== before) problems.push('Rückgängig im Timer hat den Satz nicht wieder geöffnet');
// Getippter Wert übersteht das Ende des Rückgängig-Fensters (kein Neuzeichnen während der Eingabe), „Fertig“ greift beim ersten Tap.
await btn(page, /Back Squat, Satz 1 abschließen/).click();
await btn(page, /Back Squat, Satz 2: .* Ändern/).click();
const kgField = page.getByRole('textbox', { name: 'Gewicht in kg' });
await kgField.click();
await page.waitForTimeout(100);
await page.keyboard.type('77,5');
await page.waitForTimeout(11_000);
if ((await kgField.inputValue()) !== '77,5') problems.push(`Eingabe nach 11 s: "${await kgField.inputValue()}" statt 77,5`);
await btn(page, 'Fertig', true).click();
if (await page.locator('.sheet').count()) problems.push('„Fertig“ nach dem Tippen: Sheet beim ersten Tap nicht geschlossen');
if (!(await btn(page, /Back Squat, Satz 2:/).textContent()).includes('77,5')) problems.push('„Fertig“ nach dem Tippen: Wert nicht übernommen');
await btn(page, 'Beenden', true).click();
await btn(page, 'Training verwerfen').click();
await btn(page, 'Ja, verwerfen').click();

await setFocusView(page);
// Fokus: Wert tippen (ohne Enter, wie auf der iPhone-Zahlentastatur) und direkt „Satz fertig“: ein Tap reicht, der Wert zählt.
await btn(page, 'Training starten').click();
const repsField = page.getByRole('textbox', { name: /^Wiederholungen/ });
await repsField.click();
await page.waitForTimeout(100);
const sel = await repsField.evaluate((el) => el.selectionEnd - el.selectionStart === el.value.length);
if (!sel) problems.push('Zahlenfeld: Inhalt beim Antippen nicht markiert');
await page.keyboard.type('3');
const before2 = await doneCount();
await btn(page, 'Satz fertig').click();
if ((await doneCount()) !== before2 + 1) problems.push('„Satz fertig“ direkt nach dem Tippen: erster Tap ging verloren');
await btn(page, 'Menü').click(); await btn(page, 'Liste', true).click(); await btn(page, 'Schließen', true).click();
if (!(await btn(page, /Trap Bar Jump, Satz 1:/).textContent()).includes('× 3')) problems.push(`„Satz fertig“ nach dem Tippen: Wert ${await btn(page, /Trap Bar Jump, Satz 1:/).textContent()}`);
await btn(page, 'Beenden', true).click();
await btn(page, 'Training verwerfen').click();
await btn(page, 'Ja, verwerfen').click();
await setFocusView(page);
for (const [label, key] of [['e1', null], ['e2', null], ['e1-nochmal', 'Einheit 1 – schwer']]) {
  const n = await runFocusSession(page, { label, chooseKey: key, problems, shot });
  console.log(`${label}: ${n} Sätze`);
}
for (const theme of ['Hell', 'Fancy', 'Dunkel']) {
  await btn(page, 'Menü').click(); await btn(page, theme, true).click(); await btn(page, 'Schließen', true).click();
  await shot(`05-heute-${theme}`);
}
await btn(page, 'Verlauf', true).click();
await shot('06-verlauf'); await noHScroll('Verlauf');
// Übungsauswahl: Per Tastatur bleibt der Fokus im Feld. Nach Touch nicht, sonst öffnet iOS die Auswahl gleich wieder.
const chartSel = page.locator('[data-fid="chart-ex"]');
const chartOpts = await chartSel.locator('option').evaluateAll((os) => os.map((o) => o.value));
await chartSel.focus();
await chartSel.selectOption(chartOpts[1]);
if (!(await page.evaluate(() => document.activeElement?.dataset.fid === 'chart-ex'))) problems.push('Verlauf: Auswahl per Tastatur verliert den Fokus');
await chartSel.dispatchEvent('pointerdown', { pointerType: 'touch', bubbles: true });
await chartSel.selectOption(chartOpts[0]);
if (await page.evaluate(() => document.activeElement?.dataset.fid === 'chart-ex')) problems.push('Verlauf: Auswahl nach Touch erneut fokussiert (iOS öffnet sie wieder)');
await page.getByRole('combobox').selectOption({ label: 'RDL (Rumänisches Kreuzheben)' });
await shot('07-verlauf-rdl');
await page.locator('.list-item').first().click();
await shot('08-verlauf-detail'); await noHScroll('Verlauf-Detail');
const [fit] = await Promise.all([page.waitForEvent('download', { timeout: 10000 }).catch(() => null), btn(page, 'Für Garmin exportieren').click()]);
if (process.env.BROWSER !== 'webkit') {
  if (!fit) problems.push('Garmin: kein Download');
  else if (!/^training-\d{4}-\d{2}-\d{2}\.fit$/.test(fit.suggestedFilename())) problems.push(`Garmin: Dateiname ${fit.suggestedFilename()}`);
}
const theme = await page.evaluate(() => document.documentElement.dataset.theme);
if (theme !== 'dark') problems.push(`Stil nach Wahl Dunkel: ${theme}`);
// Korrigieren und Löschen im Verlauf
const firstSet = page.locator('.set-edit').first();
const beforeSet = await firstSet.textContent();
await firstSet.click();
await btn(page, /erhöhen$/).first().click();
await shot('09-verlauf-korrigieren'); await noHScroll('Verlauf-Korrigieren');
await btn(page, 'Fertig', true).click();
if ((await page.locator('.set-edit').first().textContent()) === beforeSet) problems.push(`Verlauf: Satz nicht geändert (${beforeSet})`);
await btn(page, /^Notiz zu .* hinzufügen$/).first().click();
await page.locator('#hist-note').fill('Korrigiert');
await btn(page, 'Speichern', true).click();
if (!(await page.getByText('Notiz: Korrigiert').count())) problems.push('Verlauf: Notiz nicht gespeichert');
await btn(page, 'Training löschen', true).click();
await shot('10-verlauf-loeschen');
await btn(page, 'Ja, löschen', true).click();
await page.getByText('Training gelöscht.').waitFor();
const countAfter = await page.locator('.list-item').count();
if (countAfter !== 2) problems.push(`Verlauf nach dem Löschen: ${countAfter} Trainings (vorher 3)`);

// ---------- Bedienung: Ton, Notiz vom letzten Mal, Gewichtsschritte, Später, Halten ----------
await btn(page, 'Heute', true).click();
// Signalton-Einstellung: Probeton darf nichts kaputt machen, Wahl bleibt erhalten.
await btn(page, 'Menü').click();
await btn(page, 'Leise', true).click();
if ((await page.locator('[data-fid="seg-Signalton-quiet"]').getAttribute('aria-pressed')) !== 'true') problems.push('Ton: „Leise“ nicht gewählt');
await btn(page, 'Liste', true).click();
await btn(page, 'Schließen', true).click();
// E1 in der Liste: Notiz bei jeder Übung, je ein Satz erledigt, speichern.
await btn(page, 'Andere Einheit wählen').click();
await btn(page, 'Einheit 1 – schwer', true).click();
await btn(page, 'Beenden', true).waitFor();
const nItems = await page.locator('[data-fid^="more-"]').count();
for (let k = 0; k < nItems; k++) {
  await page.locator(`[data-fid="more-${k}"]`).click();
  await page.locator(`#note-${k}`).fill(`Notiz ${k}: Gerät hinten links, Sitz auf Stufe 4, Griff eng, langsam absenken und oben kurz halten`);
  await btn(page, 'Fertig', true).click();
  await page.waitForTimeout(650);
  const chk = page.locator(`[data-fid="chk-${k}-0"]`);
  if (await chk.count()) await chk.click();
}
await btn(page, 'Beenden', true).click();
await btn(page, 'Beenden und speichern').click();
await btn(page, 'Zur Übersicht').click();
await btn(page, 'Andere Einheit wählen').click();
await btn(page, 'Einheit 1 – schwer', true).click();
await btn(page, 'Beenden', true).waitFor();
if (!(await page.getByText(/^Notiz letztes Mal: Notiz 1:/).count())) problems.push('Liste: „Notiz letztes Mal“ fehlt');
// Gewichts-Stepper: −2,5 −0,5 Wert +0,5 +2,5, gleich für alle Übungen (Schulterdrücken hat incrementKg 1).
await btn(page, /Schulterdrücken sitzend mit Lehne, Satz 1: .* Ändern/).click();
const spKg = page.getByRole('textbox', { name: 'Gewicht in kg' });
await spKg.fill('20'); await spKg.press('Enter');
await btn(page, 'Gewicht um 0,5 kg erhöhen').click();
await btn(page, 'Gewicht um 2,5 kg erhöhen').click();
await btn(page, 'Gewicht um 0,5 kg verringern').click();
if ((await spKg.inputValue()) !== '22,5') problems.push(`Gewichts-Stepper: ${await spKg.inputValue()} statt 22,5`);
await spKg.fill('1'); await spKg.press('Enter');
await btn(page, 'Gewicht um 2,5 kg verringern').click();
if ((await spKg.inputValue()) !== '0') problems.push(`Gewichts-Stepper unter 0: ${await spKg.inputValue()}`);
const stpBoxes = await page.locator('.sheet .stp-multi .rb').evaluateAll((els) => els.map((e) => Math.round(Math.min(e.getBoundingClientRect().width, e.getBoundingClientRect().height))));
if (stpBoxes.length !== 4 || stpBoxes.some((x) => x < 44)) problems.push(`Gewichts-Stepper: Buttons ${stpBoxes.join(', ')} px`);
await shot('11-gewicht-stepper'); await noHScroll('Gewichts-Stepper');
await btn(page, 'Fertig', true).click();
// Später: Trap Bar Jump zurückstellen, Back Squat wird aktiv, Tag „später“.
await page.locator('[data-fid="more-0"]').click();
await btn(page, /^Später:/).click();
if (!(await page.locator('.tag', { hasText: 'später' }).count())) problems.push('Später: Tag fehlt');
if (!(await page.locator('.rest .next').textContent()).includes('Back Squat')) problems.push(`Später: Als Nächstes ${await page.locator('.rest .next').textContent()}`);
await setFocusView(page);
await shot('11-fokus-notiz'); await noHScroll('Fokus');
if ((await page.locator('.focus-name').textContent()) !== 'Back Squat') problems.push(`Später: Fokus zeigt ${await page.locator('.focus-name').textContent()}`);
await btn(page, 'Optionen für Back Squat').click();
await btn(page, 'Fertig', true).click();
await btn(page, 'Menü').click(); await btn(page, 'Liste', true).click(); await btn(page, 'Schließen', true).click();
await page.locator('[data-fid="more-0"]').click();
await btn(page, /^Jetzt machen:/).click();
if (await page.locator('.tag', { hasText: 'später' }).count()) problems.push('Jetzt machen: Tag bleibt');
await btn(page, 'Beenden', true).click();
await btn(page, 'Training verwerfen').click();
await btn(page, 'Ja, verwerfen').click();
// Fokus mit Notizen vom letzten Mal: passt weiter auf 375 × 630 (runFocusSession prüft jeden Satz).
await setFocusView(page);
console.log(`e1-notiz: ${await runFocusSession(page, { label: 'e1-notiz', chooseKey: 'Einheit 1 – schwer', problems, shot: null })} Sätze`);
// Halten: Countdown im Fokus, kurze Haltezeit, schließt den Satz selbst ab.
await btn(page, 'Andere Einheit wählen').click();
await btn(page, 'Einheit 1 – schwer', true).click();
await btn(page, 'Beenden', true).waitFor();
for (let guard = 0; guard < 40 && (await page.locator('.focus-name').textContent()) !== 'Copenhagen Plank'; guard++) {
  const before = await page.locator('.live-meta .mut').textContent();
  await btn(page, 'Satz fertig').click();
  await page.waitForFunction((t) => document.querySelector('.live-meta .mut')?.textContent !== t, before, { timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(620);
}
const secIn = page.getByRole('textbox', { name: 'Haltezeit in s' });
await secIn.fill('1'); await secIn.press('Enter');
await btn(page, /^Halten starten/).click();
const fitHold = await page.evaluate(() => [document.documentElement.scrollHeight, innerHeight]);
if (fitHold[0] > fitHold[1] + 1) problems.push(`Halten: Fokus scrollt (${fitHold.join(' > ')})`);
if (!(await page.locator('#hold-phase').textContent()).startsWith('Gleich')) problems.push(`Halten: Vorlauf zeigt ${await page.locator('#hold-phase').textContent()}`);
await shot('12-fokus-halten');
// Abbrechen: Satz bleibt offen.
await page.waitForTimeout(700);
const beforeHold = await doneCount();
await btn(page, /^Halten abbrechen/).click();
if (await page.locator('#hold-time').count()) problems.push('Halten: Abbrechen ohne Wirkung');
if ((await doneCount()) !== beforeHold) problems.push('Halten: Abbrechen hat den Satz abgeschlossen');
await btn(page, /^Halten starten/).click();
// Abfrage per evaluate statt waitForFunction: Letzteres läuft in Playwright-WebKit unter der CSP der App nicht.
const until = async (fn, arg, timeout) => {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    if (await page.evaluate(fn, arg)) return true;
    await page.waitForTimeout(100);
  }
  return false;
};
if (!(await until(() => document.getElementById('hold-phase')?.textContent === 'Halten · Seite 1', null, 8000))) problems.push('Halten: Seite 1 nicht erreicht');
if (!(await until(() => document.getElementById('hold-phase')?.textContent === 'Seite wechseln', null, 4000))) problems.push('Halten: Seitenwechsel nicht erreicht');
if (!(await until((n) => Number(document.querySelector('.live-meta .mut')?.textContent.match(/(\d+) von/)?.[1]) === n + 1, beforeHold, 12000))) problems.push('Halten: Satz nach dem Countdown nicht abgeschlossen');
if (!(await page.locator('.rest').getByRole('button', { name: /^Rückgängig: .*Copenhagen Plank: Satz 1 erledigt/ }).count())) problems.push('Halten: kein Rückgängig nach dem Countdown');
if (!(await page.locator('.rest.running').count())) problems.push('Halten: Pause startet nicht');
// Wechsel von Fokus zu Liste: Der aktuelle Satz steht im sichtbaren Bereich.
await setFocusView(page, 'Liste');
const actBox = await page.locator('.row.act, .ss-cell.act').first().boundingBox();
if (!actBox || actBox.y < 0 || actBox.y + actBox.height > 630) problems.push(`Liste nach Fokus: aktueller Satz nicht sichtbar (${JSON.stringify(actBox)})`);
// Umschalter in der Leiste: ein Tap je Richtung, auch weit unten in der Liste erreichbar.
await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
await btn(page, 'Zum Fokus wechseln', true).click();
if (!(await page.locator('.focus-name').count())) problems.push('Umschalter: Fokus nicht geöffnet');
const fitToggle = await page.evaluate(() => [document.documentElement.scrollHeight, innerHeight]);
if (fitToggle[0] > fitToggle[1] + 1) problems.push(`Umschalter: Fokus scrollt (${fitToggle.join(' > ')})`);
await btn(page, 'Zur Liste wechseln', true).click();
const actBox2 = await page.locator('.row.act, .ss-cell.act').first().boundingBox();
if (!actBox2 || actBox2.y < 0 || actBox2.y + actBox2.height > 630) problems.push(`Umschalter: aktueller Satz in der Liste nicht sichtbar (${JSON.stringify(actBox2)})`);
await shot('12-umschalter-liste');
// Umschalter liegt nicht unter „Weiter“ (kein Fehltap beim Beenden der Pause).
const under = await page.evaluate(() => {
  const t = document.querySelector('[data-fid="view-toggle"]')?.getBoundingClientRect();
  const w = document.querySelector('.rest [data-fid="rest-skip"], .rest [data-fid="finish-bar"]')?.getBoundingClientRect();
  return t && w ? t.right > w.left && t.left < w.right : null;
});
if (under) problems.push('Umschalter liegt unter „Weiter“/„Abschließen“');
// Liste, alle Sätze erledigt: genau ein Abschluss-Knopf unten in der Leiste, die Karte hat keinen eigenen.
for (let guard = 0; guard < 60; guard++) {
  const open = page.locator('[data-fid^="chk-"]:not(.done)');
  if (!(await open.count())) break;
  await open.first().click();
  if ((await open.count()) > 0) await page.waitForTimeout(620);
}
if (await page.locator('[data-fid^="chk-"]:not(.done)').count()) problems.push('Liste: nicht alle Sätze abhakbar');
// Direkt nach dem letzten Satz (Rückgängig sichtbar): Leiste passt in die Breite.
if (!(await page.locator('.rest [data-fid="undo"]').count())) problems.push('Nach dem letzten Satz: kein Rückgängig in der Leiste');
await noHScroll('Leiste nach dem letzten Satz');
const barFit = await page.evaluate(() => [...document.querySelectorAll('.rest button')].every((b) => b.getBoundingClientRect().right <= innerWidth));
if (!barFit) problems.push('Nach dem letzten Satz: Knöpfe der Leiste ragen rechts hinaus');
await shot('13-letzter-satz');
const ends = await page.evaluate(() => ({
  card: document.querySelectorAll('[data-fid="all-done"]').length,
  cardBtns: document.querySelectorAll('[data-fid="all-done"] button').length,
  bar: document.querySelectorAll('.rest [data-fid="finish-bar"]').length,
  listBtn: document.querySelectorAll('[data-fid="finish-list"]').length,
}));
if (ends.card !== 1 || ends.cardBtns !== 0 || ends.bar !== 1 || ends.listBtn !== 0) problems.push(`Liste, alles erledigt: Abschluss-Knöpfe ${JSON.stringify(ends)}`);
// Wechsel zu Fokus und zurück: Liste springt zur Karte „Alle Sätze erledigt“.
await setFocusView(page);
if (await page.locator('[data-fid="all-done"] button').count()) problems.push('Fokus, alles erledigt: Karte hat einen eigenen Knopf');
await setFocusView(page, 'Liste');
const doneBox = await page.locator('[data-fid="all-done"]').boundingBox();
if (!doneBox || doneBox.y < 0 || doneBox.y + doneBox.height > 630) problems.push(`Liste nach Fokus: „Alle Sätze erledigt“ nicht sichtbar (${JSON.stringify(doneBox)})`);
await btn(page, 'Beenden', true).click();
await btn(page, 'Training verwerfen').click();
await btn(page, 'Ja, verwerfen').click();
report('training', { problems, external });
await browser.close();
