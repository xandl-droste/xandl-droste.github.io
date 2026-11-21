import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const planText = readFileSync(fileURLToPath(new URL('./fixtures/beispielplan.plan.json', import.meta.url)), 'utf8');
export const planRaw = () => JSON.parse(planText);

let n = 0;
/** Deterministische Session-IDs für Tests. */
export function sid() {
  n++;
  return `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
}

/** Baut eine abgeschlossene Session. */
export function session({ key = 'E1', week = 1, date = '2026-01-01', blocks = [], id = sid(), ended = true } = {}) {
  const startedAt = `${date}T08:00:00.000Z`;
  return { id, date, sessionKey: key, week, startedAt, endedAt: ended ? `${date}T09:00:00.000Z` : null, blocks };
}

export function block(exerciseId, sets, extra = {}) {
  return {
    exerciseId,
    variantId: null,
    note: '',
    sets: sets.map(([kg, reps, done = true, sec = null]) => ({ kg, reps, sec, done })),
    ...extra,
  };
}

/** Ein erledigter Satz: reicht, damit eine Session als absolvierte Einheit zählt. */
export const doneBlocks = () => [block('back-squat', [[60, 5]])];

/** Abgeschlossene Session, die für die Wochen-Ableitung zählt. */
export const unit = (opts = {}) => session({ blocks: doneBlocks(), ...opts });
