// Onboarding, Import (gültig, ungültig, präpariert), Export, Wiederherstellung aus leerem Speicher, Plan-Tab, CSV.
import { readFileSync, writeFileSync } from 'node:fs';
import { launch, btn, report, BASE, SHOTS } from './helpers.mjs';

const seed = readFileSync(new URL('../fixtures/beispielplan.plan.json', import.meta.url), 'utf8');
const tmp = `${SHOTS}/tmp`;
import { mkdirSync } from 'node:fs';
mkdirSync(tmp, { recursive: true });
const write = (name, text) => { const p = `${tmp}/${name}`; writeFileSync(p, text); return p; };

const evil = JSON.parse(seed);
evil.name = '<img src=x onerror="window.__xss=1">Plan';
evil.sessions[0].name = '<script>window.__xss=2</script>Einheit';
evil.sessions[0].blocks[0].exercises[0].cue = '"><svg onload="window.__xss=3">';
const broken = JSON.parse(seed);
delete broken.sessions[1].blocks[2].exercises[0].repsMax;
delete broken.sessions[1].blocks[2].exercises[0].byWeek;

const run = await launch();
const { page, problems, shot } = run;
page.on('dialog', (d) => { problems.push(`Dialog geöffnet: ${d.message()}`); d.dismiss(); });

async function choose(paths) {
  const [fc] = await Promise.all([page.waitForEvent('filechooser'), btn(page, /^Plan öffnen/).click()]);
  await fc.setFiles(paths);
}

await page.goto(BASE);
await shot('i01-onboarding');
// Ungültige Datei: Abbruch mit Pfad
await choose([write('kaputt.json', JSON.stringify(broken)), write('plan.json', seed)]);
await page.getByRole('heading', { name: 'Import abgebrochen' }).waitFor();
const errText = await page.locator('.errors').first().textContent();
if (!errText.includes('plan.sessions[1].blocks[2].exercises[0]: repsMax fehlt')) problems.push(`Fehlerpfad fehlt: ${errText}`);
await shot('i02-fehler');
await btn(page, 'Schließen', true).click();
if (!(await page.getByRole('heading', { name: 'Hast du schon einen Plan?' }).count())) problems.push('Nach Fehler nicht mehr im Onboarding');

// Präparierter Plan: Texte nur als Text
await choose([write('evil.json', JSON.stringify(evil))]);
await btn(page, 'Übernehmen').click();
await btn(page, 'Training starten').waitFor();
await shot('i03-xss');
const xss = await page.evaluate(() => window.__xss ?? null);
if (xss) problems.push(`XSS ausgeführt: ${xss}`);
if (!(await page.getByText('<script>window.__xss=2</script>Einheit').count())) problems.push('Präparierter Name nicht als Text sichtbar');

// Zweiter Plan bei vorhandenem Stand: Wahl anbieten, neu beginnen
await btn(page, 'Plan', true).click();
await choose([write('plan.json', seed)]);
await btn(page, 'Ganz neu').click();
await shot('i04-vorschau-plan');
await btn(page, 'Übernehmen').click();
await btn(page, 'Training starten').waitFor();

// Ein Training, dann Export
await btn(page, 'Training starten').click();
await btn(page, /Trap Bar Jump, Satz 1 abschließen/).click();
await btn(page, 'Beenden', true).click();
await btn(page, 'Beenden und speichern').click();
const [dl] = await Promise.all([page.waitForEvent('download'), btn(page, 'Als Datei sichern', true).click()]);
const exported = `${tmp}/${dl.suggestedFilename()}`;
await dl.saveAs(exported);
console.log('Export:', dl.suggestedFilename());
if (!/\.training\.json$/.test(dl.suggestedFilename())) problems.push(`Dateiname: ${dl.suggestedFilename()}`);
// Garmin-Export direkt nach dem Training (unter „Als Datei sichern“).
const order = await page.evaluate(() => [...document.querySelectorAll('#app button')].map((b) => b.textContent));
if (order.indexOf('Für Garmin exportieren') < order.indexOf('Nochmal sichern')) problems.push(`Abschluss: Reihenfolge ${order.join(' | ')}`);
await shot('i04b-abschluss-garmin');
if (process.env.BROWSER !== 'webkit') {
  const [fitDl] = await Promise.all([page.waitForEvent('download', { timeout: 10000 }).catch(() => null), btn(page, 'Für Garmin exportieren').click()]);
  if (!fitDl || !/^training-\d{4}-\d{2}-\d{2}\.fit$/.test(fitDl.suggestedFilename())) problems.push(`Abschluss: Garmin-Export ${fitDl?.suggestedFilename() ?? 'ohne Download'}`);
}
await btn(page, 'Zur Übersicht').click();
const lastLine = await page.getByRole('region', { name: 'Nächste Einheit' }).textContent();
if (!lastLine.includes('Zuletzt: Einheit 1 – schwer, heute')) problems.push(`Heute: Zeile „Zuletzt“ fehlt (${lastLine})`);
const backup = await page.getByRole('region', { name: 'Backup' }).textContent();
if (!backup.includes('Alle Trainings gesichert')) problems.push(`Backup-Status nach Export: ${backup}`);

// Plan-Tab: Woche setzen, Export für Coach
await btn(page, 'Plan', true).click();
await btn(page, 'Woche vor').click();
if ((await page.locator('.week-num').textContent()) !== '2') problems.push('Woche nicht gesetzt');
await shot('i05-plan');
await btn(page, 'Export für Coach', true).click();
const [coach] = await Promise.all([page.waitForEvent('download'), page.locator('[data-fid="coach-share"]').click()]);
if (!/-coach\.md$/.test(coach.suggestedFilename())) problems.push(`Export für Coach: Dateiname ${coach.suggestedFilename()}`);
const coachPath = `${tmp}/${coach.suggestedFilename()}`;
await coach.saveAs(coachPath);
const coachText = readFileSync(coachPath, 'utf8');
if (!coachText.startsWith('# Training: Export für Coach') || !coachText.includes('## Log') || !coachText.includes('Trap Bar Jump')) problems.push('Export für Coach: Inhalt unerwartet');
if (/fileId|"revision"|doneAt/.test(coachText)) problems.push('Export für Coach enthält technische Felder');
await btn(page, 'Schließen', true).click();
await run.browser.close();

// Leerer Speicher: Wiederherstellung per Import
const run2 = await launch();
await run2.page.goto(BASE);
const [fc2] = await Promise.all([run2.page.waitForEvent('filechooser'), btn(run2.page, 'Plan öffnen').click()]);
await fc2.setFiles([exported]);
await run2.shot('i06-vorschau-restore');
const prev = await run2.page.locator('.sheet').textContent();
if (!prev.includes('1 Training (')) problems.push(`Vorschau ohne Trainingszahl: ${prev}`);
await btn(run2.page, 'Übernehmen').click();
await btn(run2.page, 'Verlauf', true).click();
await run2.shot('i07-verlauf-restore');
const tags = await run2.page.locator('.list-item .tag').allTextContents();
if (tags.join() !== 'gesichert') problems.push(`Wiederhergestellt: Status ${tags.join()}`);
// Gleiche Datei nochmal: nichts zu tun
await btn(run2.page, 'Plan', true).click();
const [fc3] = await Promise.all([run2.page.waitForEvent('filechooser'), btn(run2.page, 'Plan öffnen (Datei)').click()]);
await fc3.setFiles([exported]);
try { await run2.page.getByText('Entspricht dem gespeicherten Stand').waitFor({ timeout: 5000 }); } catch { problems.push('Gleicher Stand nicht erkannt'); }
await run2.shot('i08-gleicher-stand');
problems.push(...run2.problems);
run.external.push(...run2.external);
await run2.browser.close();

// Abgeschlossener Plan: Export, nächster Plan mit KI, erneut starten; danach neuer Plan mit Überschneidung in der Vorschau.
const done = JSON.parse(readFileSync(exported, 'utf8'));
const seedPlan = JSON.parse(seed);
let k = 0;
done.sessions = [];
for (let w = 1; w <= seedPlan.weeks; w++) {
  for (const ps of seedPlan.sessions) {
    k++;
    const day = `2026-01-${String(k).padStart(2, '0')}`;
    done.sessions.push({
      id: `00000000-0000-4000-8000-${String(k).padStart(12, '0')}`, date: day, sessionKey: ps.key, week: w,
      startedAt: `${day}T08:00:00.000Z`, endedAt: `${day}T09:00:00.000Z`,
      blocks: [{ exerciseId: 'back-squat', variantId: null, note: '', sets: [{ kg: 80, reps: 5, sec: null, done: true }] }],
    });
  }
}
done.revision += 1;
const run3 = await launch();
if (process.env.BROWSER !== 'webkit') await run3.ctx.grantPermissions(['clipboard-read', 'clipboard-write']);
await run3.page.goto(BASE);
const [fc4] = await Promise.all([run3.page.waitForEvent('filechooser'), btn(run3.page, 'Plan öffnen').click()]);
await fc4.setFiles([write('fertig.training.json', JSON.stringify(done))]);
await btn(run3.page, 'Übernehmen').click();
await run3.page.getByRole('heading', { name: 'Plan abgeschlossen' }).waitFor();
await run3.shot('i09-plan-abgeschlossen');
const doneBtns = await run3.page.locator('.card').first().getByRole('button').allTextContents();
if (doneBtns.join(' | ') !== 'Als Datei sichern | Nächsten Plan mit KI erstellen | Plan erneut starten') problems.push(`Plan abgeschlossen: Buttons ${doneBtns.join(' | ')}`);
await btn(run3.page, 'Nächsten Plan mit KI erstellen').click();
await run3.page.getByRole('dialog', { name: 'Nächsten Plan mit KI erstellen' }).waitFor();
await run3.shot('i10-naechster-plan');
const sheetW = await run3.page.evaluate(() => document.documentElement.scrollWidth);
if (sheetW > 375) problems.push(`KI-Sheet: horizontales Scrollen (${sheetW})`);
if (!(await run3.page.getByText('gehen dann ebenfalls an den Anbieter').count())) problems.push('KI-Sheet: Hinweis zu den Ergebnissen fehlt');
await btn(run3.page, 'Mit Plan und letzten Ergebnissen kopieren').click();
if (process.env.BROWSER !== 'webkit') {
  const clip = await run3.page.evaluate(() => navigator.clipboard.readText()).catch(() => '');
  if (!clip.includes('back-squat "Back Squat": 80 kg × 5 · 2026-01-12')) problems.push('Prompt: Ergebniszeile fehlt');
  if (!clip.includes('behält ihre id')) problems.push('Prompt: ID-Regeln fehlen');
}
await btn(run3.page, 'Schließen', true).click();
// Neuer Plan: Vorschau zeigt, wie er zur Historie passt (nicht bei „Ganz neu“).
await btn(run3.page, 'Plan', true).click();
const [fc5] = await Promise.all([run3.page.waitForEvent('filechooser'), btn(run3.page, 'Plan öffnen (Datei)').click()]);
await fc5.setFiles([write('plan.json', seed)]);
await run3.page.getByRole('heading', { name: 'Import prüfen' }).waitFor();
await run3.shot('i11-vorschau-ueberschneidung');
const ov = run3.page.locator('[data-fid="overlap-0"]');
if ((await ov.count()) !== 1 || (await ov.textContent()) !== '1 Übung mit Verlauf · 19 neu') problems.push(`Vorschau: Überschneidung ${(await ov.count()) ? await ov.textContent() : 'fehlt'}`);
await btn(run3.page, 'Ganz neu', true).click();
if (await ov.count()) problems.push('Vorschau: Überschneidung bei „Ganz neu“');
await btn(run3.page, 'Anpassen', true).click();
if (!(await ov.count())) problems.push('Vorschau: Überschneidung bei „Anpassen“ fehlt');
problems.push(...run3.problems);
run.external.push(...run3.external);
await run3.browser.close();
report('import', run);
