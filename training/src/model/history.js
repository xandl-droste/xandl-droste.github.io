// Auswertungen für den Verlauf.

import { exercisesOf } from './plan.js';
import { LIMITS } from './validate.js';
import { bumpRevision } from './training-file.js';
import { clampOrNull } from './live.js';

/** Namen aller Übungen und Einheiten aus dem Plan (für die Anzeige der Historie). */
export function nameIndex(plan) {
  const exercises = new Map();
  const variants = new Map();
  const units = new Map();
  const perSide = new Map();
  const main = new Set();
  const sessions = new Map();
  for (const ps of plan.sessions) {
    sessions.set(ps.key, ps.name);
    for (const { exercise } of exercisesOf(ps)) {
      if (!exercises.has(exercise.id)) exercises.set(exercise.id, exercise.name);
      if (!units.has(exercise.id)) units.set(exercise.id, exercise.unit);
      if (!perSide.has(exercise.id)) perSide.set(exercise.id, Boolean(exercise.perSide));
      if (exercise.main) main.add(exercise.id);
      for (const v of exercise.variants ?? []) variants.set(`${exercise.id}/${v.id}`, v.name);
    }
  }
  return {
    exercise: (id) => exercises.get(id) ?? id,
    variant: (exId, vId) => (vId ? variants.get(`${exId}/${vId}`) ?? vId : null),
    /** Name einer Übung in einem Training: der beim Training gespeicherte, sonst aus dem Plan, sonst die id. */
    blockExercise: (block) => block.name ?? exercises.get(block.exerciseId) ?? block.exerciseId,
    /** Name der Variante in einem Training: gespeichert, sonst aus dem Plan, ohne Variante null. */
    blockVariant: (block) => (block.variantId
      ? block.variantName ?? variants.get(`${block.exerciseId}/${block.variantId}`) ?? block.variantId
      : null),
    session: (key) => sessions.get(key) ?? key,
    unit: (id) => units.get(id) ?? null,
    perSide: (id) => perSide.get(id) ?? false,
    /** Hauptübung im aktuellen Plan? */
    main: (id) => main.has(id),
  };
}

/** Abgeschlossene Sessions, neueste zuerst. */
export function endedSessions(file) {
  return file.sessions
    .filter((s) => s.endedAt)
    .sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt));
}

/**
 * Einträge für die Liste im Verlauf: beendete Krafttrainings und andere Trainings, neueste zuerst.
 * Sortiert nach Datum, am selben Tag nach Beginn (Krafttraining) bzw. Zeitpunkt des Eintrags (anderes Training).
 * @returns {{kind: 'session'|'activity', item: object}[]}
 */
export function historyEntries(file) {
  const all = [
    ...endedSessions(file).map((s) => ({ kind: 'session', item: s, date: s.date, at: Date.parse(s.startedAt) })),
    ...(file.activities ?? []).map((a) => ({ kind: 'activity', item: a, date: a.date, at: Date.parse(a.createdAt) })),
  ];
  all.sort((x, y) => y.date.localeCompare(x.date) || y.at - x.at);
  return all.map(({ kind, item }) => ({ kind, item }));
}

/** Kalendertage zwischen zwei Datumsangaben JJJJ-MM-TT (lokale Daten, unabhängig von Sommerzeit). */
export function daysBetween(fromIso, toIso) {
  const utc = (iso) => {
    const [y, m, d] = iso.split('-').map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((utc(toIso) - utc(fromIso)) / 86_400_000);
}

/** "heute", "gestern" oder "vor N Tagen" (Daten in der Zukunft, z. B. falsch gehende Uhr: "heute"). */
export function daysAgoText(days) {
  if (days <= 0) return 'heute';
  if (days === 1) return 'gestern';
  return `vor ${days} Tagen`;
}

/**
 * Letztes beendetes Training für die Karte „Nächste Einheit“: Einheit und wie lange her (Kalendertage in
 * lokaler Zeit, Grundlage ist das lokale Datum der Session). Ohne beendetes Training null.
 * @param {string} todayIso heutiges lokales Datum JJJJ-MM-TT
 */
export function lastTrained(file, todayIso) {
  const last = endedSessions(file)[0];
  if (!last) return null;
  const days = Math.max(0, daysBetween(last.date, todayIso));
  return { sessionId: last.id, name: nameIndex(file.plan).session(last.sessionKey), days, when: daysAgoText(days) };
}

export function sessionStats(session) {
  let done = 0;
  let total = 0;
  for (const b of session.blocks) {
    if (b.skipped) continue;
    total += b.sets.length;
    done += b.sets.filter((s) => s.done).length;
  }
  const minutes = session.endedAt ? Math.round((Date.parse(session.endedAt) - Date.parse(session.startedAt)) / 60000) : null;
  return { done, total, minutes };
}

/**
 * Verlauf einer Übung: pro Session der beste erledigte Satz.
 * Kennzahl: Gewicht (kg), wenn je ein Gewicht eingetragen wurde, sonst Haltezeit (s) bzw. Wiederholungen.
 * @returns {{metric: 'kg'|'sec'|'reps', points: {date: string, value: number, sessionId: string}[]}}
 */
export function exerciseSeries(file, exerciseId) {
  const rows = [];
  const sessions = [...file.sessions].filter((s) => s.endedAt).sort((a, b) => Date.parse(a.startedAt) - Date.parse(b.startedAt));
  for (const s of sessions) {
    for (const b of s.blocks) {
      if (b.exerciseId !== exerciseId || b.skipped) continue;
      const done = b.sets.filter((x) => x.done);
      if (done.length) rows.push({ session: s, done });
    }
  }
  const hasKg = rows.some((r) => r.done.some((x) => typeof x.kg === 'number' && x.kg > 0));
  const hasSec = rows.some((r) => r.done.some((x) => typeof x.sec === 'number'));
  const metric = hasKg ? 'kg' : hasSec ? 'sec' : 'reps';
  const points = [];
  for (const { session, done } of rows) {
    const vals = done.map((x) => x[metric]).filter((v) => typeof v === 'number');
    if (vals.length) points.push({ date: session.date, value: Math.max(...vals), sessionId: session.id });
  }
  return { metric, points };
}

/** Übungen, zu denen es Einträge gibt, in Plan-Reihenfolge, danach unbekannte. */
export function exercisesWithHistory(file) {
  const seen = new Set();
  for (const s of file.sessions) {
    if (!s.endedAt) continue;
    for (const b of s.blocks) if (!b.skipped && b.sets.some((x) => x.done)) seen.add(b.exerciseId);
  }
  const ordered = [];
  for (const ps of file.plan.sessions) {
    for (const { exercise } of exercisesOf(ps)) {
      if (seen.has(exercise.id) && !ordered.includes(exercise.id)) ordered.push(exercise.id);
    }
  }
  for (const id of seen) if (!ordered.includes(id)) ordered.push(id);
  return ordered;
}

/**
 * Geometrie eines einfachen Liniendiagramms.
 * @returns {{x: number, y: number}[], min, max}
 */
export function chartGeometry(values, { width = 320, height = 120, padX = 24, padTop = 14, padBottom = 26 } = {}) {
  if (!values.length) return { points: [], min: null, max: null };
  let min = Math.min(...values);
  let max = Math.max(...values);
  if (min === max) {
    min -= 1;
    max += 1;
  }
  const innerW = width - 2 * padX;
  const innerH = height - padTop - padBottom;
  const step = values.length > 1 ? innerW / (values.length - 1) : 0;
  const points = values.map((v, i) => ({
    x: Math.round((values.length > 1 ? padX + i * step : width / 2) * 10) / 10,
    y: Math.round((padTop + (1 - (v - min) / (max - min)) * innerH) * 10) / 10,
  }));
  return { points, min: Math.min(...values), max: Math.max(...values) };
}

// ---------- Korrigieren ----------

/**
 * Einheit eines protokollierten Blocks für die Bearbeitung: Haltezeit, wenn Sekunden statt Wiederholungen
 * eingetragen sind (z. B. Wochen mit Haltezeit), sonst die Einheit aus dem Plan (unbekannte Übung: kg).
 */
export function loggedUnit(planUnit, block) {
  const repsUnit = planUnit && planUnit !== 's' ? planUnit : 'kg';
  if (block.durationSec != null) return 's';
  if (block.repsMax != null) return repsUnit;
  if (block.sets.some((s) => typeof s.sec === 'number' && s.reps == null)) return 's';
  if (block.sets.some((s) => typeof s.reps === 'number')) return repsUnit;
  return planUnit ?? 'kg';
}

function editSession(file, sessionId, fn, now) {
  const idx = file.sessions.findIndex((s) => s.id === sessionId);
  if (idx < 0) return file;
  const session = structuredClone(file.sessions[idx]);
  if (fn(session) === false) return file;
  const sessions = [...file.sessions];
  sessions[idx] = session;
  return bumpRevision({ ...file, sessions }, now);
}

/** Wert eines Satzes in einem beendeten Training korrigieren (kg, reps, sec). Gleicher Wert: keine Änderung. */
export function updateLoggedSet(file, sessionId, blockIndex, setIndex, patch, now = new Date()) {
  return editSession(file, sessionId, (s) => {
    const set = s.blocks[blockIndex]?.sets[setIndex];
    if (!set) return false;
    let changed = false;
    const apply = (key, value) => {
      if (value !== set[key]) { set[key] = value; changed = true; }
    };
    if ('kg' in patch) apply('kg', clampOrNull(patch.kg, 0, LIMITS.maxKg, 2));
    if ('reps' in patch) apply('reps', clampOrNull(patch.reps, 0, LIMITS.maxLoggedReps, 0));
    if ('sec' in patch) apply('sec', clampOrNull(patch.sec, 0, LIMITS.maxLoggedSec, 0));
    return changed;
  }, now);
}

/** Notiz einer Übung in einem beendeten Training ändern. */
export function setLoggedNote(file, sessionId, blockIndex, note, now = new Date()) {
  return editSession(file, sessionId, (s) => {
    const b = s.blocks[blockIndex];
    const text = String(note ?? '').slice(0, LIMITS.maxNote).trim();
    if (!b || b.note === text) return false;
    b.note = text;
    return true;
  }, now);
}

/** RIR nach dem letzten Satz in einem beendeten Training korrigieren (0 bis 4) oder mit null entfernen. */
export function setLoggedRir(file, sessionId, blockIndex, value, now = new Date()) {
  if (value !== null && !(Number.isInteger(value) && value >= 0 && value <= LIMITS.maxRir)) return file;
  return editSession(file, sessionId, (s) => {
    const b = s.blocks[blockIndex];
    if (!b || (b.rirLast ?? null) === value) return false;
    if (value === null) delete b.rirLast;
    else b.rirLast = value;
    return true;
  }, now);
}

/** RPE eines beendeten Trainings korrigieren (0 bis 10) oder mit null entfernen. */
export function setSessionRpe(file, sessionId, value, now = new Date()) {
  if (value !== null && !(Number.isInteger(value) && value >= 0 && value <= LIMITS.maxRpe)) return file;
  return editSession(file, sessionId, (s) => {
    if ((s.rpe ?? null) === value) return false;
    if (value === null) delete s.rpe;
    else s.rpe = value;
    return true;
  }, now);
}

/** Notiz zum ganzen Training ändern. Leerer Text entfernt sie. */
export function setSessionNote(file, sessionId, note, now = new Date()) {
  return editSession(file, sessionId, (s) => {
    const text = String(note ?? '').slice(0, LIMITS.maxNote).trim();
    if ((s.note ?? '') === text) return false;
    if (text) s.note = text;
    else delete s.note;
    return true;
  }, now);
}
