// Offline: nach dem ersten Laden funktioniert die App im Flugmodus (Service Worker).
import { launch, btn, report, BASE, openTestPlan } from './helpers.mjs';

const run = await launch();
const { page, ctx, problems, shot } = run;
await page.goto(BASE);
await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
const cached = await page.evaluate(async () => (await caches.keys()).filter((k) => k.startsWith('training-pwa-')).length);
if (cached !== 1) problems.push(`Cache-Anzahl ${cached}`);

await ctx.setOffline(true);
await page.reload();
await openTestPlan(page);
await btn(page, 'Training starten').click();
await btn(page, /Trap Bar Jump, Satz 1 abschließen/).click();
await btn(page, 'Beenden', true).click();
await btn(page, 'Beenden und speichern').click();
await page.getByRole('heading', { name: 'Training abgeschlossen' }).waitFor();
await shot('o01-offline-fertig');
const controlled = await page.evaluate(() => Boolean(navigator.serviceWorker.controller));
if (!controlled) problems.push('Seite nicht vom Service Worker gesteuert');
await ctx.setOffline(false);
// Fehler durch das Offline-Schalten selbst (z. B. sw.js-Update) sind erwartbar und werden ignoriert.
run.problems.splice(0, run.problems.length, ...problems.filter((p) => !/sw\.js|ERR_INTERNET_DISCONNECTED/.test(p)));
report('offline', run);
await run.browser.close();
