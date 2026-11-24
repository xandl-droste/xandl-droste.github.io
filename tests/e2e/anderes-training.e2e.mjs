// Version 3.0: anderes Training (z. B. Beachvolleyball) eintragen. Sheet im Heute-Tab und im Verlauf,
// Vorschläge aus bisherigen Trainingsarten, Fehlermeldungen, Speichern im Browserspeicher.
// Aufruf: node tests/e2e/anderes-training.e2e.mjs   (App muss lokal ausgeliefert werden, siehe README)

import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { launch, btn, BASE, openTestPlan, setFocusView } from './helpers.mjs';

const { browser, page, problems, external, shot } = await launch();
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const stored = () => page.evaluate(() => new Promise((resolve) => {
  const r = indexedDB.open('training-pwa');
  r.onsuccess = () => {
    const g = r.result.transaction('files', 'readonly').objectStore('files').getAll();
    g.onsuccess = () => { resolve(g.result[0]); r.result.close(); };
  };
}));
const fits = async (label) => {
  const w = await page.evaluate(() => document.documentElement.scrollWidth);
  check(w <= 375, `${label}: horizontales Scrollen (${w})`);
};

await page.goto(BASE);
await openTestPlan(page);

// Heute-Tab: Button sichtbar, Sheet öffnen
await page.locator('[data-fid="activity-add"]').click();
await page.getByRole('dialog', { name: 'Anderes Training eintragen' }).waitFor();
await fits('Sheet leer');
await shot('anderes-training-leer');

// Ohne Trainingsart: Fehlermeldung, nichts gespeichert
await page.locator('[data-fid="act-save"]').click();
await page.getByRole('alert').filter({ hasText: 'Trainingsart' }).waitFor();
check(!(await stored()).activities, 'Ohne Trainingsart sollte nichts gespeichert werden');

// Eintragen: Trainingsart, Dauer +5 (65), RPE per Tastatur, Notiz
await page.locator('#act-type').fill('Beachvolleyball');
await page.locator('[data-fid="incv-durationMin"]').click();
const dur = page.getByRole('textbox', { name: 'Dauer (Minuten)' });
check(await dur.inputValue() === '65', `Dauer nach +5: ${await dur.inputValue()}`);
check(await page.locator('#act-type').inputValue() === 'Beachvolleyball', 'Trainingsart nach Neuzeichnen verloren');
const rpe = page.locator('[data-fid="act-rpe"]');
await rpe.focus();
await rpe.press('ArrowRight');
await page.locator('#act-note').fill('Turnier');
await shot('anderes-training-ausgefuellt');
await page.locator('[data-fid="act-save"]').click();
await page.locator('.toast').getByText('Beachvolleyball eingetragen.').waitFor();
let f = await stored();
check(f.schemaVersion === 3, `schemaVersion ${f.schemaVersion}`);
check(f.activities?.length === 1, `activities: ${JSON.stringify(f.activities)}`);
const a = f.activities?.[0] ?? {};
check(a.type === 'Beachvolleyball' && a.durationMin === 65 && a.rpe === 6 && a.note === 'Turnier' && a.week === 1,
  `Eintrag passt nicht: ${JSON.stringify(a)}`);
check(await page.getByText('1 Training noch nicht gesichert.').count() === 1, 'Backup-Karte sollte 1 ungesichertes Training zeigen');

// Verlauf: Button, Vorschlag aus der ersten Eingabe, Datum in der Zukunft wird abgelehnt
await btn(page, 'Verlauf', true).click();
await page.locator('[data-fid="hist-activity-add"]').click();
await page.getByRole('dialog', { name: 'Anderes Training eintragen' }).waitFor();
const chip = page.locator('[data-fid="act-sug-0"]');
check(await chip.textContent() === 'Beachvolleyball', 'Vorschlag Beachvolleyball fehlt');
await chip.click();
check(await chip.getAttribute('aria-pressed') === 'true', 'Vorschlag sollte gewählt sein');
check(await page.locator('#act-type').inputValue() === 'Beachvolleyball', 'Vorschlag füllt die Trainingsart nicht');
await page.locator('#act-date').evaluate((el) => { el.removeAttribute('max'); el.value = '2099-01-01'; el.dispatchEvent(new Event('change', { bubbles: true })); });
await page.locator('[data-fid="act-save"]').click();
await page.getByRole('alert').filter({ hasText: 'Zukunft' }).waitFor();
await page.locator('#act-date').fill('2026-01-02');
await page.locator('[data-fid="act-save"]').click();
await page.locator('.toast').getByText('Beachvolleyball eingetragen.').waitFor();
f = await stored();
check(f.activities?.length === 2 && f.activities[0].date === '2026-01-02', `Nachtragen: ${JSON.stringify(f.activities)}`);
check(f.sessions.length === 0, 'Andere Trainings dürfen keine Trainings in sessions anlegen');

// Verlauf: beide Einträge in der Liste, neuestes zuerst
const items = page.locator('ul.list li');
check(await items.count() === 2, `Verlauf: 2 Einträge erwartet, ${await items.count()}`);
check((await items.first().textContent()).includes('Anderes Training · 65 Min · RPE 6'), `Erster Eintrag: ${await items.first().textContent()}`);
await shot('anderes-training-verlauf');

// Detailansicht, korrigieren, zurück
const firstId = f.activities[1].id;
await page.locator(`[data-fid="sess-${firstId}"]`).click();
await page.getByRole('heading', { name: /Beachvolleyball/ }).waitFor();
check(await page.getByText('Notiz: Turnier').count() === 1, 'Detail: Notiz fehlt');
await fits('Detail anderes Training');
await shot('anderes-training-detail');
await page.locator('[data-fid="activity-edit"]').click();
await page.getByRole('dialog', { name: 'Anderes Training korrigieren' }).waitFor();
check(await page.locator('#act-note').inputValue() === 'Turnier', 'Korrigieren: Notiz nicht vorbelegt');
await page.locator('#act-type').fill('Beachvolleyball Turnier');
await page.locator('[data-fid="act-save"]').click();
await page.getByRole('heading', { name: /Beachvolleyball Turnier/ }).waitFor();
f = await stored();
check(f.activities.length === 2 && f.activities[1].type === 'Beachvolleyball Turnier' && f.activities[1].id === firstId, `Korrigieren: ${JSON.stringify(f.activities)}`);

// Löschen mit Rückfrage
await page.locator('[data-fid="delete-activity"]').click();
await page.locator('[data-fid="delete-ok"]').click();
await page.locator('.toast').getByText('Training gelöscht.').waitFor();
f = await stored();
check(f.activities.length === 1 && f.deletedSessionIds?.includes(firstId), `Löschen: ${JSON.stringify(f)}`.slice(0, 300));
check(await page.locator('ul.list li').count() === 1, 'Verlauf nach dem Löschen: 1 Eintrag erwartet');

// Export für Coach: anderes Training im Log
await btn(page, 'Plan', true).click();
await page.locator('[data-fid="coach-export"]').click();
const coach = await page.locator('pre.prompt').textContent();
check(/\d{4}-\d{2}-\d{2} Beachvolleyball · W1 · 60 min/.test(coach), `Coach-Export ohne anderes Training: ${coach.slice(-200)}`);
check(coach.includes('anderes Training'), 'Coach-Export: Legende ohne anderes Training');
await btn(page, 'Schließen', true).click();

// Archiv: Datei mit anderem Training nur lesend
const archived = { ...f, fileId: '66666666-6666-4666-8666-666666666666', activities: [{ ...f.activities[0], id: '00000000-0000-4000-8000-000000000301', note: 'Archiv-Notiz' }] };
delete archived.deletedSessionIds;
const tmp = mkdtempSync(join(tmpdir(), 'anderes-'));
const archPath = join(tmp, 'alt.training.json');
writeFileSync(archPath, JSON.stringify(archived));
await btn(page, 'Archiv', true).click();
const [fc] = await Promise.all([page.waitForEvent('filechooser'), page.locator('[data-fid="archive-open"]').click()]);
await fc.setFiles([archPath]);
await page.getByRole('region', { name: 'Geöffnete Trainingsdatei' }).waitFor();
check((await page.getByRole('region', { name: 'Geöffnete Trainingsdatei' }).textContent()).includes('1 anderes Training'), 'Archiv: Anzahl anderer Trainings fehlt');
await page.locator('[data-fid="sess-00000000-0000-4000-8000-000000000301"]').click();
await page.getByText('Notiz: Archiv-Notiz').waitFor();
check(await page.locator('[data-fid="activity-edit"], [data-fid="delete-activity"]').count() === 0, 'Archiv: keine Korrektur erwartet');
await page.locator('[data-fid="back"]').click();
await page.locator('[data-fid="archive-close"]').click();
await btn(page, 'Verlauf', true).click();

// Abbrechen speichert nichts
await page.locator('[data-fid="hist-activity-add"]').click();
await page.locator('#act-type').fill('Laufen');
await btn(page, 'Abbrechen', true).click();
check((await stored()).activities.length === 1, 'Abbrechen sollte nichts speichern');

// Touch (Review r5 iOS H-1): Dauer tippen, Feld bleibt aktiv, ein einziger Tap auf „Speichern“ muss reichen.
await page.locator('[data-fid="hist-activity-add"]').click();
await page.locator('#act-type').fill('Laufen');
await page.locator('#act-duration').tap();
await page.locator('#act-duration').fill('45');
await page.locator('[data-fid="act-save"]').tap();
await page.locator('.toast').getByText('Laufen eingetragen.').waitFor({ timeout: 3000 }).catch(() => problems.push('Touch: erster Tap auf „Speichern“ nach dem Tippen der Dauer wirkt nicht'));
f = await stored();
check(f.activities.some((a) => a.type === 'Laufen' && a.durationMin === 45), `Touch: Dauer 45 nicht gespeichert: ${JSON.stringify(f.activities)}`);

// Während eines laufenden Trainings: kein Button
await btn(page, 'Heute', true).click();
await btn(page, 'Training starten').click();
await btn(page, 'Beenden', true).waitFor();
// Während eines laufenden Trainings sind Heute und Verlauf nicht erreichbar, auch nach einem Neuladen nicht.
await page.reload();
await btn(page, 'Beenden', true).waitFor();
check(await page.locator('[data-fid="activity-add"], [data-fid="hist-activity-add"]').count() === 0, 'Button während eines laufenden Trainings');

// Touch im Training (Review r5 iOS H-1): Wert tippen, dann ein Tap auf „Satz fertig“.
await setFocusView(page);
const before = await page.evaluate(() => document.body.innerText);
const field = page.locator('input.num-in').first();
await field.tap();
await field.fill('12');
await page.locator('[data-fid="set-done"]').tap();
await page.waitForTimeout(700);
const after = await page.evaluate(() => document.body.innerText);
check(before !== after && (await page.locator('.toast, .rest').count()) > 0, 'Touch: erster Tap auf „Satz fertig“ nach dem Tippen eines Werts wirkt nicht');

// Wert tippen, dann direkt ± (Review r6 Code-Qualität H1 / iOS H-1): gerechnet wird vom getippten Wert.
const tapBump = async (label, inputSel, typed, btnSel, expected) => {
  const inp = page.locator(inputSel).first();
  await inp.tap();
  await inp.fill(typed);
  await page.locator(btnSel).first().tap();
  await page.waitForTimeout(600);
  const v = await page.locator(inputSel).first().inputValue();
  check(v === expected, `${label}: getippt ${typed}, dann ±, erwartet ${expected}, ist ${v}`);
};
const kgSel = 'input.num-in[id^="in-kg-"]';
if (await page.locator(kgSel).count()) await tapBump('Training Gewicht', kgSel, '82,5', '[data-fid="incv-kg-0.5"]', '83');
else problems.push('Training: kein Gewichtsfeld im Fokus gefunden');
const repsSel = 'input.num-in[id^="in-reps-"]';
if (await page.locator(repsSel).count()) await tapBump('Training Wiederholungen', repsSel, '8', '[data-fid="dec-reps"]', '7');

// Fokus bleibt im Feld (Tastatur, Schaltersteuerung): ± per Skript ohne Fokuswechsel, das Feld zeigt den neuen Wert
// (Review r7 iOS M-1). Dazu ein Wert ab 1000 mit Tausendertrenner (Review r7 Code-Qualität N1).
if (await page.locator(kgSel).count()) {
  const inp = page.locator(kgSel).first();
  await inp.focus();
  await inp.fill('90');
  await page.evaluate(() => { document.querySelector('[data-fid="incv-kg-2.5"]').click(); });
  await page.waitForTimeout(600);
  check(await page.locator(kgSel).first().inputValue() === '92,5', `Fokus im Feld: Anzeige ${await page.locator(kgSel).first().inputValue()} statt 92,5`);
  await tapBump('Training 1000 kg', kgSel, '1000', '[data-fid="dec-kg-0.5"]', '999,5');
  await tapBump('Training zurück', kgSel, '60', '[data-fid="incv-kg-0.5"]', '60,5');
}

// Training beenden, dann im Verlauf korrigieren: tippen, dann +2,5
await btn(page, 'Beenden', true).click();
await page.locator('[data-fid="finish-save"]').click();
await btn(page, 'Zur Übersicht').click();
await btn(page, 'Verlauf', true).click();
const sessEntry = page.locator('ul.list li button').filter({ hasText: 'Sätzen' }).first();
await sessEntry.click();
await page.locator('[data-fid^="hset-"]').first().click();
if (await page.locator(kgSel).count()) await tapBump('Verlauf Gewicht', kgSel, '75', '[data-fid="incv-kg-2.5"]', '77,5');
await btn(page, 'Fertig', true).click();
const stored2 = await stored();
const kgs = stored2.sessions.flatMap((x) => x.blocks.flatMap((b) => b.sets.map((st) => st.kg)));
check(kgs.includes(77.5), `Verlauf: 77,5 kg nicht gespeichert (${kgs.join(', ')})`);

// Sheet „Anderes Training“: Dauer tippen, dann +
await btn(page, '‹ Verlauf').click().catch(() => {});
await page.locator('[data-fid="hist-activity-add"]').click();
await tapBump('Sheet Dauer', '#act-duration', '90', '[data-fid="incv-durationMin"]', '95');
await page.locator('[data-fid="act-cancel"]').click();

check(external.length === 0, `Externe Requests: ${external.join(', ')}`);
await browser.close();
if (problems.length) {
  console.error('FEHLER:\n- ' + problems.join('\n- '));
  process.exit(1);
}
console.log('anderes-training.e2e: alles in Ordnung');
