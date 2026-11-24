// Wochen-Ableitung: Eine Woche ist fertig, wenn alle Einheiten dieser Woche absolviert sind.
// Es zählen nur Sessions des aktuellen Durchgangs (progress.cycle), die nach progress.repeatFrom begonnen wurden
// und bei denen mindestens die Hälfte der Sätze erledigt ist.

import { bumpRevision } from './training-file.js';

/** Anteil erledigter Sätze, ab dem eine beendete Session als absolvierte Einheit zählt. */
export const MIN_DONE_SHARE = 0.5;

/** Durchgang einer Session bzw. des Fortschritts (ältere Dateien kennen das Feld nicht: Durchgang 1). */
export const cycleOf = (x) => x?.cycle ?? 1;

/**
 * Erledigte Sätze und alle Sätze einer Session. Der Nenner enthält auch die Sätze übersprungener Übungen,
 * gezählt werden nur erledigte Sätze nicht übersprungener Übungen.
 */
export function doneShare(session) {
  let done = 0;
  let total = 0;
  for (const b of session.blocks) {
    total += b.sets.length;
    if (!b.skipped) done += b.sets.filter((s) => s.done).length;
  }
  return { done, total, share: total ? done / total : 0 };
}

/** Zählt diese Session (beendet oder nicht) als absolvierte Einheit? */
export function countsAsUnitDone(session) {
  const { done, total } = doneShare(session);
  return total > 0 && done >= total * MIN_DONE_SHARE;
}

function countingSessions(sessions, { cycle = 1, repeatFrom = null } = {}) {
  const from = repeatFrom ? Date.parse(repeatFrom) : null;
  return sessions.filter((s) => s.endedAt
    && cycleOf(s) === cycle
    && (from == null || Date.parse(s.startedAt) >= from)
    && countsAsUnitDone(s));
}

function doneKeys(sessions, week, scope) {
  return new Set(countingSessions(sessions, scope).filter((s) => s.week === week).map((s) => s.sessionKey));
}

/** scope: { cycle, repeatFrom } aus progress. Ohne Angabe Durchgang 1 ohne Wiederholung. */
export function isWeekComplete(plan, sessions, week, scope) {
  const done = doneKeys(sessions, week, scope);
  return plan.sessions.every((ps) => done.has(ps.key));
}

const scopeOf = (progress) => ({ cycle: cycleOf(progress), repeatFrom: progress.repeatFrom ?? null });

/**
 * Leitet den Fortschritt ab, ausgehend von der gespeicherten (ggf. manuell gesetzten) Woche.
 * Die Woche rückt nur vor, nie zurück. Nach der letzten fertigen Woche: status "completed".
 * planCompleted ist nur beim Übergang auf "completed" true (für den Dialog "Plan abgeschlossen").
 */
export function deriveProgress(file) {
  const { plan, sessions, progress } = file;
  const scope = scopeOf(progress);
  let week = Math.min(Math.max(1, progress.currentWeek), plan.weeks);
  while (isWeekComplete(plan, sessions, week, scope)) {
    if (week >= plan.weeks) {
      return { currentWeek: plan.weeks, status: 'completed', planCompleted: progress.status !== 'completed' };
    }
    week++;
  }
  return { currentWeek: week, status: progress.status, planCompleted: false };
}

/**
 * Übernimmt den abgeleiteten Fortschritt in die Datei (Durchgang und repeatFrom bleiben).
 * Neue Revision nur, wenn sich etwas ändert.
 */
export function withDerivedProgress(file, now = new Date()) {
  const p = deriveProgress(file);
  if (p.currentWeek === file.progress.currentWeek && p.status === file.progress.status) return file;
  return bumpRevision({ ...file, progress: { ...file.progress, currentWeek: p.currentWeek, status: p.status } }, now);
}

/** Manuelles Setzen der aktuellen Woche. Ein abgeschlossener Plan wird dabei wieder aktiv. */
export function setCurrentWeek(file, week) {
  if (!Number.isInteger(week) || week < 1 || week > file.plan.weeks) {
    throw new RangeError(`Woche muss zwischen 1 und ${file.plan.weeks} liegen`);
  }
  return { ...file, progress: { ...file.progress, currentWeek: week, status: 'active' } };
}

/** Aktuelle Woche wiederholen: Bisherige Sessions zählen nicht mehr für den Abschluss. */
export function repeatWeek(file, now = new Date()) {
  return bumpRevision({ ...file, progress: { ...file.progress, status: 'active', repeatFrom: now.toISOString() } }, now);
}

/** Neuer Durchgang des Plans: Woche 1, aktiv, Historie bleibt. */
export function startNewCycle(file, now = new Date()) {
  const { repeatFrom, ...rest } = file.progress;
  return bumpRevision({ ...file, progress: { ...rest, currentWeek: 1, status: 'active', cycle: cycleOf(file.progress) + 1 } }, now);
}

/** Ist die aktuelle Woche im laufenden Durchgang schon fertig? */
export function currentWeekComplete(file) {
  return isWeekComplete(file.plan, file.sessions, file.progress.currentWeek, scopeOf(file.progress));
}

/** Nächste offene Einheit der aktuellen Woche (sonst die erste). */
export function nextPlanSession(file) {
  const { plan, sessions, progress } = file;
  const done = doneKeys(sessions, progress.currentWeek, scopeOf(progress));
  return plan.sessions.find((ps) => !done.has(ps.key)) ?? plan.sessions[0];
}
