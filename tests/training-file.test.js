import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validatePlan, validateTrainingFile, LIMITS, SCHEMA_VERSION } from '../training/src/model/validate.js';
import {
  createTrainingFile, mergeTrainingFiles, replacePlan, summarize, trainingFileName, bumpRevision, themeFor,
} from '../training/src/model/training-file.js';
import { newId } from '../training/src/model/id.js';
import { planRaw, session, block } from './helpers.js';

const plan = validatePlan(planRaw());
const T0 = new Date('2026-01-01T10:00:00Z');
const T1 = new Date('2026-01-02T10:00:00Z');

test('neue Datei hat leere Historie und Standard-Einstellungen', () => {
  const f = createTrainingFile(plan, { now: T0 });
  assert.equal(f.schemaVersion, SCHEMA_VERSION);
  assert.equal(f.createdAt, T0.toISOString());
  assert.match(f.fileId, /^[0-9a-f-]{36}$/);
  assert.equal(f.revision, 0);
  assert.deepEqual(f.settings, { theme: 'dark', view: 'list' });
  assert.deepEqual(f.progress, { currentWeek: 1, status: 'active' });
  assert.deepEqual(f.sessions, []);
  assert.notEqual(f.plan, plan, 'Plan wird kopiert');
});

test('bumpRevision erhöht revision, setzt updatedAt und bleibt an der Obergrenze stehen', () => {
  const f = bumpRevision(createTrainingFile(plan, { now: T0 }), T1);
  assert.equal(f.revision, 1);
  assert.equal(f.updatedAt, T1.toISOString());
  assert.equal(bumpRevision({ ...f, revision: LIMITS.maxRevision }).revision, LIMITS.maxRevision);
});

test('Merge: höhere revision gewinnt, fehlende Sessions werden per ID ergänzt', () => {
  const base = createTrainingFile(plan, { now: T0 });
  const a = session({ date: '2026-01-01' });
  const b = session({ date: '2026-01-04' });
  const c = session({ date: '2026-01-08' });
  const local = { ...base, revision: 3, sessions: [a, c], settings: { theme: 'light', view: 'list' } };
  const incoming = { ...base, revision: 5, sessions: [a, b], settings: { theme: 'fancy', view: 'focus' } };

  const r = mergeTrainingFiles(local, incoming, T1);
  assert.equal(r.winner, 'incoming');
  assert.equal(r.addedSessions, 1);
  assert.equal(r.addedFrom, 'local');
  assert.deepEqual(r.file.sessions.map((s) => s.id), [a.id, b.id, c.id], 'chronologisch sortiert');
  assert.deepEqual(r.file.settings, incoming.settings, 'Einstellungen vom Gewinner');
  assert.equal(r.file.revision, 6, 'zusammengeführter Stand bekommt neue Revision');
  assert.equal(r.file.updatedAt, T1.toISOString());
});

test('Merge: niedrigere revision verliert, ohne neue Sessions bleibt alles gleich', () => {
  const base = createTrainingFile(plan, { now: T0 });
  const a = session();
  const local = { ...base, revision: 5, sessions: [a] };
  const incoming = { ...base, revision: 2, sessions: [a] };
  const r = mergeTrainingFiles(local, incoming, T1);
  assert.equal(r.winner, 'local');
  assert.equal(r.changed, false);
  assert.equal(r.file.revision, 5);
});

test('Merge: gleiche revision behält lokal, ergänzt aber fremde Sessions', () => {
  const base = createTrainingFile(plan, { now: T0 });
  const local = { ...base, revision: 2, sessions: [session()] };
  const incoming = { ...base, revision: 2, sessions: [session()] };
  const r = mergeTrainingFiles(local, incoming, T1);
  assert.equal(r.winner, 'local');
  assert.equal(r.file.sessions.length, 2);
  assert.equal(r.file.revision, 3);
});

test('Merge: verschiedene fileId wird verweigert', () => {
  const a = createTrainingFile(plan);
  const b = createTrainingFile(plan);
  assert.throws(() => mergeTrainingFiles(a, b));
});

test('Merge verändert die Eingaben nicht', () => {
  const base = createTrainingFile(plan, { now: T0 });
  const local = { ...base, revision: 1, sessions: [session()] };
  const incoming = { ...base, revision: 2, sessions: [session()] };
  const before = structuredClone([local, incoming]);
  mergeTrainingFiles(local, incoming, T1);
  assert.deepEqual([local, incoming], before);
});

test('neuer Plan behält die Historie und meldet unbekannte Übungen', () => {
  const f = {
    ...createTrainingFile(plan, { now: T0 }),
    progress: { currentWeek: 6, status: 'active' },
    sessions: [session({ blocks: [block('back-squat', [[80, 5]]), block('alte-uebung', [[10, 10]])] })],
  };
  const newPlan = structuredClone(plan);
  newPlan.weeks = 4;
  newPlan.name = 'Neuer Plan';
  const r = replacePlan(f, newPlan, T1);
  assert.equal(r.file.sessions.length, 1);
  assert.equal(r.file.plan.name, 'Neuer Plan');
  assert.equal(r.file.progress.currentWeek, 4, 'Woche wird auf die neue Planlänge begrenzt');
  assert.equal(r.file.revision, 1);
  assert.equal(r.file.fileId, f.fileId);
  assert.deepEqual(r.unmatchedExerciseIds, ['alte-uebung']);
});

test('Zusammenfassung für die Vorschau', () => {
  assert.deepEqual(summarize({ plan }), { planName: plan.name, weeks: 7, planSessions: 2, exercises: 21, history: null });
  const s = summarize({ plan, sessions: [session({ date: '2026-03-05' }), session({ date: '2026-02-01' }), session({ ended: false })] });
  assert.deepEqual(s.history, { count: 2, activities: 0, from: '2026-02-01', to: '2026-03-05' });
});

test('Dateiname aus dem Plannamen ist sicher', () => {
  assert.equal(trainingFileName('Ganzkörper 7 Wochen – Kraft & Sprung'), 'ganzkoerper-7-wochen-kraft-sprung.training.json');
  assert.equal(trainingFileName('../../etc/passwd'), 'etc-passwd.training.json');
  assert.equal(trainingFileName('<script>'), 'script.training.json');
  assert.equal(trainingFileName('   '), 'training.training.json');
  assert.ok(trainingFileName('x'.repeat(500)).length <= 60 + '.training.json'.length);
});

test('Stil: gespeicherter Wert, sonst prefers-color-scheme; undefined überschreibt den Standard nicht', () => {
  assert.equal(themeFor({ theme: 'fancy' }, true), 'fancy');
  assert.equal(themeFor({}, true), 'light');
  assert.equal(themeFor(undefined, false), 'dark');
  assert.equal(themeFor({ theme: 'undefined' }, false), 'dark');
  const f = createTrainingFile(plan, { settings: { theme: undefined } });
  assert.equal(f.settings.theme, 'dark');
});


test('IDs auch ohne crypto.randomUUID (unsicherer Kontext, z. B. http://<IP>)', () => {
  const noUuid = { getRandomValues: (a) => globalThis.crypto.getRandomValues(a) };
  const ids = new Set(Array.from({ length: 50 }, () => newId(noUuid)));
  assert.equal(ids.size, 50);
  for (const id of ids) assert.match(id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  const f = createTrainingFile(plan);
  assert.doesNotThrow(() => validateTrainingFile(structuredClone({ ...f, fileId: newId(noUuid) })));
});
