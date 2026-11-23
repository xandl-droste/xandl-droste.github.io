// Version 2.0: eine Trainingsdatei pro Durchgang. „Plan erneut starten“ und „Nachfolger“ legen eine neue Trainingsdatei
// mit Verweis an, vorher wird gesichert, danach liegt nur die aktive Trainingsdatei im Browser. Ältere Trainingsdateien
// im Browser werden beim Start entfernt (gesichert) bzw. zum Sichern angeboten (ungesichert).
// Aufruf: node tests/e2e/durchgang.e2e.mjs   (App muss lokal ausgeliefert werden, siehe README)

import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { launch, btn, BASE, PLAN_FIXTURE } from './helpers.mjs';

const tmp = mkdtempSync(join(tmpdir(), 'durchgang-'));
const write = (name, text) => { const p = join(tmp, name); writeFileSync(p, text); return p; };
const seed = readFileSync(PLAN_FIXTURE, 'utf8');
const plan = JSON.parse(seed);

// Abgeschlossener Durchgang (Schema 1, wie aus 1.x): jede Einheit jeder Woche einmal, Back Squat 80 × 5.
const uuid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const done = {
  schemaVersion: 1, fileId: '11111111-1111-4111-8111-111111111111', revision: 30, updatedAt: '2026-02-01T10:00:00.000Z',
  plan, settings: { theme: 'dark', view: 'list' }, progress: { currentWeek: 7, status: 'completed' }, sessions: [],
};
let k = 0;
for (let w = 1; w <= plan.weeks; w++) {
  for (const ps of plan.sessions) {
    k++;
    const day = `2026-01-${String(k).padStart(2, '0')}`;
    done.sessions.push({
      id: uuid(k), date: day, sessionKey: ps.key, week: w, startedAt: `${day}T08:00:00.000Z`, endedAt: `${day}T09:00:00.000Z`,
      blocks: [{ exerciseId: 'back-squat', variantId: null, note: '', sets: [{ kg: 80, reps: 5, sec: null, done: true }] }],
    });
  }
}

const { browser, page, problems, external, shot } = await launch();
const check = (ok, msg) => { if (!ok) problems.push(msg); };

/** Trainingsdateien im Browserspeicher (fileId, Planname). */
const storedFiles = () => page.evaluate(() => new Promise((resolve, reject) => {
  const r = indexedDB.open('training-pwa');
  r.onerror = () => reject(r.error);
  r.onsuccess = () => {
    const tx = r.result.transaction('files', 'readonly');
    const g = tx.objectStore('files').getAll();
    g.onsuccess = () => { resolve(g.result.map((f) => f.fileId)); r.result.close(); };
  };
}));
/** Legt eine weitere Trainingsdatei direkt im Browserspeicher ab (wie ein Rest aus 1.x), optional als gesichert. */
const injectFile = (file, exportedRevision) => page.evaluate(({ file, exportedRevision }) => new Promise((resolve, reject) => {
  const r = indexedDB.open('training-pwa');
  r.onerror = () => reject(r.error);
  r.onsuccess = () => {
    const tx = r.result.transaction(['files', 'kv'], 'readwrite');
    tx.objectStore('files').put(file);
    if (exportedRevision != null) tx.objectStore('kv').put({ revision: exportedRevision, at: new Date().toISOString(), method: 'share' }, `lastExport:${file.fileId}`);
    tx.oncomplete = () => { r.result.close(); resolve(); };
  };
}), { file, exportedRevision });

await page.goto(BASE);
const [fc] = await Promise.all([page.waitForEvent('filechooser'), btn(page, 'Plan öffnen', true).click()]);
await fc.setFiles([write('fertig.training.json', JSON.stringify(done))]);
await btn(page, 'Übernehmen', true).click();
await page.getByRole('heading', { name: 'Plan abgeschlossen' }).waitFor();

// 1. Plan erneut starten: neue Trainingsdatei mit Verweis. Die eben geöffnete Datei gilt als gesichert: kein „Erst sichern“.
await btn(page, 'Plan erneut starten').click();
await page.locator('[data-fid="restart-ok"]').click();
await page.getByRole('region', { name: 'Nächste Einheit' }).waitFor();
check(!(await page.getByRole('heading', { name: 'Erst sichern' }).count()), 'Gesicherte Datei: „Erst sichern“ sollte nicht kommen');
check((await page.getByRole('region', { name: 'Nächste Einheit' }).textContent()).includes('Woche 1 von 7'), 'Nach „Plan erneut starten“ nicht in Woche 1');
let ids = await storedFiles();
check(ids.length === 1 && ids[0] !== done.fileId, `Nach „Plan erneut starten“: Browser hält ${JSON.stringify(ids)}`);
await btn(page, 'Plan', true).click();
const prevLine = page.locator('[data-fid="previous"]');
check(await prevLine.count() === 1 && (await prevLine.textContent()).includes('ganzkoerper-7-wochen-kraft-sprung-1111.training.json'), `Plan-Tab: Vorgänger ${await prevLine.count() ? await prevLine.textContent() : 'fehlt'}`);
await shot('d02-vorgaenger');

// Startwerte: Back Squat ist im neuen Durchgang mit 80 kg vorbelegt.
await btn(page, 'Heute', true).click();
await btn(page, 'Training starten').click();
const squat = page.locator('section.card', { has: page.getByRole('heading', { name: 'Back Squat' }) });
check((await squat.locator('.val').first().textContent()).includes('80'), `Startwerte: Back Squat nicht mit 80 kg vorbelegt (${await squat.locator('.val').first().textContent()})`);
await page.locator('[data-fid="finish"]').click();
await page.getByRole('button', { name: 'Training verwerfen' }).click();
await page.getByRole('button', { name: /verwerfen/i }).last().click();
await page.getByRole('region', { name: 'Nächste Einheit' }).waitFor();
const firstId = (await storedFiles())[0];

// 2. Neuer Plan als Nachfolger. Eine ungesicherte Änderung (Woche vor) verlangt vorher „Erst sichern“.
await btn(page, 'Plan', true).click();
await btn(page, 'Woche vor').click();
const importSuccessor = async () => {
  const [fc2] = await Promise.all([page.waitForEvent('filechooser'), btn(page, 'Plan öffnen (Datei)').click()]);
  await fc2.setFiles([write('plan.json', seed)]);
  await page.getByRole('heading', { name: 'Import prüfen' }).waitFor();
  check(await btn(page, 'Von vorn', true).count() === 0, 'Import: „Von vorn“ gibt es noch');
  await btn(page, 'Nachfolger', true).click();
  await page.locator('[data-fid="import-ok"]').click();
  await page.getByRole('heading', { name: 'Erst sichern' }).waitFor();
};
await importSuccessor();
await shot('d01-erst-sichern');
await page.locator('[data-fid="backup-cancel"]').click();
check((await storedFiles())[0] === firstId, 'Abbrechen bei „Erst sichern“: Wechsel trotzdem passiert');
check((await page.locator('.week-num').textContent()) === '2', 'Abbrechen bei „Erst sichern“: Stand verändert');
await importSuccessor();
const [dl] = await Promise.all([page.waitForEvent('download'), page.locator('[data-fid="backup-first"]').click()]);
check(/-20\d\d-\d\d-\d\d-[0-9a-f]{4}\.training\.json$/.test(dl.suggestedFilename()), `Sicherung vor dem Wechsel: Dateiname ${dl.suggestedFilename()}`);
// Download statt Teilen-Menü: Die App fragt nach, bevor die bisherige Datei den Browser verlässt.
await page.getByRole('heading', { name: 'Datei gesichert?' }).waitFor();
check((await storedFiles())[0] === firstId, 'Vor der Bestätigung darf die bisherige Datei den Browser nicht verlassen');
await page.locator('[data-fid="download-ok"]').click();
await page.getByRole('heading', { name: 'Heute' }).waitFor();
ids = await storedFiles();
check(ids.length === 1 && ids[0] !== firstId, `Nach „Nachfolger“: Browser hält ${JSON.stringify(ids)}`);
await btn(page, 'Plan', true).click();
check(/-20\d\d-\d\d-\d\d-[0-9a-f]{4}\.training\.json/.test(await prevLine.textContent()), `Vorgänger mit Datum und Kennung im Dateinamen erwartet: ${await prevLine.textContent()}`);

// 3. Ältere Trainingsdateien beim Start: gesicherte verschwinden still, ungesicherte werden angeboten.
const old1 = { ...done, fileId: '22222222-2222-4222-8222-222222222222', revision: 5 };
const old2 = { ...done, fileId: '33333333-3333-4333-8333-333333333333', revision: 7, plan: { ...plan, name: 'Alter ungesicherter Plan' } };
await injectFile(old1, 5);
await injectFile(old2, null);
await page.reload();
await page.getByRole('heading', { name: 'Ältere Trainingsdateien im Browser' }).waitFor();
await shot('d04-aeltere-dateien');
const sheetText = await page.locator('.sheet').textContent();
check(sheetText.includes('Alter ungesicherter Plan'), 'Ältere Dateien: ungesicherte fehlt im Angebot');
check(!sheetText.includes(old1.plan.name) || sheetText.split(old1.plan.name).length - 1 <= 1, 'Ältere Dateien: gesicherte wird angeboten');
ids = await storedFiles();
check(!ids.includes(old1.fileId), 'Gesicherte ältere Datei nicht entfernt');
check(ids.includes(old2.fileId), 'Ungesicherte ältere Datei ohne Rückfrage entfernt');
await page.locator('[data-fid="other-later"]').click();
await page.reload();
await page.getByRole('heading', { name: 'Ältere Trainingsdateien im Browser' }).waitFor();
const [dl2] = await Promise.all([page.waitForEvent('download'), page.locator(`[data-fid="other-save-${old2.fileId.slice(0, 8)}"]`).click()]);
check(dl2.suggestedFilename() === 'alter-ungesicherter-plan-3333.training.json', `Ältere Datei sichern: Dateiname ${dl2.suggestedFilename()}`);
await page.locator('[data-fid="download-ok"]').click();
await page.waitForTimeout(300);
ids = await storedFiles();
check(ids.length === 1 && !ids.includes(old2.fileId), `Nach dem Sichern der älteren Datei: Browser hält ${JSON.stringify(ids)}`);

// 4. Veraltetes zweites Fenster (Review r4 Security M1): Fenster B ändert und speichert, Fenster A (alter Stand) wechselt.
// Der Wechsel darf die Änderung aus B nicht löschen: A meldet „neu laden“, im Browser bleibt B's Stand.
const pageB = await page.context().newPage();
await pageB.goto(BASE);
await pageB.getByRole('heading', { name: 'Heute' }).waitFor();
await page.reload();
await page.getByRole('heading', { name: 'Heute' }).waitFor();
const activeBefore = (await storedFiles())[0];
await pageB.getByRole('button', { name: 'Plan', exact: true }).click();
await pageB.getByRole('button', { name: 'Woche vor' }).click(); // B: neue Revision, nicht gesichert
await pageB.waitForTimeout(300);
const revB = await page.evaluate((id) => new Promise((resolve) => {
  const r = indexedDB.open('training-pwa');
  r.onsuccess = () => { const g = r.result.transaction('files').objectStore('files').get(id); g.onsuccess = () => { resolve(g.result.revision); r.result.close(); }; };
}), activeBefore);
// A sieht den alten Stand (gilt als gesichert, kein „Erst sichern“) und öffnet einen Plan mit „Ganz neu“.
await btn(page, 'Plan', true).click();
const [fcStale] = await Promise.all([page.waitForEvent('filechooser'), btn(page, 'Plan öffnen (Datei)').click()]);
await fcStale.setFiles([write('plan.json', seed)]);
await btn(page, 'Ganz neu', true).click();
await page.locator('[data-fid="import-ok"]').click();
await page.waitForTimeout(500);
ids = await storedFiles();
check(ids.length === 1 && ids[0] === activeBefore, `Veraltetes Fenster: bisherige Datei wurde ersetzt (${JSON.stringify(ids)})`);
const revAfter = await page.evaluate((id) => new Promise((resolve) => {
  const r = indexedDB.open('training-pwa');
  r.onsuccess = () => { const g = r.result.transaction('files').objectStore('files').get(id); g.onsuccess = () => { resolve(g.result?.revision ?? null); r.result.close(); }; };
}), activeBefore);
check(revAfter === revB, `Veraltetes Fenster: Änderung aus dem anderen Fenster verloren (${revAfter} statt ${revB})`);
check(await page.getByText(/anderen Fenster/).count() > 0, 'Veraltetes Fenster: Hinweis „in einem anderen Fenster neuer gespeichert“ fehlt');
await pageB.close();
// Erwartet: Das veraltete Fenster protokolliert den StaleError in der Konsole. Das ist hier kein Problem.
for (let k = problems.length - 1; k >= 0; k--) if (/StaleError/.test(problems[k])) problems.splice(k, 1);

console.log(`[durchgang] externe Requests: ${external.length ? external.join(', ') : 'keine'}`);
console.log(`[durchgang] Probleme: ${problems.length ? `\n - ${problems.join('\n - ')}` : 'keine'}`);
await browser.close();
process.exitCode = problems.length || external.length ? 1 : 0;
