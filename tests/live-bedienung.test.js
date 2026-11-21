// Bedienung im Training: Später, Halten-Countdown, Gewichts-Stepper, Notiz vom letzten Mal.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validatePlan, validateSession, validateTrainingFile } from '../training/src/model/validate.js';
import { createTrainingFile } from '../training/src/model/training-file.js';
import {
  startLive, slotOrder, activeSlot, progress, toggleSet, setSkipped, restoreLive, finishLive,
  isDeferred, setDeferred, canDefer, stepValue, KG_STEPS, holdPhase, holdPhases, HOLD_LEAD_SEC, HOLD_SWITCH_SEC,
} from '../training/src/model/live.js';
import { planRaw, session, block } from './helpers.js';

const plan = validatePlan(planRaw());
const T0 = new Date('2026-01-08T08:00:00Z');
const fresh = () => createTrainingFile(plan, { now: T0 });
const idx = (live, id) => live.items.findIndex((it) => it.exerciseId === id);
const doneAll = (live, i) => live.session.blocks[i].sets.reduce((l, _, s) => toggleSet(l, i, s, T0), live);

// ---------- Später ----------

test('Später: Block wird übergangen, solange andere offene Sätze da sind', () => {
  let live = startLive(fresh(), 'E1', { now: T0 });
  assert.deepEqual(live.deferred, []);
  assert.equal(canDefer(live, 0), true);
  live = setDeferred(live, 0, true);
  assert.equal(isDeferred(live, 0), true);
  assert.deepEqual(activeSlot(live), { i: 1, s: 0 }, 'Back Squat statt Trap Bar Jump');
  assert.deepEqual(progress(live), { done: 0, total: 26 }, 'Fortschritt zählt unverändert');
  const order = slotOrder(live);
  assert.ok(order.slice(-3).every(({ i }) => i === 0), 'zurückgestellte Sätze am Ende');
  assert.equal(setDeferred(live, 0, true), live, 'doppelt zurückstellen ändert nichts');
});

test('Später: Superset als Ganzes, mehrere Blöcke in Plan-Reihenfolge, Rest wird wieder aktiv', () => {
  let live = startLive(fresh(), 'E1', { now: T0 });
  const pull = idx(live, 'pull-up');
  const tib = idx(live, 'tibialis-raise');
  live = setDeferred(live, tib, true); // über b) zurückstellen betrifft auch a)
  assert.equal(isDeferred(live, pull), true);
  live = setDeferred(live, 0, true);
  // Alles andere erledigen
  for (const { i, s } of slotOrder(live)) {
    if (i !== 0 && i !== pull && i !== tib) live = toggleSet(live, i, s, T0);
  }
  assert.deepEqual(activeSlot(live), { i: 0, s: 0 }, 'nur noch zurückgestellte: Plan-Reihenfolge, Trap Bar Jump zuerst');
});

test('Später: „Jetzt machen“ und ein erledigter Satz des Blocks heben es auf', () => {
  let live = startLive(fresh(), 'E1', { now: T0 });
  live = setDeferred(live, 0, true);
  live = setDeferred(live, 0, false);
  assert.equal(isDeferred(live, 0), false);
  assert.deepEqual(activeSlot(live), { i: 0, s: 0 });
  live = setDeferred(live, 0, true);
  live = toggleSet(live, 0, 1, T0); // Satz in der Liste direkt abgehakt
  assert.equal(isDeferred(live, 0), false);
  assert.deepEqual(activeSlot(live), { i: 0, s: 0 });
});

test('Später: nicht für übersprungene oder fertige Blöcke', () => {
  let live = startLive(fresh(), 'E1', { now: T0 });
  live = doneAll(live, 0);
  assert.equal(canDefer(live, 0), false);
  live = setSkipped(live, 1, true);
  assert.equal(canDefer(live, 1), false);
});

test('Später: restoreLive übernimmt geprüfte Block-Nummern, ältere Stände ohne Feld gehen', () => {
  const file = fresh();
  let live = startLive(file, 'E1', { now: T0 });
  live = setDeferred(live, 2, true); // Superset Klimmzug, Block 2
  const back = restoreLive(file, structuredClone(live), validateSession);
  assert.deepEqual(back.deferred, [live.items[2].blockIndex]);
  assert.deepEqual(activeSlot(back), activeSlot(live));
  const old = structuredClone(live);
  delete old.deferred;
  assert.deepEqual(restoreLive(file, old, validateSession).deferred, []);
  for (const bad of ['x', [99], [-1], [1.5], ['1'], Array(50).fill(0), null]) {
    assert.deepEqual(restoreLive(file, { ...live, deferred: bad }, validateSession).deferred, [], JSON.stringify(bad));
  }
  assert.deepEqual(restoreLive(file, { ...live, deferred: [1, 1, 0] }, validateSession).deferred, [1, 0], 'ohne Doppelte');
});

test('Später ändert das Format der fertigen Session nicht', () => {
  let live = startLive(fresh(), 'E1', { now: T0, id: '11111111-1111-4111-8111-111111111111' });
  live = setDeferred(live, 0, true);
  live = toggleSet(live, 1, 0, T0);
  const sess = finishLive(live, new Date(T0.getTime() + 60_000));
  assert.equal('deferred' in sess, false);
  assert.doesNotThrow(() => validateTrainingFile(structuredClone({ ...fresh(), sessions: [sess] })));
});

// ---------- Halten ----------

test('Halten: Abschnitte ohne und mit Seitenwechsel', () => {
  assert.deepEqual(holdPhases(20, false).map((p) => [p.phase, p.side, p.sec]), [['lead', null, HOLD_LEAD_SEC], ['hold', null, 20]]);
  assert.deepEqual(holdPhases(20, true).map((p) => [p.phase, p.side, p.sec]),
    [['lead', null, HOLD_LEAD_SEC], ['hold', 1, 20], ['switch', null, HOLD_SWITCH_SEC], ['hold', 2, 20]]);
});

test('Halten: Phase und Restzeit aus Zeitstempeln', () => {
  const t = 1_000_000;
  const at = (ms, perSide = false) => holdPhase({ startedAt: t, sec: 20, perSide }, t + ms);
  assert.deepEqual([at(0).phase, at(0).remaining, at(0).finished], ['lead', 5, false]);
  assert.equal(at(4_100).remaining, 1, 'aufgerundet');
  assert.deepEqual([at(5_000).phase, at(5_000).remaining, at(5_000).index], ['hold', 20, 1]);
  assert.equal(at(5_000).phaseStartedAt, t + 5_000);
  assert.deepEqual([at(24_999).phase, at(24_999).remaining], ['hold', 1]);
  const end = at(25_000);
  assert.deepEqual([end.phase, end.remaining, end.finished, end.endsAt], ['done', 0, true, t + 25_000]);
  assert.equal(at(999_000).finished, true, 'nach langer Abwesenheit fertig');
  assert.equal(at(-3_000).remaining, 5, 'Uhr zurückgestellt: nie mehr als die Phase');
  // pro Seite: 5 + 20 + 5 + 20
  assert.deepEqual([at(10_000, true).phase, at(10_000, true).side], ['hold', 1]);
  assert.deepEqual([at(26_000, true).phase, at(26_000, true).remaining], ['switch', 4]);
  assert.deepEqual([at(30_000, true).phase, at(30_000, true).side, at(30_000, true).index], ['hold', 2, 3]);
  assert.equal(at(49_999, true).finished, false);
  assert.equal(at(50_000, true).finished, true);
  assert.equal(at(50_000, true).endsAt, t + 50_000);
});

// ---------- Gewichts-Stepper ----------

test('Gewichts-Stepper: feste Schritte 2,5 und 0,5 für alle Übungen', () => {
  assert.deepEqual([...KG_STEPS], [2.5, 0.5]);
  const live = startLive(fresh(), 'E1', { now: T0 });
  assert.equal('incrementKg' in live.items[idx(live, 'seated-shoulder-press')], false, 'incrementKg nur für den +X-kg-Vorschlag');
});

test('Schritt: nie unter 0, gerundet auf 2 Nachkommastellen, leer zählt als 0', () => {
  assert.equal(stepValue(80, 2.5), 82.5);
  assert.equal(stepValue(80, -0.5), 79.5);
  assert.equal(stepValue(0.3, -0.5), 0);
  assert.equal(stepValue(1, -2.5), 0);
  assert.equal(stepValue(null, 0.5), 0.5);
  assert.equal(stepValue(undefined, 2.5), 2.5);
  let v = 0;
  for (let k = 0; k < 7; k++) v = stepValue(v, 0.1);
  assert.equal(v, 0.7, 'kein Gleitkomma-Rauschen');
  assert.equal(stepValue(20.25, 0.5), 20.75);
  assert.equal(stepValue(5, 1), 6, 'auch für Wdh. und Haltezeit');
});

// ---------- Notiz vom letzten Mal ----------

test('Notiz vom letzten Mal kommt aus der Leistung für „Letztes Mal“', () => {
  const older = session({ date: '2026-01-01', blocks: [block('back-squat', [[70, 5]], { note: 'alt' })] });
  const newer = session({ date: '2026-01-05', blocks: [block('back-squat', [[80, 5]], { note: '  Knie gut  ' }), block('romanian-deadlift', [[60, 6]])] });
  const skippedWithNote = session({ date: '2026-01-06', blocks: [block('back-squat', [[90, 5, false]], { note: 'nicht gemacht' })] });
  const file = { ...fresh(), sessions: [older, newer, skippedWithNote] };
  const live = startLive(file, 'E1', { now: T0 });
  const sq = live.items[idx(live, 'back-squat')];
  assert.equal(sq.lastNote, 'Knie gut', 'getrimmt, nur aus Sessions mit erledigtem Satz');
  assert.equal(sq.last.sets[0].kg, 80);
  assert.equal(live.items[idx(live, 'romanian-deadlift')].lastNote, '', 'leere Notiz');
  assert.equal(live.items[idx(live, 'trap-bar-jump')].lastNote, '', 'kein letztes Mal');
  const back = restoreLive(file, structuredClone(live), validateSession);
  assert.equal(back.items[idx(back, 'back-squat')].lastNote, 'Knie gut');
});
