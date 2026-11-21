import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validatePlan, validateTrainingFile, validateSession } from '../training/src/model/validate.js';
import { createTrainingFile } from '../training/src/model/training-file.js';
import { startLive, toggleSet, restoreLive } from '../training/src/model/live.js';
import { finishInto, isAlreadyFinished, dropDuplicateSessions } from '../training/src/model/finish.js';
import { isStale } from '../training/src/storage.js';
import { planRaw } from './helpers.js';

const plan = validatePlan(planRaw());
const T0 = new Date('2026-01-08T08:00:00Z');
const T1 = new Date('2026-01-08T09:00:00Z');

function oneSetDone() {
  const file = createTrainingFile(plan, { now: T0 });
  let live = startLive(file, 'E1', { now: T0, id: 'live-0001' });
  live = toggleSet(live, 0, 0, T0);
  return { file, live };
}

test('Abschluss: Training wird angehängt, Revision steigt, Datei bleibt gültig', () => {
  const { file, live } = oneSetDone();
  const r = finishInto(file, live, T1);
  assert.equal(r.file.sessions.length, 1);
  assert.equal(r.file.sessions[0].id, r.session.id);
  assert.equal(r.file.revision, file.revision + 1);
  assert.doesNotThrow(() => validateTrainingFile(structuredClone(r.file)));
});

test('Abschluss zweimal mit derselben Session: ersetzt statt doppelt (Review r3 H1)', () => {
  const { file, live } = oneSetDone();
  const first = finishInto(file, live, T1).file;
  const second = finishInto(first, live, new Date('2026-01-08T09:05:00Z')).file;
  assert.equal(second.sessions.length, 1);
  assert.equal(second.sessions[0].endedAt, '2026-01-08T09:05:00.000Z');
  assert.doesNotThrow(() => validateTrainingFile(structuredClone(second)), 'keine doppelte ID');
});

test('Start: laufender Stand eines schon beendeten Trainings wird nicht wiederhergestellt', () => {
  const { file, live } = oneSetDone();
  const done = finishInto(file, live, T1).file;
  const stored = structuredClone(live);
  assert.equal(isAlreadyFinished(done, stored), true);
  assert.equal(isAlreadyFinished(file, stored), false);
  assert.equal(restoreLive(done, stored, validateSession), null);
  assert.notEqual(restoreLive(file, structuredClone(live), validateSession), null, 'noch nicht beendet: wird wiederhergestellt');
});

test('Start: doppelte Session-IDs werden repariert statt den Stand zu verwerfen', () => {
  const { file, live } = oneSetDone();
  const done = finishInto(file, live, T1).file;
  const broken = structuredClone({ ...done, sessions: [done.sessions[0], { ...done.sessions[0] }] });
  assert.throws(() => validateTrainingFile(structuredClone(broken)));
  const { file: fixed, dropped } = dropDuplicateSessions(broken);
  assert.equal(dropped, 1);
  assert.equal(fixed.sessions.length, 1);
  assert.doesNotThrow(() => validateTrainingFile(fixed));
  assert.equal(dropDuplicateSessions(done).file, done, 'ohne Duplikate unverändert');
  assert.equal(dropDuplicateSessions(null).dropped, 0);
});

test('Speicher: Schreiben nur, wenn niemand anders inzwischen gespeichert hat (Review r3 Security M1)', () => {
  assert.equal(isStale(undefined, null), false, 'alter Speicher ohne stamp');
  assert.equal(isStale('a', 'a'), false);
  assert.equal(isStale('b', 'a'), true, 'andere Instanz hat geschrieben');
  assert.equal(isStale('b', null), true, 'andere Instanz hat als erste geschrieben');
  assert.equal(isStale('b', undefined), false, 'vor dem ersten Laden keine Prüfung');
});
