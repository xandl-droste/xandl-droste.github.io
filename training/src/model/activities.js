// Andere Trainings (ab Schema 3): Trainings ohne Einheit und ohne Sätze, z. B. „Beachvolleyball · 90 min · RPE 6“.
// Sie liegen in file.activities, zählen nicht für die Woche und ändern weder Vorbelegung noch Steigerung.
// Alle Funktionen sind rein und geben neue Objekte zurück. Entwurf: docs/entwurf-andere-trainingsarten.md.

import { LIMITS, validateActivityEntry, cleanActivityType, byActivityDate } from './validate.js';
import { bumpRevision, unionDeleted } from './training-file.js';
import { newId } from './id.js';
import { localDate } from '../format.js';

/** Andere Trainings einer Trainingsdatei, älteste zuerst. Fehlt das Feld, eine leere Liste. */
export function activitiesOf(file) {
  return file?.activities ?? [];
}

/** Bereinigt die Eingabe aus dem Sheet: Trainingsart ohne unsichtbare Zeichen und Rand-Leerzeichen, leere RPE und Notiz entfallen. */
function cleanInput({ type, date, durationMin, rpe, note }) {
  // Ohne unsichtbare Zeichen (Review r5/r6 Security N2), Menge und Bereinigung stehen in validate.js.
  const out = { type: cleanActivityType(type), date, durationMin };
  if (rpe !== null && rpe !== undefined && rpe !== '') out.rpe = rpe;
  const n = String(note ?? '').trim();
  if (n) out.note = n;
  return out;
}

/** Fehler, die die App vor dem Speichern prüft und die der Validator nicht kennt (z. B. Datum in der Zukunft). */
function checkDate(date, today) {
  if (typeof date === 'string' && date > today) throw new RangeError('Das Datum liegt in der Zukunft.');
}

/**
 * Trägt ein anderes Training ein. Wirft ValidationError bei ungültiger Eingabe und RangeError bei Datum in der Zukunft
 * oder voller Liste.
 * @param {{type: string, date: string, durationMin: number, rpe?: number|null, note?: string}} input
 * @returns {{file: object, activity: object}}
 */
export function addActivity(file, input, { now = new Date(), id = newId() } = {}) {
  const list = activitiesOf(file);
  if (list.length >= LIMITS.maxActivities) throw new RangeError(`Höchstens ${LIMITS.maxActivities} andere Trainings pro Trainingsdatei.`);
  const clean = cleanInput(input);
  checkDate(clean.date, localDate(now));
  const activity = validateActivityEntry({
    id,
    ...clean,
    week: file.progress.currentWeek,
    createdAt: new Date(now).toISOString(),
  });
  const activities = [...list, activity].sort(byActivityDate);
  return { file: bumpRevision({ ...file, activities }, now), activity };
}

/**
 * Korrigiert ein anderes Training. Trainingsart, Datum, Dauer, RPE und Notiz werden aus patch übernommen
 * (rpe: null bzw. note: '' nimmt den Wert heraus). id, week und createdAt bleiben.
 */
export function updateActivity(file, id, patch, { now = new Date() } = {}) {
  const list = activitiesOf(file);
  const old = list.find((a) => a.id === id);
  if (!old) return file;
  const merged = { type: old.type, date: old.date, durationMin: old.durationMin, rpe: old.rpe ?? null, note: old.note ?? '', ...patch };
  const clean = cleanInput(merged);
  if (clean.date !== old.date) checkDate(clean.date, localDate(now));
  const keep = { id: old.id, createdAt: old.createdAt };
  if (old.week !== undefined) keep.week = old.week;
  const next = validateActivityEntry({ ...keep, ...clean });
  // Ohne Änderung keine neue Revision (sonst gilt der Stand grundlos als „nicht gesichert“, Review r5 Code-Qualität N1).
  if (JSON.stringify(next) === JSON.stringify(old)) return file;
  const activities = list.map((a) => (a.id === id ? next : a)).sort(byActivityDate);
  return bumpRevision({ ...file, activities }, now);
}

/** Löscht ein anderes Training und merkt sich die ID (gegen Wiederkehr beim Zusammenführen). */
export function deleteActivity(file, id, now = new Date()) {
  const list = activitiesOf(file);
  if (!list.some((a) => a.id === id)) return file;
  const activities = list.filter((a) => a.id !== id);
  const next = { ...file, activities, deletedSessionIds: unionDeleted(file.deletedSessionIds, [id]) };
  if (!activities.length) delete next.activities;
  return bumpRevision(next, now);
}

/** Vorschläge für die Trainingsart: bisherige Trainingsarten der Datei, häufigste zuerst, bei Gleichstand die zuletzt genutzte. */
export function activityTypeSuggestions(file, max = 6) {
  const stats = new Map();
  activitiesOf(file).forEach((a, i) => {
    const key = a.type.toLocaleLowerCase('de');
    const s = stats.get(key) ?? { type: a.type, count: 0, last: -1 };
    s.count++;
    if (i > s.last) { s.last = i; s.type = a.type; }
    stats.set(key, s);
  });
  return [...stats.values()]
    .sort((a, b) => b.count - a.count || b.last - a.last)
    .slice(0, max)
    .map((s) => s.type);
}
