import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseImportText, validatePlan, validateTrainingFile, ValidationError, LIMITS, SCHEMA_VERSION } from '../training/src/model/validate.js';
import { createTrainingFile, serialize } from '../training/src/model/training-file.js';
import { planText, planRaw, session, block } from './helpers.js';

function errorsOf(fn) {
  try {
    fn();
  } catch (e) {
    assert.ok(e instanceof ValidationError, `ValidationError erwartet, bekam ${e}`);
    return e.errors;
  }
  assert.fail('ValidationError erwartet');
}

test('Beispielplan ist gültig', () => {
  const r = parseImportText(planText);
  assert.equal(r.kind, 'plan');
  assert.equal(r.plan.weeks, 7);
  assert.equal(r.plan.sessions.length, 2);
  assert.deepEqual(r.plan, planRaw(), 'bereinigte Kopie entspricht dem Original');
});

test('Plan kann auch in { "plan": ... } verpackt sein', () => {
  const r = parseImportText(JSON.stringify({ plan: planRaw() }));
  assert.equal(r.kind, 'plan');
});

test('fehlendes repsMax wird mit Pfad gemeldet', () => {
  const raw = planRaw();
  const ex = raw.sessions[1].blocks[2].exercises[0];
  delete ex.repsMax;
  delete ex.byWeek;
  const errs = errorsOf(() => validatePlan(raw));
  assert.ok(errs.includes('plan.sessions[1].blocks[2].exercises[0]: repsMax fehlt'), errs.join('\n'));
});

test('fehlende Vorgabe nur in einzelnen Wochen nennt die Wochen', () => {
  const raw = planRaw();
  const ex = raw.sessions[0].blocks[0].exercises[0];
  ex.byWeek = { 3: { unit: 's' } };
  const errs = errorsOf(() => validatePlan(raw));
  assert.ok(errs.includes('plan.sessions[0].blocks[0].exercises[0]: durationSec fehlt (Woche 3)'), errs.join('\n'));
});

test('Superset braucht genau 2 Übungen', () => {
  const raw = planRaw();
  raw.sessions[0].blocks[2].exercises.pop();
  const errs = errorsOf(() => validatePlan(raw));
  assert.ok(errs.some((e) => e.startsWith('plan.sessions[0].blocks[2].exercises: ein Superset braucht genau 2')));
});

test('unbekannte Felder, falsche Typen und unsinnige Zahlen werden abgelehnt', () => {
  const raw = planRaw();
  raw.extra = 1;
  raw.sessions[0].blocks[1].exercises[0].sets = -3;
  raw.sessions[0].blocks[1].exercises[0].restSec = 1e9;
  raw.sessions[0].blocks[1].exercises[0].incrementKg = Number.NaN; // wird zu null serialisiert
  raw.sessions[0].blocks[1].exercises[0].unit = 'pfund';
  const errs = errorsOf(() => parseImportText(JSON.stringify(raw)));
  const p = 'plan.sessions[0].blocks[1].exercises[0]';
  assert.ok(errs.includes('plan.extra: unbekanntes Feld'));
  assert.ok(errs.includes(`${p}.sets: muss eine ganze Zahl zwischen 1 und ${LIMITS.maxSets} sein`));
  assert.ok(errs.some((e) => e.startsWith(`${p}.restSec:`)));
  assert.ok(errs.some((e) => e.startsWith(`${p}.incrementKg:`)));
  assert.ok(errs.some((e) => e.startsWith(`${p}.unit: muss einer dieser Werte sein`)));
});

test('doppelte IDs und Schlüssel werden erkannt', () => {
  const raw = planRaw();
  raw.sessions[1].key = 'E1';
  raw.sessions[0].blocks[1].exercises[0].id = 'trap-bar-jump';
  const errs = errorsOf(() => validatePlan(raw));
  assert.ok(errs.some((e) => e.includes('"E1" ist doppelt')));
  assert.ok(errs.some((e) => e.includes('"trap-bar-jump" kommt in dieser Einheit doppelt vor')));
});

test('Prototype Pollution: __proto__, constructor, prototype werden abgelehnt', () => {
  for (const key of ['__proto__', 'constructor', 'prototype']) {
    const text = planText.replace('"name": "Trap Bar Jump"', `"name": "Trap Bar Jump", "${key}": {"polluted": true}`);
    const errs = errorsOf(() => parseImportText(text));
    assert.ok(errs[0].includes(`unzulässiger Schlüssel "${key}"`), errs[0]);
  }
  assert.equal({}.polluted, undefined);
});

test('kaputtes JSON, zu tiefe Verschachtelung und zu große Dateien', () => {
  assert.match(errorsOf(() => parseImportText('{ "weeks": 7, '))[0], /^Datei: kein gültiges JSON/);
  const deep = '['.repeat(LIMITS.maxDepth + 5) + ']'.repeat(LIMITS.maxDepth + 5);
  assert.match(errorsOf(() => parseImportText(deep))[0], /zu tief verschachtelt/);
  const big = JSON.stringify({ x: 'a'.repeat(LIMITS.maxBytes) });
  assert.match(errorsOf(() => parseImportText(big))[0], /^Datei: zu groß/);
  assert.match(errorsOf(() => parseImportText('[]'))[0], /muss ein JSON-Objekt sein/);
  assert.match(errorsOf(() => parseImportText('{"foo": 1}'))[0], /weder ein Plan/);
});

test('Trainingsdatei: Rundreise erstellen → serialisieren → importieren', () => {
  const plan = validatePlan(planRaw());
  const file = createTrainingFile(plan, { now: new Date('2026-01-01T10:00:00Z') });
  file.sessions.push(session({ blocks: [block('back-squat', [[80, 5], [80, 5], [80, 5]])] }));
  const r = parseImportText(serialize(file));
  assert.equal(r.kind, 'training');
  assert.deepEqual(r.file, file);
});

test('Trainingsdatei: neuere schemaVersion und fehlerhafte Sessions', () => {
  const file = createTrainingFile(validatePlan(planRaw()));
  assert.match(errorsOf(() => validateTrainingFile({ ...file, schemaVersion: SCHEMA_VERSION + 1 }))[0], /neueren App-Version/);

  const bad = structuredClone(file);
  bad.sessions = [
    session({ blocks: [block('back-squat', [[-5, 5]])] }),
    { ...session(), date: '2026-02-30' },
    { ...session(), endedAt: '2025-01-01T00:00:00Z' },
  ];
  bad.sessions.push({ ...bad.sessions[0] });
  const errs = errorsOf(() => validateTrainingFile(bad));
  assert.ok(errs.some((e) => e.startsWith('sessions[0].blocks[0].sets[0].kg:')));
  assert.ok(errs.includes('sessions[1].date: ungültiges Datum'));
  assert.ok(errs.includes('sessions[2].endedAt: liegt vor startedAt'));
  assert.ok(errs.some((e) => e.startsWith('sessions[3].id:') && e.includes('doppelt')));
});

test('Fehlerliste ist begrenzt', () => {
  const raw = planRaw();
  for (const s of raw.sessions) for (const b of s.blocks) for (const e of b.exercises) e.foo = 1;
  const errs = errorsOf(() => validatePlan(raw));
  assert.ok(errs.length <= LIMITS.maxErrors);
});

test('Satz: doneAt ist optional, muss aber ein gültiger Zeitstempel sein', () => {
  const file = createTrainingFile(validatePlan(planRaw()));
  const ok = structuredClone(file);
  const s = session({ blocks: [block('back-squat', [[60, 5]])] });
  s.blocks[0].sets[0].doneAt = '2026-01-01T08:20:00.000Z';
  ok.sessions = [s];
  assert.equal(validateTrainingFile(ok).sessions[0].blocks[0].sets[0].doneAt, '2026-01-01T08:20:00.000Z');

  const bad = structuredClone(ok);
  bad.sessions[0].blocks[0].sets[0].doneAt = '<script>';
  assert.ok(errorsOf(() => validateTrainingFile(bad)).some((e) => e.startsWith('sessions[0].blocks[0].sets[0].doneAt:')));
});

test('Viele Felder in einem Objekt werden schnell abgelehnt (keine quadratische Laufzeit)', () => {
  const raw = planRaw();
  raw.rirTargets = Object.fromEntries(Array.from({ length: 150_000 }, (_, i) => [`k${i}`, '1']));
  const t = Date.now();
  const errs = errorsOf(() => parseImportText(JSON.stringify(raw)));
  assert.ok(Date.now() - t < 2000, 'Prüfung dauert zu lange');
  assert.match(errs[0], /rirTargets: zu viele Felder/);
});

test('Lange Schlüssel werden in Meldungen gekürzt (unbekannte Felder und Wochen)', () => {
  const raw = planRaw();
  raw['x'.repeat(5000)] = 1;
  assert.ok(errorsOf(() => parseImportText(JSON.stringify(raw))).some((e) => e.includes('…') && e.length < 200));
  const weeks = planRaw();
  weeks.rirTargets = { ['9'.repeat(5000)]: '1' };
  assert.ok(errorsOf(() => parseImportText(JSON.stringify(weeks))).every((e) => e.length < 300));
});


test('settings.sound: optional, nur off, quiet, loud', () => {
  const base = createTrainingFile(validatePlan(planRaw()));
  assert.equal('sound' in validateTrainingFile(structuredClone(base)).settings, false, 'fehlt = Standard (laut)');
  for (const sound of ['off', 'quiet', 'loud']) {
    const f = { ...base, settings: { ...base.settings, sound } };
    assert.equal(validateTrainingFile(structuredClone(f)).settings.sound, sound);
    assert.equal(parseImportText(serialize(f)).file.settings.sound, sound, 'übersteht Export und Import');
  }
  for (const sound of ['laut', '', 1, null, 'x'.repeat(50)]) {
    const errs = errorsOf(() => validateTrainingFile({ ...structuredClone(base), settings: { ...base.settings, sound } }));
    assert.ok(errs.some((e) => e.startsWith('settings.sound')), `${JSON.stringify(sound)}: ${errs.join('; ')}`);
  }
});
