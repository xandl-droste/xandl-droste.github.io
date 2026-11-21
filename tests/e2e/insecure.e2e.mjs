// Unsicherer Kontext (z. B. im WLAN über http://<IP> geöffnet): ohne crypto.randomUUID, Service Worker und Teilen.
// Plan öffnen, trainieren und sichern müssen trotzdem gehen. Nur Chromium: Ein Fantasie-Hostname wird lokal auf die
// Adresse aus BASE_URL umgeleitet, damit die Seite nicht als localhost (sicher) gilt.
import { launch, btn, report, BASE, openTestPlan } from './helpers.mjs';

if (process.env.BROWSER === 'webkit') {
  console.log('[insecure] übersprungen (nur Chromium)');
  process.exit(0);
}
const base = new URL(BASE);
const run = await launch({ args: [`--host-resolver-rules=MAP app.test ${base.hostname}`] });
const { page, problems } = run;
base.hostname = 'app.test';
await page.goto(base.href);
if (await page.evaluate(() => window.isSecureContext)) problems.push('Testaufbau: Seite gilt als sicher');
if (!(await page.locator('.toast').textContent()).includes('Ohne https')) problems.push('Kein Hinweis auf den unsicheren Kontext');
await openTestPlan(page);
await btn(page, 'Training starten').click();
await btn(page, /Trap Bar Jump, Satz 1 abschließen/).click();
await btn(page, 'Beenden', true).click();
await btn(page, 'Beenden und speichern').click();
const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 10000 }).catch(() => null), btn(page, 'Als Datei sichern').click()]);
if (!dl) problems.push('Export ohne Teilen-Menü: kein Download');
// Externe Requests zählt helpers über die Origin aus BASE_URL. Hier ist der Host app.test, daher nicht auswerten.
report('insecure', { problems, external: [] });
await run.browser.close();
