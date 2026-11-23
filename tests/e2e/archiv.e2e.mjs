// Version 2.0: Archiv. Eine ältere Trainingsdatei oder eine Plandatei nur lesend ansehen, mit Export für Coach und
// Garmin-Export. Die aktive Trainingsdatei bleibt unberührt, nichts wird gespeichert.
// Aufruf: node tests/e2e/archiv.e2e.mjs   (App muss lokal ausgeliefert werden, siehe README)

import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { launch, btn, BASE, PLAN_FIXTURE, openTestPlan } from './helpers.mjs';

const tmp = mkdtempSync(join(tmpdir(), 'archiv-'));
const write = (name, text) => { const p = join(tmp, name); writeFileSync(p, text); return p; };
const seed = readFileSync(PLAN_FIXTURE, 'utf8');
const plan = JSON.parse(seed);

// Ältere Trainingsdatei (Schema 2) mit Vorgänger und zwei Trainings.
const old = {
  schemaVersion: 2, fileId: '44444444-4444-4444-8444-444444444444', revision: 4, updatedAt: '2026-10-20T10:00:00.000Z',
  createdAt: '2026-09-01T08:00:00.000Z',
  previous: { fileId: '55555555-5555-4555-8555-555555555555', fileName: 'vorplan-2026-06-01.training.json', planName: 'Vorplan' },
  plan, settings: { theme: 'dark', view: 'list' }, progress: { currentWeek: 2, status: 'active' },
  sessions: [
    { id: '00000000-0000-4000-8000-000000000101', date: '2026-09-02', sessionKey: 'E1', week: 1, startedAt: '2026-09-02T08:00:00.000Z', endedAt: '2026-09-02T09:10:00.000Z', rpe: 6, note: 'Archiv-Notiz',
      blocks: [{ exerciseId: 'back-squat', name: 'Back Squat', variantId: null, note: '', rirLast: 2, sets: [{ kg: 80, reps: 5, sec: null, done: true }, { kg: 80, reps: 5, sec: null, done: true }] }] },
    { id: '00000000-0000-4000-8000-000000000102', date: '2026-09-05', sessionKey: 'E2', week: 1, startedAt: '2026-09-05T08:00:00.000Z', endedAt: '2026-09-05T09:00:00.000Z',
      blocks: [{ exerciseId: 'hip-thrust', name: 'Hip Thrust', variantId: null, note: '', sets: [{ kg: 60, reps: 8, sec: null, done: true }] }] },
  ],
};
const oldPath = write('alt-2026-09-01.training.json', JSON.stringify(old));

const { browser, page, problems, external, shot } = await launch();
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const storedFiles = () => page.evaluate(() => new Promise((resolve) => {
  const r = indexedDB.open('training-pwa');
  r.onsuccess = () => {
    const g = r.result.transaction('files', 'readonly').objectStore('files').getAll();
    g.onsuccess = () => { resolve(g.result.map((f) => ({ id: f.fileId, n: f.sessions.length, rev: f.revision }))); r.result.close(); };
  };
}));
const fits = async (label) => {
  const w = await page.evaluate(() => document.documentElement.scrollWidth);
  check(w <= 375, `${label}: horizontales Scrollen (${w})`);
};

// Ohne aktive Trainingsdatei: Archiv vom Start aus erreichbar, ohne Tabs
await page.goto(BASE);
await page.locator('[data-fid="empty-archive"]').click();
await page.getByRole('heading', { name: 'Archiv' }).waitFor();
check(await page.locator('nav.tabs').count() === 0, 'Archiv ohne Plan: Tabs sollten fehlen');
await page.locator('[data-fid="arch-start"]').click();
await page.getByRole('heading', { name: 'Hast du schon einen Plan?' }).waitFor();

await openTestPlan(page);
const before = await storedFiles();

await btn(page, 'Archiv', true).click();
check(await page.locator('nav.tabs button').count() === 4, 'Tab-Leiste: 4 Tabs erwartet');
await fits('Archiv leer');
const [fc] = await Promise.all([page.waitForEvent('filechooser'), page.locator('[data-fid="archive-open"]').click()]);
await fc.setFiles([oldPath]);
await page.getByRole('region', { name: 'Geöffnete Trainingsdatei' }).waitFor();
await shot('a01-archiv-trainingsdatei');
await fits('Archiv mit Trainingsdatei');
const card = await page.getByRole('region', { name: 'Geöffnete Trainingsdatei' }).textContent();
check(card.includes('alt-2026-09-01.training.json'), 'Archiv: Dateiname fehlt');
check(card.includes('2 Trainings'), `Archiv: Anzahl Trainings fehlt (${card})`);
check((await page.locator('[data-fid="archive-previous"]').textContent()).includes('Vorgänger: Vorplan (vorplan-2026-06-01.training.json)'), 'Archiv: Vorgänger fehlt');
check(await page.locator('.list-item').count() === 2, 'Archiv: 2 Trainings in der Liste erwartet');
check(await page.locator('.list-item .tag').count() === 0, 'Archiv: Sicherungs-Tags sollten fehlen');
check(await page.locator('.week-num').textContent() === '2', 'Archiv: Plan sollte die zuletzt aktuelle Woche zeigen');
await page.locator('[data-fid="archive-week-inc"]').click();
check(await page.locator('.week-num').textContent() === '3', 'Archiv: Woche vor wirkt nicht');

// Detail: nur lesen, Garmin-Export geht
await page.locator('.list-item').last().click();
const detail = await page.locator('#app').textContent();
check(detail.includes('RPE 6') && detail.includes('Notiz: Archiv-Notiz') && detail.includes('RIR nach dem letzten Satz: 2'), 'Archiv-Detail: RPE, Notiz oder RIR fehlen');
for (const fid of ['delete-session', 'hsnote', 'hrpe-edit', 'hrir-edit-0', 'hnote-0', 'hset-0-0']) {
  check(await page.locator(`[data-fid="${fid}"]`).count() === 0, `Archiv-Detail: ${fid} sollte fehlen (nur lesen)`);
}
check(!(await btn(page, 'Jetzt sichern').count()), 'Archiv-Detail: „Jetzt sichern“ sollte fehlen');
await shot('a02-archiv-detail');
const [fit] = await Promise.all([page.waitForEvent('download'), page.locator('[data-fid="garmin-export"]').click()]);
check(/\.fit$/.test(fit.suggestedFilename()), `Archiv: Garmin-Export ${fit.suggestedFilename()}`);
await page.locator('[data-fid="back"]').click();

// Export für Coach aus dem Archiv
await page.locator('[data-fid="archive-coach"]').click();
const [coach] = await Promise.all([page.waitForEvent('download'), page.locator('[data-fid="coach-share"]').click()]);
check(coach.suggestedFilename() === 'ganzkoerper-7-wochen-kraft-sprung-2026-09-01-4444-coach.md', `Archiv: Coach-Dateiname ${coach.suggestedFilename()}`);
const coachText = readFileSync(await coach.path(), 'utf8');
check(coachText.includes('Vorgänger: Vorplan') && coachText.includes('Back Squat  80×5, 80×5 @2'), 'Archiv: Inhalt des Coach-Exports unerwartet');
await btn(page, 'Schließen', true).click();

// Plandatei ansehen
const [fc2] = await Promise.all([page.waitForEvent('filechooser'), page.locator('[data-fid="archive-other"]').click()]);
await fc2.setFiles([write('plan.json', seed)]);
await page.getByRole('region', { name: 'Geöffnete Plandatei' }).waitFor();
check(await page.locator('[data-fid="archive-coach"]').count() === 0, 'Plandatei: kein Export für Coach erwartet');
check(await page.locator('details.plan-session').count() === plan.sessions.length, 'Plandatei: Einheiten fehlen');
await shot('a03-archiv-plandatei');

// Aktive Trainingsdatei unberührt, nichts gespeichert; nach Neuladen ist das Archiv leer
check(JSON.stringify(await storedFiles()) === JSON.stringify(before), `Browserspeicher verändert: ${JSON.stringify(await storedFiles())}`);
await page.locator('[data-fid="archive-close"]').click();
check(await page.locator('[data-fid="archive-open"]').count() === 1, 'Archiv schließen wirkt nicht');
const [fc3] = await Promise.all([page.waitForEvent('filechooser'), page.locator('[data-fid="archive-open"]').click()]);
await fc3.setFiles([oldPath]);
await page.getByRole('region', { name: 'Geöffnete Trainingsdatei' }).waitFor();
await page.reload();
await btn(page, 'Archiv', true).click();
check(await page.locator('[data-fid="archive-open"]').count() === 1, 'Nach dem Neuladen sollte das Archiv leer sein');
await btn(page, 'Heute', true).click();
check(await page.getByRole('region', { name: 'Nächste Einheit' }).count() === 1, 'Aktiver Plan nach dem Archiv nicht mehr da');

console.log(`[archiv] externe Requests: ${external.length ? external.join(', ') : 'keine'}`);
console.log(`[archiv] Probleme: ${problems.length ? `\n - ${problems.join('\n - ')}` : 'keine'}`);
await browser.close();
process.exitCode = problems.length || external.length ? 1 : 0;
