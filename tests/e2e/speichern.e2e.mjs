// Speichern unter Wettlauf und mit zwei offenen Instanzen (Review Runde 3: Code H1, Security M1).
import { launch, btn, openTestPlan, report, BASE } from './helpers.mjs';

const idb = (page) => page.evaluate(() => new Promise((res) => {
  const r = indexedDB.open('training-pwa');
  r.onsuccess = () => {
    const db = r.result;
    const tx = db.transaction(['files', 'kv']);
    const out = {};
    tx.objectStore('kv').get('live').onsuccess = (e) => { out.live = e.target.result?.session?.id ?? null; };
    tx.objectStore('files').getAll().onsuccess = (e) => { out.sessions = e.target.result[0]?.sessions.length ?? 0; };
    tx.oncomplete = () => { db.close(); res(out); };
  };
}));

async function finishOneSet(page, hiddenAfterMs = null) {
  await btn(page, 'Training starten').click();
  await btn(page, /Satz 1 abschließen/).first().click();
  await page.waitForTimeout(700);
  await btn(page, 'Beenden', true).click();
  if (hiddenAfterMs == null) return btn(page, 'Beenden und speichern').click();
  // App verlassen wenige Millisekunden nach „Beenden und speichern“.
  await page.evaluate((d) => {
    document.querySelector('[data-fid="finish-save"]')?.click();
    setTimeout(() => {
      Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    }, d);
  }, hiddenAfterMs);
}

const all = { problems: [], external: [] };

for (const delay of [0, 3]) {
  const { browser, page, problems, external } = await launch();
  await page.goto(BASE);
  await openTestPlan(page);
  await finishOneSet(page, delay);
  await page.waitForTimeout(500);
  const s = await idb(page);
  await page.evaluate(() => { delete document.visibilityState; });
  await page.reload();
  await btn(page, 'Menü').waitFor();
  if (s.live) problems.push(`Verlassen nach ${delay} ms: beendetes Training liegt wieder als laufend im Speicher`);
  if (s.sessions !== 1) problems.push(`Verlassen nach ${delay} ms: ${s.sessions} statt 1 Training gespeichert`);
  if (await btn(page, 'Beenden', true).count()) problems.push(`Verlassen nach ${delay} ms: nach dem Neuladen läuft das Training wieder`);
  all.problems.push(...problems); all.external.push(...external);
  await browser.close();
}

{
  const { browser, ctx, page: a, problems, external } = await launch();
  await a.goto(BASE);
  await openTestPlan(a);
  const b = await ctx.newPage();
  await b.goto(BASE);
  await btn(b, 'Training starten').waitFor();
  await finishOneSet(a);
  await a.waitForTimeout(500);
  await btn(b, 'Menü').click();
  await btn(b, 'Fancy', true).click();
  await b.waitForTimeout(500);
  if ((await idb(a)).sessions !== 1) problems.push('Zwei Fenster: das ältere Fenster hat das beendete Training überschrieben');
  if (!(await b.getByRole('button', { name: 'Neu laden' }).count())) problems.push('Zwei Fenster: kein Hinweis „Neu laden“ im älteren Fenster');
  all.problems.push(...problems.filter((p) => !p.includes('StaleError'))); all.external.push(...external);
  await browser.close();
}

report('speichern', all);
