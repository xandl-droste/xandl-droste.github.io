// Gemeinsame Hilfen für die Browser-Prüfungen (Playwright, nicht Teil von `npm test`).
// Aufruf: node tests/e2e/<name>.e2e.mjs   (App muss lokal ausgeliefert werden, siehe README)
// Umgebungsvariablen:
//   BASE_URL           Adresse der App, Standard http://127.0.0.1:8765/training/
//   PLAYWRIGHT_MODULE  Pfad/Name des Playwright-Pakets, Standard "playwright"
//   BROWSER            chromium (Standard) oder webkit
//   CHROME_PATH        optional: eigener Chrome statt des Playwright-Chromiums
//   SHOTS              Ordner für Screenshots, Standard test-results/shots

import { mkdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/** Testplan (liegt nur im Repo, wird nicht ausgeliefert). */
export const PLAN_FIXTURE = fileURLToPath(new URL('../fixtures/beispielplan.plan.json', import.meta.url));

/** Namen der Körpergewicht-Übungen im Testplan (dort gibt es keinen Gewichts-Stepper). */
const BODYWEIGHT = new Set(JSON.parse(readFileSync(PLAN_FIXTURE, 'utf8')).sessions
  .flatMap((ps) => ps.blocks.flatMap((b) => b.exercises)).filter((ex) => ex.unit === 'bodyweight').map((ex) => ex.name));

export const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:8765/training/';
export const SHOTS = process.env.SHOTS ?? 'test-results/shots';
mkdirSync(SHOTS, { recursive: true });

export async function launch({ width = 375, height = 630, colorScheme = 'dark', offline = false, args = [] } = {}) {
  const mod = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
  const pw = mod.default ?? mod;
  const type = process.env.BROWSER === 'webkit' ? pw.webkit : pw.chromium;
  const opts = type === pw.chromium ? { args: [...args, ...(process.env.CHROME_PATH ? ['--no-sandbox'] : [])] } : {};
  if (process.env.CHROME_PATH && type === pw.chromium) opts.executablePath = process.env.CHROME_PATH;
  const browser = await type.launch(opts);
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 2, isMobile: type === pw.chromium, hasTouch: true, colorScheme, locale: 'de-AT', offline });
  const page = await ctx.newPage();
  const problems = [];
  const external = [];
  const origin = new URL(BASE).origin;
  page.on('request', (r) => { const u = r.url(); if (!u.startsWith(origin) && !u.startsWith('data:') && !u.startsWith('blob:')) external.push(u); });
  page.on('pageerror', (e) => problems.push(`JS-Fehler: ${e}`));
  page.on('console', (m) => { if (m.type() === 'error') problems.push(`Konsole: ${m.text()}`); });
  const shot = (name) => page.screenshot({ path: `${SHOTS}/${name}.png` });
  return { browser, ctx, page, problems, external, shot };
}

export const btn = (page, name, exact = false) => page.getByRole('button', { name, exact });

/** Öffnet den Testplan im Onboarding über „Plan öffnen“ und übernimmt ihn. */
export async function openTestPlan(page) {
  const [fc] = await Promise.all([page.waitForEvent('filechooser'), btn(page, 'Plan öffnen', true).click()]);
  await fc.setFiles(PLAN_FIXTURE);
  await btn(page, 'Übernehmen', true).click();
  await btn(page, 'Training starten').waitFor();
}

export async function setFocusView(page, view = 'Fokus') {
  await btn(page, 'Menü').click();
  await btn(page, view, true).click();
  await btn(page, 'Schließen', true).click();
}

/** Ein komplettes Training im Fokus-Modus durchklicken. Prüft dabei, dass nichts scrollt. */
export async function runFocusSession(page, { label, chooseKey, kg = '50', problems, shot }) {
  if (chooseKey) {
    await btn(page, 'Andere Einheit wählen').click();
    await btn(page, chooseKey, true).click();
  } else {
    await btn(page, 'Training starten').click();
  }
  await btn(page, 'Beenden', true).waitFor();
  let n = 0;
  while (await btn(page, 'Satz fertig').count()) {
    const kgIn = page.getByRole('textbox', { name: /gewicht in kg/i });
    if (await kgIn.count()) {
      if (!(await kgIn.inputValue())) { await kgIn.fill(kg); await kgIn.press('Enter'); }
    }
    const m = await page.evaluate(() => ({
      h: document.documentElement.scrollHeight, vh: innerHeight,
      name: document.querySelector('.focus-name')?.textContent,
      inc: !!document.querySelector('[data-fid^="inc-"]'), chips: !!document.querySelector('.chips'),
      kgStepper: !!document.querySelector('.stp-multi'),
    }));
    if (m.kgStepper && BODYWEIGHT.has(m.name?.split(' · ')[0])) problems.push(`${label}: Gewichts-Stepper bei Körpergewicht-Übung ${m.name}`);
    if (m.h > m.vh + 1) problems.push(`${label}: Fokus scrollt bei ${m.name} (${m.h} > ${m.vh})`);
    if (shot && (m.inc || m.chips)) await shot(`${label}-${n}`);
    const before = await page.locator('.live-meta .mut').textContent();
    await btn(page, 'Satz fertig').click();
    // Doppeltipp-Sperre: ein zweiter Tap innerhalb von 600 ms zählt nicht. Daher auf den Fortschritt warten.
    await page.waitForFunction((t) => document.querySelector('.live-meta .mut')?.textContent !== t, before, { timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(620);
    n++;
  }
  if (!(await page.locator('.rest').getByRole('button', { name: 'Training abschließen' }).count())) problems.push(`${label}: kein „Abschließen“ im Timer nach dem letzten Satz`);
  if (await page.locator('[data-fid="all-done"] button').count()) problems.push(`${label}: Karte „Alle Sätze erledigt“ hat einen eigenen Knopf (doppelt zur Leiste)`);
  await page.locator('.rest').getByRole('button', { name: 'Training abschließen' }).click();
  await btn(page, 'Beenden und speichern').click();
  await btn(page, 'Zur Übersicht').click();
  return n;
}

export function report(name, { problems, external }) {
  console.log(`\n[${name}] externe Requests: ${external.length ? external.join(', ') : 'keine'}`);
  console.log(`[${name}] Probleme: ${problems.length ? '\n  - ' + problems.join('\n  - ') : 'keine'}`);
  if (problems.length || external.length) process.exitCode = 1;
}
