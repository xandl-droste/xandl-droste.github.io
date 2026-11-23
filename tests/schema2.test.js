// Schema 2 (Version 2.0): Hauptübungen, RIR, RPE und Notiz pro Training, Namen in Trainings,
// Anlagedatum, Vorgänger und Startwerte. Siehe docs/entwurf-2.0.md.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validatePlan, validateTrainingFile, validateSession, ValidationError, SCHEMA_VERSION, LIMITS } from '../training/src/model/validate.js';
import { createTrainingFile, serialize, replacePlan, trainingFileName, fileNameOf, withBlockNames } from '../training/src/model/training-file.js';
import { createSuccessorFile, buildCarryOver, performanceSessions } from '../training/src/model/carry-over.js';
import { startLive, toggleSet, addSet, setRir, rirDue, finishLive, restoreLive } from '../training/src/model/live.js';
import { finishInto } from '../training/src/model/finish.js';
import { nameIndex, setLoggedRir, setSessionRpe, setSessionNote } from '../training/src/model/history.js';
import { planRaw, session, block } from './helpers.js';

const T0 = new Date('2026-01-08T08:00:00Z');
const T1 = new Date('2026-03-01T08:00:00Z');

/** Beispielplan mit Hauptübungen (back-squat und romanian-deadlift). */
function mainPlanRaw() {
  const raw = planRaw();
  const plan = raw.plan ?? raw;
  for (const ps of plan.sessions) {
    for (const b of ps.blocks) for (const ex of b.exercises) if (['back-squat', 'romanian-deadlift'].includes(ex.id)) ex.main = true;
  }
  return raw;
}
const mainPlan = () => validatePlan((({ plan, ...rest }) => plan ?? rest)(mainPlanRaw()));
const plan = validatePlan((({ plan: p, ...rest }) => p ?? rest)(planRaw()));
const idx = (live, id) => live.items.findIndex((it) => it.exerciseId === id);
const errorsOf = (fn) => {
  try {
    fn();
  } catch (e) {
    if (e instanceof ValidationError) return e.errors;
    throw e;
  }
  assert.fail('keine ValidationError');
};

/** Alle Sätze einer Übung abhaken. */
function finishExercise(live, i, now = T0) {
  let l = live;
  for (let s = 0; s < l.session.blocks[i].sets.length; s++) if (!l.session.blocks[i].sets[s].done) l = toggleSet(l, i, s, now);
  return l;
}

// ---------- Validator ----------

test('Schema 2: Major-Version 2, Dateien aus 1.x werden gelesen und auf 2 gehoben', () => {
  assert.equal(SCHEMA_VERSION, 2);
  const old = { ...createTrainingFile(plan, { now: T0 }), schemaVersion: 1 };
  delete old.createdAt;
  old.sessions = [session({ blocks: [block('back-squat', [[80, 5]])] })];
  const f = validateTrainingFile(JSON.parse(serialize(old)));
  assert.equal(f.schemaVersion, 2);
  assert.equal(f.createdAt, undefined);
  assert.equal(f.sessions[0].blocks[0].name, undefined, 'Namen werden beim Lesen nicht erfunden');
});

test('Plan: main ist optional, true bleibt, false entfällt, andere Werte sind Fehler', () => {
  const p = mainPlan();
  const ex = p.sessions[0].blocks[1].exercises[0];
  assert.equal(ex.id, 'back-squat');
  assert.equal(ex.main, true);
  assert.equal(p.sessions[0].blocks[0].exercises[0].main, undefined);

  const raw = mainPlanRaw();
  const pl = raw.plan ?? raw;
  pl.sessions[0].blocks[0].exercises[0].main = false;
  assert.equal(validatePlan(pl).sessions[0].blocks[0].exercises[0].main, undefined);
  pl.sessions[0].blocks[0].exercises[0].main = 'ja';
  assert.match(errorsOf(() => validatePlan(pl)).join('\n'), /main: muss true oder false sein/);
});

test('Trainingsdatei: neue Felder werden übernommen und geprüft', () => {
  const file = createSuccessorFile(createTrainingFile(plan, { now: T0 }), plan, { now: T1 });
  file.sessions = [{
    ...session({ blocks: [block('back-squat', [[80, 5]], { name: 'Back Squat', rirLast: 2 }), block('leg-curl', [[null, 6]], { variantId: 'slider', name: 'Leg Curl', variantName: 'A: Slider' })] }),
    rpe: 7,
    note: 'schlecht geschlafen',
  }];
  const f = validateTrainingFile(JSON.parse(serialize(file)));
  assert.equal(f.createdAt, T1.toISOString());
  assert.equal(f.previous.planName, plan.name);
  assert.match(f.previous.fileName, /-2026-01-08-[0-9a-f]{4}\.training\.json$/);
  assert.equal(f.sessions[0].rpe, 7);
  assert.equal(f.sessions[0].note, 'schlecht geschlafen');
  assert.equal(f.sessions[0].blocks[0].rirLast, 2);
  assert.equal(f.sessions[0].blocks[0].name, 'Back Squat');
  assert.equal(f.sessions[0].blocks[1].variantName, 'A: Slider');
});

test('Trainingsdatei: ungültige Werte der neuen Felder werden abgelehnt', () => {
  const base = createTrainingFile(plan, { now: T0 });
  const withSession = (extra, blockExtra = {}) => ({
    ...base,
    sessions: [{ ...session({ blocks: [block('back-squat', [[80, 5]], blockExtra)] }), ...extra }],
  });
  assert.match(errorsOf(() => validateTrainingFile(withSession({ rpe: 11 }))).join('\n'), /rpe: muss eine ganze Zahl zwischen 0 und 10/);
  assert.match(errorsOf(() => validateTrainingFile(withSession({ rpe: 6.5 }))).join('\n'), /rpe/);
  assert.match(errorsOf(() => validateTrainingFile(withSession({}, { rirLast: 5 }))).join('\n'), /rirLast: muss eine ganze Zahl zwischen 0 und 4/);
  assert.match(errorsOf(() => validateTrainingFile(withSession({}, { rirLast: -1 }))).join('\n'), /rirLast/);
  assert.match(errorsOf(() => validateTrainingFile(withSession({ note: 'x'.repeat(LIMITS.maxNote + 1) }))).join('\n'), /note: zu lang/);
  assert.match(errorsOf(() => validateTrainingFile({ ...base, createdAt: 'gestern' })).join('\n'), /createdAt/);

  const prev = { fileId: base.fileId, fileName: 'plan-2026-01-01.training.json', planName: 'Plan' };
  assert.match(errorsOf(() => validateTrainingFile({ ...base, previous: { ...prev, fileName: '../geheim.txt' } })).join('\n'), /previous\.fileName/);
  assert.match(errorsOf(() => validateTrainingFile({ ...base, previous: { ...prev, fileId: 'x' } })).join('\n'), /previous\.fileId: UUID erwartet/);
  assert.match(errorsOf(() => validateTrainingFile({ ...base, previous: { ...prev, extra: 1 } })).join('\n'), /previous\.extra: unbekanntes Feld/);

  const carry = { exerciseId: 'back-squat', date: '2026-01-01', variantId: null, plannedSets: 3, repsMax: 5, sets: [{ kg: 80, reps: 5, sec: null }] };
  assert.equal(validateTrainingFile({ ...base, carryOver: [carry] }).carryOver[0].exerciseId, 'back-squat');
  assert.match(errorsOf(() => validateTrainingFile({ ...base, carryOver: [carry, carry] })).join('\n'), /"back-squat" ist doppelt/);
  const { plannedSets, ...noSets } = carry;
  assert.match(errorsOf(() => validateTrainingFile({ ...base, carryOver: [noSets] })).join('\n'), /plannedSets fehlt/);
  assert.match(errorsOf(() => validateTrainingFile({ ...base, carryOver: [{ ...carry, sets: [] }] })).join('\n'), /sets: darf nicht leer sein/);
  assert.match(errorsOf(() => validateTrainingFile({ ...base, carryOver: [{ ...carry, sets: [{ kg: 1, reps: 1, sec: null, done: true }] }] })).join('\n'), /done: unbekanntes Feld/);
  assert.match(errorsOf(() => validateTrainingFile({ ...base, carryOver: [{ ...carry, date: '2026-02-30' }] })).join('\n'), /ungültiges Datum/);
});

// ---------- Dateinamen ----------

test('Dateiname: Planname, Anlagedatum und 4 Zeichen der fileId, ältere Dateien ohne Datum', () => {
  assert.equal(trainingFileName('Ganzkörper 7 Wochen', '2026-01-08T08:00:00Z', 'A1B2c3d4-0000-4000-8000-000000000000'), 'ganzkoerper-7-wochen-2026-01-08-a1b2.training.json');
  assert.equal(trainingFileName('Ganzkörper 7 Wochen', '2026-01-08T08:00:00Z'), 'ganzkoerper-7-wochen-2026-01-08.training.json');
  assert.equal(trainingFileName('Ganzkörper 7 Wochen'), 'ganzkoerper-7-wochen.training.json');
  const f = createTrainingFile(plan, { now: T0, fileId: 'abcd0000-0000-4000-8000-000000000000' });
  assert.equal(fileNameOf(f), 'ganzkoerper-7-wochen-kraft-sprung-2026-01-08-abcd.training.json');
  const { createdAt, ...old } = f;
  assert.equal(fileNameOf(old), 'ganzkoerper-7-wochen-kraft-sprung-abcd.training.json', '1.x: ohne Datum, aber eindeutig');
});

test('Dateiname: Vorgänger und Nachfolger vom selben Tag heißen nie gleich (Review r4 Code-Qualität M2)', () => {
  const a = createTrainingFile(plan, { now: T0 });
  const b = createSuccessorFile(a, plan, { now: T0 });
  const c = createSuccessorFile(b, plan, { now: T0 });
  assert.equal(new Set([a, b, c].map(fileNameOf)).size, 3);
  assert.equal(c.previous.fileName, fileNameOf(b));
  const old1 = { ...createTrainingFile(plan) };
  const old2 = { ...createTrainingFile(plan) };
  delete old1.createdAt;
  delete old2.createdAt;
  assert.notEqual(fileNameOf(old1), fileNameOf(old2), 'zwei 1.x-Dateien desselben Plans');
});

// ---------- RIR im laufenden Training ----------

test('RIR: nur bei Hauptübungen und erst nach dem letzten Satz', () => {
  const file = createTrainingFile(mainPlan(), { now: T0 });
  let live = startLive(file, 'E1', { now: T0 });
  const sq = idx(live, 'back-squat');
  const jump = idx(live, 'trap-bar-jump');
  assert.equal(live.items[sq].main, true);
  assert.equal(live.items[jump].main, false);

  live = toggleSet(live, sq, 0, T0);
  assert.equal(rirDue(live, sq), false, 'vor dem letzten Satz nicht fällig');
  assert.equal(setRir(live, sq, 2), live, 'nicht fällig: keine Änderung');

  live = finishExercise(live, sq);
  assert.equal(rirDue(live, sq), true);
  live = setRir(live, sq, 2);
  assert.equal(live.session.blocks[sq].rirLast, 2);
  assert.equal(setRir(live, sq, 5), live, 'mehr als 4 wird verworfen');
  assert.equal(setRir(live, sq, 1.5), live);

  live = finishExercise(live, jump);
  assert.equal(rirDue(live, jump), false, 'keine Hauptübung');
  assert.equal(setRir(live, jump, 1), live);

  assert.equal(setRir(live, sq, null).session.blocks[sq].rirLast, undefined, 'null entfernt den Wert');
});

test('RIR: Rückgängig und Satz hinzufügen entfernen den Wert', () => {
  const file = createTrainingFile(mainPlan(), { now: T0 });
  const sq = idx(startLive(file, 'E1', { now: T0 }), 'back-squat');
  let live = setRir(finishExercise(startLive(file, 'E1', { now: T0 }), sq), sq, 3);
  assert.equal(live.session.blocks[sq].rirLast, 3);
  const undone = toggleSet(live, sq, 2, T0);
  assert.equal(undone.session.blocks[sq].rirLast, undefined);
  const added = addSet(live, sq);
  assert.equal(added.session.blocks[sq].rirLast, undefined);
  assert.equal(rirDue(added, sq), false, 'neuer offener Satz: wieder nicht fällig');
});

test('RIR: übersteht Neustart der App', () => {
  const file = createTrainingFile(mainPlan(), { now: T0 });
  const sq = idx(startLive(file, 'E1', { now: T0 }), 'back-squat');
  const live = setRir(finishExercise(startLive(file, 'E1', { now: T0, id: 'live-0002' }), sq), sq, 1);
  const stored = JSON.parse(JSON.stringify(live));
  const back = restoreLive(file, stored, validateSession);
  assert.equal(back.session.blocks[sq].rirLast, 1);
});

// ---------- Abschluss ----------

test('Abschluss: Namen, RIR, RPE und Notiz im fertigen Training', () => {
  const file = createTrainingFile(mainPlan(), { now: T0 });
  let live = startLive(file, 'E2', { now: T0 });
  const lc = idx(live, 'leg-curl');
  const bss = idx(live, 'bulgarian-split-squat');
  live = setRir(finishExercise(finishExercise(live, lc), bss), bss, 4);
  const s = finishLive(live, new Date('2026-01-08T09:20:00Z'), { rpe: 8, note: '  müde  ' });
  assert.equal(s.rpe, 8);
  assert.equal(s.note, 'müde');
  assert.equal(s.blocks[lc].name, 'Leg Curl');
  assert.match(s.blocks[lc].variantName, /Slider/);
  assert.equal(s.blocks[bss].rirLast, undefined, 'bulgarian-split-squat ist in diesem Plan keine Hauptübung');

  const file2 = createTrainingFile(mainPlan(), { now: T0 });
  let live2 = startLive(file2, 'E1', { now: T0 });
  const sq = idx(live2, 'back-squat');
  live2 = setRir(finishExercise(live2, sq), sq, 0);
  const s2 = finishLive(live2, T0);
  assert.equal(s2.blocks[sq].rirLast, 0, 'RIR 0 wird gespeichert');
  assert.equal(s2.rpe, undefined);
  assert.equal(s2.note, undefined);
  assert.equal(finishLive(live2, T0, { rpe: 11 }).rpe, undefined, 'ungültige RPE wird verworfen');
  assert.equal(finishLive(live2, T0, { rpe: 0 }).rpe, 0);

  const { file: done } = finishInto(file2, live2, T0, { rpe: 6, note: 'gut' });
  const back = validateTrainingFile(JSON.parse(serialize(done)));
  assert.equal(back.sessions[0].rpe, 6);
  assert.equal(back.sessions[0].blocks[sq].rirLast, 0);
});

// ---------- Korrigieren im Verlauf ----------

test('Verlauf: RIR, RPE und Notiz korrigieren, gleiche Werte ändern nichts', () => {
  const s = { ...session({ blocks: [block('back-squat', [[80, 5]], { rirLast: 2 })] }), rpe: 7 };
  const file = { ...createTrainingFile(plan, { now: T0 }), sessions: [s] };

  const a = setLoggedRir(file, s.id, 0, 1, T1);
  assert.equal(a.sessions[0].blocks[0].rirLast, 1);
  assert.equal(a.revision, file.revision + 1);
  assert.equal(setLoggedRir(file, s.id, 0, 2, T1), file);
  assert.equal(setLoggedRir(file, s.id, 0, 7, T1), file);
  assert.equal(setLoggedRir(file, s.id, 0, null, T1).sessions[0].blocks[0].rirLast, undefined);

  assert.equal(setSessionRpe(file, s.id, 9, T1).sessions[0].rpe, 9);
  assert.equal(setSessionRpe(file, s.id, 7, T1), file);
  assert.equal(setSessionRpe(file, s.id, 11, T1), file);
  assert.equal(setSessionRpe(file, s.id, null, T1).sessions[0].rpe, undefined);

  const n = setSessionNote(file, s.id, ' Knie zwickt ', T1);
  assert.equal(n.sessions[0].note, 'Knie zwickt');
  assert.equal(setSessionNote(n, s.id, 'Knie zwickt', T1), n);
  assert.equal(setSessionNote(n, s.id, '  ', T1).sessions[0].note, undefined);
});

test('Namen: gespeicherter Name vor dem Plan, Plan ersetzen hält alte Namen fest', () => {
  const names = nameIndex(plan);
  assert.equal(names.blockExercise({ exerciseId: 'back-squat' }), 'Back Squat');
  assert.equal(names.blockExercise({ exerciseId: 'back-squat', name: 'Kniebeuge' }), 'Kniebeuge');
  assert.equal(names.blockExercise({ exerciseId: 'weg' }), 'weg');
  assert.match(names.blockVariant({ exerciseId: 'leg-curl', variantId: 'slider' }), /Slider/);
  assert.equal(names.blockVariant({ exerciseId: 'leg-curl', variantId: 'slider', variantName: 'Gleiter' }), 'Gleiter');
  assert.equal(names.blockVariant({ exerciseId: 'back-squat', variantId: null }), null);

  const s = session({ blocks: [block('back-squat', [[80, 5]]), block('leg-curl', [[null, 6]], { variantId: 'slider' })] });
  const file = { ...createTrainingFile(plan, { now: T0 }), sessions: [s] };
  const other = structuredClone(plan);
  other.name = 'Anderer Plan';
  other.sessions = [other.sessions[1]]; // back-squat fliegt raus
  const { file: next } = replacePlan(file, other, T1);
  assert.equal(next.sessions[0].blocks[0].name, 'Back Squat');
  assert.match(next.sessions[0].blocks[1].variantName, /Slider/);
  assert.equal(nameIndex(next.plan).blockExercise(next.sessions[0].blocks[0]), 'Back Squat');
  assert.equal(file.sessions[0].blocks[0].name, undefined, 'Eingabe bleibt unverändert');
  assert.deepEqual(withBlockNames([{ ...s, blocks: [{ ...s.blocks[0], name: 'Eigen' }] }], plan)[0].blocks[0].name, 'Eigen');
});

// ---------- Nachfolger und Startwerte ----------

function previousRun() {
  const f = createTrainingFile(plan, { now: T0 });
  f.sessions = [
    session({ date: '2026-01-10', blocks: [block('back-squat', [[80, 5], [82.5, 5], [82.5, 5]], { plannedSets: 3, repsMax: 5 }), block('trap-bar-jump', [[40, 4]])] }),
    session({ date: '2026-01-20', week: 2, blocks: [block('back-squat', [[85, 5], [85, 5], [85, 5]], { plannedSets: 3, repsMax: 5, note: 'tief' })] }),
    // Deload zählt nicht für die Startwerte
    { ...session({ date: '2026-02-20', week: 7, blocks: [block('back-squat', [[68, 5], [68, 5]], { plannedSets: 2, repsMax: 5 })] }), cycle: 1, deload: true },
  ];
  return f;
}

test('Nachfolger: Verweis auf den Vorgänger, Startwerte aus der letzten Leistung außerhalb des Deloads', () => {
  const prev = previousRun();
  const next = createSuccessorFile(prev, plan, { now: T1 });
  assert.notEqual(next.fileId, prev.fileId);
  assert.deepEqual(next.previous, { fileId: prev.fileId, fileName: fileNameOf(prev), planName: plan.name });
  assert.equal(next.sessions.length, 0);
  assert.equal(next.progress.currentWeek, 1);
  assert.deepEqual(next.settings, prev.settings);
  const sq = next.carryOver.find((c) => c.exerciseId === 'back-squat');
  assert.deepEqual(sq, {
    exerciseId: 'back-squat', date: '2026-01-20', variantId: null, plannedSets: 3, repsMax: 5,
    sets: [{ kg: 85, reps: 5, sec: null }, { kg: 85, reps: 5, sec: null }, { kg: 85, reps: 5, sec: null }],
    note: 'tief',
  });
  // Ältere Trainings ohne gespeicherte Vorgabe: Vorgabe aus dem Plan des Vorgängers
  const tb = next.carryOver.find((c) => c.exerciseId === 'trap-bar-jump');
  assert.equal(tb.plannedSets, 3);
  assert.equal(tb.repsMax, 4);
  assert.equal(next.carryOver.length, 2, 'nur Übungen mit Leistung');
  validateTrainingFile(JSON.parse(serialize(next)));
});

test('Nachfolger: Startwerte nur für Übungen des neuen Plans, Kette über mehrere Durchgänge', () => {
  const prev = previousRun();
  const e2only = structuredClone(plan);
  e2only.sessions = [plan.sessions[1]];
  assert.deepEqual(buildCarryOver(prev, e2only), [], 'back-squat ist im neuen Plan nicht enthalten');

  const second = createSuccessorFile(prev, plan, { now: T1 });
  const third = createSuccessorFile(second, plan, { now: new Date('2026-05-01T08:00:00Z') });
  assert.equal(third.previous.fileId, second.fileId);
  assert.equal(third.carryOver.find((c) => c.exerciseId === 'back-squat').date, '2026-01-20',
    'ohne eigenes Training übernimmt der Nachfolger die Startwerte des Vorgängers');
});

test('Startwerte: Vorbelegung und Steigerungsvorschlag im neuen Durchgang', () => {
  const next = createSuccessorFile(previousRun(), plan, { now: T1 });
  const live = startLive(next, 'E1', { now: T1 });
  const sq = live.items[idx(live, 'back-squat')];
  assert.deepEqual(live.session.blocks[idx(live, 'back-squat')].sets.map((s) => s.kg), [85, 85, 85]);
  assert.equal(sq.last.date, '2026-01-20');
  assert.equal(sq.lastNote, 'tief');
  assert.deepEqual(sq.increase && [sq.increase.fromKg, sq.increase.toKg], [85, 87.5], 'alle 3 × 5 geschafft: +2,5 kg');

  // Ein eigenes Training geht den Startwerten vor
  const own = { ...next, sessions: [session({ date: '2026-03-02', blocks: [block('back-squat', [[87.5, 4], [87.5, 4], [87.5, 4]], { plannedSets: 3, repsMax: 5 })] })] };
  const live2 = startLive(own, 'E1', { now: new Date('2026-03-05T08:00:00Z') });
  assert.deepEqual(live2.session.blocks[idx(live2, 'back-squat')].sets.map((s) => s.kg), [87.5, 87.5, 87.5]);
  assert.equal(live2.items[idx(live2, 'back-squat')].increase, null);
});

test('Startwerte erscheinen nicht als Trainings', () => {
  const next = createSuccessorFile(previousRun(), plan, { now: T1 });
  assert.equal(next.sessions.length, 0);
  const perf = performanceSessions(next);
  assert.ok(perf.length > 0 && perf.every((s) => s.carry === true));
  const prev = previousRun();
  assert.equal(performanceSessions(prev), prev.sessions, 'ohne Startwerte unverändert');
});
