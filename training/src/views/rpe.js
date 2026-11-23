// RPE eines Trainings (0 bis 10) als Schieberegler. Startet ohne Wert („–“), erst eine Berührung setzt einen.

import { h } from '../dom.js';

/** Wörter der RPE-Skala (0 Ruhe bis 10 maximal, eigene Formulierung). */
export const RPE_WORDS = Object.freeze([
  'Ruhe', 'sehr leicht', 'leicht', 'moderat', 'etwas schwer', 'schwer', 'schwer', 'sehr schwer', 'sehr schwer', 'sehr schwer', 'maximal',
]);
export const rpeText = (v) => `${v} · ${RPE_WORDS[v]}`;

/** Halbe Griffbreite in px (CSS .rpe-range: Griff 44 px). Die Werte liegen von 22 px bis Breite − 22 px. */
const THUMB_HALF = 22;

/**
 * Schieberegler 0 bis 10 in ganzen Schritten.
 * Ohne Wert steht „–“ da und der Griff ist gedämpft (die Grundstellung 5 gilt nicht als Wert).
 * Der Regler verwaltet Anzeige und „Zurücksetzen“ selbst und zeichnet nichts neu (Review r4 iOS M-4): onPick meldet nur
 * den Wert. Ein Tipp auf die Spur setzt den Wert an der getippten Stelle (unter iOS springt der Griff dabei nicht von selbst).
 * @param {{value: number|null, onPick: (v: number|null) => void, fid: string, label?: string}} opts
 */
export function rpeSlider({ value, onPick, fid, label = 'RPE: Wie hart war das Training insgesamt?' }) {
  let current = Number.isInteger(value) ? value : null;
  const out = h('output', { class: 'rpe-value', 'aria-hidden': 'true' }, current == null ? '–' : rpeText(current));
  const none = h('span', { class: 'mut small', hidden: current != null }, 'keine Angabe');
  const clamp = (v) => Math.min(10, Math.max(0, Math.round(v)));
  let input = null;
  let wrap = null;
  let reset = null;
  const paint = () => {
    out.textContent = current == null ? '–' : rpeText(current);
    wrap.classList.toggle('unset', current == null);
    none.hidden = current != null;
    reset.hidden = current == null;
    input.setAttribute('aria-valuetext', current == null ? 'keine Angabe' : rpeText(current));
  };
  const set = (v) => {
    current = v;
    input.value = String(v ?? 5);
    paint();
    onPick(v);
  };
  reset = h('button', { class: 'link', 'data-fid': `${fid}-reset`, 'aria-label': 'RPE zurücksetzen, keine Angabe', hidden: current == null, onclick: () => set(null) }, 'Zurücksetzen');
  input = h('input', {
    type: 'range', min: 0, max: 10, step: 1, value: current ?? 5, class: 'rpe-range', 'data-fid': fid,
    'aria-label': label, 'aria-valuetext': current == null ? 'keine Angabe' : rpeText(current),
    // Beim Ziehen nur die Anzeige, übernommen wird beim Loslassen.
    oninput: (e) => {
      out.textContent = rpeText(clamp(Number(e.target.value)));
      wrap.classList.remove('unset');
    },
    onchange: (e) => set(clamp(Number(e.target.value))),
    // Tipp (Maus oder Finger, nicht Tastatur): Wert aus der Position.
    onclick: (e) => {
      if (e.detail === 0) return;
      const r = e.currentTarget.getBoundingClientRect();
      if (r.width <= 2 * THUMB_HALF) return;
      set(clamp(((e.clientX - r.left - THUMB_HALF) / (r.width - 2 * THUMB_HALF)) * 10));
    },
  });
  wrap = h('div', { class: `rpe${current == null ? ' unset' : ''}` },
    h('div', { class: 'rpe-head' }, out, none, reset),
    input,
    h('div', { class: 'rpe-ticks', 'aria-hidden': 'true' }, Array.from({ length: 11 }, (_, k) => h('span', {}, String(k)))),
    h('div', { class: 'rpe-ends mut small', 'aria-hidden': 'true' }, h('span', {}, 'sehr leicht'), h('span', {}, 'maximal')));
  return wrap;
}
