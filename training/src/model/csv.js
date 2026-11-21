// CSV-Export der Historie (Semikolon, Dezimalkomma, für Excel/Numbers in deutscher Einstellung).

import { nameIndex } from './history.js';

const HEADER = ['Datum', 'Einheit', 'Woche', 'Übung', 'Variante', 'Satz', 'kg', 'Wdh', 'Sekunden', 'erledigt', 'übersprungen', 'Notiz'];

/** Ein Feld sicher machen: Formel-Injektion verhindern, Trennzeichen und Anführungszeichen maskieren. */
export function csvField(v) {
  if (v === null || v === undefined) return '';
  let s = typeof v === 'number' ? String(v).replace('.', ',') : String(v);
  if (typeof v !== 'number' && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  // Text immer in Anführungszeichen: Auch ein Programm mit Komma als Trennzeichen zerlegt das Feld dann nicht
  // (sonst stünde z. B. „=1+1“ nach einem Komma am Zellenanfang). Zahlen bleiben ohne.
  if (typeof v !== 'number' && s !== '') s = `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function historyCsv(file) {
  const names = nameIndex(file.plan);
  const lines = [HEADER.join(';')];
  const sessions = file.sessions.filter((s) => s.endedAt).sort((a, b) => Date.parse(a.startedAt) - Date.parse(b.startedAt));
  for (const s of sessions) {
    for (const b of s.blocks) {
      const base = [s.date, names.session(s.sessionKey), s.week, names.exercise(b.exerciseId), names.variant(b.exerciseId, b.variantId) ?? ''];
      const sets = b.sets.length ? b.sets : [{ kg: null, reps: null, sec: null, done: false }];
      sets.forEach((set, i) => {
        lines.push([...base, i + 1, set.kg, set.reps, set.sec, set.done ? 'ja' : 'nein', b.skipped ? 'ja' : 'nein', i === 0 ? b.note : ''].map(csvField).join(';'));
      });
    }
  }
  // BOM, damit Excel die Umlaute richtig erkennt.
  return '﻿' + lines.join('\r\n') + '\r\n';
}
