// Durchgänge, Wochen-Ableitung, Vorbelegung über Planwochen hinweg, Korrigieren und Löschen im Verlauf.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validatePlan, validateTrainingFile, validateSession, ValidationError, LIMITS } from '../training/src/model/validate.js';
import { createTrainingFile, mergeTrainingFiles, deleteSession, replacePlan, serialize } from '../training/src/model/training-file.js';
import {
  isWeekComplete, deriveProgress, setCurrentWeek, nextPlanSession, repeatWeek, startNewCycle, currentWeekComplete,
  countsAsUnitDone, doneShare, MIN_DONE_SHARE, withDerivedProgress,
} from '../training/src/model/weeks.js';
import { startLive, toggleSet, finishLive, slotOrder, restoreLive, applyIncreaseTo } from '../training/src/model/live.js';
import { suggestSets, progressionReached, lastPerformance, isDeloadSession } from '../training/src/model/progression.js';
import { readImportFiles, previewImport, applyImports, defaultPlanChoice } from '../training/src/model/import.js';
import { updateLoggedSet, setLoggedNote, loggedUnit } from '../training/src/model/history.js';
import { planRaw, planText, session, block, unit } from './helpers.js';

const plan = validatePlan(planRaw());
const ex = (id) => plan.sessions.flatMap((s) => s.blocks.flatMap((b) => b.exercises)).find((e) => e.id === id);
const fakeFile = (name, text) => ({ name, size: new TextEncoder().encode(text).length, text: async () => text });
const roundTrip = (f) => validateTrainingFile(JSON.parse(serialize(f)));
const errorsOf = (fn) => {
  try { fn(); } catch (e) { assert.ok(e instanceof ValidationError); return e.errors; }
  return assert.fail('ValidationError erwartet');
};

// ---------- Simulation: der Nutzer macht genau die Vorgabe der Woche ----------

let clock = Date.parse('2026-01-05T08:00:00Z');
const tick = () => new Date((clock += 2 * 24 * 3600 * 1000));

/**
 * Spielt ein Training: alle (bzw. `sets`) Sätze erledigt, Werte wie vorbelegt. Ohne Vorbelegung 100 kg.
 * Liefert die Datei nach dem Abschluss und den Live-Stand beim Start.
 */
function play(file, key, { sets = Infinity, onStart = () => {} } = {}) {
  const now = tick();
  let live = startLive(file, key, { now });
  onStart(live);
  live.session.blocks.forEach((b, i) => {
    if (live.items[i].unit === 'kg') for (const st of b.sets) if (st.kg == null) st.kg = 100;
  });
  for (const { i, s } of slotOrder(live).slice(0, sets)) live = toggleSet(live, i, s, now);
  const sess = finishLive(live, new Date(now.getTime() + 3600_000));
  let next = { ...file, sessions: [...file.sessions, sess] };
  const p = deriveProgress(next);
  next = { ...next, progress: { ...next.progress, currentWeek: p.currentWeek, status: p.status } };
  return { file: next, live, planCompleted: p.planCompleted };
}

const itemOf = (live, id) => live.items.find((it) => it.exerciseId === id);
const blockOf = (live, id) => live.session.blocks[live.items.findIndex((it) => it.exerciseId === id)];

test('Regression: ein ganzer Durchgang des Beispielplans, dann „Plan erneut starten“', () => {
  let file = createTrainingFile(plan, { now: new Date(clock) });
  const offers = { 'romanian-deadlift': [], 'back-squat': [] };
  let completedDialogs = 0;
  for (let w = 1; w <= plan.weeks; w++) {
    assert.equal(file.progress.currentWeek, w, `Woche ${w}`);
    for (const key of ['E1', 'E2']) {
      const r = play(file, key, {
        onStart: (live) => {
          assert.equal(live.session.week, w);
          for (const it of live.items) {
            const b = blockOf(live, it.exerciseId);
            if (it.unit !== 's' && it.repsMin === it.repsMax) {
              assert.ok(b.sets.every((st) => st.reps === it.repsMin), `${it.exerciseId} Woche ${w}: Wdh. ${b.sets.map((st) => st.reps)} statt ${it.repsMin}`);
            }
            if (it.unit === 's') assert.ok(b.sets.every((st) => st.sec === it.durationSec), `${it.exerciseId} Woche ${w}: Haltezeit`);
            if (offers[it.exerciseId]) offers[it.exerciseId].push(it.increase ? `${w}:${it.increase.reps}` : null);
            if (w === 7) {
              assert.equal(it.increase, null, `Deload: kein Vorschlag (${it.exerciseId})`);
              if (it.unit === 'kg' && b.sets[0].kg != null) assert.equal(b.sets[0].kg, 80, `Deload-Gewicht ${it.exerciseId}`);
            }
          }
          assert.equal(live.session.deload, w === 7 ? true : undefined);
          assert.equal(live.session.cycle, 1);
        },
      });
      file = r.file;
      if (r.planCompleted) completedDialogs++;
    }
  }
  assert.equal(file.progress.status, 'completed');
  assert.equal(completedDialogs, 1);
  // RDL 6 → 7 → 8 → 6 → 7 → 8: nur beim Sprung zurück auf 6 eine Steigerung (mit 6 Wdh.).
  assert.deepEqual(offers['romanian-deadlift'], [null, null, null, '4:6', null, null, null]);
  // Back Squat 5 → 5: jede Woche nach der ersten, nie im Deload.
  assert.deepEqual(offers['back-squat'], [null, '2:5', '3:5', '4:5', '5:5', '6:5', null]);
  assert.doesNotThrow(() => roundTrip(file), 'gespeicherter Stand besteht den Validator');

  // Neuer Durchgang mit demselben Plan
  file = startNewCycle(file);
  assert.deepEqual([file.progress.currentWeek, file.progress.status, file.progress.cycle], [1, 'active', 2]);
  assert.equal(currentWeekComplete(file), false, 'Woche 1 ist im neuen Durchgang offen');
  assert.equal(nextPlanSession(file).key, 'E1');
  const r = play(file, 'E1', {
    onStart: (live) => {
      assert.equal(live.session.cycle, 2);
      const rdl = itemOf(live, 'romanian-deadlift');
      assert.equal(rdl.last.week, 6, '„Letztes Mal“ aus Woche 6, nicht aus dem Deload');
      assert.ok(blockOf(live, 'romanian-deadlift').sets.every((st) => st.kg === 100 && st.reps === 6));
      assert.deepEqual(rdl.increase, { fromKg: 100, toKg: 102.5, reps: 6, incrementKg: 2.5 }, 'Steigerung auf Basis von Woche 6');
      assert.equal(itemOf(live, 'back-squat').increase.fromKg, 100);
    },
  });
  file = r.file;
  assert.equal(r.planCompleted, false);
  assert.deepEqual([file.progress.currentWeek, file.progress.status], [1, 'active'], 'ein Training schließt den Plan nicht ab');
  assert.equal(nextPlanSession(file).key, 'E2');

  // Woche wiederholen: E2 fertig → Woche 2, zurück auf 1, wiederholen
  file = play(file, 'E2').file;
  assert.equal(file.progress.currentWeek, 2);
  file = setCurrentWeek(file, 1);
  assert.equal(file.progress.cycle, 2, 'Woche setzen behält den Durchgang');
  assert.equal(currentWeekComplete(file), true);
  assert.equal(nextPlanSession(file).key, 'E1');
  file = repeatWeek(file, tick());
  assert.equal(currentWeekComplete(file), false);
  file = play(file, 'E1').file;
  assert.equal(file.progress.currentWeek, 1, 'nach E1 noch Woche 1');
  file = play(file, 'E2').file;
  assert.equal(file.progress.currentWeek, 2);

  // Weniger als die Hälfte der Sätze: Einheit bleibt offen
  const half = play(file, 'E1', { sets: 3 });
  assert.equal(countsAsUnitDone(half.file.sessions.at(-1)), false);
  assert.equal(nextPlanSession(half.file).key, 'E1');
  file = play(half.file, 'E1').file;
  assert.equal(nextPlanSession(file).key, 'E2');

  // Gelöschtes Training kommt über eine ältere Datei nicht zurück
  const older = roundTrip(file);
  const victim = file.sessions.at(-1).id;
  file = deleteSession(file, victim);
  assert.equal(file.progress.currentWeek, 2, 'Woche bleibt');
  const m = mergeTrainingFiles(file, older);
  assert.equal(m.file.sessions.some((s) => s.id === victim), false);
  assert.equal(m.addedSessions, 0);
  assert.doesNotThrow(() => roundTrip(m.file));
});

// ---------- Wochen-Ableitung ----------

test('Wochen-Ableitung zählt nur den aktuellen Durchgang und Sessions ab repeatFrom', () => {
  const old = [unit({ key: 'E1', week: 1 }), unit({ key: 'E2', week: 1 })];
  assert.equal(isWeekComplete(plan, old, 1), true, 'ohne cycle: Durchgang 1');
  assert.equal(isWeekComplete(plan, old, 1, { cycle: 2 }), false);
  const c2 = [unit({ key: 'E1', week: 1 }), unit({ key: 'E2', week: 1 })].map((s) => ({ ...s, cycle: 2 }));
  assert.equal(isWeekComplete(plan, [...old, ...c2], 1, { cycle: 2 }), true);
  assert.equal(isWeekComplete(plan, old, 1, { cycle: 1, repeatFrom: '2026-01-01T08:30:00Z' }), false, 'vor repeatFrom begonnen');
  assert.equal(isWeekComplete(plan, old, 1, { cycle: 1, repeatFrom: '2026-01-01T07:00:00Z' }), true);
});

test('Plan „abgeschlossen“ entsteht nicht aus alten Sessions nach dem Zurücksetzen der Woche', () => {
  const sessions = [];
  for (let w = 1; w <= 7; w++) for (const key of ['E1', 'E2']) sessions.push(unit({ key, week: w }));
  const base = { ...createTrainingFile(plan), sessions, progress: { currentWeek: 7, status: 'completed' } };
  // Woche manuell zurück auf 1: ohne Wiederholen springt die Ableitung weiter (alte Sessions zählen) …
  const back = setCurrentWeek(base, 1);
  assert.equal(deriveProgress(back).status, 'completed');
  // … mit „Woche wiederholen“ nicht mehr.
  const rep = repeatWeek(back, new Date('2026-02-01T00:00:00Z'));
  assert.equal(rep.progress.repeatFrom, '2026-02-01T00:00:00.000Z');
  assert.equal(rep.revision, back.revision + 1);
  assert.deepEqual(deriveProgress(rep), { currentWeek: 1, status: 'active', planCompleted: false });
  // Neuer Durchgang entfernt repeatFrom
  const nc = startNewCycle(rep, new Date('2026-02-02T00:00:00Z'));
  assert.deepEqual(nc.progress, { currentWeek: 1, status: 'active', cycle: 2 });
  assert.equal(nc.revision, rep.revision + 1);
});

test('Einheit zählt erst ab der Hälfte aller Sätze (auch übersprungene im Nenner)', () => {
  assert.equal(MIN_DONE_SHARE, 0.5);
  const s = (blocks) => session({ blocks });
  assert.equal(countsAsUnitDone(s([block('a', [[1, 1], [1, 1, false]])])), true, 'genau die Hälfte');
  assert.equal(countsAsUnitDone(s([block('a', [[1, 1], [1, 1, false], [1, 1, false]])])), false);
  const skipped = s([block('a', [[1, 1], [1, 1]]), block('b', [[1, 1, false], [1, 1, false], [1, 1, false]], { skipped: true })]);
  assert.deepEqual(doneShare(skipped), { done: 2, total: 5, share: 0.4 });
  assert.equal(countsAsUnitDone(skipped), false);
  assert.equal(countsAsUnitDone(s([])), false, 'ohne Sätze');
  const f = { ...createTrainingFile(plan), sessions: [s([block('a', [[1, 1], [1, 1, false], [1, 1, false]])]), unit({ key: 'E2' })] };
  assert.equal(nextPlanSession(f).key, 'E1');
});

test('withDerivedProgress: neue Revision nur bei Änderung, Durchgang bleibt', () => {
  const f = { ...createTrainingFile(plan), progress: { currentWeek: 1, status: 'active', cycle: 3 } };
  assert.equal(withDerivedProgress(f), f);
  const done = { ...f, sessions: [unit({ key: 'E1' }), unit({ key: 'E2' })].map((s) => ({ ...s, cycle: 3 })) };
  const d = withDerivedProgress(done);
  assert.deepEqual(d.progress, { currentWeek: 2, status: 'active', cycle: 3 });
  assert.equal(d.revision, f.revision + 1);
});

// ---------- Start, Abschluss, Wiederherstellen ----------

test('startLive schreibt Durchgang, Deload-Kennzeichen und die gültige Vorgabe; finishLive behält sie', () => {
  const file = { ...createTrainingFile(plan), progress: { currentWeek: 7, status: 'active', cycle: 2 } };
  const live = startLive(file, 'E1', { now: new Date('2026-03-01T08:00:00Z') });
  assert.equal(live.session.cycle, 2);
  assert.equal(live.session.deload, true);
  const rdl = blockOf(live, 'romanian-deadlift');
  assert.deepEqual([rdl.plannedSets, rdl.repsMax, rdl.durationSec], [2, 8, undefined]);
  const w1 = startLive({ ...file, progress: { currentWeek: 1, status: 'active' } }, 'E1');
  assert.equal(w1.session.cycle, 1);
  assert.equal('deload' in w1.session, false);
  const hip = blockOf(w1, 'hip-flexor-knee-raise');
  assert.deepEqual([hip.plannedSets, hip.repsMax, hip.durationSec], [3, undefined, 15]);

  let l = toggleSet(live, 0, 0);
  const sess = finishLive(l);
  assert.equal(sess.cycle, 2);
  assert.equal(sess.deload, true);
  assert.equal(sess.blocks[live.items.findIndex((it) => it.exerciseId === 'romanian-deadlift')].repsMax, 8);
  const back = roundTrip({ ...file, sessions: [sess] });
  assert.deepEqual(back.sessions[0], JSON.parse(JSON.stringify(sess)));

  // Laufendes Training übersteht den Neustart samt Feldern
  l = toggleSet(startLive(file, 'E1'), 0, 0);
  const restored = restoreLive(file, structuredClone(l), validateSession);
  assert.equal(restored.session.cycle, 2);
  assert.equal(restored.session.deload, true);
  assert.equal(blockOf(restored, 'romanian-deadlift').plannedSets, 2);
  // Älterer gespeicherter Stand ohne die Felder: aus dem Plan ergänzt
  const legacy = structuredClone(l);
  delete legacy.session.cycle;
  delete legacy.session.deload;
  for (const b of legacy.session.blocks) { delete b.plannedSets; delete b.repsMax; delete b.durationSec; }
  const r2 = restoreLive(file, legacy, validateSession);
  assert.equal(r2.session.cycle, 2);
  assert.equal(blockOf(r2, 'romanian-deadlift').repsMax, 8);
});

// ---------- Vorbelegung und Progression ----------

const rdl = ex('romanian-deadlift');
const squat = ex('back-squat');

test('Deload-Session: Kennzeichen, sonst (alte Daten ohne cycle) Deload-Wochen des Plans', () => {
  assert.equal(isDeloadSession(plan, { week: 3, deload: true, cycle: 1 }), true);
  assert.equal(isDeloadSession(plan, { week: 7, cycle: 1 }), false, 'mit cycle ohne deload: kein Deload');
  assert.equal(isDeloadSession(plan, { week: 7 }), true, 'alte Daten');
  assert.equal(isDeloadSession(plan, { week: 6 }), false);
});

test('nach einem Deload: Vorbelegung aus der letzten Arbeitswoche, Steigerung auf deren Basis', () => {
  const hist = [
    session({ date: '2026-02-01', week: 6, blocks: [block('back-squat', [[100, 5], [100, 5], [100, 5]])] }),
    { ...session({ date: '2026-02-08', week: 7, blocks: [block('back-squat', [[80, 5], [80, 5]])] }), cycle: 1, deload: true },
  ];
  const s = suggestSets(plan, squat, 1, hist);
  assert.ok(s.sets.every((x) => x.kg === 100));
  assert.equal(s.last.date, '2026-02-01');
  assert.equal(s.increase.toKg, 102.5);
  // Nur Deload-Leistungen vorhanden: Vorbelegung daraus, aber kein Vorschlag
  const only = [hist[1]];
  const s2 = suggestSets(plan, squat, 1, only);
  assert.equal(s2.sets[0].kg, 80);
  assert.equal(s2.increase, null);
});

test('Progressionsregel nutzt die beim Start gespeicherte Vorgabe, nicht den heutigen Plan', () => {
  // Damals galt 3 × 10 (gespeichert). Der heutige Plan sagt für diese Woche 3 × 6.
  const b = { ...block('romanian-deadlift', [[90, 10], [90, 10], [90, 10]]), plannedSets: 3, repsMax: 10 };
  const hist = [{ ...session({ week: 1, blocks: [b] }), cycle: 1 }];
  const last = lastPerformance(hist, 'romanian-deadlift');
  assert.equal(progressionReached(plan, rdl, last), true);
  const b2 = { ...block('romanian-deadlift', [[90, 6], [90, 6], [90, 6]]), plannedSets: 3, repsMax: 10 };
  assert.equal(progressionReached(plan, rdl, lastPerformance([{ ...session({ week: 1, blocks: [b2] }), cycle: 1 }], 'romanian-deadlift')), false, 'gespeichertes repsMax 10 nicht erreicht');
  const b3 = { ...block('romanian-deadlift', [[90, 6], [90, 6]]), plannedSets: 2, repsMax: 6 };
  assert.equal(progressionReached(plan, rdl, lastPerformance([{ ...session({ week: 1, blocks: [b3] }), cycle: 1 }], 'romanian-deadlift')), true, 'gespeicherte Satzzahl 2');
  // Woche 4 (6 Wdh.) nach gespeichertem repsMax 10: Wdh. nicht angehoben → Vorschlag
  assert.equal(suggestSets(plan, rdl, 4, hist).increase.toKg, 92.5);
});

test('Haltezeit: neue Vorgabe der Woche, wenn sie sich geändert hat, sonst wie beim letzten Mal', () => {
  const plank = ex('copenhagen-plank');
  const p2 = structuredClone(plan);
  const cp = p2.sessions[0].blocks[4].exercises[1];
  cp.byWeek = { 2: { durationSec: 30 } };
  const hist = [{ ...session({ week: 1, blocks: [{ ...block('copenhagen-plank', [[null, null, true, 25], [null, null, true, 25]]), plannedSets: 2, durationSec: 20 }] }), cycle: 1 }];
  assert.ok(suggestSets(p2, cp, 2, hist).sets.every((x) => x.sec === 30), 'Vorgabe 20 → 30');
  assert.ok(suggestSets(plan, plank, 2, hist).sets.every((x) => x.sec === 25), 'Vorgabe gleich: Wert vom letzten Mal');
});

test('Steigerung übernehmen nach Rückkehr auf 6 Wdh.: neues Gewicht, 6 Wdh.', () => {
  const hist = [session({ week: 3, blocks: [block('romanian-deadlift', [[100, 8], [100, 8], [100, 8]])] })];
  const file = { ...createTrainingFile(plan), sessions: hist, progress: { currentWeek: 4, status: 'active' } };
  let live = startLive(file, 'E1');
  const i = live.items.findIndex((it) => it.exerciseId === 'romanian-deadlift');
  live = applyIncreaseTo(live, i);
  assert.deepEqual(live.session.blocks[i].sets.map((s) => [s.kg, s.reps]), [[102.5, 6], [102.5, 6], [102.5, 6]]);
});

// ---------- Import ----------

test('Plan-Import bei vorhandener Trainingsdatei: Anpassen, Nachfolger, Ganz neu, Vorbelegung, Fortschritt neu abgeleitet', async () => {
  const sessions = [];
  for (let w = 1; w <= 7; w++) for (const key of ['E1', 'E2']) sessions.push(unit({ key, week: w }));
  const completed = { ...createTrainingFile(plan), revision: 9, sessions, progress: { currentWeek: 7, status: 'completed' } };
  const running = { ...completed, sessions: sessions.slice(0, 6), progress: { currentWeek: 4, status: 'active' } };
  assert.equal(defaultPlanChoice(completed), 'successor');
  assert.equal(defaultPlanChoice(running), 'keep');
  const r = await readImportFiles([fakeFile('plan.json', planText)]);
  const pv = previewImport(completed, r.items)[0];
  assert.deepEqual([pv.action, pv.defaultChoice, pv.currentWeek, pv.historyCount], ['choose', 'successor', 7, 14]);
  assert.equal(previewImport(running, r.items)[0].defaultChoice, 'keep');

  // Vorbelegung (keine Wahl): Nachfolger in einer neuen Trainingsdatei, Woche 1, Verweis und Startwerte
  const c = applyImports(completed, r.items, {}, { now: new Date('2026-03-01T08:00:00Z') }).file;
  assert.deepEqual(c.progress, { currentWeek: 1, status: 'active' });
  assert.equal(c.sessions.length, 0);
  assert.notEqual(c.fileId, completed.fileId);
  assert.equal(c.previous.fileId, completed.fileId);
  assert.ok(c.carryOver.some((x) => x.exerciseId === 'back-squat'), 'Startwerte aus dem Vorgänger');
  assert.equal(completed.sessions.length, 14, 'bisherige Trainingsdatei unverändert');
  // Anpassen: gleiche Woche, gleicher Durchgang; danach abgeleitet (alle Wochen fertig → abgeschlossen, ohne Dialog)
  const k = applyImports(completed, r.items, { 0: 'keep' }).file;
  assert.deepEqual(k.progress, { currentWeek: 7, status: 'completed' });
  const k2 = applyImports(running, r.items, { 0: 'keep' }).file;
  assert.deepEqual(k2.progress, { currentWeek: 4, status: 'active' });
  // Ganz neu: leere Historie
  const n = applyImports(running, r.items, { 0: 'new' }).file;
  assert.equal(n.sessions.length, 0);
  assert.notEqual(n.fileId, running.fileId);
  assert.equal(n.previous, undefined);
  assert.equal(n.carryOver, undefined);
  // Unbekannte Wahl fällt auf die Vorbelegung zurück
  assert.equal(applyImports(completed, r.items, { 0: 'quatsch' }).file.previous?.fileId, completed.fileId);
  assert.equal(applyImports(completed, r.items, { 0: 'cycle' }).file.previous?.fileId, completed.fileId, 'alte Wahl „Von vorn“ gibt es nicht mehr');
  for (const f of [c, k, k2, n]) assert.doesNotThrow(() => roundTrip(f));
});

test('Gesamtstand-Import: Fortschritt wird aus der Historie abgeleitet', async () => {
  const f = { ...createTrainingFile(plan), revision: 3, sessions: [unit({ key: 'E1' }), unit({ key: 'E2' })] };
  const r = await readImportFiles([fakeFile('x.training.json', serialize(f))]);
  const a = applyImports(null, r.items).file;
  assert.equal(a.progress.currentWeek, 2);
  assert.equal(a.revision, 4);
});

test('replacePlan behält Durchgang und repeatFrom', () => {
  const f = { ...createTrainingFile(plan), progress: { currentWeek: 3, status: 'active', cycle: 2, repeatFrom: '2026-01-01T00:00:00.000Z' } };
  assert.deepEqual(replacePlan(f, plan).file.progress, f.progress);
});

// ---------- Löschen und Zusammenführen ----------

test('Löschen: Tombstone, Revision, Woche bleibt; Merge vereinigt Tombstones in beide Richtungen', () => {
  const a = unit({ key: 'E1', date: '2026-01-01' });
  const b = unit({ key: 'E2', date: '2026-01-02' });
  const base = { ...createTrainingFile(plan), revision: 4, sessions: [a, b], progress: { currentWeek: 2, status: 'active' } };
  const del = deleteSession(base, a.id);
  assert.deepEqual(del.sessions.map((s) => s.id), [b.id]);
  assert.deepEqual(del.deletedSessionIds, [a.id]);
  assert.equal(del.revision, 5);
  assert.equal(del.progress.currentWeek, 2);
  assert.equal(deleteSession(del, 'gibt-es-nicht'), del);

  // Ältere Datei (niedrigere Revision) bringt das Training nicht zurück
  const m1 = mergeTrainingFiles(del, base);
  assert.deepEqual(m1.file.sessions.map((s) => s.id), [b.id]);
  assert.equal(m1.changed, false);
  // Gelöscht auf dem anderen Gerät (Datei neuer oder älter): fällt lokal heraus
  const m2 = mergeTrainingFiles(base, del);
  assert.deepEqual(m2.file.sessions.map((s) => s.id), [b.id]);
  assert.deepEqual(m2.file.deletedSessionIds, [a.id]);
  const m3 = mergeTrainingFiles({ ...base, revision: 9 }, del);
  assert.equal(m3.winner, 'local');
  assert.equal(m3.removedSessions, 1);
  assert.deepEqual(m3.file.sessions.map((s) => s.id), [b.id]);
  assert.deepEqual(m3.file.deletedSessionIds, [a.id]);
  assert.equal(m3.file.revision, 10);
  assert.equal(m3.changed, true);
  assert.doesNotThrow(() => roundTrip(m3.file));
});

test('Tombstones sind begrenzt, die ältesten fallen heraus', () => {
  const ids = Array.from({ length: LIMITS.maxDeletedSessions }, (_, i) => `00000000-0000-4000-9000-${String(i).padStart(12, '0')}`);
  const s = unit();
  const f = { ...createTrainingFile(plan), sessions: [s], deletedSessionIds: ids };
  const d = deleteSession(f, s.id);
  assert.equal(d.deletedSessionIds.length, LIMITS.maxDeletedSessions);
  assert.equal(d.deletedSessionIds.at(-1), s.id);
  assert.equal(d.deletedSessionIds[0], ids[1]);
  assert.doesNotThrow(() => roundTrip(d));
});

// ---------- Korrigieren im Verlauf ----------

test('Satzwerte und Notiz eines beendeten Trainings korrigieren', () => {
  const s = unit({ blocks: [block('back-squat', [[80, 5], [80, 4]])] });
  const f = { ...createTrainingFile(plan), revision: 2, sessions: [s] };
  const e = updateLoggedSet(f, s.id, 0, 1, { kg: '82,5', reps: 5 });
  assert.deepEqual([e.sessions[0].blocks[0].sets[1].kg, e.sessions[0].blocks[0].sets[1].reps], [82.5, 5]);
  assert.equal(e.revision, 3);
  assert.equal(f.sessions[0].blocks[0].sets[1].kg, 80, 'Eingabe unverändert');
  assert.equal(updateLoggedSet(e, s.id, 0, 1, { kg: 82.5 }), e, 'gleicher Wert: keine neue Revision');
  assert.equal(updateLoggedSet(e, s.id, 0, 9, { kg: 1 }), e);
  assert.equal(updateLoggedSet(e, 'x', 0, 0, { kg: 1 }), e);
  assert.equal(updateLoggedSet(e, s.id, 0, 0, { kg: 1e9 }).sessions[0].blocks[0].sets[0].kg, LIMITS.maxKg);
  const n = setLoggedNote(e, s.id, 0, '  Knie gut  ' + 'x'.repeat(3000));
  assert.ok(n.sessions[0].blocks[0].note.startsWith('Knie gut'));
  assert.ok(n.sessions[0].blocks[0].note.length <= LIMITS.maxNote);
  assert.equal(n.revision, 4);
  assert.doesNotThrow(() => roundTrip(n));
});

test('Einheit zum Bearbeiten: Haltezeit erkennen, sonst aus dem Plan', () => {
  assert.equal(loggedUnit('bodyweight', block('h', [[null, null, true, 15]])), 's');
  assert.equal(loggedUnit('bodyweight', block('h', [[null, 8]])), 'bodyweight');
  assert.equal(loggedUnit('bodyweight', { ...block('h', [[null, null, false]]), durationSec: 15 }), 's');
  assert.equal(loggedUnit(null, block('x', [[10, 10]])), 'kg');
});

// ---------- Validator ----------

test('Validator: neue optionale Felder mit Grenzen', () => {
  const base = createTrainingFile(plan);
  const s = { ...unit(), cycle: 2, deload: true };
  s.blocks[0] = { ...s.blocks[0], plannedSets: 3, repsMax: 5, durationSec: 20 };
  const ok = { ...base, progress: { currentWeek: 2, status: 'active', cycle: 2, repeatFrom: '2026-01-01T00:00:00.000Z' }, sessions: [s], deletedSessionIds: ['abcdefgh-1234'] };
  const v = roundTrip(ok);
  assert.deepEqual(v.progress, ok.progress);
  assert.deepEqual(v.sessions[0], JSON.parse(JSON.stringify(s)));
  assert.deepEqual(v.deletedSessionIds, ['abcdefgh-1234']);
  // deload: false wird weggelassen
  assert.equal('deload' in validateTrainingFile({ ...ok, sessions: [{ ...s, deload: false }] }).sessions[0], false);

  const bad = structuredClone(ok);
  bad.progress.cycle = 0;
  bad.progress.repeatFrom = 'gestern';
  bad.sessions[0].cycle = LIMITS.maxCycles + 1;
  bad.sessions[0].deload = 'ja';
  bad.sessions[0].blocks[0].plannedSets = LIMITS.maxSets + 1;
  bad.sessions[0].blocks[0].repsMax = 0;
  bad.sessions[0].blocks[0].durationSec = 1.5;
  bad.deletedSessionIds = ['<script>', 'abcdefgh-1234', 'abcdefgh-1234', 7];
  const errs = errorsOf(() => validateTrainingFile(bad));
  for (const p of ['progress.cycle', 'progress.repeatFrom', 'sessions[0].cycle', 'sessions[0].deload', 'sessions[0].blocks[0].plannedSets',
    'sessions[0].blocks[0].repsMax', 'sessions[0].blocks[0].durationSec', 'deletedSessionIds[0]', 'deletedSessionIds[2]', 'deletedSessionIds[3]']) {
    assert.ok(errs.some((e) => e.startsWith(`${p}:`)), `${p} in ${errs.join(' | ')}`);
  }
  const many = { ...ok, deletedSessionIds: Array.from({ length: LIMITS.maxDeletedSessions + 1 }, (_, i) => `abcdefgh-${i}`) };
  assert.ok(errorsOf(() => validateTrainingFile(many)).some((e) => e.startsWith('deletedSessionIds: zu viele')));
  assert.equal('deletedSessionIds' in validateTrainingFile(structuredClone(base)), false, 'fehlt bleibt weg');
});
