// Wechsel der aktiven Trainingsdatei und Aufräumen des Browserspeichers (ab 2.0). Reine Entscheidungen, ohne DOM und
// Speicher, damit testbar (Review r4 Code-Qualität M4). Ausgeführt wird in app.js und storage.js.
//
// Regel: Im Browser liegt nur die aktive Trainingsdatei. Wird eine andere aktiv, muss die bisherige gesichert sein,
// danach verlässt sie den Browser. Ältere Trainingsdateien (aus 1.x) werden entfernt, wenn sie gesichert sind,
// ungesicherte bietet die App an.

import { backupStatus } from './backup.js';
import { mergeTrainingFiles } from './training-file.js';
import { validateTrainingFile, ValidationError, SCHEMA_VERSION } from './validate.js';

/** Wird mit next eine andere Trainingsdatei aktiv als current? */
export function isSwitch(current, next) {
  return Boolean(current && next && next.fileId !== current.fileId);
}

/** Muss current vor dem Wechsel auf next erst gesichert werden? */
export function needsBackupFirst(current, lastExport, next) {
  return isSwitch(current, next) && backupStatus(current, lastExport).unsavedChanges;
}

/**
 * Entfernt doppelte Trainings (Folge eines früheren Fehlers), behält jeweils das zuletzt angehängte.
 * Gleiche Regel wie beim Laden der aktiven Datei (finish.js), hier ohne Abhängigkeit vom Live-Modell.
 */
function dropDuplicates(raw) {
  if (!raw || !Array.isArray(raw.sessions)) return raw;
  const last = new Map();
  raw.sessions.forEach((x, k) => { if (x && typeof x.id === 'string') last.set(x.id, k); });
  return { ...raw, sessions: raw.sessions.filter((x, k) => !(x && typeof x.id === 'string') || last.get(x.id) === k) };
}

/**
 * Ordnet die übrigen Trainingsdateien im Browser ein.
 * @param {{file: object, lastExport: object|null}[]} others aus storage.listOtherFiles()
 * @returns {{remove: string[], offer: object[], unreadable: {fileId: string, name: string, newer: boolean}[]}}
 *   remove: gesichert, still entfernen. offer: ungesichert, zum Sichern anbieten (geprüfte Kopie).
 *   unreadable: lässt sich nicht prüfen; newer = stammt aus einer neueren App-Version (dann nicht anbieten, nur behalten).
 */
export function classifyOtherFiles(others) {
  const out = { remove: [], offer: [], unreadable: [] };
  for (const o of others) {
    const raw = o?.file;
    const fileId = typeof raw?.fileId === 'string' ? raw.fileId : null;
    if (!fileId) continue;
    let file;
    try {
      file = validateTrainingFile(dropDuplicates(raw));
    } catch (e) {
      if (!(e instanceof ValidationError)) throw e;
      const newer = Number.isInteger(raw.schemaVersion) && raw.schemaVersion > SCHEMA_VERSION;
      const name = typeof raw.plan?.name === 'string' ? raw.plan.name.slice(0, 120) : 'Unbekannter Plan';
      out.unreadable.push({ fileId, name, newer });
      continue;
    }
    if (backupStatus(file, o.lastExport ?? null).unsavedChanges) out.offer.push(file);
    else out.remove.push(fileId);
  }
  return out;
}

/**
 * Eine geöffnete Trainingsdatei, die es im Browser schon als nicht aktive Datei gibt (z. B. ungesicherter Rest aus 1.x):
 * beide Stände zusammenführen statt den im Browser zu ersetzen (Review r4 Code-Qualität M3).
 * @returns {{file: object, sameAsIncoming: boolean}} sameAsIncoming: Ergebnis entspricht der Datei (gilt dann als gesichert)
 */
export function mergeWithStored(stored, incoming, now = new Date()) {
  const m = mergeTrainingFiles(stored, incoming, now);
  const sameAsIncoming = m.winner === 'incoming' && m.addedSessions === 0 && m.removedSessions === 0;
  return { file: m.file, sameAsIncoming };
}
