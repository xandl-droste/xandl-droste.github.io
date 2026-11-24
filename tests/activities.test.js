import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validatePlan, validateTrainingFile, ValidationError, LIMITS, SCHEMA_VERSION } from '../training/src/model/validate.js';
import { createTrainingFile, mergeTrainingFiles, serialize } from '../training/src/model/training-file.js';
import { addActivity, updateActivity, deleteActivity, activityTypeSuggestions, activitiesOf } from '../training/src/model/activities.js';
import { planRaw, unit, sid } from './helpers.js';

const plan = validatePlan(planRaw());
const T0 = new Date('2026-11-18T20:00:00Z');
const base = () => createTrainingFile(plan, { now: T0 });
const input = (extra = {}) => ({ type: 'Beachvolleyball', date: '2026-11-18', durationMin: 90, rpe: 6, note: '', ...extra });
const roundTrip = (f) => validateTrainingFile(JSON.parse(serialize(f)));

test('Schema 3: SCHEMA_VERSION ist 3, Dateien aus Schema 2 werden gelesen und gehoben', () => {
  assert.equal(SCHEMA_VERSION, 3);
  const old = { ...base(), schemaVersion: 2 };
  const f = roundTrip(old);
  assert.equal(f.schemaVersion, 3);
  assert.equal(f.activities, undefined, 'ohne Feld kein leeres Feld');
});

test('Anderes Training eintragen: Felder, Woche, Revision, Rundreise durch den Validator', () => {
  const file = { ...base(), progress: { currentWeek: 3, status: 'active' } };
  const { file: f, activity } = addActivity(file, input({ type: '  Beach  volleyball ', note: ' Turnier ' }), { now: T0, id: sid() });
  assert.equal(activity.type, 'Beach volleyball');
  assert.equal(activity.note, 'Turnier');
  assert.equal(activity.week, 3);
  assert.equal(activity.rpe, 6);
  assert.equal(activity.createdAt, T0.toISOString());
  assert.equal(f.revision, file.revision + 1);
  assert.deepEqual(roundTrip(f).activities, [activity]);
  assert.equal(file.activities, undefined, 'Eingabe bleibt unverändert');
});

test('Anderes Training: RPE und Notiz sind freiwillig', () => {
  const { activity } = addActivity(base(), input({ rpe: null, note: '' }), { now: T0, id: sid() });
  assert.equal('rpe' in activity, false);
  assert.equal('note' in activity, false);
});

test('Anderes Training: ungültige Eingaben werden abgelehnt', () => {
  const f = base();
  const bad = [
    input({ type: '   ' }),
    input({ type: 'x'.repeat(LIMITS.maxActivityType + 1) }),
    input({ durationMin: 0 }),
    input({ durationMin: LIMITS.maxActivityMin + 1 }),
    input({ durationMin: 12.5 }),
    input({ rpe: 11 }),
    input({ date: '2026-02-30' }),
  ];
  for (const b of bad) assert.throws(() => addActivity(f, b, { now: T0, id: sid() }), ValidationError, JSON.stringify(b));
  assert.throws(() => addActivity(f, input({ date: '2026-11-19' }), { now: T0, id: sid() }), RangeError, 'Zukunft');
});

test('Anderes Training: Reihenfolge nach Datum, am selben Tag nach Eintrag', () => {
  let f = base();
  f = addActivity(f, input({ date: '2026-11-18', type: 'B' }), { now: T0, id: sid() }).file;
  f = addActivity(f, input({ date: '2026-11-10', type: 'A' }), { now: new Date(T0.getTime() + 1000), id: sid() }).file;
  f = addActivity(f, input({ date: '2026-11-18', type: 'C' }), { now: new Date(T0.getTime() + 2000), id: sid() }).file;
  assert.deepEqual(activitiesOf(f).map((a) => a.type), ['A', 'B', 'C']);
});

test('Anderes Training korrigieren: Werte ändern, RPE herausnehmen, id/Woche/Eintrag bleiben', () => {
  const { file, activity } = addActivity({ ...base(), progress: { currentWeek: 2, status: 'active' } }, input(), { now: T0, id: sid() });
  const f = updateActivity(file, activity.id, { durationMin: 75, rpe: null, note: 'kurz' }, { now: T0 });
  const a = f.activities[0];
  assert.equal(a.durationMin, 75);
  assert.equal('rpe' in a, false);
  assert.equal(a.note, 'kurz');
  assert.equal(a.week, 2);
  assert.equal(a.createdAt, activity.createdAt);
  assert.equal(f.revision, file.revision + 1);
  assert.equal(updateActivity(file, 'gibt-es-nicht', { durationMin: 5 }), file);
  assert.throws(() => updateActivity(file, activity.id, { durationMin: 0 }), ValidationError);
});

test('Anderes Training löschen: ID landet in deletedSessionIds, leeres Feld entfällt', () => {
  const { file, activity } = addActivity(base(), input(), { now: T0, id: sid() });
  const f = deleteActivity(file, activity.id, T0);
  assert.equal(f.activities, undefined);
  assert.deepEqual(f.deletedSessionIds, [activity.id]);
  assert.equal(deleteActivity(f, activity.id, T0), f);
  roundTrip(f);
});

test('Zusammenführen: andere Trainings werden per ID ergänzt, gelöschte kommen nicht zurück', () => {
  const { file: a1, activity: x } = addActivity(base(), input({ type: 'X' }), { now: T0, id: sid() });
  // Gerät B: hat x und trägt y ein (höhere Revision)
  const { file: b1, activity: y } = addActivity(a1, input({ type: 'Y' }), { now: T0, id: sid() });
  // Gerät A: trägt z ein (niedrigere Revision als b1? gleich), dann Merge
  const { file: a2, activity: z } = addActivity(a1, input({ type: 'Z', date: '2026-11-17' }), { now: T0, id: sid() });
  const m = mergeTrainingFiles(a2, { ...b1, revision: b1.revision + 1 }, T0);
  assert.deepEqual(m.file.activities.map((a) => a.id).sort(), [x.id, y.id, z.id].sort());
  assert.equal(m.addedSessions, 1);
  assert.equal(m.file.activities[0].id, z.id, 'nach Datum sortiert');

  const del = deleteActivity(m.file, x.id, T0);
  const m2 = mergeTrainingFiles(del, a2, T0);
  assert.equal(m2.file.activities.some((a) => a.id === x.id), false);
  const m3 = mergeTrainingFiles({ ...a2, revision: del.revision + 5 }, del, T0);
  assert.equal(m3.file.activities.some((a) => a.id === x.id), false);
  assert.equal(m3.removedSessions, 1);
  roundTrip(m3.file);
});

test('Validator: IDs müssen über Trainings und andere Trainings eindeutig sein', () => {
  const s = unit();
  const { file } = addActivity({ ...base(), sessions: [s] }, input(), { now: T0, id: s.id });
  assert.throws(() => roundTrip(file), /ist doppelt/);
});

test('Validator: unbekannte Felder und zu viele Einträge werden abgelehnt', () => {
  const { file } = addActivity(base(), input(), { now: T0, id: sid() });
  const raw = JSON.parse(serialize(file));
  raw.activities[0].puls = 140;
  assert.throws(() => validateTrainingFile(raw), /puls/);
  const many = JSON.parse(serialize(file));
  many.activities = Array.from({ length: LIMITS.maxActivities + 1 }, () => ({ ...many.activities[0] }));
  assert.throws(() => validateTrainingFile(many), /zu viele Einträge/);
  const missing = JSON.parse(serialize(file));
  delete missing.activities[0].createdAt;
  assert.throws(() => validateTrainingFile(missing), /createdAt fehlt/);
});

test('Vorschläge für die Trainingsart: häufigste zuerst, ohne Doppelte (Groß/Klein), höchstens 6', () => {
  let f = base();
  const types = ['Laufen', 'Beachvolleyball', 'beachvolleyball', 'Yoga', 'A', 'B', 'C', 'D', 'Laufen', 'Beachvolleyball'];
  types.forEach((t, i) => { f = addActivity(f, input({ type: t }), { now: new Date(T0.getTime() + i * 1000), id: sid() }).file; });
  const s = activityTypeSuggestions(f);
  assert.equal(s.length, 6);
  assert.deepEqual(s.slice(0, 2), ['Beachvolleyball', 'Laufen']);
  assert.deepEqual(activityTypeSuggestions(base()), []);
});

test('Sheet: Entwurf und verständliche Fehlermeldungen vor dem Speichern', async () => {
  const { activityDraft, activityDraftError, ACTIVITY_DEFAULT_MIN } = await import('../training/src/views/activity.js');
  const today = '2026-11-18';
  const d = activityDraft(today);
  assert.deepEqual([d.id, d.date, d.durationMin, d.rpe], [null, today, ACTIVITY_DEFAULT_MIN, null]);
  assert.match(activityDraftError(d, today), /Trainingsart/);
  const ok = { ...d, type: 'Laufen' };
  assert.equal(activityDraftError(ok, today), null);
  assert.match(activityDraftError({ ...ok, date: '' }, today), /Datum/);
  assert.match(activityDraftError({ ...ok, date: '2026-11-19' }, today), /Zukunft/);
  for (const m of [null, 0, 601, 7.5]) assert.match(activityDraftError({ ...ok, durationMin: m }, today), /Dauer/);
  const { activity } = addActivity(base(), input({ rpe: null }), { now: T0, id: sid() });
  const e = activityDraft(today, activity);
  assert.deepEqual([e.id, e.type, e.rpe, e.note], [activity.id, 'Beachvolleyball', null, '']);
});

test('Sicherung: andere Trainings zählen als ungesichert, bis exportiert wurde', async () => {
  const { backupStatus } = await import('../training/src/model/backup.js');
  const { file, activity } = addActivity(base(), input(), { now: T0, id: sid() });
  const st = backupStatus(file, null, T0);
  assert.deepEqual(st.unsavedSessionIds, [activity.id]);
  assert.equal(st.remind, true);
  const after = backupStatus(file, { revision: file.revision, at: new Date(T0.getTime() + 1000).toISOString() }, T0);
  assert.deepEqual(after.unsavedSessionIds, []);
  assert.equal(after.unsavedChanges, false);
});

test('Verlauf: Krafttrainings und andere Trainings gemischt, neueste zuerst', async () => {
  const { historyEntries } = await import('../training/src/model/history.js');
  const s1 = unit({ date: '2026-11-10' });
  const s2 = unit({ date: '2026-11-18' });
  const open = { ...unit({ date: '2026-11-20' }), endedAt: null };
  let f = { ...base(), sessions: [s1, s2, open] };
  f = addActivity(f, input({ date: '2026-11-18', type: 'Abends' }), { now: new Date('2026-11-18T20:00:00Z'), id: sid() }).file;
  f = addActivity(f, input({ date: '2026-11-12', type: 'Mitte' }), { now: T0, id: sid() }).file;
  const e = historyEntries(f);
  assert.deepEqual(e.map((x) => (x.kind === 'session' ? x.item.date : x.item.type)), ['Abends', '2026-11-18', 'Mitte', '2026-11-10']);
  assert.deepEqual(historyEntries(base()), []);
});

test('Coach-Export: andere Trainings im Log nach Datum gemischt, Legende nur mit anderen Trainings', async () => {
  const { buildCoachExport, COACH_LEGEND, COACH_LEGEND_ACTIVITIES } = await import('../training/src/model/coach-export.js');
  const plain = buildCoachExport({ ...base(), sessions: [unit({ date: '2026-11-17' })] });
  assert.equal(plain.split('\n')[1], COACH_LEGEND);
  let f = { ...base(), progress: { currentWeek: 3, status: 'active' }, sessions: [unit({ date: '2026-11-17' })] };
  f = addActivity(f, input({ note: 'Turnier,\n4 Spiele `x`', type: 'Beach`volleyball' }), { now: T0, id: sid() }).file;
  f = addActivity(f, input({ date: '2026-11-10', type: 'Laufen', durationMin: 30, rpe: null }), { now: T0, id: sid() }).file;
  const text = buildCoachExport(f);
  assert.equal(text.split('\n')[1], `${COACH_LEGEND} · ${COACH_LEGEND_ACTIVITIES}`);
  const log = text.slice(text.indexOf('## Log'));
  const heads = log.split('\n').filter((l) => /^\d{4}-/.test(l));
  assert.equal(heads[0], "2026-11-18 Beach'volleyball · W3 · 90 min · RPE 6");
  assert.match(heads[1], /^2026-11-17 E1 W1/);
  assert.equal(heads[2], '2026-11-10 Laufen · W3 · 30 min');
  assert.match(log, /\n Notiz: Turnier, 4 Spiele 'x'\n/);
  assert.equal((text.match(/```/g) ?? []).length, 6, 'keine zusätzlichen Codeblock-Grenzen');
});

test('Agent-Prompt: andere Trainings der letzten 4 Wochen zusammengefasst', async () => {
  const { activitySummaryLines, buildAgentPrompt } = await import('../training/src/agent-prompt.js');
  let f = base();
  const add = (date, type, durationMin, rpe) => { f = addActivity(f, input({ date, type, durationMin, rpe }), { now: new Date('2026-11-18T22:00:00Z'), id: sid() }).file; };
  add('2026-10-21', 'Beachvolleyball', 90, 6); // erster Tag im Zeitraum (28 Tage bis einschließlich 17.11.)
  add('2026-10-20', 'Beachvolleyball', 200, 9); // davor, fällt heraus
  add('2026-11-05', 'beachvolleyball', 60, 5);
  add('2026-11-12', 'Beachvolleyball', 90, null);
  add('2026-11-15', 'Lauf"en`', 30, null);
  const lines = activitySummaryLines(f, '2026-11-17');
  assert.deepEqual(lines, ['"Beachvolleyball": 3× · 60–90 min · RPE 5–6', '"Lauf\\"en`": 1× · 30 min']);
  assert.deepEqual(activitySummaryLines(base(), '2026-11-17'), []);
  const plan2 = base().plan;
  const text = buildAgentPrompt({ currentPlan: plan2, activities: lines });
  assert.match(text, /Meine anderen Trainings außerhalb des Plans in den letzten 4 Wochen/);
  assert.ok(text.includes('"Lauf\\"en\\u0060": 1× · 30 min'), 'Backtick maskiert');
  assert.doesNotMatch(buildAgentPrompt({ activities: lines }), /anderen Trainings/, 'nur mit Plan');
});

// ---------- Review Runde 5 ----------

test('Trennung (r5 Code-Qualität M2): andere Trainings ändern Woche, Vorbelegung, Startwerte und „Zuletzt“ nicht', async () => {
  const { deriveProgress } = await import('../training/src/model/weeks.js');
  const { startLive } = await import('../training/src/model/live.js');
  const { createSuccessorFile } = await import('../training/src/model/carry-over.js');
  const { lastTrained } = await import('../training/src/model/history.js');
  const { block } = await import('./helpers.js');
  const kraft = { ...base(), sessions: [unit({ date: '2026-11-10', blocks: [block('back-squat', [[80, 5], [80, 5], [80, 5]])] })] };
  let mit = kraft;
  for (const [date, type] of [['2026-11-12', 'Beachvolleyball'], ['2026-11-18', 'E2'], ['2026-11-18', 'back-squat']]) {
    mit = addActivity(mit, input({ date, type }), { now: T0, id: sid() }).file;
  }
  assert.deepEqual(deriveProgress(mit), deriveProgress(kraft));
  const opts = { now: T0, id: '00000000-0000-4000-8000-00000000aaaa' };
  assert.deepEqual(startLive(mit, 'E1', opts), startLive(kraft, 'E1', opts));
  const succ = (f) => createSuccessorFile(f, f.plan, { now: T0, fileId: '11111111-1111-4111-8111-111111111111' });
  const a = succ(mit);
  assert.equal(a.activities, undefined, 'Nachfolger startet ohne andere Trainings');
  assert.deepEqual(a.carryOver, succ(kraft).carryOver);
  assert.deepEqual(lastTrained(mit, '2026-11-19'), lastTrained(kraft, '2026-11-19'));
});

test('Import-Vorschau (r5 Code-Qualität M1): andere Trainings werden gezählt', async () => {
  const { previewImport } = await import('../training/src/model/import.js');
  const { summarize, historyCountText } = await import('../training/src/model/training-file.js');
  let only = base();
  only = addActivity(only, input({ date: '2026-11-05' }), { now: T0, id: sid() }).file;
  const [p] = previewImport(null, [{ kind: 'training', name: 'x', file: only }]);
  assert.deepEqual(p.summary.history, { count: 0, activities: 1, from: '2026-11-05', to: '2026-11-05' });
  assert.equal(historyCountText(p.summary.history), '1 anderes Training');
  const mixed = { ...only, sessions: [unit({ date: '2026-11-01' }), unit({ date: '2026-11-02' })] };
  assert.equal(historyCountText(summarize(mixed).history), '2 Krafttrainings · 1 anderes Training');
  assert.equal(summarize(mixed).history.from, '2026-11-01');
  assert.equal(historyCountText(summarize({ ...base(), sessions: [unit()] }).history), '1 Training');
  assert.equal(historyCountText(summarize(base()).history), null);
  const [pp] = previewImport(mixed, [{ kind: 'plan', name: 'p', plan }]);
  assert.equal(pp.historyCount, 3);
});

test('Korrigieren ohne Änderung (r5 Code-Qualität N1): keine neue Revision', () => {
  const { file, activity } = addActivity(base(), input({ note: 'x' }), { now: T0, id: sid() });
  assert.equal(updateActivity(file, activity.id, { type: 'Beachvolleyball', durationMin: 90, rpe: 6, note: 'x' }), file);
  assert.equal(updateActivity(file, activity.id, {}), file);
  assert.notEqual(updateActivity(file, activity.id, { durationMin: 91 }), file);
});

test('Zusammenführen (r5 Code-Qualität N2, Security N3): ID-Kollision über beide Listen ergibt einen gültigen Stand', () => {
  const s = unit({ date: '2026-11-01' });
  const local = { ...base(), sessions: [s], revision: 5 };
  // präparierte Datei: anderes Training mit der ID des Trainings
  const incoming = addActivity(base(), input(), { now: T0, id: s.id }).file;
  const m = mergeTrainingFiles(local, { ...incoming, fileId: local.fileId, revision: 1 }, T0);
  assert.equal(m.file.activities, undefined);
  roundTrip(m.file);
  const m2 = mergeTrainingFiles({ ...incoming, fileId: local.fileId, revision: 9 }, local, T0);
  roundTrip(m2.file);
});

test('Trainingsart (r5 Security N2): Steuer-, Bidi- und unsichtbare Zeichen', () => {
  const { activity } = addActivity(base(), input({ type: 'Beach‮volley​ball\u0007' }), { now: T0, id: sid() });
  assert.equal(activity.type, 'Beach volley ball');
  const { file } = addActivity(base(), input(), { now: T0, id: sid() });
  const raw = JSON.parse(serialize(file));
  raw.activities[0].type = 'Laufen‮';
  assert.throws(() => validateTrainingFile(raw), /Steuer- oder unsichtbare Zeichen/);
  raw.activities[0].type = 'Laufen ä ü 🏐';
  validateTrainingFile(raw);
});

test('Validator (r5 Code-Qualität N3): sortiert andere Trainings, leere Liste entfällt', () => {
  let f = base();
  f = addActivity(f, input({ date: '2026-11-01', type: 'A' }), { now: T0, id: sid() }).file;
  f = addActivity(f, input({ date: '2026-11-03', type: 'B' }), { now: T0, id: sid() }).file;
  const raw = JSON.parse(serialize(f));
  raw.activities.reverse();
  assert.deepEqual(validateTrainingFile(raw).activities.map((a) => a.type), ['A', 'B']);
  assert.equal(validateTrainingFile({ ...raw, activities: [] }).activities, undefined);
});

// ---------- Review Runde 6 ----------

test('Zusammenführen (r6 Security N1): Einträge des Gewinners gehen vor, kein Verdrängen durch eine ältere Datei', () => {
  const { file: local, activity } = addActivity({ ...base(), revision: 5 }, input(), { now: T0, id: sid() });
  // präparierte ältere Datei: Krafttraining mit der ID des lokalen anderen Trainings
  const evil = { ...base(), fileId: local.fileId, revision: 1, sessions: [unit({ id: activity.id, date: '2026-11-02' })] };
  const m = mergeTrainingFiles(local, evil, T0);
  assert.deepEqual(m.file.activities.map((a) => a.id), [activity.id], 'anderes Training bleibt');
  assert.equal(m.file.sessions.length, 0, 'kollidierendes Training kommt nicht dazu');
  assert.equal(m.removedSessions, 0, 'nichts als „gelöscht“ melden');
  roundTrip(m.file);
});

test('Trainingsart (r6 Security N2): weitere unsichtbare Zeichen, Validator bereinigt Leerraum', () => {
  for (const ch of ['\u{E0041}', '️', 'ㅤ', '⠀', ' ', '͏']) {
    const { activity } = addActivity(base(), input({ type: `Lauf${ch}en` }), { now: T0, id: sid() });
    assert.equal(activity.type, 'Lauf en', JSON.stringify(ch));
    const raw = JSON.parse(serialize(addActivity(base(), input(), { now: T0, id: sid() }).file));
    raw.activities[0].type = `Lauf${ch}en`;
    assert.throws(() => validateTrainingFile(raw), /Steuer- oder unsichtbare Zeichen/, JSON.stringify(ch));
  }
  const raw = JSON.parse(serialize(addActivity(base(), input(), { now: T0, id: sid() }).file));
  raw.activities[0].type = '  Beach   volleyball ';
  assert.equal(validateTrainingFile(raw).activities[0].type, 'Beach volleyball');
});

// ---------- Review Runde 7 ----------

test('Zahlen (r7 Code-Qualität N1): parseNum liest die eigene Anzeige mit Tausendertrenner', async () => {
  const { parseNum, fmtNum } = await import('../training/src/format.js');
  for (const n of [1000, 1000.5, 36000, 82.5, 0]) assert.equal(parseNum(fmtNum(n)), n, fmtNum(n));
  assert.equal(parseNum(' 1 000,5 '), 1000.5);
  assert.equal(parseNum(''), null);
});

test('Import-Vorschau (r7): gleiche Revision mit anderem Inhalt, wegfallende lokale Einträge', async () => {
  const { previewImport } = await import('../training/src/model/import.js');
  const a = { ...base(), revision: 3, sessions: [unit({ date: '2026-11-01' })] };
  const b = { ...a, sessions: [{ ...a.sessions[0], note: 'anders' }] };
  const [p] = previewImport(a, [{ kind: 'training', name: 'x', file: b }]);
  assert.equal(p.action, 'differs');
  const [same] = previewImport(a, [{ kind: 'training', name: 'x', file: structuredClone(a) }]);
  assert.equal(same.action, 'unchanged');
  // Datei gewinnt und hat ein lokales anderes Training als gelöscht vermerkt
  const { file: local, activity } = addActivity({ ...base(), revision: 2 }, input(), { now: T0, id: sid() });
  const incoming = { ...base(), fileId: local.fileId, revision: 9, deletedSessionIds: [activity.id] };
  const m = mergeTrainingFiles(local, incoming, T0);
  assert.equal(m.file.activities, undefined);
  assert.equal(m.removedSessions, 1, 'Vorschau nennt den wegfallenden Eintrag');
});

test('Trainingsart (r7): nur unsichtbare Zeichen gilt als leer, Kombinationszeichen am Anfang, private Zeichen', async () => {
  const { activityDraftError, activityDraft } = await import('../training/src/views/activity.js');
  assert.match(activityDraftError({ ...activityDraft('2026-11-18'), type: '​‮' }, '2026-11-18'), /Trainingsart/);
  assert.equal(addActivity(base(), input({ type: '́Laufen' }), { now: T0, id: sid() }).activity.type, 'Laufen');
  const raw = JSON.parse(serialize(addActivity(base(), input(), { now: T0, id: sid() }).file));
  for (const t of ['́Laufen', 'Laufen', 'Lauf￾en']) {
    raw.activities[0].type = t;
    assert.throws(() => validateTrainingFile(raw), /Steuer- oder unsichtbare Zeichen/, JSON.stringify(t));
  }
});

test('Coach-Export (r7 Security N2): unsichtbare Zeichen aus Namen und Notizen entfallen', async () => {
  const { cleanText } = await import('../training/src/model/coach-export.js');
  assert.equal(cleanText('Back‮ Squat\u0000 \u{E0041}x'), 'Back Squat x');
});
