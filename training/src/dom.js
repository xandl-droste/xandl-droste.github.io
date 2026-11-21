// Kleiner DOM-Helfer. Texte werden ausschließlich als Textknoten eingefügt, nie als HTML.

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * h('button', { class: 'btn', onclick: fn, 'aria-label': 'x' }, 'Text', child)
 * Strings und Zahlen werden zu Textknoten. null/false/undefined werden übersprungen.
 */
export function h(tag, props, ...children) {
  const el = document.createElement(tag);
  setProps(el, props);
  append(el, children);
  return el;
}

function setProps(el, props) {
  if (!props) return;
  for (const [k, v] of Object.entries(props)) {
    if (v === undefined || v === null) continue;
    if (v === false && !k.startsWith('aria-')) continue;
    if (k === 'class') el.className = v;
    else if (k === 'text') el.textContent = String(v);
    else if (k === 'value') el.value = String(v);
    else if (k === 'style') Object.assign(el.style, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (k.startsWith('aria-')) el.setAttribute(k, String(v)); // aria-pressed="true"/"false"
    else el.setAttribute(k, v === true ? '' : String(v));
  }
}

function append(el, children) {
  for (const c of children.flat(Infinity)) {
    if (c === null || c === undefined || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
}

const ICONS = {
  check: ['M5 12l5 5 9-9'],
  menu: ['M4 7h16', 'M4 12h16', 'M4 17h16'],
  more: ['M6 12h.01', 'M12 12h.01', 'M18 12h.01'],
  close: ['M6 6l12 12', 'M18 6L6 18'],
  // Ansicht wechseln: Liste (Zeilen mit Punkten) bzw. Fokus (eine Karte).
  list: ['M9 6h11', 'M9 12h11', 'M9 18h11', 'M4 6h.01', 'M4 12h.01', 'M4 18h.01'],
  focus: ['M6 4h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z', 'M8 10h8', 'M8 14h5'],
};

/** Inline-SVG-Icon, rein dekorativ (Beschriftung kommt vom Button). */
export function icon(name, size = 22) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  for (const [k, v] of Object.entries({
    width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
    'stroke-width': name === 'more' ? 4 : 2.75, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true', focusable: 'false',
  })) svg.setAttribute(k, String(v));
  for (const d of ICONS[name]) {
    const p = document.createElementNS(SVG_NS, 'path');
    p.setAttribute('d', d);
    svg.append(p);
  }
  return svg;
}

export function svgEl(tag, attrs = {}, ...children) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  for (const c of children) el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  return el;
}
