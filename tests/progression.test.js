import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validatePlan } from '../training/src/model/validate.js';
import { resolvePrescription, estimateMinutes, findPlanSession } from '../training/src/model/plan.js';
import { suggestSets, applyIncrease, progressionReached, lastPerformance } from '../training/src/model/progression.js';
import { planRaw, session, block } from './helpers.js';

const plan = validatePlan(planRaw());
const ex = (id) => plan.sessions.flatMap((s) => s.blocks.flatMap((b) => b.exercises)).find((e) => e.id === id);
const squat = ex('back-squat');
const rdl = ex('romanian-deadlift');
const hip = ex('hip-flexor-knee-raise');

test('Wochenvorgaben: byWeek und Deload', () => {
  assert.deepEqual([1, 2, 3, 4, 5, 6].map((w) => resolvePrescription(plan, rdl, w).repsMax), [6, 7, 8, 6, 7, 8]);
  const w7 = resolvePrescription(plan, rdl, 7);
  assert.equal(w7.sets, 2, 'Deload: ein Satz weniger');
  assert.equal(w7.isDeload, true);
  assert.equal(w7.loadFactor, 0.8);
  const hip1 = resolvePrescription(plan, hip, 1);
  assert.deepEqual([hip1.unit, hip1.sets, hip1.durationSec], ['s', 3, 15]);
  const hip3 = resolvePrescription(plan, hip, 3);
  assert.deepEqual([hip3.unit, hip3.sets, hip3.repsMax, hip3.cue], ['bodyweight', 2, 8, '3 s absenken.']);
  assert.equal(resolvePrescription(plan, hip, 7).sets, 1, 'Deload gilt für jede Übung');
});

test('ohne Historie: Ziel-Wiederholungen, kein Gewicht, kein Vorschlag', () => {
  const s = suggestSets(plan, squat, 1, []);
  assert.equal(s.sets.length, 3);
  assert.deepEqual(s.sets[0], { kg: null, reps: 5, sec: null, done: false });
  assert.equal(s.increase, null);
  assert.equal(s.last, null);
});

test('alle Sätze an der oberen Grenze → +incrementKg vorschlagen, dann wieder unten starten', () => {
  const hist = [session({ week: 1, blocks: [block('back-squat', [[80, 5], [80, 5], [80, 5]])] })];
  const s = suggestSets(plan, squat, 2, hist);
  assert.deepEqual(s.increase, { fromKg: 80, toKg: 82.5, reps: 5, incrementKg: 2.5 });
  assert.equal(s.sets[0].kg, 80, 'ohne Tap bleibt das alte Gewicht vorbelegt');
  const applied = applyIncrease(s);
  assert.ok(applied.every((x) => x.kg === 82.5 && x.reps === 5));
});

test('obere Grenze der damals gültigen Woche zählt, aber der Plan hebt die Wiederholungen an: kein Vorschlag', () => {
  // Woche 1 RDL: 3×6 geschafft. Woche 2 verlangt 7: erst die Wiederholungen, kein zusätzliches Gewicht.
  const hist = [session({ week: 1, blocks: [block('romanian-deadlift', [[100, 6], [100, 6], [100, 6]])] })];
  const s = suggestSets(plan, rdl, 2, hist);
  assert.equal(progressionReached(plan, rdl, lastPerformance(hist, 'romanian-deadlift')), true);
  assert.equal(s.increase, null);
  assert.deepEqual(s.sets.map((x) => [x.kg, x.reps]), [[100, 7], [100, 7], [100, 7]], 'Wiederholungen der Woche');
  // Woche 3 → 4 (8 → 6): Steigerung, wieder bei 6
  const hist3 = [session({ week: 3, blocks: [block('romanian-deadlift', [[100, 8], [100, 8], [100, 8]])] })];
  const s4 = suggestSets(plan, rdl, 4, hist3);
  assert.deepEqual(s4.increase, { fromKg: 100, toKg: 102.5, reps: 6, incrementKg: 2.5 });
  assert.ok(s4.sets.every((x) => x.reps === 6));
});

test('kein Vorschlag, wenn ein Satz fehlt, unter der Grenze liegt oder nicht erledigt ist', () => {
  const cases = [
    [[80, 5], [80, 5]],
    [[80, 5], [80, 4], [80, 5]],
    [[80, 5], [80, 5], [80, 5, false]],
  ];
  for (const sets of cases) {
    const hist = [session({ week: 1, blocks: [block('back-squat', sets)] })];
    assert.equal(suggestSets(plan, squat, 2, hist).increase, null, JSON.stringify(sets));
  }
});

test('Vorbelegung mit den Werten vom letzten Mal, jüngste Session zählt, Wiederholungen in der Spanne der Woche', () => {
  const row = ex('seated-cable-row'); // 3 × 8–10
  const hist = [
    session({ date: '2026-01-01', week: 1, blocks: [block('seated-cable-row', [[40, 10], [40, 10], [40, 10]])] }),
    session({ date: '2026-01-08', week: 2, blocks: [block('seated-cable-row', [[45, 9], [45, 12], [45, 6]])] }),
  ];
  const s = suggestSets(plan, row, 3, hist);
  assert.deepEqual(s.sets.map((x) => [x.kg, x.reps]), [[45, 9], [45, 10], [45, 8]], 'auf 8–10 begrenzt');
  assert.equal(s.last.date, '2026-01-08');
  assert.equal(s.increase, null);
  const sq = [session({ week: 2, blocks: [block('back-squat', [[75, 5], [75, 4], [75, 3]])] })];
  assert.deepEqual(suggestSets(plan, squat, 3, sq).sets.map((x) => x.reps), [5, 5, 5], 'feste Vorgabe: Ziel der Woche');
});

test('übersprungene Blöcke und laufende Sessions zählen nicht als "letztes Mal"', () => {
  const hist = [
    session({ date: '2026-01-01', blocks: [block('back-squat', [[70, 5]])] }),
    session({ date: '2026-01-05', blocks: [block('back-squat', [[90, 5]], { skipped: true })] }),
    session({ date: '2026-01-09', ended: false, blocks: [block('back-squat', [[95, 5]])] }),
  ];
  assert.equal(lastPerformance(hist, 'back-squat').session.date, '2026-01-01');
});

test('Deload: ca. 80 % des letzten Arbeitsgewichts außerhalb der Deload-Woche, ein Satz weniger', () => {
  const hist = [
    session({ date: '2026-02-01', week: 6, blocks: [block('back-squat', [[100, 5], [100, 5], [97.5, 5]])] }),
  ];
  const s = suggestSets(plan, squat, 7, hist);
  assert.equal(s.sets.length, 2);
  assert.equal(s.deloadKg, 80);
  assert.ok(s.sets.every((x) => x.kg === 80));
  assert.equal(s.increase, null, 'in der Deload-Woche keine Steigerung');

  // Zweite Session in der Deload-Woche: Basis bleibt das Gewicht aus Woche 6, nicht das reduzierte.
  const hist2 = [...hist, session({ date: '2026-02-05', week: 7, blocks: [block('back-squat', [[80, 5], [80, 5]])] })];
  assert.equal(suggestSets(plan, squat, 7, hist2).deloadKg, 80);
});

test('Deload rundet auf 0,5 kg', () => {
  const hist = [session({ week: 6, blocks: [block('back-squat', [[83, 5]])] })];
  assert.equal(suggestSets(plan, squat, 7, hist).deloadKg, 66.5);
});

test('Haltezeit-Übung: Sekunden statt Wiederholungen, keine Steigerung', () => {
  const s = suggestSets(plan, hip, 1, []);
  assert.deepEqual(s.sets[0], { kg: null, reps: null, sec: 15, done: false });
  const hist = [session({ week: 2, blocks: [block('hip-flexor-knee-raise', [[null, null, true, 15]])] })];
  const s3 = suggestSets(plan, hip, 3, hist);
  assert.equal(s3.sets[0].reps, 8, 'Wechsel auf Wiederholungen ab Woche 3');
  assert.equal(s3.sets[0].sec, null);
  assert.equal(s3.increase, null);
});

test('incrementKg 0 bedeutet: keine Gewichtssteigerung (z. B. Trap Bar Jump)', () => {
  const tbj = ex('trap-bar-jump');
  const hist = [session({ week: 1, blocks: [block('trap-bar-jump', [[40, 4], [40, 4], [40, 4]])] })];
  assert.equal(progressionReached(plan, tbj, lastPerformance(hist, 'trap-bar-jump')), true);
  assert.equal(suggestSets(plan, tbj, 2, hist).increase, null);
});

test('Inkrement ist pro Übung konfigurierbar (Schulterdrücken +1 kg)', () => {
  const sp = ex('seated-shoulder-press');
  const hist = [session({ week: 1, blocks: [block('seated-shoulder-press', [[20, 8], [20, 8], [20, 8]])] })];
  assert.equal(suggestSets(plan, sp, 2, hist).increase.toKg, 21);
});

test('Steigerung über das Limit von 1000 kg wird nicht vorgeschlagen (Export bliebe sonst nicht einlesbar)', () => {
  const hist = [session({ week: 1, blocks: [block('back-squat', [[1000, 5], [1000, 5], [1000, 5]])] })];
  assert.equal(suggestSets(plan, squat, 2, hist).increase, null);
});

test('Dauer-Schätzung einer Einheit', () => {
  const e1 = estimateMinutes(plan, findPlanSession(plan, 'E1'), 1);
  const e2 = estimateMinutes(plan, findPlanSession(plan, 'E2'), 1);
  assert.ok(e1 >= 50 && e1 <= 100, `E1 ${e1}`);
  assert.ok(e2 >= 50 && e2 <= 110, `E2 ${e2}`);
  assert.equal(e1 % 5, 0);
});
