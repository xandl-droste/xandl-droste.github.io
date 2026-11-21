import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validatePlan } from '../training/src/model/validate.js';
import { crc16 } from '../training/src/garmin/fit.js';
import { garminCategoryOf, sessionTimeline, sessionToFit, garminFileName, UNKNOWN_CATEGORY } from '../training/src/garmin/session-fit.js';
import { exercisesOf } from '../training/src/model/plan.js';
import { planRaw, session, block } from './helpers.js';

const plan = validatePlan(planRaw());
const T = (min) => new Date(Date.parse('2026-01-01T08:00:00.000Z') + min * 60_000).toISOString();

test('Garmin-Kategorie aus dem Plan wird übernommen', () => {
  const squat = exercisesOf(plan.sessions[0]).find((e) => e.exercise.id === 'back-squat').exercise;
  assert.deepEqual(garminCategoryOf(squat), { category: 28, subcategory: 6 });
});

test('Fallback-Kategorie per Stichwort, sonst unknown', () => {
  assert.deepEqual(garminCategoryOf({ id: 'front-squat', name: 'Frontkniebeuge' }), { category: 28, subcategory: null });
  assert.equal(garminCategoryOf({ id: 'bss', name: 'Bulgarian Split Squat' }).category, 17);
  assert.equal(garminCategoryOf({ id: 'lc', name: 'Leg Curl' }).category, 15);
  assert.equal(garminCategoryOf({ id: 'bc', name: 'Bizeps Curl' }).category, 7);
  assert.equal(garminCategoryOf({ id: 'tibialis-raise', name: 'Tibialis-Raise' }).category, UNKNOWN_CATEGORY);
  assert.equal(garminCategoryOf(null).category, UNKNOWN_CATEGORY);
});

test('Zeitachse mit doneAt: Satzende = doneAt, Pausen dazwischen', () => {
  const s = session({ blocks: [block('back-squat', [[60, 5], [60, 5], [60, 5, false]])] });
  s.blocks[0].sets[0].doneAt = T(10);
  s.blocks[0].sets[1].doneAt = T(13);
  const tl = sessionTimeline(plan, s);
  assert.deepEqual(tl.sets.map((x) => x.type), ['active', 'rest', 'active']);
  assert.equal(tl.sets[0].start.toISOString(), new Date(Date.parse(T(10)) - 15_000).toISOString()); // 5 Wdh. × 3 s
  assert.equal(tl.sets[0].durationSec, 15);
  assert.equal(tl.sets[1].durationSec, 165);
  assert.deepEqual([tl.sets[2].reps, tl.sets[2].kg, tl.sets[2].category, tl.sets[2].subcategory], [5, 60, 28, 6]);
});

test('Zeitachse ohne doneAt: geschätzt, endet auf endedAt, übersprungene und offene Sätze fehlen', () => {
  const s = session({
    blocks: [
      block('back-squat', [[60, 5], [60, 5]]),
      block('pull-up', [[null, 8], [null, 8, false]]),
      block('romanian-deadlift', [[80, 8]], { skipped: true }),
    ],
  });
  const tl = sessionTimeline(plan, s);
  const active = tl.sets.filter((x) => x.type === 'active');
  assert.equal(active.length, 3);
  assert.equal(active[2].kg, null); // Körpergewicht
  const last = active[2];
  assert.equal(last.start.getTime() + last.durationSec * 1000, Date.parse(s.endedAt));
  assert.equal(tl.sets[1].type, 'rest');
  assert.equal(tl.sets[1].durationSec, 180); // restSec Back Squat
  for (let i = 1; i < tl.sets.length; i++) assert.ok(tl.sets[i].start >= tl.sets[i - 1].start);
});

test('Zeitachse ohne doneAt: zu kurze Session kürzt die Pausen statt über endedAt hinauszulaufen', () => {
  const s = session({ blocks: [block('back-squat', [[60, 5], [60, 5], [60, 5]])] });
  s.endedAt = '2026-01-01T08:02:00.000Z';
  const tl = sessionTimeline(plan, s);
  assert.ok(tl.sets[0].start.getTime() >= Date.parse(s.startedAt));
  assert.equal(tl.end.toISOString(), s.endedAt);
});

test('Haltezeit-Übung: Dauer aus sec, keine Wiederholungen', () => {
  const s = session({ blocks: [block('copenhagen-plank', [[null, null, true, 20]])] });
  const [set] = sessionTimeline(plan, s).sets;
  assert.equal(set.reps, null);
  assert.equal(set.durationSec, 40); // pro Seite doppelt
  assert.equal(set.category, 19);
});

test('sessionToFit: gültige Datei, nur für abgeschlossene Sessions', () => {
  const s = session({ blocks: [block('back-squat', [[60, 5], [62.5, 5]])] });
  const bytes = sessionToFit(plan, s);
  assert.equal(crc16(bytes), 0);
  assert.equal(String.fromCharCode(...bytes.subarray(8, 12)), '.FIT');
  assert.throws(() => sessionToFit(plan, session({ ended: false })));
});

test('Dateiname nur aus dem Datum', () => {
  assert.equal(garminFileName({ date: '2026-03-05' }), 'training-2026-03-05.fit');
  assert.equal(garminFileName({ date: '../../x' }), 'training-datum.fit');
});

test('Zeitachse: lange offenes Training wird auf die Trainingszeit begrenzt (Export bleibt möglich)', () => {
  const s = session({ blocks: [block('back-squat', [[60, 5], [60, 5]])] });
  s.endedAt = '2026-03-01T08:00:00.000Z'; // 59 Tage offen
  s.blocks[0].sets[0].doneAt = '2026-01-01T08:20:00.000Z';
  s.blocks[0].sets[1].doneAt = '2026-01-01T08:24:00.000Z';
  const tl = sessionTimeline(plan, s);
  assert.ok(tl.end - tl.start <= 40 * 60_000);
  assert.equal(crc16(sessionToFit(plan, s)), 0);
});

test('Garmin-Kategorien: Prompt nennt die Tabelle, Beispiel, Seed-Plan und Stichwort-Fallback nutzen nur Nummern daraus', async () => {
  const { GARMIN_CATEGORIES } = await import('../training/src/garmin/categories.js');
  const { buildAgentPrompt, EXAMPLE_PLAN } = await import('../training/src/agent-prompt.js');
  const { exercisesOf } = await import('../training/src/model/plan.js');
  const { garminCategoryOf, UNKNOWN_CATEGORY } = await import('../training/src/garmin/session-fit.js');
  const { planRaw } = await import('./helpers.js');
  const known = new Set(GARMIN_CATEGORIES.map(([n]) => n));
  assert.equal(known.size, GARMIN_CATEGORIES.length, 'Nummern eindeutig');
  const text = buildAgentPrompt();
  for (const [n, name] of GARMIN_CATEGORIES) assert.ok(text.includes(`${n} ${name}`), `${n} ${name} im Prompt`);
  const ex = EXAMPLE_PLAN.sessions.flatMap((s) => s.blocks.flatMap((b) => b.exercises));
  for (const e of ex) assert.ok(known.has(e.garminCategory), `Beispiel ${e.id}`);
  const seed = planRaw().sessions.flatMap((s) => exercisesOf(s).map((x) => x.exercise));
  assert.ok(seed.length > 0);
  for (const e of seed) if (e.garminCategory !== undefined) assert.ok(known.has(e.garminCategory), `Seed ${e.id}`);
  const words = ['leg curl', 'lunge', 'hip thrust', 'deadlift', 'squat', 'pull-up', 'push-up', 'bench', 'row', 'shoulder press',
    'lateral raise', 'calf', 'triceps', 'curl', 'shrug', 'crunch', 'plank', 'farmer carry', 'chop', 'jump'];
  for (const w of words) {
    const c = garminCategoryOf({ id: w, name: w }).category;
    assert.ok(c !== UNKNOWN_CATEGORY && known.has(c), `Stichwort ${w}`);
  }
});
