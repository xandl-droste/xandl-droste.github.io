import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validatePlan, validateTrainingFile, validateSession } from '../training/src/model/validate.js';
import { createTrainingFile } from '../training/src/model/training-file.js';
import {
  startLive, slotOrder, activeSlot, progress, toggleSet, updateSet, addSet, removeSet, setSkipped,
  setNote, setVariant, itemTitle, setDeferred, applyIncreaseTo, restRemaining, extendRest, clearRest, finishLive, summarize, hasAnyDone, localDate, restoreLive,
} from '../training/src/model/live.js';
import { planRaw, session, block } from './helpers.js';

const plan = validatePlan(planRaw());
const T0 = new Date('2026-01-08T08:00:00Z');
const fresh = () => createTrainingFile(plan, { now: T0 });
const idx = (live, id) => live.items.findIndex((it) => it.exerciseId === id);

test('Start: alle Übungen der Einheit mit Vorgaben der aktuellen Woche', () => {
  const live = startLive(fresh(), 'E1', { now: T0, id: 'live-0001' });
  assert.equal(live.items.length, 9);
  assert.equal(live.session.sessionKey, 'E1');
  assert.equal(live.session.week, 1);
  assert.equal(live.session.endedAt, null);
  assert.equal(live.rirTarget, '3');
  assert.equal(live.items[0].name, 'Trap Bar Jump');
  assert.deepEqual(live.items.filter((x) => x.slot).map((x) => x.slot), ['a', 'b', 'a', 'b', 'a', 'b']);
  const hip = live.items[idx(live, 'hip-flexor-knee-raise')];
  assert.deepEqual([hip.unit, hip.plannedSets, hip.durationSec], ['s', 3, 15]);
});

test('Supersets werden abwechselnd abgearbeitet', () => {
  const live = startLive(fresh(), 'E1', { now: T0 });
  const pull = idx(live, 'pull-up');
  const tib = idx(live, 'tibialis-raise');
  const order = slotOrder(live).filter(({ i }) => i === pull || i === tib).map(({ i, s }) => `${i === pull ? 'a' : 'b'}${s + 1}`);
  assert.deepEqual(order, ['a1', 'b1', 'a2', 'b2', 'a3', 'b3']);
  // Ungleiche Satzzahl: Schulterdrücken 3, Copenhagen 2
  const sp = idx(live, 'seated-shoulder-press');
  const cp = idx(live, 'copenhagen-plank');
  const o2 = slotOrder(live).filter(({ i }) => i === sp || i === cp).map(({ i, s }) => `${i === sp ? 'a' : 'b'}${s + 1}`);
  assert.deepEqual(o2, ['a1', 'b1', 'a2', 'b2', 'a3']);
});

test('Satz abschließen startet die Pause mit restSec, Rückgängig stoppt sie', () => {
  let live = startLive(fresh(), 'E1', { now: T0 });
  assert.deepEqual(activeSlot(live), { i: 0, s: 0 });
  live = toggleSet(live, 0, 0, T0);
  assert.equal(live.session.blocks[0].sets[0].done, true);
  assert.equal(live.session.blocks[0].sets[0].doneAt, T0.toISOString());
  assert.equal(live.rest.endsAt, T0.getTime() + 150_000);
  assert.deepEqual(activeSlot(live), { i: 0, s: 1 });
  assert.deepEqual(progress(live), { done: 1, total: 26 });

  live = toggleSet(live, 0, 0, T0);
  assert.equal(live.session.blocks[0].sets[0].done, false);
  assert.equal('doneAt' in live.session.blocks[0].sets[0], false);
  assert.equal(live.rest, null);
  assert.deepEqual(activeSlot(live), { i: 0, s: 0 });
});

test('Nach dem letzten offenen Satz startet keine Pause mehr', () => {
  let live = startLive(fresh(), 'E1', { now: T0 });
  const order = slotOrder(live);
  for (const { i, s } of order.slice(0, -1)) live = toggleSet(live, i, s, T0);
  assert.ok(live.rest, 'vor dem letzten Satz läuft noch eine Pause');
  const last = order[order.length - 1];
  live = toggleSet(live, last.i, last.s, T0);
  assert.equal(activeSlot(live), null);
  assert.equal(live.rest, null, 'eine laufende Pause endet mit dem letzten Satz');
  // Rückgängig: Satz wieder offen, keine Pause
  live = toggleSet(live, last.i, last.s, T0);
  assert.equal(live.rest, null);
  // Ein früherer Satz als letzter offener (außer der Reihe abgehakt) startet ebenfalls keine Pause
  live = toggleSet(live, last.i, last.s, T0);
  live = toggleSet(live, order[0].i, order[0].s, T0);
  live = toggleSet(live, order[0].i, order[0].s, T0);
  assert.equal(live.rest, null);
});

test('Pause nach dem letzten Satz: „Später“ zählt als offen, Überspringen und Satz entfernen beenden sie', () => {
  const base = startLive(fresh(), 'E1', { now: T0 });
  const order = slotOrder(base);
  const doAll = (live, slots) => slots.reduce((l, { i, s }) => toggleSet(l, i, s, T0), live);

  // „Später“: Der zurückgestellte Block ist noch offen, also läuft nach den anderen Sätzen eine Pause.
  let live = setDeferred(base, 0, true);
  live = doAll(live, slotOrder(live).filter(({ i }) => i !== 0));
  assert.ok(activeSlot(live), 'zurückgestellter Block noch offen');
  assert.ok(live.rest, 'Pause läuft, weil noch der zurückgestellte Block kommt');

  // Überspringen: Pause läuft nach Übung A, dann wird die letzte offene Übung B übersprungen.
  const lastI = order[order.length - 1].i;
  live = doAll(base, order.filter(({ i }) => i !== lastI));
  assert.ok(live.rest && live.rest.afterItem !== lastI);
  live = setSkipped(live, lastI, true);
  assert.equal(activeSlot(live), null);
  assert.equal(live.rest, null, 'nach dem Überspringen des Letzten keine Pause mehr');

  // Satz entfernen: Der letzte offene Satz wird entfernt.
  live = doAll(base, order.slice(0, -1));
  assert.ok(live.rest);
  live = removeSet(live, order[order.length - 1].i);
  assert.equal(activeSlot(live), null);
  assert.equal(live.rest, null, 'nach dem Entfernen des letzten offenen Satzes keine Pause mehr');
});

test('Timer rechnet mit Zeitstempeln (übersteht App-Wechsel)', () => {
  let live = toggleSet(startLive(fresh(), 'E1', { now: T0 }), 1, 0, T0); // Back Squat, 180 s
  const t = T0.getTime();
  assert.equal(restRemaining(live, t), 180);
  assert.equal(restRemaining(live, t + 61_500), 119, 'aufgerundet');
  assert.equal(restRemaining(live, t + 999_000), 0, 'nie negativ');
  live = extendRest(live, 30, t + 10_000);
  assert.equal(restRemaining(live, t + 10_000), 200);
  live = extendRest(live, 30, t + 999_000);
  assert.equal(restRemaining(live, t + 999_000), 30, '+30 s nach Ablauf zählt ab jetzt');
  assert.equal(clearRest(live).rest, null);
});

test('Werte ändern: Komma, Grenzen, ungültige Eingaben', () => {
  let live = startLive(fresh(), 'E1', { now: T0 });
  live = updateSet(live, 1, 0, { kg: '82,5', reps: 6 });
  assert.deepEqual([live.session.blocks[1].sets[0].kg, live.session.blocks[1].sets[0].reps], [82.5, 6]);
  live = updateSet(live, 1, 0, { kg: -5, reps: 'abc' });
  assert.deepEqual([live.session.blocks[1].sets[0].kg, live.session.blocks[1].sets[0].reps], [0, null]);
  live = updateSet(live, 1, 0, { kg: 1e9 });
  assert.equal(live.session.blocks[1].sets[0].kg, 1000);
});

test('Satz hinzufügen/entfernen, Übung überspringen, Notiz, Variante', () => {
  const file = fresh();
  let live = startLive(file, 'E2', { now: T0 });
  const lc = idx(live, 'leg-curl');
  assert.equal(live.session.blocks[lc].variantId, 'slider', 'erste Variante vorausgewählt');
  assert.equal(itemTitle(live, lc), 'Leg Curl · A: Slider');
  live = setVariant(live, lc, 'stability-ball');
  assert.equal(live.session.blocks[lc].variantId, 'stability-ball');
  assert.equal(itemTitle(live, lc), 'Leg Curl · B: Stability Ball', 'Titel folgt der Variante');
  const plain = live.items.findIndex((it) => !it.variants.length);
  assert.equal(itemTitle(live, plain), live.items[plain].name, 'ohne Varianten: nur der Name');
  assert.equal(setVariant(live, lc, 'gibt-es-nicht'), live);

  live = addSet(live, lc);
  assert.equal(live.session.blocks[lc].sets.length, 4);
  live = toggleSet(live, lc, 0, T0);
  live = removeSet(live, lc);
  live = removeSet(live, lc);
  live = removeSet(live, lc);
  assert.equal(live.session.blocks[lc].sets.length, 1, 'erledigte Sätze bleiben, mindestens einer');
  assert.equal(live.session.blocks[lc].sets[0].done, true);

  const before = progress(live).total;
  live = setSkipped(live, 0, true);
  assert.ok(progress(live).total < before, 'übersprungene Übung zählt nicht');
  assert.ok(slotOrder(live).every(({ i }) => i !== 0));

  live = setNote(live, lc, '  Ball rutscht  ' + 'x'.repeat(3000));
  assert.equal(live.session.blocks[lc].note.length, 2000);
});

test('zuletzt genutzte Variante wird vorausgewählt', () => {
  const file = { ...fresh(), sessions: [session({ key: 'E2', blocks: [block('leg-curl', [[null, 6]], { variantId: 'stability-ball' })] })] };
  const live = startLive(file, 'E2', { now: T0 });
  assert.equal(live.session.blocks[idx(live, 'leg-curl')].variantId, 'stability-ball');
});

test('Steigerungsvorschlag übernehmen betrifft nur offene Sätze', () => {
  const file = { ...fresh(), sessions: [session({ week: 1, blocks: [block('back-squat', [[80, 5], [80, 5], [80, 5]])] })] };
  let live = startLive(file, 'E1', { now: T0, week: 2 });
  const sq = idx(live, 'back-squat');
  assert.equal(live.items[sq].increase.toKg, 82.5);
  live = toggleSet(live, sq, 0, T0);
  live = applyIncreaseTo(live, sq);
  assert.deepEqual(live.session.blocks[sq].sets.map((s) => s.kg), [80, 82.5, 82.5]);
  assert.equal(live.items[sq].increaseApplied, true);
  assert.equal(applyIncreaseTo(live, sq), live, 'nur einmal');
});

test('Abschluss liefert eine gültige Session für die Historie', () => {
  let live = startLive(fresh(), 'E1', { now: T0, id: '11111111-1111-4111-8111-111111111111' });
  assert.equal(hasAnyDone(live), false);
  for (const { i, s } of slotOrder(live).slice(0, 5)) live = toggleSet(live, i, s, T0);
  live = setSkipped(live, 8, true);
  live = setNote(live, 1, '  gut  ');
  const end = new Date(T0.getTime() + 47 * 60000);
  const sess = finishLive(live, end);
  assert.equal(sess.endedAt, end.toISOString());
  assert.equal(sess.blocks[1].note, 'gut');
  assert.equal(sess.blocks[8].skipped, true);
  assert.equal('skipped' in sess.blocks[0], false);

  const file = { ...fresh(), sessions: [sess] };
  assert.doesNotThrow(() => validateTrainingFile(structuredClone(file)));

  const sum = summarize(live, end);
  assert.equal(sum.minutes, 47);
  assert.equal(sum.setsDone, 5);
  assert.equal(sum.skipped, 1);
});

test('lokales Datum statt UTC', () => {
  assert.equal(localDate(new Date(2026, 0, 31, 23, 30)), '2026-01-31');
});

test('Gewicht geht an die folgenden offenen Sätze, wenn diese leer sind oder den alten Wert haben', () => {
  let live = startLive(fresh(), 'E1', { now: T0 });
  const i = idx(live, 'back-squat');
  live = updateSet(live, i, 0, { kg: 40 });
  assert.deepEqual(live.session.blocks[i].sets.map((x) => x.kg), [40, 40, 40]);
  live = toggleSet(live, i, 0, T0);
  live = updateSet(live, i, 2, { kg: 45 }); // eigener Wert im letzten Satz
  live = updateSet(live, i, 1, { kg: 42.5 });
  assert.deepEqual(live.session.blocks[i].sets.map((x) => x.kg), [40, 42.5, 45], 'erledigte und abweichende Sätze bleiben');
});

test('restoreLive: gültiger Stand wird wiederhergestellt, kaputter oder fremder verworfen', () => {
  const file = fresh();
  let live = startLive(file, 'E1', { now: T0 });
  live = toggleSet(live, 0, 0, T0);
  live = updateSet(live, 1, 0, { kg: 80 });
  const back = restoreLive(file, structuredClone(live), validateSession);
  assert.equal(back.session.blocks[0].sets[0].done, true);
  assert.equal(back.session.blocks[1].sets[0].kg, 80);
  assert.equal(back.items.length, live.items.length);
  assert.deepEqual(back.rest, live.rest);

  assert.equal(restoreLive(file, { ...live, items: 'kaputt' }, validateSession).items.length, live.items.length, 'items kommen aus dem Plan');
  assert.equal(restoreLive(file, { ...live, version: 99 }, validateSession), null);
  assert.equal(restoreLive(file, { ...live, fileId: 'andere' }, validateSession), null);
  assert.throws(() => restoreLive(file, { ...live, session: { ...live.session, blocks: 'x' } }, validateSession));
  const wrong = structuredClone(live);
  wrong.session.blocks[0].exerciseId = 'gibt-es-nicht';
  assert.equal(restoreLive(file, wrong, validateSession), null);
  assert.equal(restoreLive(file, { ...live, rest: { endsAt: 'x' } }, validateSession).rest, null);
});
