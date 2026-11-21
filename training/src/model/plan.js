// Hilfsfunktionen rund um den Plan. Der Plan gehört dem Agenten und wird hier nie verändert.

export const DEFAULT_REST_SEC = 90;
export const DEFAULT_INCREMENT_KG = 2.5;

/** Liefert die in einer Woche gültige Vorgabe einer Übung (Basis + byWeek + Deload). */
export function resolvePrescription(plan, exercise, week) {
  const o = (exercise.byWeek && exercise.byWeek[String(week)]) || {};
  const deload = plan.deload;
  const isDeload = Boolean(deload && deload.weeks.includes(week));
  let sets = o.sets ?? exercise.sets;
  if (isDeload) sets = Math.max(1, sets + deload.setsDelta);
  return {
    week,
    unit: o.unit ?? exercise.unit,
    sets,
    repsMin: o.repsMin ?? exercise.repsMin ?? null,
    repsMax: o.repsMax ?? exercise.repsMax ?? null,
    durationSec: o.durationSec ?? exercise.durationSec ?? null,
    cue: o.cue ?? exercise.cue ?? '',
    restSec: exercise.restSec ?? DEFAULT_REST_SEC,
    perSide: exercise.perSide ?? false,
    incrementKg: exercise.incrementKg ?? DEFAULT_INCREMENT_KG,
    isDeload,
    loadFactor: isDeload ? deload.loadFactor : 1,
  };
}

/** Alle Übungen einer Plan-Einheit in Reihenfolge, mit Block-Kontext. */
export function exercisesOf(planSession) {
  const out = [];
  planSession.blocks.forEach((block, blockIndex) => {
    block.exercises.forEach((exercise, slot) => {
      out.push({ exercise, block, blockIndex, slot: block.type === 'superset' ? (slot === 0 ? 'a' : 'b') : null });
    });
  });
  return out;
}

/** Alle Übungen des Plans (eine Übung kann in mehreren Einheiten vorkommen). */
export function allExerciseIds(plan) {
  const ids = new Set();
  for (const s of plan.sessions) for (const { exercise } of exercisesOf(s)) ids.add(exercise.id);
  return ids;
}

export function findPlanSession(plan, key) {
  return plan.sessions.find((s) => s.key === key) ?? null;
}

/**
 * Geschätzte Dauer einer Einheit in Minuten.
 * Formel: 10 Min Warm-up + Summe über alle Sätze (Arbeitszeit + Pause).
 * Arbeitszeit: Haltezeit bzw. 3 s pro Wiederholung (obere Grenze) plus 20 s Vorbereitung; pro Seite doppelt.
 */
export const WARMUP_MIN = 10;
export function estimateMinutes(plan, planSession, week) {
  let sec = WARMUP_MIN * 60;
  for (const { exercise } of exercisesOf(planSession)) {
    const p = resolvePrescription(plan, exercise, week);
    const sides = p.perSide ? 2 : 1;
    const work = (p.unit === 's' ? p.durationSec ?? 0 : (p.repsMax ?? p.repsMin ?? 0) * 3) * sides + 20;
    sec += p.sets * (work + p.restSec);
  }
  return Math.round(sec / 60 / 5) * 5;
}

export function countExercises(plan) {
  let n = 0;
  for (const s of plan.sessions) n += exercisesOf(s).length;
  return n;
}
