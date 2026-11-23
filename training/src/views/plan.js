// Plan-Tab: Plan ansehen, aktuelle Woche setzen, Dateien öffnen und sichern.

import { h } from '../dom.js';
import { fmtTarget } from '../format.js';
import { resolvePrescription } from '../model/plan.js';
import { currentWeekComplete, cycleOf } from '../model/weeks.js';

function exerciseLine(plan, ex, week, prefix) {
  const p = resolvePrescription(plan, ex, week);
  const item = { unit: p.unit, plannedSets: p.sets, repsMin: p.repsMin, repsMax: p.repsMax, durationSec: p.durationSec, perSide: p.perSide };
  return h('li', {},
    h('span', {}, `${prefix}${ex.name}`), h('span', { class: 'mut' }, ` · ${fmtTarget(item)}`),
    ex.main ? h('span', { class: 'tag main' }, h('span', { 'aria-hidden': 'true' }, 'Haupt'), h('span', { class: 'sr-only' }, 'Hauptübung')) : null,
    p.cue ? h('div', { class: 'mut small' }, p.cue) : null,
    ex.variants?.length ? h('div', { class: 'mut small' }, `Varianten: ${ex.variants.map((v) => v.name).join(', ')}`) : null);
}

export function planScreen(file, A) {
  const { plan, progress } = file;
  const w = progress.currentWeek;
  const rir = plan.rirTargets?.[String(w)];
  const deload = plan.deload?.weeks.includes(w);
  const completed = progress.status === 'completed';
  const cycle = cycleOf(progress);
  const weekDone = !completed && currentWeekComplete(file);
  return [
    h('h1', {}, 'Plan'),
    h('section', { class: 'card', 'aria-label': 'Aktueller Plan' },
      h('h3', {}, plan.name),
      h('p', { class: 'mut' }, `${plan.sessions.length} Einheiten pro Woche · ${plan.weeks} Wochen${cycle > 1 ? ` · Durchgang ${cycle}` : ''}`),
      file.previous ? h('p', { class: 'mut small', 'data-fid': 'previous' }, `Vorgänger: ${file.previous.planName} (${file.previous.fileName})`) : null,
      h('p', { class: 'mut small' }, 'Keine medizinische Beratung. Bei Beschwerden bitte ärztlich oder physiotherapeutisch abklären.'),
      completed ? h('span', { class: 'tag' }, 'abgeschlossen') : null,
      h('div', { class: 'stp' },
        h('span', { id: 'week-label' }, 'Aktuelle Woche'),
        h('div', { class: 'week-stp', role: 'group', 'aria-labelledby': 'week-label' },
          h('button', { class: 'rb rb-sm', 'aria-label': 'Woche zurück', 'data-fid': 'week-dec', disabled: w <= 1, onclick: () => A.setWeek(w - 1) }, '−'),
          h('b', { class: 'week-num', 'aria-live': 'polite' }, `${w}`),
          h('button', { class: 'rb rb-sm', 'aria-label': 'Woche vor', 'data-fid': 'week-inc', disabled: w >= plan.weeks, onclick: () => A.setWeek(w + 1) }, '+'))),
      h('p', { class: 'mut small' }, [rir ? `RIR-Ziel ${rir}` : null, deload ? 'Deload-Woche' : null].filter(Boolean).join(' · ') || ' '),
      weekDone ? h('p', { class: 'mut small' }, `Woche ${w} ist in diesem Durchgang schon geschafft. Nach dem nächsten Training geht es mit der nächsten offenen Woche weiter, außer du wiederholst sie.`) : null,
      weekDone ? h('button', { class: 'btn ghost', 'data-fid': 'repeat-week', onclick: A.repeatWeek }, 'Woche wiederholen') : null,
      completed ? h('button', { class: 'btn ghost', 'data-fid': 'restart-plan', onclick: A.restartPlan }, 'Plan erneut starten') : null),
    h('button', { class: 'btn ghost', onclick: A.openFiles }, 'Plan öffnen (Datei)'),
    h('button', { class: 'btn ghost', onclick: A.agentPrompt }, 'Plan mit KI erstellen oder anpassen'),
    h('button', { class: 'btn ghost', onclick: A.exportAll }, 'Gesamtstand sichern'),
    h('button', { class: 'btn ghost', 'data-fid': 'coach-export', onclick: A.coachExport }, 'Export für Coach'),
    h('h2', { class: 'section-title' }, `Woche ${w} im Detail`),
    hasMain(plan) ? h('p', { class: 'mut small', 'data-fid': 'main-hint' }, '„Haupt“ = Hauptübung: Nach dem letzten Satz fragt die App, wie viele Wiederholungen noch gegangen wären (RIR).') : null,
    planSessionsDetail(plan, w),
  ];
}

const hasMain = (plan) => plan.sessions.some((ps) => ps.blocks.some((b) => b.exercises.some((ex) => ex.main)));

/** Einheiten des Plans mit den Vorgaben einer Woche (zum Aufklappen). Auch im Archiv, nur lesend. */
export function planSessionsDetail(plan, w) {
  return plan.sessions.map((ps) => h('details', { class: 'card plan-session' },
    h('summary', {}, h('span', {}, ps.name), ps.suggestedDay ? h('span', { class: 'mut small' }, ps.suggestedDay) : null),
    ps.warmup?.length ? h('p', { class: 'mut small' }, `Warm-up: ${ps.warmup.join(' · ')}`) : null,
    h('ol', { class: 'plan-blocks' },
      ps.blocks.map((b) => (b.type === 'superset'
        ? h('li', {}, h('span', { class: 'mut small' }, 'Superset'), h('ul', {}, b.exercises.map((ex, i) => exerciseLine(plan, ex, w, i === 0 ? 'a) ' : 'b) '))))
        : h('li', {}, h('ul', {}, exerciseLine(plan, b.exercises[0], w, ''))))))));
}
