// Zustand eines laufenden Trainings. Rein funktional: jede Operation gibt einen neuen Zustand zurück.
// Der Zustand wird nach jeder Änderung in IndexedDB gesichert (Autosave) und übersteht App-Neustarts.
// Der Pausentimer speichert einen Endzeitpunkt (Zeitstempel), keinen Zähler.

import { findPlanSession } from './plan.js';
import { cycleOf } from './weeks.js';
import { suggestSets, applyIncrease, lastPerformance } from './progression.js';
import { newId } from './id.js';
import { performanceSessions } from './carry-over.js';
import { LIMITS } from './validate.js';
import { localDate } from '../format.js';

export { localDate };

export const LIVE_VERSION = 1;
const MAX_SETS = LIMITS.maxLoggedSets;
const MAX_NOTE = LIMITS.maxNote;
/** Schrittweiten der Gewichts-Stepper: für alle Übungen gleich (außen groß, innen klein). */
export const KG_STEPS = Object.freeze([2.5, 0.5]);

const clone = (v) => structuredClone(v);
const isDeloadWeek = (plan, week) => Boolean(plan.deload?.weeks.includes(week));


/**
 * Stellt ein gespeichertes laufendes Training wieder her. Die Anzeige-Daten (items) werden aus dem Plan neu
 * berechnet, übernommen werden nur geprüfte Session-Daten. Liefert null, wenn der Stand nicht passt.
 * @param {(raw: unknown) => object} checkSession wirft bei ungültiger Session (validateSession)
 */
export function restoreLive(file, stored, checkSession) {
  if (!stored || typeof stored !== 'object' || stored.version !== LIVE_VERSION || stored.fileId !== file.fileId) return null;
  const session = checkSession(stored.session);
  // Schon beendet (steht in der Historie): nicht noch einmal als laufend anbieten.
  if (file.sessions.some((x) => x.id === session.id)) return null;
  if (session.endedAt || !findPlanSession(file.plan, session.sessionKey) || session.week > file.plan.weeks) return null;
  const fresh = startLive(file, session.sessionKey, { week: session.week, now: new Date(session.startedAt), id: session.id });
  const same = fresh.session.blocks.length === session.blocks.length
    && fresh.session.blocks.every((b, k) => b.exerciseId === session.blocks[k].exerciseId);
  if (!same) return null;
  const items = fresh.items.map((it, k) => ({ ...it, increaseApplied: stored.items?.[k]?.increaseApplied === true }));
  const deferred = restoreDeferred(stored.deferred, items);
  const blocks = session.blocks.map((b, k) => ({
    ...prescriptionOf(b.plannedSets != null ? b : fresh.session.blocks[k]),
    exerciseId: b.exerciseId, variantId: b.variantId, sets: b.sets, note: b.note, skipped: Boolean(b.skipped),
    ...(b.rirLast != null && items[k]?.main ? { rirLast: b.rirLast } : {}),
  }));
  const r = stored.rest;
  const rest = r && Number.isFinite(r.endsAt) && Number.isFinite(r.totalSec) && Number.isInteger(r.afterItem) && r.afterItem >= 0 && r.afterItem < items.length
    ? { endsAt: r.endsAt, totalSec: r.totalSec, afterItem: r.afterItem }
    : null;
  // Durchgang und Deload stammen aus dem Start des Trainings (ältere gespeicherte Stände: wie beim Neustart).
  const fromStart = session.cycle != null;
  const meta = { cycle: fromStart ? session.cycle : fresh.session.cycle };
  if (fromStart ? session.deload : fresh.session.deload) meta.deload = true;
  return { ...fresh, session: { ...session, ...meta, endedAt: null, blocks }, items, rest, deferred };
}

/** Zurückgestellte Blöcke aus dem Speicher: nur bekannte Block-Nummern, ohne Doppelte (ältere Stände: keine). */
function restoreDeferred(raw, items) {
  if (!Array.isArray(raw) || raw.length > items.length) return [];
  const known = new Set(items.map((it) => it.blockIndex));
  const out = [];
  for (const b of raw) if (Number.isInteger(b) && known.has(b) && !out.includes(b)) out.push(b);
  return out;
}

/** Beim Start gültige Vorgabe eines Blocks (für die Progressionsregel, auch nach Planwechsel). */
function prescriptionOf(b) {
  const out = {};
  if (b?.plannedSets != null) out.plannedSets = b.plannedSets;
  if (b?.repsMax != null) out.repsMax = b.repsMax;
  if (b?.durationSec != null) out.durationSec = b.durationSec;
  return out;
}

/** Startet ein Training für eine Plan-Einheit in der aktuellen (oder angegebenen) Woche. */
export function startLive(file, sessionKey, { now = new Date(), id = newId(), week } = {}) {
  const ps = findPlanSession(file.plan, sessionKey);
  if (!ps) throw new Error(`Einheit ${sessionKey} nicht im Plan`);
  const w = week ?? file.progress.currentWeek;
  // Vorbelegung und Progression: eigene Trainings, davor die Startwerte aus dem Vorgänger.
  const history = performanceSessions(file);
  const items = [];
  const blocks = [];
  ps.blocks.forEach((block, blockIndex) => {
    block.exercises.forEach((ex, xi) => {
      const sug = suggestSets(file.plan, ex, w, history);
      const p = sug.prescription;
      const variants = (ex.variants ?? []).map((v) => ({ id: v.id, name: v.name, cue: v.cue ?? '' }));
      const lastAny = lastPerformance(history, ex.id);
      const lastVariant = lastAny?.block.variantId;
      items.push({
        blockIndex,
        type: block.type,
        slot: block.type === 'superset' ? (xi === 0 ? 'a' : 'b') : null,
        exerciseId: ex.id,
        name: ex.name,
        main: Boolean(ex.main),
        unit: p.unit,
        plannedSets: p.sets,
        repsMin: p.repsMin,
        repsMax: p.repsMax,
        durationSec: p.durationSec,
        restSec: p.restSec,
        perSide: p.perSide,
        cue: p.cue,
        isDeload: p.isDeload,
        variants,
        last: sug.last,
        lastNote: sug.last?.note ?? '',
        increase: sug.increase,
        increaseApplied: false,
      });
      blocks.push({
        ...prescriptionOf({ plannedSets: p.sets, ...(p.unit === 's' ? { durationSec: p.durationSec } : { repsMax: p.repsMax }) }),
        exerciseId: ex.id,
        variantId: variants.length ? (variants.some((v) => v.id === lastVariant) ? lastVariant : variants[0].id) : null,
        sets: sug.sets,
        note: '',
        skipped: false,
      });
    });
  });
  return {
    version: LIVE_VERSION,
    fileId: file.fileId,
    title: ps.name,
    rirTarget: file.plan.rirTargets?.[String(w)] ?? null,
    warmup: ps.warmup ?? [],
    session: {
      id, date: localDate(now), sessionKey, week: w, cycle: cycleOf(file.progress),
      ...(isDeloadWeek(file.plan, w) ? { deload: true } : {}),
      startedAt: now.toISOString(), endedAt: null, blocks,
    },
    items,
    rest: null,
    deferred: [],
  };
}

/**
 * Reihenfolge aller Sätze. Supersets abwechselnd a1, b1, a2, b2, … Übersprungene Übungen fehlen.
 * Zurückgestellte Blöcke („Später“) kommen ans Ende, untereinander in Plan-Reihenfolge.
 */
export function slotOrder(live) {
  const out = [];
  const groups = new Map();
  live.items.forEach((it, i) => {
    if (!groups.has(it.blockIndex)) groups.set(it.blockIndex, []);
    groups.get(it.blockIndex).push(i);
  });
  const later = live.deferred ?? [];
  const blocks = [...groups.keys()];
  const ordered = [...blocks.filter((b) => !later.includes(b)), ...blocks.filter((b) => later.includes(b))];
  for (const idx of ordered.map((b) => groups.get(b))) {
    const active = idx.filter((i) => !live.session.blocks[i].skipped);
    const max = Math.max(0, ...active.map((i) => live.session.blocks[i].sets.length));
    for (let s = 0; s < max; s++) {
      for (const i of active) if (s < live.session.blocks[i].sets.length) out.push({ i, s });
    }
  }
  return out;
}

/** Erster offener Satz in der Reihenfolge, sonst null. */
export function activeSlot(live) {
  return slotOrder(live).find(({ i, s }) => !live.session.blocks[i].sets[s].done) ?? null;
}

export function progress(live) {
  const order = slotOrder(live);
  return { done: order.filter(({ i, s }) => live.session.blocks[i].sets[s].done).length, total: order.length };
}

/** Satz abschließen bzw. wieder öffnen (Rückgängig bei Fehltap). Startet nach dem Abschluss die Pause. */
export function toggleSet(live, i, s, now = new Date()) {
  const next = clone(live);
  const set = next.session.blocks[i]?.sets[s];
  if (!set) return live;
  set.done = !set.done;
  if (set.done) set.doneAt = now.toISOString();
  else delete set.doneAt;
  // Ein wieder geöffneter Satz macht den RIR-Wert ungültig: Er gehört zum letzten Satz der Übung.
  if (!set.done) delete next.session.blocks[i].rirLast;
  // Ein erledigter Satz holt seinen Block aus „Später“ zurück.
  if (set.done && next.deferred?.length) next.deferred = next.deferred.filter((b) => b !== next.items[i].blockIndex);
  const rest = next.items[i].restSec;
  if (!set.done) next.rest = null;
  else if (rest > 0) next.rest = { endsAt: now.getTime() + rest * 1000, totalSec: rest, afterItem: i };
  return dropRestIfDone(next);
}

/** Ist kein Satz mehr offen, endet die Pause: Es kommt nichts, worauf sie hinführt (Abhaken, Überspringen, Satz entfernen). */
function dropRestIfDone(next) {
  if (next.rest && !activeSlot(next)) next.rest = null;
  return next;
}

/**
 * Werte eines Satzes ändern (kg, reps, sec). Ungültige Werte werden verworfen.
 * Ein geändertes Gewicht geht auch an die folgenden offenen Sätze derselben Übung,
 * wenn deren Gewicht leer ist oder noch dem alten Wert entspricht.
 */
export function updateSet(live, i, s, patch) {
  const next = clone(live);
  const sets = next.session.blocks[i]?.sets;
  const set = sets?.[s];
  if (!set) return live;
  if ('kg' in patch) {
    const old = set.kg;
    set.kg = clampOrNull(patch.kg, 0, 1000, 2);
    for (let k = s + 1; k < sets.length; k++) {
      if (!sets[k].done && (sets[k].kg == null || sets[k].kg === old)) sets[k].kg = set.kg;
    }
  }
  if ('reps' in patch) set.reps = clampOrNull(patch.reps, 0, 1000, 0);
  if ('sec' in patch) set.sec = clampOrNull(patch.sec, 0, 36000, 0);
  return next;
}

export function clampOrNull(v, min, max, decimals) {
  if (v === null || v === '') return null;
  const n = typeof v === 'number' ? v : Number(String(v).replace(',', '.'));
  if (!Number.isFinite(n)) return null;
  const f = 10 ** decimals;
  return Math.min(max, Math.max(min, Math.round(n * f) / f));
}

/** Satz hinzufügen (übernimmt die Werte des letzten Satzes). */
export function addSet(live, i) {
  const next = clone(live);
  const sets = next.session.blocks[i].sets;
  if (sets.length >= MAX_SETS) return live;
  const last = sets[sets.length - 1] ?? { kg: null, reps: next.items[i].repsMin, sec: next.items[i].durationSec };
  sets.push({ kg: last.kg, reps: last.reps, sec: last.sec, done: false });
  // Ein neuer letzter Satz: Der bisherige RIR-Wert gehört nicht mehr zum letzten Satz.
  delete next.session.blocks[i].rirLast;
  return next;
}

/** Letzten offenen Satz entfernen. Mindestens ein Satz bleibt. */
export function removeSet(live, i) {
  const next = clone(live);
  const sets = next.session.blocks[i].sets;
  if (sets.length <= 1) return live;
  for (let s = sets.length - 1; s >= 0; s--) {
    if (!sets[s].done) {
      sets.splice(s, 1);
      return dropRestIfDone(next);
    }
  }
  return live;
}

export function setSkipped(live, i, skipped) {
  const next = clone(live);
  next.session.blocks[i].skipped = Boolean(skipped);
  if (skipped && next.rest?.afterItem === i) next.rest = null;
  return dropRestIfDone(next);
}

// ---------- Später ----------

/** Ist der Block (Einzelübung oder Superset) der Übung i zurückgestellt? */
export function isDeferred(live, i) {
  return Boolean(live.items[i] && live.deferred?.includes(live.items[i].blockIndex));
}

/**
 * Block der Übung i zurückstellen („Später“) bzw. wieder einreihen („Jetzt machen“).
 * Seine offenen Sätze werden übergangen, solange andere offene Sätze da sind.
 */
export function setDeferred(live, i, deferred) {
  const item = live.items[i];
  if (!item || isDeferred(live, i) === Boolean(deferred)) return live;
  const next = clone(live);
  const rest = (next.deferred ?? []).filter((b) => b !== item.blockIndex);
  next.deferred = deferred ? [...rest, item.blockIndex] : rest;
  return next;
}

/** Kann der Block der Übung i zurückgestellt werden? Nur mit offenen Sätzen, die nicht übersprungen sind. */
export function canDefer(live, i) {
  const item = live.items[i];
  if (!item) return false;
  return live.items.some((it, k) => it.blockIndex === item.blockIndex
    && !live.session.blocks[k].skipped && live.session.blocks[k].sets.some((s) => !s.done));
}

/** Wert eines Steppers um delta ändern: nie unter 0, auf 2 Nachkommastellen gerundet (kein 0,1 + 0,2-Rauschen). */
export function stepValue(value, delta) {
  const v = typeof value === 'number' && Number.isFinite(value) ? value : 0;
  return Math.max(0, Math.round((v + delta) * 100) / 100);
}

// ---------- Halten (Countdown für Haltezeit-Übungen) ----------

export const HOLD_LEAD_SEC = 5; // Vorlauf „Gleich geht's los“
export const HOLD_SWITCH_SEC = 5; // Seitenwechsel bei pro-Seite-Übungen

/** Abschnitte eines Countdowns: Vorlauf, Halten (bei perSide: Seite 1, Wechsel, Seite 2). */
export function holdPhases(sec, perSide) {
  const out = [{ phase: 'lead', side: null, sec: HOLD_LEAD_SEC }];
  if (perSide) out.push({ phase: 'hold', side: 1, sec }, { phase: 'switch', side: null, sec: HOLD_SWITCH_SEC }, { phase: 'hold', side: 2, sec });
  else out.push({ phase: 'hold', side: null, sec });
  return out;
}

/**
 * Stand eines Countdowns zum Zeitpunkt now, nur aus Zeitstempeln berechnet (übersteht App-Wechsel).
 * @param {{startedAt: number, sec: number, perSide?: boolean}} hold startedAt in ms
 * @returns {{phase: 'lead'|'hold'|'switch'|'done', side: 1|2|null, index: number, remaining: number,
 *   phaseStartedAt: number, endsAt: number, finished: boolean}} remaining in Sekunden (aufgerundet)
 */
export function holdPhase({ startedAt, sec, perSide = false }, now = Date.now()) {
  const phases = holdPhases(sec, perSide);
  const endsAt = startedAt + phases.reduce((n, p) => n + p.sec, 0) * 1000;
  let t = startedAt;
  for (let k = 0; k < phases.length; k++) {
    const end = t + phases[k].sec * 1000;
    if (now < end) {
      const remaining = Math.min(phases[k].sec, Math.max(0, Math.ceil((end - now) / 1000)));
      return { phase: phases[k].phase, side: phases[k].side, index: k, remaining, phaseStartedAt: t, endsAt, finished: false };
    }
    t = end;
  }
  return { phase: 'done', side: null, index: phases.length, remaining: 0, phaseStartedAt: endsAt, endsAt, finished: true };
}

// ---------- RIR nach dem letzten Satz ----------

/**
 * Ist bei Übung i die RIR-Abfrage fällig? Nur bei Hauptübungen, die nicht übersprungen sind und bei denen alle
 * Sätze erledigt sind (also nach dem letzten Satz).
 */
export function rirDue(live, i) {
  const item = live.items[i];
  const block = live.session.blocks[i];
  if (!item?.main || !block || block.skipped || !block.sets.length) return false;
  return block.sets.every((s) => s.done);
}

/** RIR-Wert der Übung i setzen (0 bis 4, 4 = „4+“) oder mit null entfernen. Nur wenn die Abfrage fällig ist. */
export function setRir(live, i, value) {
  if (value !== null && !(Number.isInteger(value) && value >= 0 && value <= LIMITS.maxRir)) return live;
  if (value !== null && !rirDue(live, i)) return live;
  const next = clone(live);
  if (value === null) delete next.session.blocks[i].rirLast;
  else next.session.blocks[i].rirLast = value;
  return next;
}

export function setNote(live, i, note) {
  const next = clone(live);
  next.session.blocks[i].note = String(note ?? '').slice(0, MAX_NOTE);
  return next;
}

/** Anzeigename einer Übung im Training: mit gewählter Variante, z. B. „Leg Curl · A: Slider“. */
export function itemTitle(live, i) {
  const item = live.items[i];
  const v = item.variants.find((x) => x.id === live.session.blocks[i]?.variantId);
  return v ? `${item.name} · ${v.name}` : item.name;
}

export function setVariant(live, i, variantId) {
  if (!live.items[i].variants.some((v) => v.id === variantId)) return live;
  const next = clone(live);
  next.session.blocks[i].variantId = variantId;
  return next;
}

/** Steigerungsvorschlag übernehmen: gilt für alle noch offenen Sätze. */
export function applyIncreaseTo(live, i) {
  const item = live.items[i];
  if (!item.increase || item.increaseApplied) return live;
  const next = clone(live);
  const target = applyIncrease({ sets: next.session.blocks[i].sets, increase: item.increase });
  next.session.blocks[i].sets = next.session.blocks[i].sets.map((s, k) => (s.done ? s : target[k]));
  next.items[i].increaseApplied = true;
  return next;
}

// ---------- Pausentimer ----------

/** Verbleibende Sekunden (aufgerundet, nie negativ). */
export function restRemaining(live, now = Date.now()) {
  if (!live.rest) return 0;
  return Math.max(0, Math.ceil((live.rest.endsAt - now) / 1000));
}

export function extendRest(live, sec, now = Date.now()) {
  const next = clone(live);
  const base = next.rest && next.rest.endsAt > now ? next.rest.endsAt : now;
  next.rest = { endsAt: base + sec * 1000, totalSec: (next.rest?.totalSec ?? 0) + sec, afterItem: next.rest?.afterItem ?? null };
  return next;
}

export function clearRest(live) {
  if (!live.rest) return live;
  return { ...clone(live), rest: null };
}

// ---------- Abschluss ----------

export function hasAnyDone(live) {
  return live.session.blocks.some((b) => b.sets.some((s) => s.done));
}

/** RPE eines Trainings prüfen: ganze Zahl 0 bis 10, sonst null. */
export function cleanRpe(v) {
  return Number.isInteger(v) && v >= 0 && v <= LIMITS.maxRpe ? v : null;
}

/**
 * Fertige Session für die Historie (Format der .training.json). Mit Namen der Übung und Variante, damit das Training
 * auch ohne den Plan lesbar bleibt.
 * @param {{rpe?: number|null, note?: string}} [extra] Angaben aus dem Abschluss-Dialog (beide optional)
 */
export function finishLive(live, now = new Date(), { rpe = null, note = '' } = {}) {
  const s = clone(live.session);
  s.endedAt = now.toISOString();
  const r = cleanRpe(rpe);
  if (r != null) s.rpe = r;
  else delete s.rpe;
  const text = String(note ?? '').slice(0, MAX_NOTE).trim();
  if (text) s.note = text;
  else delete s.note;
  s.blocks = s.blocks.map((b, k) => {
    const item = live.items[k];
    const out = { exerciseId: b.exerciseId };
    if (item?.name) out.name = item.name;
    out.variantId = b.variantId;
    const vn = item?.variants.find((v) => v.id === b.variantId)?.name;
    if (vn) out.variantName = vn;
    out.sets = b.sets;
    out.note = b.note.trim();
    Object.assign(out, prescriptionOf(b));
    if (b.skipped) out.skipped = true;
    else if (b.rirLast != null && item?.main && b.sets.length && b.sets.every((x) => x.done)) out.rirLast = b.rirLast;
    return out;
  });
  return s;
}

/** Zusammenfassung für den Abschluss-Bildschirm. */
export function summarize(live, now = new Date()) {
  const p = progress(live);
  let reps = 0;
  let volume = 0;
  live.session.blocks.forEach((b) => {
    if (b.skipped) return;
    for (const s of b.sets) {
      if (!s.done) continue;
      reps += s.reps ?? 0;
      volume += (s.kg ?? 0) * (s.reps ?? 0);
    }
  });
  const minutes = Math.max(0, Math.round((now.getTime() - Date.parse(live.session.startedAt)) / 60000));
  const skipped = live.session.blocks.filter((b) => b.skipped).length;
  return { setsDone: p.done, setsTotal: p.total, reps, volumeKg: Math.round(volume), minutes, skipped };
}
