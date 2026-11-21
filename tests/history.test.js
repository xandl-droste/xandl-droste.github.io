import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validatePlan } from '../training/src/model/validate.js';
import { createTrainingFile } from '../training/src/model/training-file.js';
import { nameIndex, endedSessions, sessionStats, exerciseSeries, exercisesWithHistory, chartGeometry } from '../training/src/model/history.js';
import { planRaw, session, block } from './helpers.js';

const plan = validatePlan(planRaw());
const file = (sessions) => ({ ...createTrainingFile(plan), sessions });

test('Namen aus dem Plan, unbekannte IDs bleiben sichtbar', () => {
  const n = nameIndex(plan);
  assert.equal(n.exercise('back-squat'), 'Back Squat');
  assert.equal(n.exercise('alte-uebung'), 'alte-uebung');
  assert.equal(n.variant('leg-curl', 'slider'), 'A: Slider');
  assert.equal(n.session('E2'), 'Einheit 2 – elastisch');
});

test('Sessions neueste zuerst, laufende fehlen; Statistik', () => {
  const a = session({ date: '2026-01-01', blocks: [block('back-squat', [[80, 5], [80, 5, false]]), block('rdl', [[60, 6]], { skipped: true })] });
  const b = session({ date: '2026-01-04' });
  const c = session({ date: '2026-01-08', ended: false });
  const list = endedSessions(file([a, b, c]));
  assert.deepEqual(list.map((s) => s.id), [b.id, a.id]);
  assert.deepEqual(sessionStats(a), { done: 1, total: 2, minutes: 60 });
});

test('Verlauf einer Übung: bester Satz pro Session', () => {
  const f = file([
    session({ date: '2026-01-08', blocks: [block('back-squat', [[82.5, 5], [85, 3], [90, 1, false]])] }),
    session({ date: '2026-01-01', blocks: [block('back-squat', [[80, 5], [80, 5]])] }),
    session({ date: '2026-01-04', blocks: [block('back-squat', [[100, 5]], { skipped: true })] }),
  ]);
  const s = exerciseSeries(f, 'back-squat');
  assert.equal(s.metric, 'kg');
  assert.deepEqual(s.points.map((p) => [p.date, p.value]), [['2026-01-01', 80], ['2026-01-08', 85]]);
});

test('ohne Gewicht: Haltezeit bzw. Wiederholungen', () => {
  const f = file([session({ blocks: [block('copenhagen-plank', [[null, null, true, 20], [null, null, true, 25]]), block('pull-up', [[null, 8], [null, 7]])] })]);
  assert.deepEqual(exerciseSeries(f, 'copenhagen-plank'), { metric: 'sec', points: [{ date: '2026-01-01', value: 25, sessionId: f.sessions[0].id }] });
  assert.equal(exerciseSeries(f, 'pull-up').metric, 'reps');
  assert.equal(exerciseSeries(f, 'pull-up').points[0].value, 8);
});

test('Übungen mit Historie in Plan-Reihenfolge', () => {
  const f = file([session({ blocks: [block('hip-thrust', [[60, 8]]), block('alte-uebung', [[1, 1]]), block('back-squat', [[80, 5]])] })]);
  assert.deepEqual(exercisesWithHistory(f), ['back-squat', 'hip-thrust', 'alte-uebung']);
});

test('Diagramm-Geometrie', () => {
  const g = chartGeometry([75, 77.5, 80], { width: 320, height: 120, padX: 20, padTop: 10, padBottom: 30 });
  assert.deepEqual(g.points.map((p) => p.x), [20, 160, 300]);
  assert.equal(g.points[0].y, 90);
  assert.equal(g.points[2].y, 10);
  assert.deepEqual(chartGeometry([50]).points.length, 1);
  assert.deepEqual(chartGeometry([]), { points: [], min: null, max: null });
});
