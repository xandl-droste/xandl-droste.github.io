// Info-Seite: erreichbar aus Onboarding, allen Tabs und dem Menü; Betreiberangaben aus legal.js; Zurück; Touch-Ziele.
import { launch, btn, report, BASE, openTestPlan } from './helpers.mjs';
import { NAME, WOHNORT, KONTAKT_MAIL } from '../../training/src/legal.js';
import { APP_VERSION } from '../../training/src/version.js';

const run = await launch();
const { page, problems, shot } = run;
const check = async (where) => {
  try { await btn(page, 'Impressum & Datenschutz', true).waitFor({ timeout: 5000 }); } catch { problems.push(`Kein Info-Link: ${where}`); }
};
async function openAndBack(where) {
  await btn(page, 'Impressum & Datenschutz', true).click();
  await page.getByRole('heading', { name: 'Info, Impressum & Datenschutz' }).waitFor();
  const text = await page.locator('#app').textContent();
  for (const t of [`${NAME}, ${WOHNORT}, Österreich`, KONTAKT_MAIL, '§ 25 MedienG', 'keine medizinische oder therapeutische Beratung', 'Open-Source-Komponenten', `Version ${APP_VERSION}`]) {
    if (!text.includes(t)) problems.push(`Info-Seite (${where}): "${t}" fehlt`);
  }
  const small = await page.evaluate(() => [...document.querySelectorAll('#app button, #app a')].filter((e) => e.getBoundingClientRect().height < 48).map((e) => e.textContent));
  if (small.length) problems.push(`Info-Seite: Touch-Ziele < 48 px: ${small.join(', ')}`);
  await btn(page, '‹ Zurück').click();
}

await page.goto(BASE);
await check('Onboarding');
await openAndBack('Onboarding');
await shot('n01-onboarding');
await openTestPlan(page);
for (const tab of ['Heute', 'Verlauf', 'Plan']) {
  await btn(page, tab, true).click();
  await check(tab);
}
await openAndBack('Plan');
if (!(await page.getByRole('heading', { name: 'Plan', exact: true }).count())) problems.push('Zurück führt nicht zum Plan-Tab');
await btn(page, 'Menü').click();
await btn(page, 'Info, Impressum & Datenschutz').click();
await page.getByRole('heading', { name: 'Info, Impressum & Datenschutz' }).waitFor();
await shot('n02-info');
await page.goto(`${BASE}#info`);
await page.getByRole('heading', { name: 'Info, Impressum & Datenschutz' }).waitFor();
await page.goto(new URL('../', BASE).href);
await shot('n03-startseite');
if (!(await page.getByRole('link', { name: 'Training' }).count())) problems.push('Startseite ohne Link zur App');
report('info', run);
await run.browser.close();
