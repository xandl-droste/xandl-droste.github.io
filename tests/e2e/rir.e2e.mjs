// Version 2.0: Hauptübungen, RIR nach dem letzten Satz, RPE und Notiz beim Abschluss, Anzeige und Korrektur im Verlauf.
// Aufruf: node tests/e2e/rir.e2e.mjs   (App muss lokal ausgeliefert werden, siehe README)

import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { launch, btn, BASE, PLAN_FIXTURE, setFocusView } from './helpers.mjs';

// Testplan mit Hauptübungen: Back Squat und RDL (Einheit 1).
const raw = JSON.parse(readFileSync(PLAN_FIXTURE, 'utf8'));
for (const ps of raw.sessions) for (const b of ps.blocks) for (const ex of b.exercises) if (['back-squat', 'romanian-deadlift'].includes(ex.id)) ex.main = true;
const planPath = join(mkdtempSync(join(tmpdir(), 'rir-')), 'haupt.plan.json');
writeFileSync(planPath, JSON.stringify(raw));

const { browser, page, problems, external, shot } = await launch();
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const fits = async (label) => {
  const m = await page.evaluate(() => ({ h: document.documentElement.scrollHeight, vh: innerHeight, w: document.documentElement.scrollWidth }));
  check(m.h <= m.vh + 1, `${label}: scrollt (${m.h} > ${m.vh})`);
  check(m.w <= 375, `${label}: horizontales Scrollen (${m.w})`);
};

await page.goto(BASE);
const [fc] = await Promise.all([page.waitForEvent('filechooser'), btn(page, 'Plan öffnen', true).click()]);
await fc.setFiles(planPath);
await btn(page, 'Übernehmen', true).click();
await btn(page, 'Training starten').waitFor();

// Plan-Tab: Tag „Haupt“ bei den Hauptübungen
await page.getByRole('button', { name: 'Plan', exact: true }).click();
await page.locator('details.plan-session').first().locator('summary').click();
check(await page.locator('details.plan-session').first().locator('.tag.main').count() === 2, 'Plan-Tab: zwei Tags „Haupt“ in Einheit 1 erwartet');
await page.getByRole('button', { name: 'Heute', exact: true }).click();

await setFocusView(page, 'Fokus');
await btn(page, 'Training starten').click();
await btn(page, 'Beenden', true).waitFor();

let sawSquatBar = false;
let guard = 0;
while (await btn(page, 'Satz fertig').count()) {
  if (++guard > 60) { problems.push('Abbruch: zu viele Sätze'); break; }
  const kgIn = page.getByRole('textbox', { name: /gewicht in kg/i });
  if (await kgIn.count() && !(await kgIn.inputValue())) { await kgIn.fill('50'); await kgIn.press('Enter'); }
  const name = await page.locator('.focus-name').textContent();
  const isMain = await page.locator('.focus-head .tag.main').count();
  check(Boolean(isMain) === /Back Squat|RDL|Romanian/i.test(name), `Fokus: Tag „Haupt“ bei ${name} falsch`);
  await btn(page, 'Satz fertig').click();
  await page.waitForTimeout(650); // Doppeltipp-Sperre
  const bar = page.locator('[data-fid="rir-bar"]');
  if (await bar.count()) {
    const label = await bar.locator('.rir-chips').getAttribute('aria-label');
    if (/Back Squat/.test(label) && !sawSquatBar) {
      sawSquatBar = true;
      await fits('Fokus mit RIR in der Pausenleiste');
      await shot('rir-pausenleiste-fokus');
      const sizes = await bar.locator('button').evaluateAll((els) => els.map((e) => { const r = e.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; }));
      check(sizes.length === 5, `RIR-Chips: 5 erwartet, ${sizes.length}`);
      check(sizes.every(([w, hh]) => w >= 36 && hh >= 40), `RIR-Chips zu klein: ${JSON.stringify(sizes)}`);
      check((await bar.textContent()).includes('Ziel 3'), 'RIR-Leiste: Ziel 3 fehlt');
      await bar.getByRole('button', { name: /^2 Wiederholungen/ }).click();
      check(await bar.getByRole('button', { name: /^2 Wiederholungen/ }).getAttribute('aria-pressed') === 'true', 'RIR 2 nicht gewählt');
      // Nicht beantwortet bleibt auch gültig: beim RDL wird hier nichts getippt.
    }
  }
}
check(sawSquatBar, 'RIR-Chips in der Pausenleiste nach dem letzten Back-Squat-Satz nicht gesehen');

// Nach dem letzten Satz: RIR-Frage zur zuletzt beendeten Hauptübung im Fokus (RDL war unbeantwortet)
await page.waitForTimeout(300);
const panel = page.locator('.rir-panel');
check(await panel.count() === 1, `Fokus nach dem letzten Satz: eine RIR-Frage erwartet, ${await panel.count()}`);
if (await panel.count()) {
  await shot('rir-fokus-ende');
  await panel.getByRole('button', { name: /^4\+/ }).click();
}

// Abschluss mit RPE und Notiz
await btn(page, 'Training abschließen').click();
const rpe = page.locator('[data-fid="rpe"]');
const rpeShown = async () => (await page.locator('.rpe-value').textContent()).trim();
check(await rpe.getAttribute('aria-valuetext') === 'keine Angabe' && await rpeShown() === '–', 'RPE: startet nicht ohne Wert');
// Tippen auf die Stelle der 7 (Mitte des Griffs liegt 22 px vom Rand)
const tapRpe = async (v) => {
  const box = await page.locator('[data-fid="rpe"]').boundingBox();
  await page.mouse.click(box.x + 22 + ((box.width - 44) * v) / 10, box.y + box.height / 2);
};
await tapRpe(7);
check(await rpeShown() === '7 · sehr schwer', `RPE nach Tipp auf 7: ${await rpeShown()}`);
check(await page.locator('[data-fid="rpe"]').getAttribute('aria-valuetext') === '7 · sehr schwer', 'RPE: aria-valuetext nach Tipp falsch');
await page.locator('[data-fid="rpe-reset"]').click();
check(await rpeShown() === '–', 'RPE: Zurücksetzen wirkt nicht');
await tapRpe(5);
check(await rpeShown() === '5 · schwer', `RPE: Tipp auf die Grundstellung 5 setzt keinen Wert (${await rpeShown()})`);
await page.locator('[data-fid="rpe"]').fill('7');
check(await rpeShown() === '7 · sehr schwer', `RPE nach Ziehen auf 7: ${await rpeShown()}`);
await page.locator('#finish-note').fill('Schlecht geschlafen');
await fits('Dialog Training beenden');
await shot('rpe-dialog');
await page.locator('[data-fid="finish-save"]').click();
await page.getByRole('heading', { name: 'Training abgeschlossen' }).waitFor();
await btn(page, 'Zur Übersicht', true).click();

// Verlauf: RPE, Notiz, RIR und Korrektur
await page.getByRole('button', { name: 'Verlauf', exact: true }).click();
check((await page.locator('.list-item').first().textContent()).includes('RPE 7'), 'Verlauf-Liste: RPE 7 fehlt');
await page.locator('.list-item').first().click();
const detail = async () => page.locator('#app').textContent();
let text = await detail();
check(text.includes('RPE 7'), 'Detail: RPE 7 fehlt');
check(text.includes('Notiz: Schlecht geschlafen'), 'Detail: Notiz zum Training fehlt');
check(text.includes('RIR nach dem letzten Satz: 2 (Ziel 3)'), 'Detail: RIR 2 (Ziel 3) bei Back Squat fehlt');
check(text.includes('RIR nach dem letzten Satz: 4+ (Ziel 3)'), 'Detail: RIR 4+ beim RDL fehlt');
await shot('verlauf-detail-rir');
const squatCard = page.locator('section.card', { has: page.getByRole('heading', { name: 'Back Squat' }) });
await squatCard.getByRole('button', { name: /RIR Back Squat ändern/ }).click();
await page.locator('[data-fid="hrir-1"]').click();
await btn(page, 'Fertig', true).click();
text = await detail();
check(text.includes('RIR nach dem letzten Satz: 1 (Ziel 3)'), 'Korrektur RIR auf 1 nicht übernommen');
await page.locator('[data-fid="hrpe-edit"]').click();
await page.locator('[data-fid="hrpe"]').fill('8');
await btn(page, 'Fertig', true).click();
check((await detail()).includes('RPE 8'), 'Korrektur RPE auf 8 nicht übernommen');

// Nach einem Neuladen bleibt alles erhalten
await page.reload();
await page.getByRole('button', { name: 'Verlauf', exact: true }).click();
await page.locator('.list-item').first().click();
text = await detail();
check(text.includes('RPE 8') && text.includes('RIR nach dem letzten Satz: 1 (Ziel 3)') && text.includes('Notiz: Schlecht geschlafen'), 'Nach dem Neuladen fehlen RPE, RIR oder Notiz');

// Liste (Review r4 iOS M-1/M-3): Frage in der Karte direkt nach dem letzten Satz, kein Sprung am Pausenende,
// Leiste behält „Als Nächstes“; beantwortet nur noch eine Zeile.
await btn(page, 'Heute', true).click();
await setFocusView(page, 'Liste');
const startE1 = async () => {
  await btn(page, 'Andere Einheit wählen').click();
  await page.getByRole('button', { name: /^Einheit 1/ }).click();
  await btn(page, 'Beenden', true).waitFor();
};
await startE1();
const squatCardL = () => page.locator('section.card', { has: page.getByRole('heading', { name: 'Back Squat' }) });
for (let k = 0; k < 40; k++) {
  const chk = squatCardL().locator('button.chk:not(.done)').first();
  if (!(await chk.count())) break;
  await chk.click();
  await page.waitForTimeout(650);
}
check(await squatCardL().locator('.rir-panel').count() === 1, 'Liste: RIR-Frage nicht direkt nach dem letzten Satz in der Karte');
check(await page.locator('[data-fid="rir-bar"]').count() === 0, 'Liste: RIR-Chips sollten nicht in der Leiste stehen');
// In den ersten 10 s steht dort der Rückgängig-Hinweis („… erledigt“), danach „Als Nächstes“.
const nextText = await page.locator('.rest .next').textContent();
check(/^Als Nächstes|erledigt$/.test(nextText), `Liste: Leiste zeigt „${nextText}“ statt „Als Nächstes“`);
const actY = async () => (await page.locator('.row.act, .ss-cell.act').first().boundingBox())?.y ?? null;
const before = await actY();
await page.locator('[data-fid="rest-skip"]').click();
await page.waitForTimeout(300);
const after = await actY();
check(before != null && after != null && Math.abs(after - before) < 2, `Liste: aktueller Satz springt am Pausenende (${before} → ${after})`);
await squatCardL().getByRole('button', { name: /^1 Wiederholung/ }).click();
check(await squatCardL().locator('details.rir-done').count() === 1, 'Liste: beantworteter RIR sollte nur eine Zeile sein');
await shot('rir-liste-karte');
await page.locator('[data-fid="finish"]').click();
await page.getByRole('button', { name: 'Training verwerfen' }).click();
await page.getByRole('button', { name: /verwerfen/i }).last().click();

// Fokus (Review r4 iOS M-2): mindestens 8 px zwischen den RIR-Chips und „Rückgängig“/„Weiter“.
await setFocusView(page, 'Fokus');
await startE1();
for (let k = 0; k < 40; k++) {
  if (await page.locator('[data-fid="rir-bar"]').count()) break;
  await btn(page, 'Satz fertig').click();
  await page.waitForTimeout(650);
}
const gap = await page.evaluate(() => {
  const chips = document.querySelector('[data-fid="rir-bar"] .rir-chips')?.getBoundingClientRect();
  const btns = [...document.querySelectorAll('.rest > .btn')].map((b) => b.getBoundingClientRect());
  return chips && btns.length ? Math.min(...btns.map((r) => chips.top - r.bottom)) : null;
});
check(gap != null && gap >= 8, `Fokus: Abstand RIR-Chips zu den Knöpfen der Leiste ${gap} px`);
check((await page.locator('[data-fid="rir-bar"]').textContent()).includes('Back Squat'), 'Fokus: Leiste nennt die Übung nicht');
await fits('Fokus mit RIR (neue Leiste)');
await page.locator('[data-fid="finish"]').click();
await page.getByRole('button', { name: 'Training verwerfen' }).click();
await page.getByRole('button', { name: /verwerfen/i }).last().click();

// Seitenzoom ca. 150 % (Review r4 iOS M-5): 250 px breit, kein waagrechtes Scrollen mit vier Tabs.
await page.setViewportSize({ width: 250, height: 500 });
for (const tab of ['Heute', 'Verlauf', 'Plan', 'Archiv']) {
  await page.getByRole('button', { name: tab, exact: true }).click();
  const w = await page.evaluate(() => document.documentElement.scrollWidth);
  check(w <= 250, `250 px: ${tab} scrollt waagrecht (${w})`);
}

console.log(`[rir] externe Requests: ${external.length ? external.join(', ') : 'keine'}`);
console.log(`[rir] Probleme: ${problems.length ? `\n - ${problems.join('\n - ')}` : 'keine'}`);
await browser.close();
process.exitCode = problems.length || external.length ? 1 : 0;
