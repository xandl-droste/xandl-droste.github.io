// Erzeugen, Zusammenführen und Zusammenfassen von .training.json-Dateien.
// Alle Funktionen sind rein: Sie verändern ihre Eingaben nicht und geben neue Objekte zurück.

import { SCHEMA_VERSION, LIMITS, byActivityDate } from './validate.js';

export { byActivityDate };
import { allExerciseIds, countExercises } from './plan.js';
import { newId } from './id.js';
import { localDate } from '../format.js';

const clone = (v) => structuredClone(v);
const iso = (d) => new Date(d).toISOString();
const definedOnly = (o) => Object.fromEntries(Object.entries(o ?? {}).filter(([, v]) => v !== undefined));

export const THEMES = ['light', 'dark', 'fancy'];

/** Gespeicherter Stil, sonst Vorbelegung über prefers-color-scheme (Standard Dunkel). */
export function themeFor(settings, prefersLight) {
  const t = settings?.theme;
  if (THEMES.includes(t)) return t;
  return prefersLight ? 'light' : 'dark';
}

/**
 * Legt aus einem Plan eine neue Trainingsdatei mit leerer Historie an.
 * previous und carryOver nur für einen Nachfolger (siehe carry-over.js).
 */
export function createTrainingFile(plan, { now = new Date(), fileId = newId(), settings, previous, carryOver } = {}) {
  const file = {
    schemaVersion: SCHEMA_VERSION,
    fileId,
    revision: 0,
    updatedAt: iso(now),
    createdAt: iso(now),
  };
  if (previous) file.previous = clone(previous);
  if (carryOver?.length) file.carryOver = clone(carryOver);
  return {
    ...file,
    plan: clone(plan),
    settings: { theme: 'dark', view: 'list', ...definedOnly(settings) },
    progress: { currentWeek: 1, status: 'active' },
    sessions: [],
  };
}

/** Neue Revision nach einer relevanten Änderung. */
export function bumpRevision(file, now = new Date()) {
  return { ...file, revision: Math.min(LIMITS.maxRevision, file.revision + 1), updatedAt: iso(now) };
}

/**
 * Ersetzt den Plan, behält Historie und Einstellungen.
 * Die Zuordnung der Historie läuft über exerciseId; unbekannte IDs werden gemeldet, aber nicht gelöscht.
 */
export function replacePlan(file, plan, now = new Date()) {
  const ids = allExerciseIds(plan);
  const unmatched = new Set();
  for (const s of file.sessions) for (const b of s.blocks) if (!ids.has(b.exerciseId)) unmatched.add(b.exerciseId);
  const next = bumpRevision(
    {
      ...file,
      plan: clone(plan),
      progress: { ...file.progress, currentWeek: Math.min(file.progress.currentWeek, plan.weeks), status: 'active' },
      // Namen aus dem bisherigen Plan festhalten, bevor er ersetzt wird: Erledigte Trainings bleiben so lesbar.
      sessions: withBlockNames(file.sessions, file.plan),
    },
    now,
  );
  return { file: next, unmatchedExerciseIds: [...unmatched].sort() };
}

/**
 * Trägt in Blöcken ohne Namen den Übungs- und Variantennamen aus dem Plan ein (ältere Trainings).
 * Vorhandene Namen bleiben. Gibt neue Objekte zurück.
 */
export function withBlockNames(sessions, plan) {
  const names = new Map();
  const variants = new Map();
  for (const ps of plan.sessions) {
    for (const block of ps.blocks) {
      for (const ex of block.exercises) {
        if (!names.has(ex.id)) names.set(ex.id, ex.name);
        for (const v of ex.variants ?? []) variants.set(`${ex.id}/${v.id}`, v.name);
      }
    }
  }
  return sessions.map((s) => ({
    ...clone(s),
    blocks: s.blocks.map((b) => {
      const out = clone(b);
      if (out.name == null && names.has(b.exerciseId)) out.name = names.get(b.exerciseId);
      const vn = b.variantId ? variants.get(`${b.exerciseId}/${b.variantId}`) : null;
      if (out.variantName == null && vn) out.variantName = vn;
      return out;
    }),
  }));
}

const byStart = (a, b) => Date.parse(a.startedAt) - Date.parse(b.startedAt) || a.id.localeCompare(b.id);

/** Vereinigt zwei Listen gelöschter Session-IDs (Reihenfolge bleibt, älteste fallen bei Überlauf heraus). */
export function unionDeleted(a = [], b = []) {
  const all = [...new Set([...a, ...b])];
  return all.slice(Math.max(0, all.length - LIMITS.maxDeletedSessions));
}

/**
 * Gleicht zwei Stände mit derselben fileId ab.
 * Die höhere revision gewinnt (bei Gleichstand der lokale Stand).
 * Sessions, die nur im unterlegenen Stand vorkommen, werden per ID ergänzt.
 * Gelöschte Sessions (deletedSessionIds beider Stände) fallen heraus und kommen nicht zurück.
 * Andere Trainings (activities) werden genauso abgeglichen und in addedSessions/removedSessions mitgezählt.
 */
export function mergeTrainingFiles(local, incoming, now = new Date()) {
  if (local.fileId !== incoming.fileId) throw new Error('mergeTrainingFiles: unterschiedliche fileId');
  const incomingWins = incoming.revision > local.revision;
  const winner = incomingWins ? incoming : local;
  const loser = incomingWins ? local : incoming;
  const deletedIds = unionDeleted(winner.deletedSessionIds, loser.deletedSessionIds);
  const deleted = new Set([...(winner.deletedSessionIds ?? []), ...(loser.deletedSessionIds ?? [])]);
  // Eine ID darf nur einmal vorkommen, auch über beide Listen (sonst lehnt der Validator den Stand ab). Die Einträge des
  // Gewinners gehen vor: Aus dem Verlierer kommt nur dazu, was im Gewinner unter keiner der beiden Listen steht
  // (Review r5 Code-Qualität N2 / Security N3, r6 Security N1). Kollisionen gibt es nur mit präparierten Dateien.
  const winnerActs = winner.activities ?? [];
  const winnerIds = new Set([...winner.sessions.map((s) => s.id), ...winnerActs.map((a) => a.id)]);
  const added = loser.sessions.filter((s) => !winnerIds.has(s.id) && !deleted.has(s.id));
  const kept = winner.sessions.filter((s) => !deleted.has(s.id));
  const removed = winner.sessions.length - kept.length;
  const newTombstones = deletedIds.length !== (winner.deletedSessionIds ?? []).length
    || deletedIds.some((id, i) => id !== winner.deletedSessionIds[i]);
  const sessions = [...clone(kept), ...clone(added)].sort(byStart);
  let result = { ...clone(winner), sessions };

  const addedActs = (loser.activities ?? []).filter((a) => !winnerIds.has(a.id) && !deleted.has(a.id));
  const keptActs = winnerActs.filter((a) => !deleted.has(a.id));
  const removedActs = winnerActs.length - keptActs.length;
  const activities = [...clone(keptActs), ...clone(addedActs)].sort(byActivityDate);
  if (activities.length) result.activities = activities;
  else delete result.activities;

  if (deletedIds.length) result.deletedSessionIds = deletedIds;
  else delete result.deletedSessionIds;
  const changedWinner = added.length > 0 || removed > 0 || addedActs.length > 0 || removedActs > 0 || newTombstones;
  // Einträge des Verlierers, die wegen gelöschter IDs des Gewinners wegfallen, nennt die Vorschau mit (Review r7 Security N1).
  const loserEntries = [...loser.sessions, ...(loser.activities ?? [])];
  const droppedFromLoser = loserEntries.filter((x) => deleted.has(x.id) && !winnerIds.has(x.id)).length;
  // Gleiche Revision, aber anderer Inhalt (z. B. auf zwei Geräten unabhängig geändert): Der lokale Stand gilt, die
  // Vorschau sagt das, statt „entspricht dem gespeicherten Stand“ (Review r7 Code-Qualität N2).
  const contentOf = (f) => JSON.stringify([f.plan, f.progress, f.sessions, f.activities ?? [], f.deletedSessionIds ?? []]);
  const differs = !incomingWins && !changedWinner && incoming.revision === local.revision && contentOf(incoming) !== contentOf(local);
  if (changedWinner) result = bumpRevision({ ...result, revision: Math.max(local.revision, incoming.revision) }, now);
  return {
    file: result,
    winner: incomingWins ? 'incoming' : 'local',
    addedSessions: added.length + addedActs.length,
    removedSessions: removed + removedActs + droppedFromLoser,
    addedFrom: incomingWins ? 'local' : 'incoming',
    changed: incomingWins || changedWinner,
    differs,
  };
}

/** Entfernt ein Training aus der Historie und merkt sich die ID (gegen Wiederkehr beim Zusammenführen). */
export function deleteSession(file, sessionId, now = new Date()) {
  if (!file.sessions.some((s) => s.id === sessionId)) return file;
  return bumpRevision({
    ...file,
    sessions: file.sessions.filter((s) => s.id !== sessionId),
    deletedSessionIds: unionDeleted(file.deletedSessionIds, [sessionId]),
  }, now);
}

/** Daten für die Import-Vorschau. Nimmt einen Plan oder eine Trainingsdatei. */
export function summarize({ plan, sessions = null, activities = [] }) {
  const ended = (sessions ?? []).filter((s) => s.endedAt);
  // Zeitraum über Krafttrainings und andere Trainings (ab 3.0); count zählt nur die Krafttrainings.
  const dates = [...ended.map((s) => s.date), ...(activities ?? []).map((a) => a.date)].sort();
  return {
    planName: plan.name,
    weeks: plan.weeks,
    planSessions: plan.sessions.length,
    exercises: countExercises(plan),
    history: sessions
      ? { count: ended.length, activities: (activities ?? []).length, from: dates[0] ?? null, to: dates[dates.length - 1] ?? null }
      : null,
  };
}

/**
 * Anzahl der Trainings als Text für Import-Vorschau und Archiv, z. B. „3 Trainings“ oder, wenn es auch andere
 * Trainings gibt, „3 Krafttrainings · 1 anderes Training“ („Krafttraining“ nur dann, siehe docs/begriffe.md).
 * Ohne Trainings null.
 */
export function historyCountText(history) {
  const n = history?.count ?? 0;
  const a = history?.activities ?? 0;
  if (!n && !a) return null;
  if (!a) return `${n} ${n === 1 ? 'Training' : 'Trainings'}`;
  const other = `${a} ${a === 1 ? 'anderes Training' : 'andere Trainings'}`;
  return n ? `${n} ${n === 1 ? 'Krafttraining' : 'Krafttrainings'} · ${other}` : other;
}

/**
 * Sicherer Dateiname aus dem Plannamen: <planname>-<JJJJ-MM-TT>-<id4>.training.json mit dem Tag der Anlage (createdAt)
 * und den ersten 4 Zeichen der fileId. Die 4 Zeichen machen den Namen eindeutig (Vorgänger und Nachfolger vom selben
 * Tag, zwei Dateien aus 1.x mit demselben Plan), damit „Ersetzen“ nie die Sicherung einer anderen Trainingsdatei trifft.
 * Ohne createdAt (Dateien aus 1.x) entfällt das Datum, ohne fileId die 4 Zeichen.
 */
export function trainingFileName(planName, createdAt = null, fileId = null) {
  const base = String(planName ?? '')
    .toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/g, '');
  const day = createdAt && Number.isFinite(Date.parse(createdAt)) ? `-${localDate(createdAt)}` : '';
  const id = typeof fileId === 'string' && /^[0-9a-f]{4}/i.test(fileId) ? `-${fileId.slice(0, 4).toLowerCase()}` : '';
  return `${base || 'training'}${day}${id}.training.json`;
}

/** Dateiname einer Trainingsdatei. */
export function fileNameOf(file) {
  return trainingFileName(file.plan.name, file.createdAt ?? null, file.fileId ?? null);
}

/** Stabile JSON-Ausgabe für den Export. */
export function serialize(file) {
  return JSON.stringify(file, null, 2) + '\n';
}
