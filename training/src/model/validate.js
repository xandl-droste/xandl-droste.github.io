// Handgeschriebener Validator für plan.json und .training.json.
// Gibt nur bereinigte Kopien zurück, die ausschließlich bekannte Felder enthalten.
// Bei einem Fehler wird eine ValidationError mit allen Fehlermeldungen (Pfad: Klartext) geworfen.

import { resolvePrescription } from './plan.js';

export const SCHEMA_VERSION = 3;
/** Älteste Schemaversion, die noch gelesen wird. Gelesene Dateien werden auf SCHEMA_VERSION gehoben. */
export const MIN_SCHEMA_VERSION = 1;

/** Grenzwerte. Bewusst großzügig für echte Nutzung, aber eng genug gegen Missbrauch. */
export const LIMITS = Object.freeze({
  maxBytes: 5 * 1024 * 1024, // 5 MB Rohtext
  maxDepth: 12, // Verschachtelungstiefe des JSON
  maxErrors: 50, // so viele Fehler werden höchstens gemeldet
  maxName: 120,
  maxText: 500, // Hinweise, Warm-up-Zeilen
  maxNote: 2000, // Notizen pro Übung
  maxWeeks: 52,
  maxPlanSessions: 14,
  maxBlocks: 30,
  maxVariants: 10,
  maxWarmup: 20,
  maxSets: 20, // geplante Sätze pro Übung
  maxLoggedSets: 30, // protokollierte Sätze pro Übung
  maxReps: 100,
  maxLoggedReps: 1000,
  maxDurationSec: 3600,
  maxLoggedSec: 36000,
  maxRestSec: 900,
  maxIncrementKg: 20,
  maxKg: 1000,
  maxHistory: 5000, // Sessions in der Historie
  maxLoggedBlocks: 40,
  maxRevision: 1e9,
  maxCycles: 1000, // Durchgänge eines Plans
  maxDeletedSessions: 5000, // gemerkte IDs gelöschter Trainings (älteste fallen zuerst heraus)
  maxCarryOver: 500, // Startwerte aus dem Vorgänger (eine pro Übung)
  maxRpe: 10, // RPE eines Trainings: 0 bis 10
  maxRir: 4, // RIR nach dem letzten Satz: 0 bis 4 (4 = „4+“)
  maxFileName: 120,
  maxKeys: 200, // Schlüssel pro Objekt (bremst präparierte Dateien mit sehr vielen Feldern)
  maxActivities: 2000, // andere Trainings in einer Trainingsdatei (ab Schema 3)
  maxActivityType: 60, // Länge der Trainingsart
  maxActivityMin: 600, // Dauer eines anderen Trainings in Minuten
});

const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const ID_RE = /^[a-z0-9][a-z0-9-]{0,63}$/;
const KEY_RE = /^[A-Za-z0-9_-]{1,20}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SESSION_ID_RE = /^[A-Za-z0-9-]{8,64}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/;
const LANG_RE = /^[a-z]{2}(-[A-Z]{2})?$/;
const FILE_NAME_RE = /^[A-Za-z0-9._-]+\.training\.json$/;
const UNITS = ['kg', 's', 'bodyweight'];
const BLOCK_TYPES = ['single', 'superset'];
const THEMES = ['light', 'dark', 'fancy'];
const VIEWS = ['list', 'focus'];
const SOUNDS = ['off', 'quiet', 'loud'];
const STATUSES = ['active', 'completed'];

export class ValidationError extends Error {
  constructor(errors) {
    super(errors.join('\n'));
    this.name = 'ValidationError';
    this.errors = errors;
  }
}

// ---------- Rohtext und Struktur ----------

/** Parst JSON-Text mit Größen-, Tiefen- und Schlüsselprüfung. */
export function parseJsonSafe(text) {
  if (typeof text !== 'string') throw new ValidationError(['Datei: kein lesbarer Text']);
  const bytes = new TextEncoder().encode(text).length;
  if (bytes > LIMITS.maxBytes) {
    throw new ValidationError([`Datei: zu groß (${Math.ceil(bytes / 1024)} KB, erlaubt sind ${LIMITS.maxBytes / 1024 / 1024} MB)`]);
  }
  let data;
  try {
    data = JSON.parse(text.replace(/^﻿/, ''));
  } catch (e) {
    throw new ValidationError([`Datei: kein gültiges JSON (${e.message})`]);
  }
  checkStructure(data, '', 0);
  return data;
}

function checkStructure(value, path, depth) {
  if (depth > LIMITS.maxDepth) {
    throw new ValidationError([`${path || 'Datei'}: zu tief verschachtelt (mehr als ${LIMITS.maxDepth} Ebenen)`]);
  }
  if (Array.isArray(value)) {
    value.forEach((v, i) => checkStructure(v, `${path}[${i}]`, depth + 1));
  } else if (value !== null && typeof value === 'object') {
    const keys = Object.keys(value);
    if (keys.length > LIMITS.maxKeys) {
      throw new ValidationError([`${path || 'Datei'}: zu viele Felder (mehr als ${LIMITS.maxKeys})`]);
    }
    for (const key of keys) {
      const p = path ? `${path}.${short(key)}` : short(key);
      if (FORBIDDEN_KEYS.has(key)) throw new ValidationError([`${p}: unzulässiger Schlüssel "${key}"`]);
      checkStructure(value[key], p, depth + 1);
    }
  }
}

// ---------- Hilfen ----------

class Ctx {
  constructor() {
    this.errors = [];
  }
  err(path, msg) {
    if (this.errors.length < LIMITS.maxErrors) this.errors.push(`${path}: ${msg}`);
  }
  throwIfErrors() {
    if (this.errors.length) throw new ValidationError(this.errors);
  }
}

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
/** Schlüssel in Fehlermeldungen kürzen (präparierte Dateien können sehr lange Schlüssel haben). */
const short = (k) => (k.length > 80 ? `${k.slice(0, 80)}…` : k);

function expectObject(ctx, v, path, allowed) {
  if (!isObj(v)) {
    ctx.err(path, 'muss ein Objekt sein');
    return false;
  }
  const ok = allowed instanceof Set ? allowed : new Set(allowed);
  for (const k of Object.keys(v)) if (!ok.has(k)) ctx.err(`${path}.${short(k)}`, 'unbekanntes Feld');
  return true;
}

function expectArray(ctx, v, path, { min = 0, max }) {
  if (!Array.isArray(v)) {
    ctx.err(path, 'muss eine Liste sein');
    return false;
  }
  if (v.length < min) {
    ctx.err(path, min === 1 ? 'darf nicht leer sein' : `braucht mindestens ${min} Einträge`);
    return false;
  }
  if (v.length > max) {
    ctx.err(path, `zu viele Einträge (höchstens ${max})`);
    return false;
  }
  return true;
}

/** Liest ein Feld. Gibt undefined zurück, wenn es fehlt oder ungültig ist. */
function field(ctx, o, key, path, spec) {
  if (!has(o, key) || o[key] === undefined) {
    if (spec.required) ctx.err(path, `${key} fehlt`);
    return undefined;
  }
  const v = o[key];
  const p = `${path}.${key}`;
  if (v === null) {
    if (spec.nullable) return null;
    ctx.err(p, 'darf nicht leer (null) sein');
    return undefined;
  }
  switch (spec.type) {
    case 'string': {
      if (typeof v !== 'string') return void ctx.err(p, 'muss ein Text sein');
      if (spec.nonEmpty !== false && v.trim() === '') return void ctx.err(p, 'darf nicht leer sein');
      if (v.length > spec.max) return void ctx.err(p, `zu lang (höchstens ${spec.max} Zeichen)`);
      if (spec.pattern && !spec.pattern.test(v)) return void ctx.err(p, spec.patternMsg || 'ungültiges Format');
      if (spec.oneOf && !spec.oneOf.includes(v)) return void ctx.err(p, `muss einer dieser Werte sein: ${spec.oneOf.join(', ')}`);
      return v;
    }
    case 'int':
    case 'number': {
      const ok = typeof v === 'number' && Number.isFinite(v) && (spec.type === 'number' || Number.isInteger(v));
      const kind = spec.type === 'int' ? 'eine ganze Zahl' : 'eine Zahl';
      if (!ok || v < spec.min || v > spec.max) {
        return void ctx.err(p, `muss ${kind} zwischen ${spec.min} und ${spec.max} sein`);
      }
      return v;
    }
    case 'bool':
      if (typeof v !== 'boolean') return void ctx.err(p, 'muss true oder false sein');
      return v;
    default:
      throw new Error(`unbekannter Typ ${spec.type}`);
  }
}

function setIf(target, key, value) {
  if (value !== undefined) target[key] = value;
}

function weekKeys(ctx, obj, path, weeks) {
  const out = [];
  for (const k of Object.keys(obj)) {
    const n = Number(k);
    if (!/^\d+$/.test(k) || n < 1 || n > weeks) ctx.err(`${path}.${short(k)}`, `Woche muss zwischen 1 und ${weeks} liegen`);
    else out.push(k);
  }
  return out;
}

// ---------- Plan ----------

const PLAN_KEYS = ['name', 'version', 'language', 'weeks', 'rirTargets', 'deload', 'sessions'];
const PLAN_SESSION_KEYS = ['key', 'name', 'suggestedDay', 'warmup', 'blocks'];
const BLOCK_KEYS = ['type', 'exercises'];
const EXERCISE_KEYS = [
  'id', 'name', 'sets', 'repsMin', 'repsMax', 'durationSec', 'unit', 'perSide', 'restSec',
  'incrementKg', 'cue', 'variants', 'garminCategory', 'garminSubcategory', 'byWeek', 'main',
];
const BYWEEK_KEYS = ['sets', 'repsMin', 'repsMax', 'durationSec', 'unit', 'cue'];
const VARIANT_KEYS = ['id', 'name', 'cue'];

function validatePlanInto(ctx, raw, path) {
  if (!expectObject(ctx, raw, path, PLAN_KEYS)) return undefined;
  const plan = {};
  setIf(plan, 'name', field(ctx, raw, 'name', path, { type: 'string', required: true, max: LIMITS.maxName }));
  if (has(raw, 'version')) {
    const v = raw.version;
    if (typeof v === 'string' && v.length > 0 && v.length <= 40) plan.version = v;
    else if (Number.isInteger(v) && v >= 0 && v <= 1e6) plan.version = v;
    else ctx.err(`${path}.version`, 'muss ein kurzer Text oder eine ganze Zahl sein');
  }
  setIf(plan, 'language', field(ctx, raw, 'language', path, { type: 'string', required: true, max: 5, pattern: LANG_RE, patternMsg: 'Sprachcode wie "de" erwartet' }));
  const weeks = field(ctx, raw, 'weeks', path, { type: 'int', required: true, min: 1, max: LIMITS.maxWeeks });
  if (weeks === undefined) return undefined; // ohne Wochenzahl lässt sich der Rest nicht sinnvoll prüfen
  plan.weeks = weeks;

  if (has(raw, 'rirTargets')) {
    const p = `${path}.rirTargets`;
    if (expectObject(ctx, raw.rirTargets, p, Object.keys(raw.rirTargets ?? {}))) {
      plan.rirTargets = {};
      for (const k of weekKeys(ctx, raw.rirTargets, p, weeks)) {
        setIf(plan.rirTargets, k, field(ctx, raw.rirTargets, k, p, { type: 'string', max: 20 }));
      }
    }
  }

  if (has(raw, 'deload')) {
    const p = `${path}.deload`;
    const d = raw.deload;
    if (expectObject(ctx, d, p, ['weeks', 'setsDelta', 'loadFactor'])) {
      const deload = {};
      if (!has(d, 'weeks')) ctx.err(p, 'weeks fehlt');
      else if (expectArray(ctx, d.weeks, `${p}.weeks`, { min: 1, max: weeks })) {
        const seen = new Set();
        d.weeks.forEach((w, i) => {
          if (!Number.isInteger(w) || w < 1 || w > weeks) ctx.err(`${p}.weeks[${i}]`, `muss eine Woche zwischen 1 und ${weeks} sein`);
          else if (seen.has(w)) ctx.err(`${p}.weeks[${i}]`, `Woche ${w} doppelt`);
          else seen.add(w);
        });
        deload.weeks = [...seen].sort((a, b) => a - b);
      }
      setIf(deload, 'setsDelta', field(ctx, d, 'setsDelta', p, { type: 'int', required: true, min: -10, max: 0 }));
      setIf(deload, 'loadFactor', field(ctx, d, 'loadFactor', p, { type: 'number', required: true, min: 0.3, max: 1 }));
      plan.deload = deload;
    }
  }

  if (!has(raw, 'sessions')) ctx.err(path, 'sessions fehlt');
  else if (expectArray(ctx, raw.sessions, `${path}.sessions`, { min: 1, max: LIMITS.maxPlanSessions })) {
    const keys = new Set();
    plan.sessions = raw.sessions.map((s, i) => {
      const ps = validatePlanSession(ctx, s, `${path}.sessions[${i}]`, plan);
      if (ps?.key) {
        if (keys.has(ps.key)) ctx.err(`${path}.sessions[${i}].key`, `"${ps.key}" ist doppelt`);
        keys.add(ps.key);
      }
      return ps;
    });
  }
  return plan;
}

function validatePlanSession(ctx, raw, path, plan) {
  if (!expectObject(ctx, raw, path, PLAN_SESSION_KEYS)) return undefined;
  const s = {};
  setIf(s, 'key', field(ctx, raw, 'key', path, { type: 'string', required: true, max: 20, pattern: KEY_RE, patternMsg: 'nur Buchstaben, Ziffern, - und _ (höchstens 20 Zeichen)' }));
  setIf(s, 'name', field(ctx, raw, 'name', path, { type: 'string', required: true, max: LIMITS.maxName }));
  setIf(s, 'suggestedDay', field(ctx, raw, 'suggestedDay', path, { type: 'string', max: LIMITS.maxText }));
  if (has(raw, 'warmup') && expectArray(ctx, raw.warmup, `${path}.warmup`, { max: LIMITS.maxWarmup })) {
    s.warmup = [];
    raw.warmup.forEach((line, i) => {
      if (typeof line !== 'string' || line.trim() === '' || line.length > LIMITS.maxText) {
        ctx.err(`${path}.warmup[${i}]`, `muss ein nicht leerer Text mit höchstens ${LIMITS.maxText} Zeichen sein`);
      } else s.warmup.push(line);
    });
  }
  if (!has(raw, 'blocks')) ctx.err(path, 'blocks fehlt');
  else if (expectArray(ctx, raw.blocks, `${path}.blocks`, { min: 1, max: LIMITS.maxBlocks })) {
    const ids = new Set();
    s.blocks = raw.blocks.map((b, i) => validateBlock(ctx, b, `${path}.blocks[${i}]`, plan, ids));
  }
  return s;
}

function validateBlock(ctx, raw, path, plan, idsInSession) {
  if (!expectObject(ctx, raw, path, BLOCK_KEYS)) return undefined;
  const b = {};
  const type = field(ctx, raw, 'type', path, { type: 'string', required: true, max: 20, oneOf: BLOCK_TYPES });
  setIf(b, 'type', type);
  if (!has(raw, 'exercises')) ctx.err(path, 'exercises fehlt');
  else {
    const n = type === 'superset' ? 2 : 1;
    if (Array.isArray(raw.exercises) && type && raw.exercises.length !== n) {
      ctx.err(`${path}.exercises`, type === 'superset' ? 'ein Superset braucht genau 2 Übungen' : 'ein einzelner Block braucht genau 1 Übung');
    } else if (expectArray(ctx, raw.exercises, `${path}.exercises`, { min: 1, max: 2 })) {
      b.exercises = raw.exercises.map((e, i) => {
        const ex = validateExercise(ctx, e, `${path}.exercises[${i}]`, plan);
        if (ex?.id) {
          if (idsInSession.has(ex.id)) ctx.err(`${path}.exercises[${i}].id`, `"${ex.id}" kommt in dieser Einheit doppelt vor`);
          idsInSession.add(ex.id);
        }
        return ex;
      });
    }
  }
  return b;
}

function prescriptionFields(ctx, raw, path, required) {
  const out = {};
  setIf(out, 'sets', field(ctx, raw, 'sets', path, { type: 'int', required, min: 1, max: LIMITS.maxSets }));
  setIf(out, 'repsMin', field(ctx, raw, 'repsMin', path, { type: 'int', min: 1, max: LIMITS.maxReps }));
  setIf(out, 'repsMax', field(ctx, raw, 'repsMax', path, { type: 'int', min: 1, max: LIMITS.maxReps }));
  setIf(out, 'durationSec', field(ctx, raw, 'durationSec', path, { type: 'int', min: 1, max: LIMITS.maxDurationSec }));
  setIf(out, 'unit', field(ctx, raw, 'unit', path, { type: 'string', required, max: 20, oneOf: UNITS }));
  setIf(out, 'cue', field(ctx, raw, 'cue', path, { type: 'string', max: LIMITS.maxText, nonEmpty: false }));
  return out;
}

function validateExercise(ctx, raw, path, plan) {
  if (!expectObject(ctx, raw, path, EXERCISE_KEYS)) return undefined;
  const before = ctx.errors.length;
  const ex = {};
  setIf(ex, 'id', field(ctx, raw, 'id', path, { type: 'string', required: true, max: 64, pattern: ID_RE, patternMsg: 'nur Kleinbuchstaben, Ziffern und - (z. B. "back-squat")' }));
  setIf(ex, 'name', field(ctx, raw, 'name', path, { type: 'string', required: true, max: LIMITS.maxName }));
  Object.assign(ex, prescriptionFields(ctx, raw, path, true));
  setIf(ex, 'perSide', field(ctx, raw, 'perSide', path, { type: 'bool' }));
  setIf(ex, 'restSec', field(ctx, raw, 'restSec', path, { type: 'int', min: 0, max: LIMITS.maxRestSec }));
  setIf(ex, 'incrementKg', field(ctx, raw, 'incrementKg', path, { type: 'number', min: 0, max: LIMITS.maxIncrementKg }));
  setIf(ex, 'garminCategory', field(ctx, raw, 'garminCategory', path, { type: 'int', min: 0, max: 65534 }));
  setIf(ex, 'garminSubcategory', field(ctx, raw, 'garminSubcategory', path, { type: 'int', min: 0, max: 65534 }));
  // Hauptübung (optional, fehlt = nein): nach dem letzten Satz fragt die App nach dem RIR.
  if (field(ctx, raw, 'main', path, { type: 'bool' })) ex.main = true;

  if (has(raw, 'variants') && expectArray(ctx, raw.variants, `${path}.variants`, { max: LIMITS.maxVariants })) {
    const ids = new Set();
    ex.variants = raw.variants.map((v, i) => {
      const p = `${path}.variants[${i}]`;
      if (!expectObject(ctx, v, p, VARIANT_KEYS)) return undefined;
      const out = {};
      setIf(out, 'id', field(ctx, v, 'id', p, { type: 'string', required: true, max: 64, pattern: ID_RE, patternMsg: 'nur Kleinbuchstaben, Ziffern und -' }));
      setIf(out, 'name', field(ctx, v, 'name', p, { type: 'string', required: true, max: LIMITS.maxName }));
      setIf(out, 'cue', field(ctx, v, 'cue', p, { type: 'string', max: LIMITS.maxText, nonEmpty: false }));
      if (out.id) {
        if (ids.has(out.id)) ctx.err(`${p}.id`, `"${out.id}" ist doppelt`);
        ids.add(out.id);
      }
      return out;
    });
  }

  if (has(raw, 'byWeek')) {
    const p = `${path}.byWeek`;
    if (isObj(raw.byWeek)) {
      ex.byWeek = {};
      for (const k of weekKeys(ctx, raw.byWeek, p, plan.weeks)) {
        if (expectObject(ctx, raw.byWeek[k], `${p}.${k}`, BYWEEK_KEYS)) {
          ex.byWeek[k] = prescriptionFields(ctx, raw.byWeek[k], `${p}.${k}`, false);
        }
      }
    } else ctx.err(p, 'muss ein Objekt sein');
  }

  // Für jede Woche muss die gültige Vorgabe vollständig sein.
  if (ctx.errors.length === before && ex.unit && ex.sets) checkWeeklyPrescriptions(ctx, ex, path, plan);
  return ex;
}

function checkWeeklyPrescriptions(ctx, ex, path, plan) {
  const problems = new Map(); // Meldung -> Wochen
  const add = (msg, w) => {
    if (!problems.has(msg)) problems.set(msg, []);
    problems.get(msg).push(w);
  };
  const planLike = { deload: undefined }; // Deload ändert nur die Satzzahl und ist hier egal
  for (let w = 1; w <= plan.weeks; w++) {
    const p = resolvePrescription(planLike, ex, w);
    if (p.unit === 's') {
      if (p.durationSec == null) add('durationSec fehlt', w);
    } else {
      if (p.repsMin == null) add('repsMin fehlt', w);
      if (p.repsMax == null) add('repsMax fehlt', w);
      if (p.repsMin != null && p.repsMax != null && p.repsMin > p.repsMax) add('repsMin ist größer als repsMax', w);
    }
  }
  for (const [msg, weeks] of problems) {
    ctx.err(path, weeks.length === plan.weeks ? msg : `${msg} (Woche ${weeks.join(', ')})`);
  }
}

/** Validiert einen Plan. Wirft ValidationError, sonst bereinigte Kopie. */
export function validatePlan(raw, path = 'plan') {
  const ctx = new Ctx();
  const plan = validatePlanInto(ctx, raw, path);
  ctx.throwIfErrors();
  return plan;
}

// ---------- Trainingsdatei ----------

const FILE_KEYS = [
  'schemaVersion', 'fileId', 'revision', 'updatedAt', 'createdAt', 'previous', 'carryOver',
  'plan', 'settings', 'progress', 'sessions', 'activities', 'deletedSessionIds',
];
const PREVIOUS_KEYS = ['fileId', 'fileName', 'planName'];
const CARRY_KEYS = ['exerciseId', 'date', 'variantId', 'plannedSets', 'repsMax', 'durationSec', 'sets', 'note'];
const CARRY_SET_KEYS = ['kg', 'reps', 'sec'];
const SESSION_KEYS = ['id', 'date', 'sessionKey', 'week', 'cycle', 'deload', 'startedAt', 'endedAt', 'rpe', 'note', 'blocks'];
const LOGGED_BLOCK_KEYS = [
  'exerciseId', 'name', 'variantId', 'variantName', 'sets', 'note', 'skipped', 'rirLast', 'plannedSets', 'repsMax', 'durationSec',
];
const SET_KEYS = ['kg', 'reps', 'sec', 'done', 'doneAt'];
/**
 * Zeichen, die in der Trainingsart nicht vorkommen dürfen: Steuerzeichen, Formatzeichen (u. a. Bidi, Nullbreite,
 * Tag-Zeichen), Zeilen- und Absatztrenner, standardmäßig unsichtbare Zeichen (u. a. Variantenwähler, Hangul-Füller)
 * und das leere Braille-Muster (Review r5 Security N2, r6 Security N2). Eine Stelle für Modell und Validator.
 */
// Dazu (Review r7 Security N2): private Zeichen (Co), einzelne Surrogate (Cs) und Nichtzeichen.
const INVISIBLE_CLASS = '\\p{Cc}\\p{Cf}\\p{Co}\\p{Cs}\\p{Zl}\\p{Zp}\\p{Default_Ignorable_Code_Point}\\p{Noncharacter_Code_Point}\\u2800';
export const INVISIBLE_RE = new RegExp(`[${INVISIBLE_CLASS}]`, 'gu');
// Außerdem darf die Trainingsart nicht mit einem Kombinationszeichen ohne Grundzeichen beginnen.
const ACTIVITY_TYPE_RE = new RegExp(`^(?!\\p{M})[^${INVISIBLE_CLASS}]*$`, 'u');

/** Trainingsart wie in der App: ohne unsichtbare Zeichen, ohne Leerraum am Rand, Leerraum innen als ein Leerzeichen. */
export const cleanActivityType = (t) => String(t ?? '').replace(INVISIBLE_RE, ' ').trim().replace(/\s+/g, ' ').replace(/^\p{M}+/u, '').trim();

/** Andere Trainings: nach Datum, am selben Tag nach dem Zeitpunkt des Eintrags (eine Stelle für App und Validator). */
export const byActivityDate = (a, b) => a.date.localeCompare(b.date)
  || Date.parse(a.createdAt) - Date.parse(b.createdAt) || a.id.localeCompare(b.id);
const ACTIVITY_KEYS = ['id', 'date', 'type', 'durationMin', 'rpe', 'note', 'week', 'createdAt'];

function isoField(ctx, o, key, path, { required, nullable }) {
  const v = field(ctx, o, key, path, { type: 'string', required, nullable, max: 40, pattern: ISO_RE, patternMsg: 'Zeitstempel im Format ISO-8601 erwartet' });
  if (typeof v === 'string' && !Number.isFinite(Date.parse(v))) {
    ctx.err(`${path}.${key}`, 'ungültiger Zeitpunkt');
    return undefined;
  }
  return v;
}

function dateField(ctx, o, key, path, { required }) {
  const date = field(ctx, o, key, path, { type: 'string', required, max: 10, pattern: DATE_RE, patternMsg: 'Datum im Format JJJJ-MM-TT erwartet' });
  if (date !== undefined && !validDate(date)) {
    ctx.err(`${path}.${key}`, 'ungültiges Datum');
    return undefined;
  }
  return date;
}

function validDate(s) {
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d && y >= 2000 && y <= 2100;
}

function validateLoggedSession(ctx, raw, path) {
  if (!expectObject(ctx, raw, path, SESSION_KEYS)) return undefined;
  const s = {};
  setIf(s, 'id', field(ctx, raw, 'id', path, { type: 'string', required: true, max: 64, pattern: SESSION_ID_RE, patternMsg: 'ungültige ID' }));
  setIf(s, 'date', dateField(ctx, raw, 'date', path, { required: true }));
  setIf(s, 'sessionKey', field(ctx, raw, 'sessionKey', path, { type: 'string', required: true, max: 20, pattern: KEY_RE, patternMsg: 'ungültiger Schlüssel' }));
  setIf(s, 'week', field(ctx, raw, 'week', path, { type: 'int', required: true, min: 1, max: LIMITS.maxWeeks }));
  // Durchgang und Deload-Kennzeichen (optional, ältere Dateien haben sie nicht)
  setIf(s, 'cycle', field(ctx, raw, 'cycle', path, { type: 'int', min: 1, max: LIMITS.maxCycles }));
  if (field(ctx, raw, 'deload', path, { type: 'bool' })) s.deload = true;
  setIf(s, 'startedAt', isoField(ctx, raw, 'startedAt', path, { required: true }));
  const ended = isoField(ctx, raw, 'endedAt', path, { required: false, nullable: true });
  s.endedAt = ended ?? null;
  if (s.startedAt && s.endedAt && Date.parse(s.endedAt) < Date.parse(s.startedAt)) {
    ctx.err(`${path}.endedAt`, 'liegt vor startedAt');
  }
  // RPE und Notiz zum ganzen Training (optional, ab Schema 2)
  setIf(s, 'rpe', field(ctx, raw, 'rpe', path, { type: 'int', min: 0, max: LIMITS.maxRpe }));
  const note = field(ctx, raw, 'note', path, { type: 'string', max: LIMITS.maxNote, nonEmpty: false });
  if (note) s.note = note;
  if (!has(raw, 'blocks')) ctx.err(path, 'blocks fehlt');
  else if (expectArray(ctx, raw.blocks, `${path}.blocks`, { max: LIMITS.maxLoggedBlocks })) {
    s.blocks = raw.blocks.map((b, i) => validateLoggedBlock(ctx, b, `${path}.blocks[${i}]`));
  }
  return s;
}

function validateLoggedBlock(ctx, raw, path) {
  if (!expectObject(ctx, raw, path, LOGGED_BLOCK_KEYS)) return undefined;
  const b = {};
  setIf(b, 'exerciseId', field(ctx, raw, 'exerciseId', path, { type: 'string', required: true, max: 64, pattern: ID_RE, patternMsg: 'ungültige Übungs-ID' }));
  // Namen zum Zeitpunkt des Trainings (optional, ab Schema 2), damit das Training ohne den Plan lesbar bleibt.
  setIf(b, 'name', field(ctx, raw, 'name', path, { type: 'string', max: LIMITS.maxName }));
  const variant = field(ctx, raw, 'variantId', path, { type: 'string', nullable: true, max: 64, pattern: ID_RE, patternMsg: 'ungültige Varianten-ID' });
  b.variantId = variant ?? null;
  const variantName = field(ctx, raw, 'variantName', path, { type: 'string', nullable: true, max: LIMITS.maxName });
  if (variantName) b.variantName = variantName;
  const note = field(ctx, raw, 'note', path, { type: 'string', max: LIMITS.maxNote, nonEmpty: false });
  b.note = note ?? '';
  const skipped = field(ctx, raw, 'skipped', path, { type: 'bool' });
  if (skipped) b.skipped = true;
  // RIR nach dem letzten Satz einer Hauptübung (optional, ab Schema 2)
  setIf(b, 'rirLast', field(ctx, raw, 'rirLast', path, { type: 'int', min: 0, max: LIMITS.maxRir }));
  // Beim Start gültige Vorgabe (optional, ältere Dateien haben sie nicht)
  setIf(b, 'plannedSets', field(ctx, raw, 'plannedSets', path, { type: 'int', min: 1, max: LIMITS.maxSets }));
  setIf(b, 'repsMax', field(ctx, raw, 'repsMax', path, { type: 'int', min: 1, max: LIMITS.maxReps }));
  setIf(b, 'durationSec', field(ctx, raw, 'durationSec', path, { type: 'int', min: 1, max: LIMITS.maxDurationSec }));
  if (!has(raw, 'sets')) ctx.err(path, 'sets fehlt');
  else if (expectArray(ctx, raw.sets, `${path}.sets`, { max: LIMITS.maxLoggedSets })) {
    b.sets = raw.sets.map((st, i) => {
      const p = `${path}.sets[${i}]`;
      if (!expectObject(ctx, st, p, SET_KEYS)) return undefined;
      const out = {
        kg: field(ctx, st, 'kg', p, { type: 'number', nullable: true, min: 0, max: LIMITS.maxKg }) ?? null,
        reps: field(ctx, st, 'reps', p, { type: 'int', nullable: true, min: 0, max: LIMITS.maxLoggedReps }) ?? null,
        sec: field(ctx, st, 'sec', p, { type: 'number', nullable: true, min: 0, max: LIMITS.maxLoggedSec }) ?? null,
        done: field(ctx, st, 'done', p, { type: 'bool', required: true }) ?? false,
      };
      // Zeitpunkt des Satzabschlusses (optional, ältere Dateien haben ihn nicht)
      const doneAt = isoField(ctx, st, 'doneAt', p, { required: false, nullable: true });
      if (doneAt) out.doneAt = doneAt;
      return out;
    });
  }
  return b;
}

function validatePrevious(ctx, raw, path) {
  if (!expectObject(ctx, raw, path, PREVIOUS_KEYS)) return undefined;
  const out = {};
  setIf(out, 'fileId', field(ctx, raw, 'fileId', path, { type: 'string', required: true, max: 36, pattern: UUID_RE, patternMsg: 'UUID erwartet' }));
  setIf(out, 'fileName', field(ctx, raw, 'fileName', path, { type: 'string', required: true, max: LIMITS.maxFileName, pattern: FILE_NAME_RE, patternMsg: 'Dateiname wie "plan-2026-01-31.training.json" erwartet' }));
  setIf(out, 'planName', field(ctx, raw, 'planName', path, { type: 'string', required: true, max: LIMITS.maxName }));
  return out;
}

/** Startwerte aus dem Vorgänger: letzte Leistung pro Übung mit der damals gültigen Vorgabe. */
function validateCarryOver(ctx, raw, path) {
  if (!expectArray(ctx, raw, path, { max: LIMITS.maxCarryOver })) return undefined;
  const ids = new Set();
  return raw.map((e, i) => {
    const p = `${path}[${i}]`;
    if (!expectObject(ctx, e, p, CARRY_KEYS)) return undefined;
    const out = {};
    const id = field(ctx, e, 'exerciseId', p, { type: 'string', required: true, max: 64, pattern: ID_RE, patternMsg: 'ungültige Übungs-ID' });
    if (id !== undefined) {
      if (ids.has(id)) ctx.err(`${p}.exerciseId`, `"${id}" ist doppelt`);
      ids.add(id);
      out.exerciseId = id;
    }
    setIf(out, 'date', dateField(ctx, e, 'date', p, { required: true }));
    out.variantId = field(ctx, e, 'variantId', p, { type: 'string', nullable: true, max: 64, pattern: ID_RE, patternMsg: 'ungültige Varianten-ID' }) ?? null;
    setIf(out, 'plannedSets', field(ctx, e, 'plannedSets', p, { type: 'int', required: true, min: 1, max: LIMITS.maxSets }));
    setIf(out, 'repsMax', field(ctx, e, 'repsMax', p, { type: 'int', min: 1, max: LIMITS.maxReps }));
    setIf(out, 'durationSec', field(ctx, e, 'durationSec', p, { type: 'int', min: 1, max: LIMITS.maxDurationSec }));
    if (!has(e, 'sets')) ctx.err(p, 'sets fehlt');
    else if (expectArray(ctx, e.sets, `${p}.sets`, { min: 1, max: LIMITS.maxLoggedSets })) {
      out.sets = e.sets.map((st, k) => {
        const q = `${p}.sets[${k}]`;
        if (!expectObject(ctx, st, q, CARRY_SET_KEYS)) return undefined;
        return {
          kg: field(ctx, st, 'kg', q, { type: 'number', nullable: true, min: 0, max: LIMITS.maxKg }) ?? null,
          reps: field(ctx, st, 'reps', q, { type: 'int', nullable: true, min: 0, max: LIMITS.maxLoggedReps }) ?? null,
          sec: field(ctx, st, 'sec', q, { type: 'number', nullable: true, min: 0, max: LIMITS.maxLoggedSec }) ?? null,
        };
      });
    }
    const note = field(ctx, e, 'note', p, { type: 'string', max: LIMITS.maxNote, nonEmpty: false });
    if (note) out.note = note;
    return out;
  });
}

/**
 * Ein anderes Training (ab Schema 3): Trainingsart, Datum, Dauer, RPE und Notiz, ohne Einheit und ohne Sätze.
 * week ist die Planwoche beim Eintragen, nur zur Einordnung (zählt nicht für die Woche).
 */
function validateActivity(ctx, raw, path) {
  if (!expectObject(ctx, raw, path, ACTIVITY_KEYS)) return undefined;
  const a = {};
  setIf(a, 'id', field(ctx, raw, 'id', path, { type: 'string', required: true, max: 64, pattern: SESSION_ID_RE, patternMsg: 'ungültige ID' }));
  setIf(a, 'date', dateField(ctx, raw, 'date', path, { required: true }));
  const type = field(ctx, raw, 'type', path, { type: 'string', required: true, max: LIMITS.maxActivityType, pattern: ACTIVITY_TYPE_RE, patternMsg: 'enthält Steuer- oder unsichtbare Zeichen' });
  // Wie in der App bereinigt, damit Vorschläge und „Korrigieren ohne Änderung“ gleich arbeiten (Review r6 Code-Qualität N2).
  if (type !== undefined) a.type = cleanActivityType(type);
  setIf(a, 'durationMin', field(ctx, raw, 'durationMin', path, { type: 'int', required: true, min: 1, max: LIMITS.maxActivityMin }));
  setIf(a, 'rpe', field(ctx, raw, 'rpe', path, { type: 'int', min: 0, max: LIMITS.maxRpe }));
  const note = field(ctx, raw, 'note', path, { type: 'string', max: LIMITS.maxNote, nonEmpty: false });
  if (note) a.note = note;
  setIf(a, 'week', field(ctx, raw, 'week', path, { type: 'int', min: 1, max: LIMITS.maxWeeks }));
  setIf(a, 'createdAt', isoField(ctx, raw, 'createdAt', path, { required: true }));
  return a;
}

/** Prüft ein einzelnes anderes Training (z. B. aus dem Eingabe-Sheet), wirft ValidationError. */
export function validateActivityEntry(raw) {
  const ctx = new Ctx();
  if (raw === null || typeof raw !== 'object') ctx.err('activity', 'fehlt');
  const a = ctx.errors.length ? undefined : validateActivity(ctx, raw, 'activity');
  ctx.throwIfErrors();
  return a;
}

/** Prüft eine einzelne protokollierte Session (z. B. das laufende Training aus dem Browserspeicher). */
export function validateSession(raw) {
  const ctx = new Ctx();
  if (raw === null || typeof raw !== 'object') ctx.err('session', 'fehlt');
  const s = ctx.errors.length ? undefined : validateLoggedSession(ctx, raw, 'session');
  ctx.throwIfErrors();
  return s;
}

/**
 * Validiert eine komplette .training.json (Schema 1 bis 3). Wirft ValidationError, sonst bereinigte Kopie.
 * Die Kopie hat immer schemaVersion = SCHEMA_VERSION: Schema 2 und 3 ergänzen nur optionale Felder.
 */
export function validateTrainingFile(raw) {
  const ctx = new Ctx();
  if (!expectObject(ctx, raw, 'Datei', FILE_KEYS)) ctx.throwIfErrors();
  const f = {};
  const sv = raw.schemaVersion;
  if (Number.isInteger(sv) && sv > SCHEMA_VERSION) {
    throw new ValidationError([`schemaVersion: Datei stammt aus einer neueren App-Version (${sv}). Bitte die App aktualisieren.`]);
  }
  if (field(ctx, raw, 'schemaVersion', 'Datei', { type: 'int', required: true, min: MIN_SCHEMA_VERSION, max: SCHEMA_VERSION }) !== undefined) {
    f.schemaVersion = SCHEMA_VERSION;
  }
  setIf(f, 'fileId', field(ctx, raw, 'fileId', 'Datei', { type: 'string', required: true, max: 36, pattern: UUID_RE, patternMsg: 'UUID erwartet' }));
  setIf(f, 'revision', field(ctx, raw, 'revision', 'Datei', { type: 'int', required: true, min: 0, max: LIMITS.maxRevision }));
  setIf(f, 'updatedAt', isoField(ctx, raw, 'updatedAt', 'Datei', { required: true }));
  // Ab Schema 2, optional: Anlage der Datei, Vorgänger und Startwerte aus dem Vorgänger.
  setIf(f, 'createdAt', isoField(ctx, raw, 'createdAt', 'Datei', { required: false }));
  if (has(raw, 'previous')) setIf(f, 'previous', validatePrevious(ctx, raw.previous, 'previous'));
  if (has(raw, 'carryOver')) setIf(f, 'carryOver', validateCarryOver(ctx, raw.carryOver, 'carryOver'));

  if (!has(raw, 'plan')) ctx.err('Datei', 'plan fehlt');
  else f.plan = validatePlanInto(ctx, raw.plan, 'plan');

  const settings = { theme: 'dark', view: 'list' };
  if (has(raw, 'settings') && expectObject(ctx, raw.settings, 'settings', ['theme', 'view', 'sound'])) {
    setIf(settings, 'theme', field(ctx, raw.settings, 'theme', 'settings', { type: 'string', max: 10, oneOf: THEMES }));
    setIf(settings, 'view', field(ctx, raw.settings, 'view', 'settings', { type: 'string', max: 10, oneOf: VIEWS }));
    // Ton am Pausenende (optional, fehlt = laut)
    setIf(settings, 'sound', field(ctx, raw.settings, 'sound', 'settings', { type: 'string', max: 10, oneOf: SOUNDS }));
  }
  f.settings = settings;

  const weeks = f.plan?.weeks ?? LIMITS.maxWeeks;
  const progress = { currentWeek: 1, status: 'active' };
  if (has(raw, 'progress') && expectObject(ctx, raw.progress, 'progress', ['currentWeek', 'status', 'cycle', 'repeatFrom'])) {
    setIf(progress, 'currentWeek', field(ctx, raw.progress, 'currentWeek', 'progress', { type: 'int', min: 1, max: weeks }));
    setIf(progress, 'status', field(ctx, raw.progress, 'status', 'progress', { type: 'string', max: 20, oneOf: STATUSES }));
    setIf(progress, 'cycle', field(ctx, raw.progress, 'cycle', 'progress', { type: 'int', min: 1, max: LIMITS.maxCycles }));
    setIf(progress, 'repeatFrom', isoField(ctx, raw.progress, 'repeatFrom', 'progress', { required: false }));
  }
  f.progress = progress;

  f.sessions = [];
  if (has(raw, 'sessions') && expectArray(ctx, raw.sessions, 'sessions', { max: LIMITS.maxHistory })) {
    const ids = new Set();
    raw.sessions.forEach((s, i) => {
      const v = validateLoggedSession(ctx, s, `sessions[${i}]`);
      if (v?.id) {
        if (ids.has(v.id)) ctx.err(`sessions[${i}].id`, `"${v.id}" ist doppelt`);
        ids.add(v.id);
      }
      f.sessions.push(v);
    });
  }

  // Andere Trainings (ab Schema 3, optional). IDs teilen sich mit den Trainings deletedSessionIds und müssen daher
  // über beide Listen eindeutig sein.
  if (has(raw, 'activities') && expectArray(ctx, raw.activities, 'activities', { max: LIMITS.maxActivities })) {
    const ids = new Set(f.sessions.map((s) => s?.id).filter(Boolean));
    f.activities = raw.activities.map((a, i) => {
      const v = validateActivity(ctx, a, `activities[${i}]`);
      if (v?.id) {
        if (ids.has(v.id)) ctx.err(`activities[${i}].id`, `"${v.id}" ist doppelt`);
        ids.add(v.id);
      }
      return v;
    });
    // Wie in der App: nach Datum, am selben Tag nach Eintrag. Eine leere Liste entfällt (Review r5 Code-Qualität N3).
    if (!ctx.errors.length) {
      f.activities.sort(byActivityDate);
      if (!f.activities.length) delete f.activities;
    }
  }

  // IDs gelöschter Trainings, damit sie beim Zusammenführen mit älteren Dateien nicht zurückkommen.
  if (has(raw, 'deletedSessionIds') && expectArray(ctx, raw.deletedSessionIds, 'deletedSessionIds', { max: LIMITS.maxDeletedSessions })) {
    const seen = new Set();
    raw.deletedSessionIds.forEach((id, i) => {
      const p = `deletedSessionIds[${i}]`;
      if (typeof id !== 'string' || !SESSION_ID_RE.test(id)) ctx.err(p, 'ungültige ID');
      else if (seen.has(id)) ctx.err(p, `"${id}" ist doppelt`);
      else seen.add(id);
    });
    f.deletedSessionIds = [...seen];
  }
  ctx.throwIfErrors();
  return f;
}

// ---------- Einstieg für den Import ----------

/**
 * Erkennt und validiert eine Importdatei.
 * @returns {{kind: 'plan', plan: object} | {kind: 'training', file: object}}
 */
export function parseImportText(text) {
  const data = parseJsonSafe(text);
  if (!isObj(data)) throw new ValidationError(['Datei: muss ein JSON-Objekt sein']);
  if (has(data, 'schemaVersion') || has(data, 'fileId')) {
    return { kind: 'training', file: validateTrainingFile(data) };
  }
  if (has(data, 'plan') && Object.keys(data).length === 1) {
    return { kind: 'plan', plan: validatePlan(data.plan, 'plan') };
  }
  if (has(data, 'sessions') && has(data, 'weeks')) {
    return { kind: 'plan', plan: validatePlan(data, 'plan') };
  }
  throw new ValidationError(['Datei: weder ein Plan (plan.json) noch ein Trainingsstand (.training.json) erkannt']);
}
