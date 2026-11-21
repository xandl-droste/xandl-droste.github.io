// Verlauf: Liste der Sessions, Detailansicht und Verlaufsgraph je Übung (eigenes SVG).

import { h, svgEl } from '../dom.js';
import { fmtDay, fmtNum } from '../format.js';
import { backupText, sessionSaveState } from '../model/backup.js';
import { nameIndex, endedSessions, sessionStats, exerciseSeries, exercisesWithHistory, chartGeometry, loggedUnit } from '../model/history.js';

/** „Woche 3“ bzw. ab dem zweiten Durchgang „Durchgang 2 · Woche 3“. */
const weekLabel = (s) => ((s.cycle ?? 1) > 1 ? `Durchgang ${s.cycle} · Woche ${s.week}` : `Woche ${s.week}`);

const METRIC = { kg: { label: 'Top-Satz (kg)', unit: 'kg' }, sec: { label: 'Beste Haltezeit (s)', unit: 's' }, reps: { label: 'Meiste Wiederholungen', unit: 'Wdh.' } };
const shortDate = (iso) => { const [, m, d] = iso.split('-'); return `${d}.${m}.`; };

/** Liniendiagramm als SVG. Nur Zahlen und Datumswerte werden als Text eingesetzt. */
export function chart(series, title, { height = 120 } = {}) {
  const { metric, points } = series;
  const m = METRIC[metric];
  if (!points.length) return h('p', { class: 'mut small' }, 'Noch keine Werte.');
  const values = points.map((p) => p.value);
  const g = chartGeometry(values, { width: 320, height });
  const first = points[0];
  const last = points[points.length - 1];
  const desc = points.length === 1
    ? `${title}: ${fmtNum(first.value)} ${m.unit} am ${shortDate(first.date)}`
    : `${title}: von ${fmtNum(first.value)} auf ${fmtNum(last.value)} ${m.unit}, ${points.length} Einträge, ${shortDate(first.date)} bis ${shortDate(last.date)}`;
  const svg = svgEl('svg', { viewBox: `0 0 320 ${height}`, role: 'img', 'aria-label': desc, class: 'chart' });
  svg.append(svgEl('line', { x1: 24, x2: 296, y1: height - 26, y2: height - 26, class: 'chart-axis' }));
  if (g.points.length > 1) {
    svg.append(svgEl('polyline', { points: g.points.map((p) => `${p.x},${p.y}`).join(' '), class: 'chart-line' }));
  }
  g.points.forEach((p, i) => {
    svg.append(svgEl('circle', { cx: p.x, cy: p.y, r: 4.5, class: 'chart-dot' }));
    const showLabel = g.points.length <= 6 || i === 0 || i === g.points.length - 1 || values[i] === g.max;
    if (showLabel) {
      svg.append(svgEl('text', { x: p.x, y: Math.max(11, p.y - 9), 'text-anchor': 'middle', class: 'chart-val' }, fmtNum(values[i])));
    }
  });
  svg.append(svgEl('text', { x: g.points[0].x, y: height - 8, 'text-anchor': g.points.length > 1 ? 'start' : 'middle', class: 'chart-date' }, shortDate(first.date)));
  if (points.length > 1) svg.append(svgEl('text', { x: g.points[g.points.length - 1].x, y: height - 8, 'text-anchor': 'end', class: 'chart-date' }, shortDate(last.date)));
  return svg;
}

function chartCard(file, ui, A) {
  const ids = exercisesWithHistory(file);
  if (!ids.length) return null;
  const names = nameIndex(file.plan);
  const current = ids.includes(ui.chartExercise) ? ui.chartExercise : ids[0];
  const series = exerciseSeries(file, current);
  return h('section', { class: 'card', 'aria-label': 'Verlauf je Übung' },
    h('label', { class: 'field', for: 'chart-ex' },
      h('span', { class: 'mut small' }, `Verlauf je Übung · ${METRIC[series.metric].label}`),
      h('select', { id: 'chart-ex', class: 'select', 'data-fid': 'chart-ex', onchange: (e) => A.chartExercise(e.target.value) },
        ids.map((id) => h('option', { value: id, selected: id === current }, names.exercise(id))))),
    chart(series, names.exercise(current)));
}

/** Tag „gesichert“ / „nicht gesichert“; ohne Tag, wenn unklar ist, ob gerade dieses Training geändert wurde. */
function saveTag(state) {
  if (state === 'saved') return h('span', { class: 'tag' }, 'gesichert');
  if (state === 'unsaved') return h('span', { class: 'tag warn' }, 'nicht gesichert');
  return null;
}

export function historyList(file, backup, ui, A) {
  const sessions = endedSessions(file);
  const names = nameIndex(file.plan);
  const notice = backupText({ ...backup, remind: false });
  if (!sessions.length) {
    return [h('h1', {}, 'Verlauf'), h('section', { class: 'card' }, h('p', { class: 'mut' }, 'Noch keine Trainings. Nach dem ersten Training erscheint es hier.'))];
  }
  return [
    h('h1', {}, 'Verlauf'),
    notice ? h('section', { class: 'card' },
      h('p', { class: 'mut' }, notice),
      h('button', { class: 'btn ghost', onclick: A.exportAll }, 'Jetzt sichern')) : null,
    chartCard(file, ui, A),
    h('ul', { class: 'list', 'aria-label': 'Trainings' },
      sessions.map((s) => {
        const st = sessionStats(s);
        const state = sessionSaveState(backup, s.id);
        return h('li', {},
          h('button', { class: 'card list-item', 'data-fid': `sess-${s.id}`, onclick: () => A.openSession(s.id) },
            h('div', { class: 'row2' },
              h('h3', {}, fmtDay(s.date)),
              saveTag(state)),
            h('span', { class: 'mut' }, `${names.session(s.sessionKey)} · ${weekLabel(s)}`),
            h('span', { class: 'mut small' }, `${st.done} von ${st.total} Sätzen${st.minutes != null ? ` · ${st.minutes} Min` : ''}`)));
      })),
  ];
}

function fmtLoggedSet(unit, set) {
  if (typeof set.sec === 'number' && (unit === 's' || set.reps == null)) return `${fmtNum(set.sec)} s`;
  const reps = set.reps == null ? '–' : set.reps;
  if (typeof set.kg === 'number' && set.kg > 0) return `${fmtNum(set.kg)} kg × ${reps}`;
  return `${reps} Wdh.`;
}

export function historyDetail(file, sessionId, backup, A) {
  const s = file.sessions.find((x) => x.id === sessionId);
  if (!s) return [h('p', { class: 'mut' }, 'Training nicht gefunden.'), h('button', { class: 'btn ghost', onclick: A.back }, 'Zurück')];
  const names = nameIndex(file.plan);
  const st = sessionStats(s);
  const state = sessionSaveState(backup, s.id);
  return [
    h('div', {}, h('button', { class: 'link back', 'data-fid': 'back', onclick: A.back }, '‹ Verlauf')),
    h('h1', {}, `${fmtDay(s.date)} · ${names.session(s.sessionKey)}`),
    h('section', { class: 'card' },
      h('div', { class: 'row2' },
        h('span', { class: 'mut' }, `${weekLabel(s)} · ${st.done} von ${st.total} Sätzen${st.minutes != null ? ` · ${st.minutes} Min` : ''}`),
        saveTag(state)),
      state === 'saved' ? null : h('button', { class: 'btn ghost', onclick: A.exportAll }, 'Jetzt sichern'),
      s.endedAt && st.done > 0
        ? h('button', { class: 'btn ghost', 'data-fid': 'garmin-export', onclick: () => A.exportGarmin(s.id) }, 'Für Garmin exportieren')
        : null),
    s.blocks.map((b, bi) => {
      const unit = loggedUnit(names.unit(b.exerciseId), b);
      const name = names.exercise(b.exerciseId);
      const editable = Boolean(s.endedAt);
      const variant = names.variant(b.exerciseId, b.variantId);
      const series = exerciseSeries(file, b.exerciseId);
      return h('section', { class: `card${b.skipped ? ' dim' : ''}`, 'aria-label': names.exercise(b.exerciseId) },
        h('div', { class: 'card-head' },
          h('div', { class: 'grow' }, h('h3', {}, names.exercise(b.exerciseId)), variant ? h('div', { class: 'mut small' }, `Variante: ${variant}`) : null),
          b.skipped ? h('span', { class: 'tag' }, 'übersprungen') : null),
        b.skipped ? null : h('ol', { class: 'sets' },
          b.sets.map((set, si) => {
            const text = `${fmtLoggedSet(unit, set)}${set.done ? '' : ' (nicht erledigt)'}`;
            return h('li', { class: set.done ? '' : 'mut' }, editable
              ? h('button', { class: `link set-edit${set.done ? '' : ' open'}`, 'data-fid': `hset-${bi}-${si}`, 'aria-label': `${name}, Satz ${si + 1}: ${text}. Ändern`, onclick: () => A.editSet(bi, si) }, text)
              : text);
          })),
        b.note ? h('p', { class: 'mut small' }, `Notiz: ${b.note}`) : null,
        editable ? h('button', { class: 'link', 'data-fid': `hnote-${bi}`, 'aria-label': `Notiz zu ${name} ${b.note ? 'bearbeiten' : 'hinzufügen'}`, onclick: () => A.editNote(bi) }, b.note ? 'Notiz bearbeiten' : 'Notiz hinzufügen') : null,
        !b.skipped && series.points.length > 1 ? chart(series, names.exercise(b.exerciseId), { height: 90 }) : null);
    }),
    s.endedAt ? h('button', { class: 'btn danger', 'data-fid': 'delete-session', onclick: () => A.askDelete(s.id) }, 'Training löschen') : null,
  ];
}
