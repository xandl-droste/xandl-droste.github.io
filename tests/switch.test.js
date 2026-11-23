// Wechsel der aktiven Trainingsdatei und Aufräumen des Browserspeichers (model/switch.js, Review r4 Code-Qualität M3/M4).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validatePlan, SCHEMA_VERSION } from '../training/src/model/validate.js';
import { createTrainingFile, serialize } from '../training/src/model/training-file.js';
import { createSuccessorFile } from '../training/src/model/carry-over.js';
import { isSwitch, needsBackupFirst, classifyOtherFiles, mergeWithStored } from '../training/src/model/switch.js';
import { planRaw, session, block } from './helpers.js';

const plan = validatePlan(planRaw());
const T0 = new Date('2026-01-08T08:00:00Z');
const withSessions = (f, n, rev = 3) => ({ ...f, revision: rev, sessions: Array.from({ length: n }, (_, k) => session({ date: `2026-01-1${k}`, blocks: [block('back-squat', [[80, 5]])] })) });
const saved = (f) => ({ revision: f.revision, at: new Date(Date.parse(f.updatedAt) + 1000).toISOString(), method: 'share' });

test('isSwitch: nur bei anderer fileId', () => {
  const a = createTrainingFile(plan, { now: T0 });
  assert.equal(isSwitch(a, a), false);
  assert.equal(isSwitch(a, { ...a, revision: 9 }), false, 'gleiche Datei, neuerer Stand: Abgleich, kein Wechsel');
  assert.equal(isSwitch(a, createSuccessorFile(a, plan)), true);
  assert.equal(isSwitch(null, a), false, 'ohne aktive Datei gibt es nichts zu verlassen');
});

test('needsBackupFirst: nur beim Wechsel und nur, wenn die bisherige ungesichert ist', () => {
  const a = withSessions(createTrainingFile(plan, { now: T0 }), 2);
  const next = createSuccessorFile(a, plan);
  assert.equal(needsBackupFirst(a, null, next), true, 'nie gesichert');
  assert.equal(needsBackupFirst(a, saved(a), next), false, 'gesichert');
  assert.equal(needsBackupFirst(a, { ...saved(a), revision: a.revision - 1 }, next), true, 'Stand nach der Sicherung geändert');
  assert.equal(needsBackupFirst(a, null, { ...a, revision: 9 }), false, 'gleiche Datei: kein Wechsel');
  const empty = createTrainingFile(plan, { now: T0 });
  assert.equal(needsBackupFirst(empty, null, createSuccessorFile(empty, plan)), false, 'neue Datei ohne Änderungen');
});

test('classifyOtherFiles: gesichert entfernen, ungesichert anbieten, beschädigt melden, neuere Version behalten', () => {
  const backedUp = withSessions(createTrainingFile(plan, { now: T0 }), 1);
  const open = withSessions(createTrainingFile(plan, { now: T0 }), 2, 5);
  const broken = { ...createTrainingFile(plan, { now: T0 }), revision: -1 };
  const future = { ...createTrainingFile(plan, { now: T0 }), schemaVersion: SCHEMA_VERSION + 1 };
  // Doppelte Trainings (älterer Fehler) werden repariert statt die Datei als beschädigt zu melden.
  const dup = withSessions(createTrainingFile(plan, { now: T0 }), 1, 2);
  dup.sessions = [dup.sessions[0], { ...dup.sessions[0] }];
  const r = classifyOtherFiles([
    { file: JSON.parse(serialize(backedUp)), lastExport: saved(backedUp) },
    { file: JSON.parse(serialize(open)), lastExport: null },
    { file: broken, lastExport: null },
    { file: future, lastExport: null },
    { file: JSON.parse(serialize(dup)), lastExport: saved(dup) },
    { file: { nichts: true }, lastExport: null },
  ]);
  assert.deepEqual(r.remove, [backedUp.fileId, dup.fileId]);
  assert.deepEqual(r.offer.map((f) => f.fileId), [open.fileId]);
  assert.deepEqual(r.unreadable.map((u) => [u.fileId, u.newer]), [[broken.fileId, false], [future.fileId, true]]);
  assert.equal(r.unreadable[0].name, plan.name);
});

test('mergeWithStored: älterer Stand im Browser wird zusammengeführt statt ersetzt', () => {
  const base = withSessions(createTrainingFile(plan, { now: T0 }), 1, 4);
  // Im Browser: ein Training mehr, ungesichert (Revision 5). Geöffnet wird die ältere Sicherung (Revision 4).
  const stored = { ...base, revision: 5, sessions: [...base.sessions, session({ date: '2026-01-20', blocks: [block('back-squat', [[85, 5]])] })] };
  const m = mergeWithStored(stored, base);
  assert.equal(m.file.sessions.length, 2, 'Training aus dem Browser bleibt');
  assert.equal(m.sameAsIncoming, false, 'Ergebnis weicht von der Datei ab: gilt nicht als gesichert');
  const same = mergeWithStored(base, { ...base, revision: 6 });
  assert.equal(same.sameAsIncoming, true, 'Datei ist neuer und enthält alles: gilt als gesichert');
});
