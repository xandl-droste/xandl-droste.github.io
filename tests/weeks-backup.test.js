import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validatePlan } from '../training/src/model/validate.js';
import { createTrainingFile } from '../training/src/model/training-file.js';
import { isWeekComplete, deriveProgress, setCurrentWeek, nextPlanSession } from '../training/src/model/weeks.js';
import { backupStatus, backupText, sessionSaveState } from '../training/src/model/backup.js';
import { planRaw, session, unit } from './helpers.js';

const plan = validatePlan(planRaw());
const fileWith = (sessions, progress = { currentWeek: 1, status: 'active' }) => ({
  ...createTrainingFile(plan, { now: new Date('2026-01-01T00:00:00Z') }),
  sessions,
  progress,
});

test('Woche ist fertig, wenn alle Einheiten absolviert sind', () => {
  assert.equal(isWeekComplete(plan, [unit({ key: 'E1', week: 1 })], 1), false);
  assert.equal(isWeekComplete(plan, [unit({ key: 'E1', week: 1 }), unit({ key: 'E2', week: 1 })], 1), true);
  assert.equal(isWeekComplete(plan, [unit({ key: 'E1', week: 1 }), unit({ key: 'E2', week: 1, ended: false })], 1), false);
});

test('currentWeek rückt nach fertiger Woche vor', () => {
  const f = fileWith([unit({ key: 'E1', week: 1 }), unit({ key: 'E2', week: 1 })]);
  assert.deepEqual(deriveProgress(f), { currentWeek: 2, status: 'active', planCompleted: false });
  assert.equal(nextPlanSession({ ...f, progress: { currentWeek: 2, status: 'active' } }).key, 'E1');
});

test('nächste Einheit ist die erste offene der Woche', () => {
  const f = fileWith([unit({ key: 'E1', week: 1 })]);
  assert.equal(nextPlanSession(f).key, 'E2');
});

test('manuell gesetzte Woche ist der Ausgangspunkt und geht nicht zurück', () => {
  const f = setCurrentWeek(fileWith([]), 4);
  assert.deepEqual(deriveProgress(f), { currentWeek: 4, status: 'active', planCompleted: false });
  assert.throws(() => setCurrentWeek(f, 8), RangeError);
  assert.throws(() => setCurrentWeek(f, 0), RangeError);
});

test('nach der letzten Woche: Plan abgeschlossen (Dialog nur einmal)', () => {
  const s = [unit({ key: 'E1', week: 7 }), unit({ key: 'E2', week: 7 })];
  const f = fileWith(s, { currentWeek: 7, status: 'active' });
  assert.deepEqual(deriveProgress(f), { currentWeek: 7, status: 'completed', planCompleted: true });
  const done = fileWith(s, { currentWeek: 7, status: 'completed' });
  assert.equal(deriveProgress(done).planCompleted, false);
  assert.equal(setCurrentWeek(done, 3).progress.status, 'active');
});

test('Backup-Status: nie exportiert, exportiert, neue Änderungen, 7 Tage', () => {
  const now = new Date('2026-01-10T12:00:00Z');
  const a = session({ date: '2026-01-02' });
  const b = session({ date: '2026-01-09' });
  const f = { ...fileWith([a, b]), revision: 4 };

  const never = backupStatus(f, null, now);
  assert.equal(never.unsavedChanges, true);
  assert.deepEqual(never.unsavedSessionIds, [a.id, b.id]);
  assert.equal(never.remind, true);

  const fresh = backupStatus(f, { revision: 4, at: '2026-01-09T10:00:00Z' }, now);
  assert.equal(fresh.unsavedChanges, false);
  assert.deepEqual(fresh.unsavedSessionIds, []);
  assert.equal(fresh.remind, false);

  const partly = backupStatus(f, { revision: 3, at: '2026-01-05T00:00:00Z' }, now);
  assert.deepEqual(partly.unsavedSessionIds, [b.id]);
  assert.equal(partly.remind, true);

  const old = backupStatus(f, { revision: 4, at: '2026-01-02T12:00:00Z' }, now);
  assert.equal(old.daysSinceExport, 8);
  assert.equal(old.remind, true, 'Erinnerung nach 7 Tagen ohne Export');

  assert.equal(backupStatus(fileWith([]), null, now).remind, false, 'ohne Trainings keine Erinnerung');
});

test('Backup: Änderung bei gleicher Revision (Obergrenze erreicht) gilt trotzdem als nicht gesichert', () => {
  const file = { revision: 5, updatedAt: '2026-01-02T10:00:00Z', sessions: [{ id: 'a', endedAt: '2026-01-02T09:00:00Z' }] };
  assert.equal(backupStatus(file, { revision: 5, at: '2026-01-02T11:00:00Z' }).unsavedChanges, false);
  assert.equal(backupStatus(file, { revision: 5, at: '2026-01-02T08:00:00Z' }).unsavedChanges, true);
});

test('Backup: Korrektur nach dem Export gilt im Verlauf nicht als gesichert, Hinweise richtig formuliert (Review r3 Code M2)', () => {
  const now = new Date('2026-01-10T12:00:00Z');
  const a = session({ date: '2026-01-02' });
  const f = { ...fileWith([a]), revision: 5 };
  // Exportiert mit Revision 4, danach eine Korrektur am alten Training (Revision 5): kein neues Training.
  const st = backupStatus(f, { revision: 4, at: '2026-01-09T10:00:00Z' }, now);
  assert.equal(st.unsavedChanges, true);
  assert.deepEqual(st.unsavedSessionIds, []);
  assert.equal(sessionSaveState(st, a.id), null, 'nicht „gesichert“ anzeigen');
  assert.equal(backupText(st), 'Änderungen sind noch nicht als Datei gesichert.');

  const clean = backupStatus(f, { revision: 5, at: '2026-01-09T10:00:00Z' }, now);
  assert.equal(sessionSaveState(clean, a.id), 'saved');
  assert.equal(backupText(clean), null);
  assert.equal(sessionSaveState(backupStatus(f, null, now), a.id), 'unsaved');
  assert.equal(backupText(backupStatus(f, { revision: 5, at: '2026-01-09T10:00:00Z' }, new Date('2026-01-17T10:00:00Z'))), 'Letzte Sicherung vor 8 Tagen.');
  assert.equal(backupText({ unsavedSessionIds: [], unsavedChanges: false, remind: true, daysSinceExport: 1 }), 'Letzte Sicherung vor 1 Tag.');
});
