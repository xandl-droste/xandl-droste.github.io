// Live-Training: Ansicht Liste (Standard) und Fokus, Pausentimer, Bearbeiten-Sheet.

import { h, icon } from '../dom.js';
import { fmtClock, fmtNum, fmtSet, fmtSetShort, fmtTarget, fmtLast, parseNum } from '../format.js';
import { activeSlot, progress, restRemaining, isDeferred, holdPhase, stepValue, KG_STEPS, itemTitle } from '../model/live.js';

export const SEC_STEP = 5;

const anyDone = (block) => block.sets.some((s) => s.done);
const slotLabel = (item) => (item.slot ? `${item.slot}) ` : '');

/** Beschriftung des nächsten Satzes für Timer und Fokus. */
export function nextLabel(live) {
  const a = activeSlot(live);
  if (!a) return 'Alle Sätze erledigt';
  const it = live.items[a.i];
  return `${slotLabel(it)}${itemTitle(live, a.i)} · Satz ${a.s + 1}`;
}

// ---------- Kopf ----------

function header(live, A) {
  const p = progress(live);
  const pct = p.total ? Math.round((p.done / p.total) * 100) : 0;
  const meta = [`W${live.session.week}`];
  if (live.rirTarget) meta.push(`RIR ${live.rirTarget}`);
  if (live.items.some((it) => it.isDeload)) meta.push('Deload');
  return [
    h('h1', { class: 'live-title' }, live.title),
    h('div', { class: 'row2 live-meta' },
      h('span', { class: 'mut small', 'aria-live': 'polite' }, `${meta.join(' · ')} · ${p.done} von ${p.total} Sätzen`),
      h('button', { class: 'link', 'data-fid': 'finish', onclick: A.askFinish }, 'Beenden')),
    h('div', { class: 'bar', role: 'progressbar', 'aria-label': 'Fortschritt', 'aria-valuemin': 0, 'aria-valuemax': p.total, 'aria-valuenow': p.done },
      h('i', { style: { width: `${pct}%` } })),
  ];
}

// ---------- Bausteine ----------

function checkButton(item, i, s, set, A, small = false, current = false) {
  const base = set.done ? `${slotLabel(item)}${item.name}, Satz ${s + 1} wieder öffnen` : `${slotLabel(item)}${item.name}, Satz ${s + 1} abschließen`;
  const label = current ? `${base} (aktueller Satz)` : base;
  return h('button', {
    // Zustand steckt in der Beschriftung („abschließen“/„wieder öffnen“), daher kein zusätzliches aria-pressed (doppelte Ansage).
    class: `chk${set.done ? ' done' : ''}`, 'aria-label': label, 'data-fid': `chk-${i}-${s}`,
    'aria-current': current ? 'step' : false,
    onclick: () => A.toggle(i, s),
  }, set.done ? icon('check', small ? 22 : 24) : null);
}

function valueButton(item, i, s, set, A, compact = false) {
  return h('button', {
    class: 'val', 'data-fid': `val-${i}-${s}`,
    'aria-label': `${slotLabel(item)}${item.name}, Satz ${s + 1}: ${spoken(fmtSet(item, set))}. Ändern`,
    onclick: () => A.edit(i, s),
  }, compact ? fmtSetShort(item, set) : fmtSet(item, set));
}

function moreButton(item, i, A) {
  return h('button', { class: 'icon-btn', 'aria-label': `Optionen für ${item.name}`, 'data-fid': `more-${i}`, onclick: () => A.options(i) }, icon('more'));
}

function variantChips(live, i, A) {
  const item = live.items[i];
  const block = live.session.blocks[i];
  if (!item.variants.length) return null;
  // Nach dem ersten Satz steht die Variante nur noch im Titel.
  if (anyDone(block)) return null;
  return h('div', { class: 'chips', role: 'group', 'aria-label': `Variante für ${item.name}` },
    item.variants.map((v) => h('button', {
      'aria-pressed': v.id === block.variantId, 'data-fid': `var-${i}-${v.id}`, onclick: () => A.variant(i, v.id),
    }, v.name)));
}

function increaseButton(live, i, A) {
  const item = live.items[i];
  if (!item.increase || item.increaseApplied || live.session.blocks[i].skipped) return null;
  const allDone = live.session.blocks[i].sets.every((s) => s.done);
  if (allDone) return null;
  return h('button', { class: 'btn ghost sm', 'data-fid': `inc-${i}`, onclick: () => A.increase(i) },
    `Alle Wdh. geschafft: +${fmtNum(item.increase.incrementKg)} kg vorschlagen`);
}

function cueLine(live, i) {
  const item = live.items[i];
  const v = item.variants.find((x) => x.id === live.session.blocks[i].variantId);
  const text = [item.cue, v?.cue].filter(Boolean).join(' ');
  return text ? h('p', { class: 'mut small' }, text) : null;
}

function noteLine(block) {
  return block.note ? h('p', { class: 'mut small' }, `Notiz: ${block.note}`) : null;
}

/** Notiz vom letzten Mal (aus der Leistung, die auch „Letztes Mal“ liefert). Leer: nichts. */
export function lastNoteText(item) {
  const note = (item.lastNote ?? '').trim();
  return note ? `Notiz letztes Mal: ${note}` : null;
}

function lastNoteLine(item, oneLine = false) {
  const text = lastNoteText(item);
  return text ? h('p', { class: `mut small${oneLine ? ' one-line' : ''}`, 'data-last-note': '' }, text) : null;
}

/** Tags im Kartenkopf: übersprungen bzw. später (Zustand als Text, nicht nur über Farbe). */
function stateTag(live, i) {
  if (live.session.blocks[i].skipped) return h('span', { class: 'tag' }, 'übersprungen');
  return isDeferred(live, i) ? h('span', { class: 'tag' }, 'später') : null;
}

// ---------- Halten (Countdown) ----------

/** Text zum Abschnitt eines Countdowns. */
export function holdLabel(ph) {
  if (ph.phase === 'lead') return 'Gleich geht’s los';
  if (ph.phase === 'switch') return 'Seite wechseln';
  if (ph.phase === 'hold') return ph.side ? `Halten · Seite ${ph.side}` : 'Halten';
  return 'Geschafft';
}

/** Haltezeit, die ein Countdown für diesen Satz läuft (Eintrag im Satz, sonst Vorgabe). */
export function holdSeconds(item, set) {
  if (item.unit !== 's') return null;
  if (typeof set.sec === 'number' && set.sec > 0) return set.sec;
  return item.durationSec > 0 ? item.durationSec : null;
}

const holdRuns = (hold, i, s) => Boolean(hold && hold.i === i && hold.s === s);

function holdStartButton(item, i, s, A, cls) {
  return h('button', {
    class: cls, 'data-fid': `hold-start-${i}-${s}`,
    'aria-label': `Halten starten: ${slotLabel(item)}${item.name}, Satz ${s + 1}`,
    onclick: () => A.holdStart(i, s),
  }, 'Halten starten');
}

function holdCancelButton(A, cls) {
  return h('button', { class: cls, 'data-fid': 'hold-cancel', 'aria-label': 'Halten abbrechen, Satz bleibt offen', onclick: A.holdCancel }, 'Abbrechen');
}

/** Anzeige eines laufenden Countdowns. Die Zeit wird im Takt nur als Text aktualisiert (ids hold-time, hold-phase). */
function holdDisplay(hold, now) {
  const ph = holdPhase(hold, now);
  return [
    h('span', { id: 'hold-time', class: 'hold-time', role: 'timer', 'aria-live': 'off' }, fmtClock(ph.remaining)),
    h('span', { id: 'hold-phase', class: 'hold-phase' }, holdLabel(ph)),
  ];
}

/** Liste: unter den Sätzen der Karte, nur für den aktiven Satz einer Haltezeit-Übung. */
function holdControl(live, act, indices, hold, A) {
  if (!act || !indices.includes(act.i)) return null;
  const item = live.items[act.i];
  const set = live.session.blocks[act.i].sets[act.s];
  if (!holdSeconds(item, set)) return null;
  if (holdRuns(hold, act.i, act.s)) {
    return h('div', { class: 'hold-strip', role: 'group', 'aria-label': `Halten: ${item.name}, Satz ${act.s + 1}` },
      h('div', { class: 'hold-mid' }, holdDisplay(hold, Date.now())),
      holdCancelButton(A, 'btn ghost sm'));
  }
  return holdStartButton(item, act.i, act.s, A, 'btn ghost sm');
}

function subline(item) {
  const last = fmtLast(item);
  return [fmtTarget(item), last ? `letztes Mal ${last}` : null].filter(Boolean).join(' · ');
}

// ---------- Ansicht Liste ----------

/** Alle Sätze erledigt (Liste und Fokus). Ohne eigenen Knopf: „Abschließen“ steht in der Leiste darunter. */
function allDoneCard() {
  return h('section', { class: 'card center', 'data-fid': 'all-done' },
    h('h2', {}, 'Alle Sätze erledigt'),
    h('p', { class: 'mut' }, 'Stark. Unten mit „Abschließen“ beenden und sichern.'));
}

function singleCard(live, i, act, A, hold) {
  const item = live.items[i];
  const block = live.session.blocks[i];
  return h('section', { class: `card${block.skipped ? ' dim' : ''}`, 'aria-label': itemTitle(live, i) },
    h('div', { class: 'card-head' },
      h('div', { class: 'grow' }, h('h3', {}, itemTitle(live, i)), h('div', { class: 'mut small' }, subline(item))),
      stateTag(live, i),
      moreButton(item, i, A)),
    block.skipped ? null : lastNoteLine(item),
    cueLine(live, i),
    variantChips(live, i, A),
    block.skipped ? null : block.sets.map((set, s) => {
      const cur = Boolean(act && act.i === i && act.s === s);
      return h('div', { class: `row${cur ? ' act' : ''}` },
        h('span', { class: 'n', 'aria-hidden': 'true' }, s + 1),
        valueButton(item, i, s, set, A),
        checkButton(item, i, s, set, A, false, cur));
    }),
    holdControl(live, act, [i], hold, A),
    increaseButton(live, i, A),
    noteLine(block));
}

function supersetCard(live, ia, ib, act, A, hold) {
  const a = live.items[ia];
  const b = live.items[ib];
  const ba = live.session.blocks[ia];
  const bb = live.session.blocks[ib];
  const rows = Math.max(ba.skipped ? 0 : ba.sets.length, bb.skipped ? 0 : bb.sets.length);
  const cell = (item, i, block, s) => {
    if (block.skipped || s >= block.sets.length) return h('div', { class: 'ss-empty', 'aria-hidden': 'true' });
    const set = block.sets[s];
    const cur = Boolean(act && act.i === i && act.s === s);
    return h('div', { class: `ss-cell${cur ? ' act' : ''}` },
      valueButton(item, i, s, set, A, true), checkButton(item, i, s, set, A, true, cur));
  };
  const head = (item, i, block) => h('div', { class: 'card-head' },
    h('div', { class: 'grow' },
      h('h3', {}, `${item.slot}) ${itemTitle(live, i)}`),
      h('div', { class: 'mut small' }, subline(item))),
    stateTag(live, i),
    moreButton(item, i, A));
  const lastNote = (item, block) => (block.skipped ? null : lastNoteLine(item));
  return h('section', { class: 'card', 'aria-label': `Superset ${itemTitle(live, ia)} und ${itemTitle(live, ib)}` },
    h('div', { class: 'mut small' }, 'Superset · abwechselnd'),
    head(a, ia, ba), lastNote(a, ba), cueLine(live, ia), variantChips(live, ia, A),
    head(b, ib, bb), lastNote(b, bb), cueLine(live, ib), variantChips(live, ib, A),
    rows ? h('div', { class: 'ss-head', 'aria-hidden': 'true' }, h('span', {}), h('span', {}, `a) ${itemTitle(live, ia)}`), h('span', {}, `b) ${itemTitle(live, ib)}`)) : null,
    Array.from({ length: rows }, (_, s) => h('div', { class: 'ss-row' },
      h('span', { class: 'n', 'aria-hidden': 'true' }, s + 1),
      cell(a, ia, ba, s), cell(b, ib, bb, s))),
    holdControl(live, act, [ia, ib], hold, A),
    increaseButton(live, ia, A), increaseButton(live, ib, A),
    noteLine(ba), noteLine(bb));
}

/**
 * Warm-up zum Aufklappen. Der Zustand kommt von außen, sonst klappt jedes Neuzeichnen es wieder zu.
 * Hinweis: Mit `open` gerendert, feuert <details> asynchron ein toggle-Event (harmlos, setzt denselben Wert).
 */
function warmupCard(live, A, open) {
  if (!live.warmup.length) return null;
  return h('details', { class: 'card warmup', 'data-fid': 'warmup', open: Boolean(open), ontoggle: (e) => A.warmupToggle(e.target.open) },
    h('summary', {}, 'Warm-up (ca. 10 Min)'),
    h('ul', {}, live.warmup.map((t) => h('li', {}, t))));
}

function listBody(live, A, hold, warmupOpen) {
  const act = activeSlot(live);
  const groups = new Map();
  live.items.forEach((it, i) => {
    if (!groups.has(it.blockIndex)) groups.set(it.blockIndex, []);
    groups.get(it.blockIndex).push(i);
  });
  const cards = [...groups.values()].map((idx) => (idx.length === 2 ? supersetCard(live, idx[0], idx[1], act, A, hold) : singleCard(live, idx[0], act, A, hold)));
  // Beenden auch unten erreichbar (nicht nur oben im Kopf). Sind alle Sätze erledigt, nur ein Hinweis:
  // abgeschlossen wird über „Abschließen“ in der Leiste (ein Knopf, wie im Fokus).
  const end = act
    ? h('button', { class: 'btn ghost', 'data-fid': 'finish-list', onclick: A.askFinish }, 'Training beenden')
    : allDoneCard();
  return [warmupCard(live, A, warmupOpen), ...cards, end];
}

// ---------- Stepper ----------

/** Für Screenreader: „– kg“ als „Gewicht offen“, kein doppelter Punkt vor „Ändern“. */
const spoken = (t) => t.replace(/–\s*kg/g, 'Gewicht offen').replace(/–/g, 'offen').replace(/\.$/, '');

function selectAll(el) {
  const run = () => {
    try { el.setSelectionRange(0, el.value.length); } catch { el.select(); }
  };
  run();
  setTimeout(run, 0);
}

/**
 * Stepper mit Zahleneingabe. field: 'kg' | 'reps' | 'sec'.
 * step: eine Schrittweite (− / +) oder mehrere, z. B. [2,5, 0,5] (−2,5 −0,5 Wert +0,5 +2,5).
 */
export function stepper({ label, unit, value, step, field, i, s, A, decimals }) {
  const id = `in-${field}-${i}-${s}`;
  const input = h('input', {
    id, class: 'num-in', type: 'text', inputmode: decimals ? 'decimal' : 'numeric', autocomplete: 'off',
    enterkeyhint: 'done', value: value == null ? '' : fmtNum(value), 'aria-label': `${label}${unit ? ` in ${unit}` : ''}`,
    placeholder: 'eintragen', 'data-fid': id,
    oninput: (e) => A.typeValue(i, s, field, parseNum(e.target.value)),
    onchange: (e) => A.commitValue(i, s, field, parseNum(e.target.value)),
    // preventDefault: Sonst löst dasselbe Enter nach dem Neuzeichnen den wieder fokussierten Button aus (z. B. „Satz fertig“).
    onkeydown: (e) => { if (e.key === 'Enter') { e.preventDefault(); e.target.blur(); } },
    // WebKit setzt beim Loslassen den Cursor neu und hebt ein select() im focus auf. Daher nach dem Tap markieren.
    onfocus: (e) => { e.target.dataset.selectAll = '1'; selectAll(e.target); },
    onclick: (e) => { if (e.target.dataset.selectAll) { delete e.target.dataset.selectAll; selectAll(e.target); } },
  });
  const bump = (d) => () => A.setValue(i, s, field, stepValue(value, d));
  const mid = h('div', { class: 'stp-mid' },
    input,
    h('label', { class: 'stp-label', for: id }, unit ? `${label} · ${unit}` : label));
  // Mehrere Schrittweiten (Gewicht): außen groß, innen klein, beschriftet mit dem Betrag.
  if (Array.isArray(step)) {
    const btn = (d, k) => {
      const amount = `${fmtNum(Math.abs(d))} ${unit}`.trim();
      return h('button', {
        class: `rb${k > 0 ? ' rb-in' : ''}`, 'aria-label': `${label} um ${amount} ${d < 0 ? 'verringern' : 'erhöhen'}`,
        'data-fid': `${d < 0 ? 'dec' : 'incv'}-${field}-${Math.abs(d)}`, onclick: bump(d),
      }, `${d < 0 ? '−' : '+'}${fmtNum(Math.abs(d))}`);
    };
    return h('div', { class: 'card stp-card' },
      h('div', { class: 'stp stp-multi' },
        step.map((d, k) => btn(-d, k)), mid, [...step].reverse().map((d, k) => btn(d, step.length - 1 - k))));
  }
  return h('div', { class: 'card stp-card' },
    h('div', { class: 'stp' },
      h('button', { class: 'rb', 'aria-label': `${label} verringern`, 'data-fid': `dec-${field}`, onclick: bump(-step) }, '−'),
      mid,
      h('button', { class: 'rb', 'aria-label': `${label} erhöhen`, 'data-fid': `incv-${field}`, onclick: bump(step) }, '+')));
}

export function steppersFor(item, set, i, s, A) {
  if (item.unit === 's') {
    return [stepper({ label: 'Haltezeit', unit: 's', value: set.sec, step: SEC_STEP, field: 'sec', i, s, A })];
  }
  const reps = stepper({ label: item.perSide ? 'Wiederholungen pro Seite' : 'Wiederholungen', unit: '', value: set.reps, step: 1, field: 'reps', i, s, A });
  // Körpergewicht: nur Wiederholungen. Ein schon eingetragenes Zusatzgewicht bleibt änderbar (z. B. beim Korrigieren im Verlauf).
  if (item.unit === 'bodyweight' && !(set.kg > 0)) return [reps];
  return [
    stepper({ label: item.unit === 'bodyweight' ? 'Zusatzgewicht' : 'Gewicht', unit: 'kg', value: set.kg, step: KG_STEPS, field: 'kg', i, s, A, decimals: true }),
    reps,
  ];
}

// ---------- Ansicht Fokus ----------

function focusBody(live, A, hold) {
  const act = activeSlot(live);
  if (!act) {
    return [allDoneCard()];
  }
  const { i, s } = act;
  const item = live.items[i];
  const block = live.session.blocks[i];
  const set = block.sets[s];
  const last = fmtLast(item);
  const target = item.unit === 's' ? `${item.durationSec} s` : item.repsMin === item.repsMax ? `${item.repsMin} Wdh.` : `${item.repsMin}–${item.repsMax} Wdh.`;
  return [
    h('div', { class: 'focus-head' },
      h('div', { class: 'card-head' },
        h('div', { class: 'grow' },
          h('div', { class: 'mut small' }, `${item.slot ? `Superset ${item.slot}) · ` : ''}Satz ${s + 1} von ${block.sets.length}`),
          h('h2', { class: 'focus-name' }, itemTitle(live, i))),
        moreButton(item, i, A)),
      h('p', { class: 'mut small' }, [last ? `Letztes Mal: ${last}` : 'Noch kein letztes Mal', ` · Ziel: ${target}${item.perSide ? ' pro Seite' : ''}`].join('')),
      lastNoteLine(item, true)),
    variantChips(live, i, A),
    ...focusWork(item, set, i, s, A, hold),
    increaseButton(live, i, A),
  ];
}

/**
 * Stepper und „Satz fertig“. Bei Haltezeit steht „Halten starten“ neben „Satz fertig“; läuft der Countdown,
 * nimmt seine Anzeige den Platz des Steppers ein und „Abbrechen“ den der Buttons (keine zusätzliche Höhe).
 */
function focusWork(item, set, i, s, A, hold) {
  const done = h('button', { class: 'btn big', 'data-fid': 'set-done', onclick: () => A.toggle(i, s) }, 'Satz fertig');
  if (!holdSeconds(item, set)) return [...steppersFor(item, set, i, s, A), done];
  if (holdRuns(hold, i, s)) {
    return [
      h('div', { class: 'card stp-card hold-card', role: 'group', 'aria-label': `Halten: ${item.name}, Satz ${s + 1}` },
        h('div', { class: 'hold-mid' }, holdDisplay(hold, Date.now()))),
      holdCancelButton(A, 'btn ghost big'),
    ];
  }
  return [
    ...steppersFor(item, set, i, s, A),
    h('div', { class: 'focus-actions' }, holdStartButton(item, i, s, A, 'btn ghost big'), done),
  ];
}

// ---------- Pausentimer ----------

export function restBar(live, A, now = Date.now(), { undo = null, ready = false, view = 'list', hold = null } = {}) {
  const rem = restRemaining(live, now);
  const running = rem > 0;
  const go = !running && ready;
  const allDone = !activeSlot(live);
  return h('section', { class: `card rest${running ? ' running' : ''}${go ? ' ready' : ''}`, 'aria-label': 'Pausentimer' },
    // Alles erledigt: keine Zeit mehr (es folgt keine Pause), damit Rückgängig und Abschließen nebeneinander passen.
    allDone && !running
      ? h('span')
      : h('div', { class: 'time' },
        h('span', { id: 'rest-time', role: 'timer', 'aria-live': 'off' }, fmtClock(rem)),
        h('small', {}, running ? 'Pause' : hold ? 'Halten' : go ? 'Los!' : 'Bereit')),
    // Kurz nach einem Satz steht „Rückgängig“ an der Stelle von „+30 s“ (gleiche Höhe, Fokus-Modus passt weiter auf 375 × 630).
    undo
      ? h('button', { class: 'btn ghost sm', 'data-fid': 'undo', 'aria-label': `Rückgängig: ${undo.text}`, onclick: A.undo }, 'Rückgängig')
      : running && !allDone ? h('button', { class: 'btn ghost sm', 'data-fid': 'rest-plus', 'aria-label': '+30 s, Pause verlängern', onclick: A.restPlus }, '+30 s') : h('span'),
    // Nach dem letzten Satz: Abschließen statt „Weiter“, unten im Daumenbereich.
    allDone
      ? h('button', { class: 'btn sm finish', 'data-fid': 'finish-bar', 'aria-label': 'Training abschließen', onclick: A.askFinish }, 'Abschließen')
      : running ? h('button', { class: 'btn sm', 'data-fid': 'rest-skip', 'aria-label': 'Weiter, Pause beenden', onclick: A.restSkip }, 'Weiter') : h('span'),
    h('div', { class: 'rest-foot' },
      viewToggle(view, A),
      h('div', { class: 'next' }, undo ? `${undo.text}` : allDone ? 'Alle Sätze erledigt' : hold ? `Halten läuft: ${nextLabel(live)}` : `Als Nächstes: ${nextLabel(live)}`)));
}

/** Ansicht wechseln, immer erreichbar unten in der Leiste (das Menü scrollt in der Liste weg). view: 'list' | 'focus'. */
function viewToggle(view, A) {
  const to = view === 'focus' ? 'list' : 'focus';
  return h('button', {
    class: 'icon-btn view-toggle', 'data-fid': 'view-toggle',
    'aria-label': to === 'list' ? 'Zur Liste wechseln' : 'Zum Fokus wechseln',
    onclick: () => A.setView(to),
  }, icon(to));
}

export function liveView(live, view, A, extra = {}) {
  const hold = extra.hold ?? null;
  return [
    ...header(live, A),
    ...(view === 'focus' ? focusBody(live, A, hold) : listBody(live, A, hold, extra.warmupOpen)),
    restBar(live, A, Date.now(), { ...extra, view }),
  ];
}
