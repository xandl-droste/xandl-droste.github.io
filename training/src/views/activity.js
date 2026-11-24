// Sheet „Anderes Training eintragen“ bzw. „… korrigieren“: Trainingsart, Datum, Dauer, RPE, Notiz.
// Der Entwurf (draft) liegt im App-Zustand. Tippen ändert nur den Entwurf und zeichnet nicht neu, damit der Tap auf
// „Speichern“ nicht verloren geht. Entwurf: docs/entwurf-andere-trainingsarten.md.

import { h } from '../dom.js';
import { LIMITS, cleanActivityType } from '../model/validate.js';
import { parseNum } from '../format.js';
import { rpeSlider } from './rpe.js';

export const ACTIVITY_DEFAULT_MIN = 60;
export const ACTIVITY_STEP_MIN = 5;

/** Neuer Entwurf (heute, 60 min) oder Entwurf aus einem vorhandenen anderen Training. */
export function activityDraft(today, activity = null) {
  if (activity) {
    return { id: activity.id, type: activity.type, date: activity.date, durationMin: activity.durationMin, rpe: activity.rpe ?? null, note: activity.note ?? '', error: null };
  }
  return { id: null, type: '', date: today, durationMin: ACTIVITY_DEFAULT_MIN, rpe: null, note: '', error: null };
}

/** Prüft den Entwurf vor dem Speichern und liefert eine verständliche Meldung oder null. */
export function activityDraftError(d, today) {
  // Auch eine Trainingsart nur aus unsichtbaren Zeichen gilt als leer (Review r7 Code-Qualität N3).
  if (!cleanActivityType(d.type)) return 'Bitte eine Trainingsart eintragen, z. B. „Beachvolleyball“.';
  if (!d.date) return 'Bitte ein Datum wählen.';
  if (d.date > today) return 'Das Datum liegt in der Zukunft.';
  const m = d.durationMin;
  if (!Number.isInteger(m) || m < 1 || m > LIMITS.maxActivityMin) return `Bitte die Dauer in ganzen Minuten eintragen (1 bis ${LIMITS.maxActivityMin}).`;
  return null;
}

/**
 * Inhalt des Sheets (ohne Rahmen).
 * @param {object} d Entwurf aus activityDraft
 * @param {{suggestions: string[], today: string, A: {update: (patch: object, opts?: {render?: boolean}) => void, save: () => void, cancel: () => void, announce?: (text: string) => void}}} opts
 */
export function activitySheetBody(d, { suggestions, today, A }) {
  const lower = String(d.type ?? '').trim().toLocaleLowerCase('de');
  return [
    h('label', { class: 'field', for: 'act-type' }, h('span', { class: 'mut' }, 'Trainingsart'),
      h('input', {
        id: 'act-type', 'data-fid': 'act-type', type: 'text', maxlength: LIMITS.maxActivityType, autocomplete: 'off',
        autocapitalize: 'sentences', enterkeyhint: 'done', placeholder: 'z. B. Beachvolleyball', value: d.type,
        oninput: (e) => A.update({ type: e.target.value }),
        onkeydown: (e) => { if (e.key === 'Enter') { e.preventDefault(); e.target.blur(); } },
      })),
    suggestions.length ? h('div', { class: 'chips act-chips', role: 'group', 'aria-label': 'Bisherige Trainingsarten' },
      suggestions.map((t, k) => h('button', {
        'aria-pressed': t.toLocaleLowerCase('de') === lower, 'data-fid': `act-sug-${k}`,
        onclick: () => A.update({ type: t }, { render: true }),
      }, t))) : null,
    // Datum und Dauer nebeneinander (unter 340 px untereinander, siehe CSS .field-pair).
    h('div', { class: 'field-pair' },
      h('label', { class: 'field', for: 'act-date' }, h('span', { class: 'mut' }, 'Datum'),
        h('input', {
          id: 'act-date', 'data-fid': 'act-date', type: 'date', max: today, min: '2000-01-01', value: d.date,
          onchange: (e) => A.update({ date: e.target.value }),
        })),
      durationField(d.durationMin, A)),
    h('div', { class: 'stack' },
      h('p', { class: 'small' }, h('b', {}, 'Wie hart war es insgesamt?'), h('span', { class: 'mut' }, ' Optional.')),
      rpeSlider({ value: d.rpe, onPick: (v) => A.update({ rpe: v }), fid: 'act-rpe', label: 'RPE: Wie hart war das Training insgesamt?' })),
    h('label', { class: 'field', for: 'act-note' }, h('span', { class: 'mut' }, 'Notiz (optional)'),
      h('textarea', {
        id: 'act-note', 'data-fid': 'act-note', maxlength: LIMITS.maxNote, rows: 2, value: d.note,
        oninput: (e) => A.update({ note: e.target.value }),
      })),
    h('p', { class: 'mut small' }, 'Zählt nicht für die Woche und ändert keine Gewichte im Plan.'),
    // Meldung und Aktionen stehen unten fest im Sheet, damit „Speichern“ ohne Scrollen erreichbar ist (Review r5 iOS M-2).
    h('div', { class: 'sheet-actions' },
      d.error ? h('p', { class: 'warn-text', role: 'alert' }, d.error) : null,
      h('div', { class: 'row2' },
        h('button', { class: 'btn ghost sm grow-btn', 'data-fid': 'act-cancel', onclick: A.cancel }, 'Abbrechen'),
        h('button', { class: 'btn sm grow-btn', 'data-fid': 'act-save', onclick: A.save }, 'Speichern'))),
  ];
}

/** Kompaktes Feld für die Dauer: so hoch wie die anderen Felder, mit −/+ in 5-Minuten-Schritten. */
function durationField(value, A) {
  let input = null;
  const bump = (delta) => () => {
    // Ausgangswert aus dem Feld zum Zeitpunkt des Taps (Review r6 Code-Qualität H1 / iOS H-1).
    const typed = input?.isConnected ? parseNum(input.value) : value;
    if (input && document.activeElement === input) input.blur(); // Review r7 iOS M-1
    const v = Number.isFinite(typed) ? typed : ACTIVITY_DEFAULT_MIN;
    const next = Math.min(LIMITS.maxActivityMin, Math.max(ACTIVITY_STEP_MIN, Math.round((v + delta) / ACTIVITY_STEP_MIN) * ACTIVITY_STEP_MIN));
    A.update({ durationMin: next }, { render: true });
    A.announce?.(`Dauer ${next} Minuten`);
  };
  return h('div', { class: 'field' },
    h('label', { class: 'mut', for: 'act-duration' }, 'Dauer (Minuten)'),
    h('div', { class: 'num-row' },
      h('button', { class: 'num-btn', 'aria-label': `Dauer um ${ACTIVITY_STEP_MIN} Minuten verringern`, 'data-fid': 'dec-durationMin', onclick: bump(-ACTIVITY_STEP_MIN) }, '−'),
      input = h('input', {
        id: 'act-duration', 'data-fid': 'act-duration', type: 'text', inputmode: 'numeric', autocomplete: 'off', enterkeyhint: 'done',
        value: value == null ? '' : String(value),
        // Kein Neuzeichnen beim Verlassen des Felds: Der Wert gilt schon über input, und der Tap auf „Speichern“ oder
        // −/+ soll seinen Button treffen (Review r5 iOS H-1).
        oninput: (e) => A.update({ durationMin: parseNum(e.target.value) }),
        onkeydown: (e) => { if (e.key === 'Enter') { e.preventDefault(); e.target.blur(); } },
      }),
      h('button', { class: 'num-btn', 'aria-label': `Dauer um ${ACTIVITY_STEP_MIN} Minuten erhöhen`, 'data-fid': 'incv-durationMin', onclick: bump(ACTIVITY_STEP_MIN) }, '+')));
}
