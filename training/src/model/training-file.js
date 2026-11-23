// Erzeugen, Zusammenführen und Zusammenfassen von .training.json-Dateien.
// Alle Funktionen sind rein: Sie verändern ihre Eingaben nicht und geben neue Objekte zurück.

import { SCHEMA_VERSION, LIMITS } from './validate.js';
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
 */
export function mergeTrainingFiles(local, incoming, now = new Date()) {
  if (local.fileId !== incoming.fileId) throw new Error('mergeTrainingFiles: unterschiedliche fileId');
  const incomingWins = incoming.revision > local.revision;
  const winner = incomingWins ? incoming : local;
  const loser = incomingWins ? local : incoming;
  const deletedIds = unionDeleted(winner.deletedSessionIds, loser.deletedSessionIds);
  const deleted = new Set([...(winner.deletedSessionIds ?? []), ...(loser.deletedSessionIds ?? [])]);
  const winnerIds = new Set(winner.sessions.map((s) => s.id));
  const added = loser.sessions.filter((s) => !winnerIds.has(s.id) && !deleted.has(s.id));
  const kept = winner.sessions.filter((s) => !deleted.has(s.id));
  const removed = winner.sessions.length - kept.length;
  const newTombstones = deletedIds.length !== (winner.deletedSessionIds ?? []).length
    || deletedIds.some((id, i) => id !== winner.deletedSessionIds[i]);
  const sessions = [...clone(kept), ...clone(added)].sort(byStart);
  let result = { ...clone(winner), sessions };
  if (deletedIds.length) result.deletedSessionIds = deletedIds;
  else delete result.deletedSessionIds;
  const changedWinner = added.length > 0 || removed > 0 || newTombstones;
  if (changedWinner) result = bumpRevision({ ...result, revision: Math.max(local.revision, incoming.revision) }, now);
  return {
    file: result,
    winner: incomingWins ? 'incoming' : 'local',
    addedSessions: added.length,
    removedSessions: removed,
    addedFrom: incomingWins ? 'local' : 'incoming',
    changed: incomingWins || changedWinner,
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
export function summarize({ plan, sessions = null }) {
  const ended = (sessions ?? []).filter((s) => s.endedAt);
  const dates = ended.map((s) => s.date).sort();
  return {
    planName: plan.name,
    weeks: plan.weeks,
    planSessions: plan.sessions.length,
    exercises: countExercises(plan),
    history: sessions
      ? { count: ended.length, from: dates[0] ?? null, to: dates[dates.length - 1] ?? null }
      : null,
  };
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
