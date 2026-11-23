// Nachfolger einer Trainingsdatei: Verweis auf den Vorgänger und Startwerte (carryOver).
// Eine Trainingsdatei enthält genau einen Durchgang. Damit Vorbelegung und Steigerungsvorschlag im neuen Durchgang
// nicht bei null anfangen, übernimmt der Nachfolger pro Übung die letzte Leistung aus dem Vorgänger.

import { createTrainingFile, fileNameOf } from './training-file.js';
import { allExerciseIds, exercisesOf } from './plan.js';
import { lastWorkPerformance, recordedPrescription } from './progression.js';

/** Startzeit, mit der Startwerte als Pseudo-Trainings vor allen echten Trainings einsortiert werden. */
const CARRY_STARTED_AT = '1970-01-01T00:00:00.000Z';

function planExercise(plan, id) {
  for (const ps of plan.sessions) for (const { exercise } of exercisesOf(ps)) if (exercise.id === id) return exercise;
  return null;
}

/**
 * Trainings für Vorbelegung und Progression: die Startwerte als Pseudo-Trainings (ganz vorn einsortiert, nie
 * gespeichert, nie angezeigt), danach die echten Trainings. Ohne Startwerte die Trainings unverändert.
 */
export function performanceSessions(file) {
  if (!file.carryOver?.length) return file.sessions;
  const pseudo = file.carryOver.map((c) => ({
    id: `carry-${c.exerciseId}`,
    date: c.date,
    sessionKey: 'carry',
    week: 1,
    cycle: 1,
    startedAt: CARRY_STARTED_AT,
    endedAt: CARRY_STARTED_AT,
    carry: true,
    blocks: [{
      exerciseId: c.exerciseId,
      variantId: c.variantId ?? null,
      plannedSets: c.plannedSets,
      ...(c.repsMax != null ? { repsMax: c.repsMax } : {}),
      ...(c.durationSec != null ? { durationSec: c.durationSec } : {}),
      sets: c.sets.map((s) => ({ kg: s.kg, reps: s.reps, sec: s.sec, done: true })),
      note: c.note ?? '',
    }],
  }));
  return [...pseudo, ...file.sessions];
}

/**
 * Startwerte für einen Nachfolger mit Plan nextPlan: pro Übung des neuen Plans die letzte Leistung außerhalb eines
 * Deloads aus dem Vorgänger (eigene Trainings, sonst dessen Startwerte) mit der damals gültigen Vorgabe.
 * Übungen ohne Leistung oder ohne bekannte Vorgabe fehlen.
 */
export function buildCarryOver(prevFile, nextPlan) {
  const out = [];
  const sessions = performanceSessions(prevFile);
  for (const id of allExerciseIds(nextPlan)) {
    const last = lastWorkPerformance(prevFile.plan, sessions, id);
    if (!last) continue;
    const exercise = planExercise(prevFile.plan, id);
    const b = last.block;
    let prescription;
    if (b.plannedSets != null && (b.repsMax != null || b.durationSec != null)) {
      prescription = { plannedSets: b.plannedSets, repsMax: b.repsMax ?? null, durationSec: b.durationSec ?? null };
    } else if (exercise) {
      const p = recordedPrescription(prevFile.plan, exercise, last);
      prescription = { plannedSets: p.sets, repsMax: p.repsMax, durationSec: p.durationSec };
    } else continue;
    const entry = {
      exerciseId: id,
      date: last.session.date,
      variantId: b.variantId ?? null,
      plannedSets: prescription.plannedSets,
      sets: last.doneSets.map((s) => ({ kg: s.kg ?? null, reps: s.reps ?? null, sec: s.sec ?? null })),
    };
    if (prescription.repsMax != null) entry.repsMax = prescription.repsMax;
    if (prescription.durationSec != null) entry.durationSec = prescription.durationSec;
    const note = (b.note ?? '').trim();
    if (note) entry.note = note;
    out.push(entry);
  }
  return out;
}

/** Verweis auf den Vorgänger: id, Dateiname und Planname. */
export function previousRef(prevFile) {
  return { fileId: prevFile.fileId, fileName: fileNameOf(prevFile), planName: prevFile.plan.name };
}

/**
 * Neue Trainingsdatei als Nachfolger von prevFile: neuer Durchgang mit plan (gleicher Plan noch einmal oder
 * Folgeplan), Verweis auf den Vorgänger und Startwerte. Die Einstellungen werden übernommen.
 */
export function createSuccessorFile(prevFile, plan, { now = new Date(), fileId } = {}) {
  return createTrainingFile(plan, {
    now,
    fileId,
    settings: prevFile.settings,
    previous: previousRef(prevFile),
    carryOver: buildCarryOver(prevFile, plan),
  });
}
