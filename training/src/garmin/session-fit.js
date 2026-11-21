// Session aus der Historie → FIT-Datei für Garmin Connect (Einbahnstraße, wird nie gelesen).
// Das JSON bleibt die Wahrheit. Keine Freitexte (Namen, Notizen) landen in der FIT-Datei.

import { strengthActivity } from './fit.js';
import { exercisesOf, findPlanSession, resolvePrescription } from '../model/plan.js';
import { GARMIN_CATEGORIES } from './categories.js';

/** Unbekannte Übung im FIT-Profil (exercise_category = unknown). */
export const UNKNOWN_CATEGORY = 65534;
const KNOWN_CATEGORIES = new Set(GARMIN_CATEGORIES.map(([n]) => n));

// Fallback, wenn die Übung im Plan keine garminCategory hat: Stichworte in ID und Name.
// Reihenfolge zählt (z. B. "leg curl" vor "curl", "split squat" vor "squat").
// Nummern: exercise_category aus dem FIT-Profil (SDK 21.221).
const KEYWORDS = [
  [/leg.?curl|beinbeug/, 15],
  [/split.?squat|lunge|ausfallschritt/, 17],
  [/hip.?thrust|glute.?bridge|hüftheben|hip.?raise/, 10],
  [/deadlift|kreuzheben|\brdl\b/, 8],
  [/squat|kniebeug/, 28],
  [/pull.?up|chin.?up|klimmzug/, 21],
  [/push.?up|liegestütz/, 22],
  [/bench|bankdrück/, 0],
  [/row|rudern/, 23],
  [/shoulder.?press|overhead.?press|schulterdrück/, 24],
  [/lateral.?raise|seitheben/, 14],
  [/calf|waden/, 1],
  [/triceps|trizeps/, 30],
  [/curl|bizeps/, 7],
  [/shrug/, 26],
  [/crunch/, 6],
  [/plank|stütz/, 19],
  [/carry|farmer/, 3],
  [/chop|holzhack/, 4],
  [/jump|sprung|hop|pogo|throw|wurf/, 20],
];

/** Garmin-Kategorie einer Plan-Übung: aus dem Plan, sonst nächstliegende per Stichwort, sonst unknown. */
export function garminCategoryOf(exercise) {
  // Nur bekannte Kategorien übernehmen; eine unbekannte Nummer (z. B. 999) würde Garmin Connect nicht zuordnen können.
  if (exercise && Number.isInteger(exercise.garminCategory) && KNOWN_CATEGORIES.has(exercise.garminCategory)) {
    return {
      category: exercise.garminCategory,
      subcategory: Number.isInteger(exercise.garminSubcategory) ? exercise.garminSubcategory : null,
    };
  }
  const text = `${exercise?.id ?? ''} ${exercise?.name ?? ''}`.toLowerCase();
  for (const [re, category] of KEYWORDS) if (re.test(text)) return { category, subcategory: null };
  return { category: UNKNOWN_CATEGORY, subcategory: null };
}

function findExercise(plan, sessionKey, exerciseId) {
  const own = findPlanSession(plan, sessionKey);
  for (const ps of own ? [own, ...plan.sessions] : plan.sessions) {
    for (const { exercise } of exercisesOf(ps)) if (exercise.id === exerciseId) return exercise;
  }
  return null;
}

/** Geschätzte Arbeitszeit eines Satzes in Sekunden (gleiche Regel wie die Dauer-Schätzung, ohne Vorbereitung). */
function workSec(p, set) {
  const sides = p?.perSide ? 2 : 1;
  const base = p?.unit === 's' || set.reps == null ? set.sec ?? p?.durationSec ?? 30 : set.reps * 3;
  return Math.max(5, Math.round(base * sides));
}

/** Erledigte Sätze einer Session mit Plan-Bezug, in Trainingsreihenfolge. */
function doneSets(plan, session) {
  const out = [];
  session.blocks.forEach((b) => {
    if (b.skipped) return;
    const ex = findExercise(plan, session.sessionKey, b.exerciseId);
    const p = ex ? resolvePrescription(plan, ex, session.week) : null;
    b.sets.forEach((set) => {
      if (set.done) out.push({ set, p, garmin: garminCategoryOf(ex ?? { id: b.exerciseId }) });
    });
  });
  return out;
}

/**
 * Zeitachse der Sätze.
 * Mit doneAt an allen Sätzen: Satzende = doneAt, Start = Ende − Arbeitszeit, Lücken dazwischen = Pausen.
 * Ohne (ältere Sessions): Sätze nacheinander mit geschätzter Arbeitszeit und Plan-Pause,
 * so gelegt, dass das letzte Satzende auf endedAt fällt; ist die Schätzung zu lang, werden die Pausen gekürzt.
 */
export function sessionTimeline(plan, session) {
  const t0 = Date.parse(session.startedAt);
  const t1 = Date.parse(session.endedAt);
  const items = doneSets(plan, session);
  const timed = items.length > 0 && items.every(({ set }) => {
    const t = Date.parse(set.doneAt ?? '');
    return Number.isFinite(t) && t >= t0 && t <= t1;
  });
  const active = [];
  if (timed) {
    items.sort((a, b) => Date.parse(a.set.doneAt) - Date.parse(b.set.doneAt));
    let prevEnd = t0;
    for (const it of items) {
      const end = Date.parse(it.set.doneAt);
      const dur = Math.max(1000, Math.min(workSec(it.p, it.set) * 1000, end - prevEnd));
      active.push({ it, start: Math.max(t0, end - dur), end });
      prevEnd = end;
    }
  } else if (items.length) {
    const works = items.map((it) => workSec(it.p, it.set) * 1000);
    const rests = items.slice(0, -1).map((it) => (it.p?.restSec ?? 90) * 1000);
    const span = Math.max(0, t1 - t0);
    const workTotal = works.reduce((a, b) => a + b, 0);
    const restTotal = rests.reduce((a, b) => a + b, 0);
    let workScale = 1;
    let restScale = 1;
    if (workTotal + restTotal > span) {
      if (workTotal <= span) restScale = restTotal ? (span - workTotal) / restTotal : 0;
      else {
        restScale = 0;
        workScale = workTotal ? span / workTotal : 0;
      }
    }
    let cursor = t1 - (workTotal * workScale + restTotal * restScale);
    items.forEach((it, i) => {
      const start = Math.round(cursor);
      cursor += works[i] * workScale;
      const end = Math.max(start + 1000, Math.round(cursor));
      active.push({ it, start, end });
      if (i < rests.length) cursor += rests[i] * restScale;
    });
  }
  const sets = [];
  active.forEach(({ it, start, end }, i) => {
    const prev = active[i - 1];
    if (prev && start - prev.end >= 1000) {
      sets.push({ type: 'rest', start: new Date(prev.end), durationSec: Math.round((start - prev.end) / 1000) });
    }
    const { set, garmin } = it;
    const reps = it.p?.unit === 's' && set.reps == null ? null : set.reps;
    sets.push({
      type: 'active',
      start: new Date(start),
      durationSec: Math.max(1, Math.round((end - start) / 1000)),
      reps: reps ?? null,
      kg: typeof set.kg === 'number' && set.kg > 0 ? set.kg : null,
      category: garmin.category,
      subcategory: garmin.subcategory,
    });
  });
  // Aktivität auf die eigentliche Trainingszeit begrenzen: höchstens 15 Min vor dem ersten und nach dem letzten Satz.
  // (Ein Training, das lange offen blieb, würde sonst Tage dauern.)
  const MARGIN = 15 * 60_000;
  if (!active.length) return { start: new Date(t0), end: new Date(t1), sets };
  const firstStart = active[0].start;
  const lastEnd = active[active.length - 1].end;
  const start = Math.max(t0, firstStart - MARGIN);
  const end = Math.max(lastEnd, Math.min(t1, lastEnd + MARGIN));
  return { start: new Date(start), end: new Date(end), sets };
}

/** FIT-Bytes für eine abgeschlossene Session. */
export function sessionToFit(plan, session) {
  if (!session?.endedAt) throw new Error('sessionToFit: Session ist nicht abgeschlossen');
  return strengthActivity(sessionTimeline(plan, session));
}

/** Dateiname nur aus dem (validierten) Datum, keine Freitexte. */
export function garminFileName(session) {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(session?.date ?? '') ? session.date : 'datum';
  return `training-${date}.fit`;
}
