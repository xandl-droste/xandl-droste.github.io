// Abschluss eines Trainings und Abgleich beim Start. Rein (ohne DOM und Speicher), damit testbar.

import { finishLive } from './live.js';
import { deriveProgress } from './weeks.js';
import { bumpRevision } from './training-file.js';

/**
 * Hängt das beendete Training an die Historie an. Steht dieselbe Session-ID schon drin
 * (z. B. weil ein schon beendetes Training noch einmal als laufend zurückkam), wird sie ersetzt statt doppelt angehängt.
 * @param {{rpe?: number|null, note?: string}} [extra] RPE und Notiz aus dem Abschluss-Dialog
 * @returns {{ file: object, session: object, progress: object }}
 */
export function finishInto(file, live, now = new Date(), extra = {}) {
  const session = finishLive(live, now, extra);
  const exists = file.sessions.some((x) => x.id === session.id);
  const sessions = exists ? file.sessions.map((x) => (x.id === session.id ? session : x)) : [...file.sessions, session];
  let next = { ...file, sessions };
  const progress = deriveProgress(next);
  next = bumpRevision({ ...next, progress: { ...next.progress, currentWeek: progress.currentWeek, status: progress.status } }, now);
  return { file: next, session, progress };
}

/** Gehört der gespeicherte laufende Stand zu einem schon beendeten Training? Dann ist er nur ein Rest und wird verworfen. */
export function isAlreadyFinished(file, storedLive) {
  const id = storedLive?.session?.id;
  return typeof id === 'string' && file.sessions.some((x) => x.id === id);
}

/**
 * Reparatur vor der Prüfung beim Start: doppelte Session-IDs (Folge eines früheren Fehlers) auf eine reduzieren.
 * Behalten wird jeweils die zuletzt angehängte. Unbekannte Formen bleiben unverändert, die Prüfung meldet sie dann.
 * @returns {{ file: any, dropped: number }}
 */
export function dropDuplicateSessions(file) {
  if (!file || !Array.isArray(file.sessions)) return { file, dropped: 0 };
  const lastIndex = new Map();
  file.sessions.forEach((x, k) => { if (x && typeof x.id === 'string') lastIndex.set(x.id, k); });
  const sessions = file.sessions.filter((x, k) => !(x && typeof x.id === 'string') || lastIndex.get(x.id) === k);
  const dropped = file.sessions.length - sessions.length;
  return dropped ? { file: { ...file, sessions }, dropped } : { file, dropped: 0 };
}
