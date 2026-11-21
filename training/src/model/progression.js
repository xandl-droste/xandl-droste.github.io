// Doppelte Progression, Deload und Vorbelegung der Sätze.

import { resolvePrescription } from './plan.js';
import { LIMITS } from './validate.js';

const round2 = (x) => Math.round(x * 100) / 100;
const roundTo = (x, step) => round2(Math.round(x / step) * step);
const clamp = (x, min, max) => Math.min(max, Math.max(min, x));

/** Schrittweite für den Deload-Gewichtsvorschlag. */
export const DELOAD_ROUND_KG = 0.5;

/**
 * Ist eine Session ein Deload-Training? Neuere Sessions tragen das Feld deload (true) bzw. haben einen Durchgang
 * (cycle) ohne deload. Ältere Sessions ohne beides: Deload-Wochen des aktuellen Plans.
 */
export function isDeloadSession(plan, session) {
  if (session.deload === true) return true;
  if (session.cycle != null) return false;
  return Boolean(plan.deload?.weeks.includes(session.week));
}

/**
 * Letzter abgeschlossener Block einer Übung mit mindestens einem erledigten Satz.
 * @param {(session) => boolean} [filter] z. B. um Deload-Wochen auszuschließen
 */
export function lastPerformance(sessions, exerciseId, filter = () => true) {
  const candidates = sessions
    .filter((s) => s.endedAt && filter(s))
    .sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt));
  for (const session of candidates) {
    const block = session.blocks.find((b) => b.exerciseId === exerciseId && !b.skipped && b.sets.some((st) => st.done));
    if (block) return { session, block, doneSets: block.sets.filter((st) => st.done) };
  }
  return null;
}

/** Letzte Leistung außerhalb von Deload-Trainings. */
export function lastWorkPerformance(plan, sessions, exerciseId) {
  return lastPerformance(sessions, exerciseId, (s) => !isDeloadSession(plan, s));
}

/** Arbeitsgewicht = schwerster erledigter Satz. */
export function workingWeight(doneSets) {
  const kgs = doneSets.map((s) => s.kg).filter((kg) => typeof kg === 'number');
  return kgs.length ? Math.max(...kgs) : null;
}

/**
 * Vorgabe, die beim letzten Mal galt: aus dem Block (beim Start gespeichert), sonst aus dem aktuellen Plan
 * für die damalige Woche (ältere Sessions).
 */
export function recordedPrescription(plan, exercise, last) {
  const b = last.block;
  const fallback = () => resolvePrescription(plan, exercise, last.session.week);
  const hasRecord = b.plannedSets != null && (b.repsMax != null || b.durationSec != null);
  if (hasRecord) {
    return { recorded: true, unit: b.durationSec != null ? 's' : null, sets: b.plannedSets, repsMax: b.repsMax ?? null, durationSec: b.durationSec ?? null };
  }
  const p = fallback();
  return { recorded: false, unit: p.unit, sets: p.sets, repsMax: p.unit === 's' ? null : p.repsMax, durationSec: p.unit === 's' ? p.durationSec : null };
}

/**
 * Progressionsregel: Beim letzten Mal wurden alle vorgegebenen Sätze erledigt und jeder
 * erreichte die obere Wiederholungsgrenze der damals gültigen Vorgabe.
 */
export function progressionReached(plan, exercise, last) {
  if (!last) return false;
  const prev = recordedPrescription(plan, exercise, last);
  if (!prev.recorded && prev.unit !== 'kg') return false;
  if (prev.repsMax == null) return false;
  if (last.doneSets.length < prev.sets) return false;
  return last.doneSets.every((s) => typeof s.reps === 'number' && s.reps >= prev.repsMax);
}

/**
 * Vorschlag für die Sätze einer Übung in einer Woche.
 * Vorbelegt mit der letzten Leistung außerhalb von Deload-Trainings (sonst irgendeiner), in der Deload-Woche mit
 * ca. loadFactor × Arbeitsgewicht. Wiederholungen werden in die Spanne der Woche gelegt.
 * increase ist gesetzt, wenn die Progressionsregel erfüllt ist und der Plan die Wiederholungen in dieser Woche
 * nicht anhebt (per Tap übernehmen, siehe applyIncrease).
 */
export function suggestSets(plan, exercise, week, sessions) {
  const p = resolvePrescription(plan, exercise, week);
  const lastAny = lastPerformance(sessions, exercise.id);
  const lastWork = lastWorkPerformance(plan, sessions, exercise.id);
  // Grundlage der Vorbelegung (und Anzeige „Letztes Mal“).
  const base = p.isDeload ? lastAny : lastWork ?? lastAny;
  const prevPrescription = base ? recordedPrescription(plan, exercise, base) : null;
  const holdChanged = p.unit === 's' && prevPrescription?.durationSec != null && prevPrescription.durationSec !== p.durationSec;

  const sets = [];
  for (let i = 0; i < p.sets; i++) {
    const prev = base ? base.doneSets[Math.min(i, base.doneSets.length - 1)] : null;
    let reps = null;
    if (p.unit !== 's') {
      const min = p.repsMin ?? p.repsMax;
      const max = p.repsMax ?? p.repsMin;
      reps = typeof prev?.reps === 'number' ? clamp(prev.reps, min, max) : min;
    }
    sets.push({
      kg: prev?.kg ?? null,
      reps,
      sec: p.unit === 's' ? (holdChanged ? p.durationSec : prev?.sec ?? p.durationSec) : null,
      done: false,
    });
  }

  let increase = null;
  let deloadKg = null;
  if (p.isDeload) {
    const w = lastWork ? workingWeight(lastWork.doneSets) : null;
    if (w != null && p.unit !== 's') {
      deloadKg = roundTo(w * p.loadFactor, DELOAD_ROUND_KG);
      for (const s of sets) if (s.kg != null) s.kg = deloadKg;
    }
  } else if (p.unit === 'kg' && p.incrementKg > 0 && progressionReached(plan, exercise, lastWork)) {
    const prevMax = recordedPrescription(plan, exercise, lastWork).repsMax;
    const w = workingWeight(lastWork.doneSets);
    const repsNotRaised = p.repsMax != null && prevMax != null && p.repsMax <= prevMax;
    if (repsNotRaised && w != null && w + p.incrementKg <= LIMITS.maxKg) {
      increase = { fromKg: w, toKg: round2(w + p.incrementKg), reps: p.repsMin, incrementKg: p.incrementKg };
    }
  }

  return {
    prescription: p,
    sets,
    last: base ? { date: base.session.date, week: base.session.week, sets: base.doneSets.map((s) => ({ ...s })), note: (base.block.note ?? '').trim() } : null,
    increase,
    deloadKg,
  };
}

/** Übernimmt den Steigerungsvorschlag: neues Gewicht, wieder am unteren Ende der Wiederholungen. */
export function applyIncrease(suggestion) {
  if (!suggestion.increase) return suggestion.sets.map((s) => ({ ...s }));
  const { toKg, reps } = suggestion.increase;
  return suggestion.sets.map((s) => ({ ...s, kg: toKg, reps: reps ?? s.reps }));
}
