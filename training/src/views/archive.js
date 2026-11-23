// Archiv: eine ältere Trainingsdatei oder eine Plandatei nur lesend ansehen.
// Die Datei liegt nur im Arbeitsspeicher (S.archive), wird nie gespeichert und berührt die aktive Trainingsdatei nicht.

import { h } from '../dom.js';
import { fmtDay } from '../format.js';
import { fileNameOf, summarize } from '../model/training-file.js';
import { historyList, historyDetail } from './history.js';
import { planSessionsDetail } from './plan.js';

/**
 * @param {null | {kind: 'training'|'plan', name: string, file?: object, plan?: object, week: number, histId: string|null,
 *   chartExercise: string|null}} ar geöffnete Datei
 * @param {string|null} activeFileId fileId der aktiven Trainingsdatei (Hinweis, wenn dieselbe geöffnet ist)
 */
export function archiveScreen(ar, activeFileId, A) {
  if (!ar) {
    return [
      h('h1', {}, 'Archiv'),
      h('section', { class: 'card' },
        h('p', {}, 'Hier siehst du eine ältere Trainingsdatei oder eine Plandatei an, ohne den aktiven Plan zu ändern.'),
        h('p', { class: 'mut small' }, 'Nur lesen: keine Korrekturen, kein Übernehmen. Die Datei wird nicht im Browser gespeichert, nach einem Neustart ist das Archiv wieder leer.'),
        h('button', { class: 'btn', 'data-fid': 'archive-open', onclick: A.open }, 'Datei ansehen')),
    ];
  }
  if (ar.kind === 'training' && ar.histId) {
    return historyDetail(ar.file, ar.histId, null, A, { readOnly: true });
  }
  const plan = ar.kind === 'training' ? ar.file.plan : ar.plan;
  const week = Math.min(Math.max(1, ar.week), plan.weeks);
  return [
    h('h1', {}, 'Archiv'),
    ar.kind === 'training' ? trainingCard(ar, activeFileId, A) : planCard(ar, A),
    ar.kind === 'training' ? historyList(ar.file, null, { chartExercise: ar.chartExercise }, A, { readOnly: true }) : null,
    h('h2', { class: 'section-title' }, 'Plan'),
    h('div', { class: 'stp' },
      h('span', { id: 'archive-week-label' }, 'Woche'),
      h('div', { class: 'week-stp', role: 'group', 'aria-labelledby': 'archive-week-label' },
        h('button', { class: 'rb rb-sm', 'aria-label': 'Woche zurück', 'data-fid': 'archive-week-dec', disabled: week <= 1, onclick: () => A.week(week - 1) }, '−'),
        h('b', { class: 'week-num', 'aria-live': 'polite' }, `${week}`),
        h('button', { class: 'rb rb-sm', 'aria-label': 'Woche vor', 'data-fid': 'archive-week-inc', disabled: week >= plan.weeks, onclick: () => A.week(week + 1) }, '+'))),
    rirLine(plan, week),
    planSessionsDetail(plan, week),
  ];
}

function rirLine(plan, week) {
  const rir = plan.rirTargets?.[String(week)];
  const deload = plan.deload?.weeks.includes(week);
  const text = [rir ? `RIR-Ziel ${rir}` : null, deload ? 'Deload-Woche' : null].filter(Boolean).join(' · ');
  return text ? h('p', { class: 'mut small' }, text) : null;
}

function actions(A, { coach }) {
  return [
    coach ? h('button', { class: 'btn ghost', 'data-fid': 'archive-coach', onclick: A.coachExport }, 'Export für Coach') : null,
    h('button', { class: 'btn ghost', 'data-fid': 'archive-other', onclick: A.open }, 'Andere Datei ansehen'),
    h('button', { class: 'btn ghost', 'data-fid': 'archive-close', onclick: A.close }, 'Archiv schließen'),
  ];
}

function trainingCard(ar, activeFileId, A) {
  const f = ar.file;
  const sum = summarize(f);
  const hist = sum.history;
  return h('section', { class: 'card', 'aria-label': 'Geöffnete Trainingsdatei' },
    h('div', { class: 'mut small' }, 'Trainingsdatei · nur lesen'),
    h('h2', {}, f.plan.name),
    h('p', { class: 'mut small', 'data-fid': 'archive-file' }, `${ar.name}${ar.name !== fileNameOf(f) ? ` (gespeichert als ${fileNameOf(f)})` : ''}`),
    h('p', { class: 'mut small' }, [
      `${sum.weeks} Wochen · ${sum.planSessions} Einheiten`,
      hist.count ? `${hist.count} ${hist.count === 1 ? 'Training' : 'Trainings'} (${fmtDay(hist.from)} bis ${fmtDay(hist.to)})` : 'keine Trainings',
      f.progress.status === 'completed' ? 'abgeschlossen' : `zuletzt Woche ${f.progress.currentWeek}`,
    ].join(' · ')),
    f.previous ? h('p', { class: 'mut small', 'data-fid': 'archive-previous' }, `Vorgänger: ${f.previous.planName} (${f.previous.fileName})`) : null,
    activeFileId && f.fileId === activeFileId
      ? h('p', { class: 'small' }, 'Das ist die aktive Trainingsdatei. Der Stand im Browser kann neuer sein als diese Datei.')
      : null,
    actions(A, { coach: true }));
}

function planCard(ar, A) {
  const p = ar.plan;
  const sum = summarize({ plan: p });
  return h('section', { class: 'card', 'aria-label': 'Geöffnete Plandatei' },
    h('div', { class: 'mut small' }, 'Plandatei · nur lesen'),
    h('h2', {}, p.name),
    h('p', { class: 'mut small', 'data-fid': 'archive-file' }, ar.name),
    h('p', { class: 'mut small' }, `${sum.weeks} Wochen · ${sum.planSessions} Einheiten · ${sum.exercises} Übungen`),
    actions(A, { coach: false }));
}
