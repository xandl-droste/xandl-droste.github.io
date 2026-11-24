// Import mehrerer Dateien: erst alles prüfen, dann Vorschau, dann alles auf einmal übernehmen.

import { parseImportText, ValidationError, LIMITS } from './validate.js';
import { createTrainingFile, mergeTrainingFiles, replacePlan, summarize } from './training-file.js';
import { withDerivedProgress, cycleOf } from './weeks.js';
import { allExerciseIds } from './plan.js';
import { createSuccessorFile } from './carry-over.js';

/**
 * Wahl für einen Plan bei vorhandener Trainingsdatei (ab 2.0 eine Trainingsdatei pro Durchgang):
 * 'keep' Anpassen: gleiche Trainingsdatei, Plan ersetzt, gleiche Woche, erledigte Trainings bleiben.
 * 'successor' Nachfolger: neue Trainingsdatei ab Woche 1 mit Verweis auf die bisherige und Startwerten daraus.
 * 'new' Ganz neu: neue Trainingsdatei ohne Verweis und ohne Startwerte.
 */
export const PLAN_CHOICES = ['keep', 'successor', 'new'];

/** Vorbelegung: nach abgeschlossenem Plan ein Nachfolger, sonst den laufenden Plan anpassen. */
export function defaultPlanChoice(active) {
  return active?.progress.status === 'completed' ? 'successor' : 'keep';
}

/**
 * Prüft alle ausgewählten Dateien. Ist eine ungültig, wird nichts übernommen.
 * @param {{name: string, size: number, text: () => Promise<string>}[]} files
 * @returns {Promise<{ok: true, items: object[]} | {ok: false, errors: {name: string, errors: string[]}[]}>}
 */
export async function readImportFiles(files) {
  const items = [];
  const errors = [];
  for (const f of files) {
    const name = String(f.name ?? 'Datei').slice(0, 120);
    if (f.size > LIMITS.maxBytes) {
      errors.push({ name, errors: [`Datei: zu groß (${Math.ceil(f.size / 1024)} KB, erlaubt sind ${LIMITS.maxBytes / 1024 / 1024} MB)`] });
      continue;
    }
    try {
      const parsed = parseImportText(await f.text());
      items.push({ name, ...parsed });
    } catch (e) {
      errors.push({ name, errors: e instanceof ValidationError ? e.errors : [`Datei: konnte nicht gelesen werden (${e?.message ?? e})`] });
    }
  }
  if (errors.length) return { ok: false, errors };
  // Gesamtstände zuerst, danach Pläne.
  items.sort((a, b) => (a.kind === b.kind ? 0 : a.kind === 'training' ? -1 : 1));
  return { ok: true, items };
}

/**
 * Wie passt ein neuer Plan zur Historie? Gezählt werden eindeutige Übungs-IDs:
 * withHistory: im neuen Plan und mit mindestens einem erledigten Satz in beendeten Trainings,
 * fresh: im neuen Plan ohne Verlauf,
 * dropped: mit Verlauf, im aktuellen Plan, aber nicht im neuen.
 * Ohne Verlauf (keine Übung mit erledigtem Satz) null.
 */
export function planHistoryOverlap(file, newPlan) {
  const done = new Set();
  for (const s of file.sessions) {
    if (!s.endedAt) continue;
    for (const b of s.blocks) if (!b.skipped && b.sets.some((x) => x.done)) done.add(b.exerciseId);
  }
  if (!done.size) return null;
  const next = allExerciseIds(newPlan);
  let withHistory = 0;
  for (const id of next) if (done.has(id)) withHistory++;
  let dropped = 0;
  for (const id of allExerciseIds(file.plan)) if (done.has(id) && !next.has(id)) dropped++;
  return { withHistory, fresh: next.size - withHistory, dropped };
}

/** Eine Zeile für die Vorschau, z. B. "9 Übungen mit Verlauf · 4 neu · 3 nicht mehr im Plan". Teile mit 0 entfallen. */
export function overlapText(o) {
  if (!o) return null;
  const parts = [
    o.withHistory ? `${o.withHistory} ${o.withHistory === 1 ? 'Übung' : 'Übungen'} mit Verlauf` : null,
    o.fresh ? `${o.fresh} neu` : null,
    o.dropped ? `${o.dropped} nicht mehr im Plan` : null,
  ].filter(Boolean);
  return parts.length ? parts.join(' · ') : null;
}

/**
 * Beschreibt, was mit jeder Datei passieren würde (für die Vorschau).
 * Für Pläne gibt es bei vorhandenem Stand die Wahl aus PLAN_CHOICES (Vorbelegung siehe defaultPlanChoice).
 */
export function previewImport(current, items) {
  let active = current;
  return items.map((item) => {
    if (item.kind === 'training') {
      const inc = item.file;
      const sum = summarize(inc);
      let action;
      let merge = null;
      if (!active) action = 'restore';
      else if (active.fileId === inc.fileId) {
        merge = mergeTrainingFiles(active, inc);
        action = merge.changed ? 'merge' : merge.differs ? 'differs' : 'unchanged';
      } else action = 'switch';
      const out = { name: item.name, kind: 'training', action, summary: sum, revision: inc.revision, localRevision: active?.fileId === inc.fileId ? active.revision : null, merge: merge && { winner: merge.winner, addedSessions: merge.addedSessions, removedSessions: merge.removedSessions, addedFrom: merge.addedFrom } };
      active = action === 'merge' ? merge.file : action === 'unchanged' || action === 'differs' ? active : inc;
      return out;
    }
    const sum = summarize({ plan: item.plan });
    const out = {
      name: item.name, kind: 'plan', action: active ? 'choose' : 'new', summary: sum,
      historyCount: active ? active.sessions.filter((s) => s.endedAt).length + (active.activities?.length ?? 0) : 0,
      defaultChoice: active ? defaultPlanChoice(active) : null,
      currentWeek: active ? Math.min(active.progress.currentWeek, item.plan.weeks) : null,
      cycle: active ? cycleOf(active.progress) : null,
      overlap: active ? planHistoryOverlap(active, item.plan) : null,
    };
    active = active ?? createTrainingFile(item.plan);
    return out;
  });
}

/**
 * Wendet alle Importe an und liefert den neuen aktiven Stand. Rein, ohne Speichern.
 * @param {object|null} current aktueller Stand
 * @param {object[]} items aus readImportFiles
 * @param {Record<number, 'keep'|'successor'|'new'>} choices Wahl für Pläne (Index in items)
 * Danach wird der Fortschritt aus der Historie abgeleitet (ohne Dialog „Plan abgeschlossen“).
 */
export function applyImports(current, items, choices = {}, { now = new Date(), settings } = {}) {
  let active = current;
  const notes = [];
  items.forEach((item, idx) => {
    if (item.kind === 'training') {
      if (active && active.fileId === item.file.fileId) {
        const m = mergeTrainingFiles(active, item.file, now);
        active = m.file;
        if (m.addedSessions) notes.push(`${m.addedSessions} Training(s) zusammengeführt.`);
        if (m.removedSessions) notes.push(`${m.removedSessions} gelöschte(s) Training(s) entfernt.`);
      } else {
        active = structuredClone(item.file);
      }
      return;
    }
    const picked = choices[idx];
    const choice = active ? (PLAN_CHOICES.includes(picked) ? picked : defaultPlanChoice(active)) : 'new';
    if (choice === 'keep') {
      const r = replacePlan(active, item.plan, now);
      active = r.file;
      if (r.unmatchedExerciseIds.length) notes.push(`Im neuen Plan fehlen Übungen aus der Historie: ${r.unmatchedExerciseIds.join(', ')}. Ihre Einträge bleiben erhalten.`);
    } else if (choice === 'successor') {
      active = createSuccessorFile(active, item.plan, { now });
    } else {
      active = createTrainingFile(item.plan, { now, settings: settings ?? active?.settings });
    }
  });
  return { file: active ? withDerivedProgress(active, now) : active, notes };
}
