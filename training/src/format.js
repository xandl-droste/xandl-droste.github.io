// Formatierung für die Anzeige (Deutsch, Komma als Dezimaltrennzeichen).

const nf = new Intl.NumberFormat('de-AT', { maximumFractionDigits: 2 });

export const fmtNum = (n) => (n === null || n === undefined || Number.isNaN(n) ? '–' : nf.format(n));
export const fmtKg = (n) => `${fmtNum(n)} kg`;

/** Lokales Datum JJJJ-MM-TT. */
export function localDate(d) {
  const x = new Date(d);
  const p = (n) => String(n).padStart(2, '0');
  return `${x.getFullYear()}-${p(x.getMonth() + 1)}-${p(x.getDate())}`;
}

/** RIR-Wert zum Anzeigen: 4 steht für „4+“. */
export const fmtRir = (v) => (v >= 4 ? '4+' : String(v));

/** RIR-Ziel aus dem Plan zum Anzeigen: Bindestrich zwischen Zahlen als Halbgeviertstrich („2-3“ → „2–3“). Leer: null. */
export function fmtRirTarget(t) {
  if (t == null || String(t).trim() === '') return null;
  return String(t).replace(/(\d)\s*-\s*(\d)/g, '$1–$2');
}

export function fmtClock(sec) {
  const s = Math.max(0, Math.round(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** Zielvorgabe kurz, z. B. "3 × 6–8 pro Seite", "2 × 20 s pro Seite". */
export function fmtTarget(item, sets = item.plannedSets) {
  let t;
  if (item.unit === 's') t = `${sets} × ${item.durationSec} s`;
  else if (item.repsMin === item.repsMax || item.repsMax == null) t = `${sets} × ${item.repsMin}`;
  else t = `${sets} × ${item.repsMin}–${item.repsMax}`;
  return item.perSide ? `${t} pro Seite` : t;
}

/** Ein Satz kurz, z. B. "80 kg × 5", "+5 kg × 8", "8 Wdh.", "20 s". */
export function fmtSet(item, set) {
  if (item.unit === 's') return `${fmtNum(set.sec)} s`;
  const reps = set.reps == null ? '–' : set.reps;
  if (item.unit === 'bodyweight') return set.kg ? `+${fmtKg(set.kg)} × ${reps}` : `${reps} Wdh.`;
  return `${fmtKg(set.kg)} × ${reps}`;
}

/** Kurzform für schmale Superset-Zellen, z. B. "82,5×10", "+5×8", "8 Wdh.", "20 s". */
export function fmtSetShort(item, set) {
  if (item.unit === 's') return `${fmtNum(set.sec)} s`;
  const reps = set.reps == null ? '–' : set.reps;
  if (item.unit === 'bodyweight') return set.kg ? `+${fmtNum(set.kg)}×${reps}` : `${reps} Wdh.`;
  return `${fmtNum(set.kg)}×${reps}`;
}

/** "Letztes Mal" in einer Zeile. */
export function fmtLast(item) {
  if (!item.last || !item.last.sets.length) return null;
  const sets = item.last.sets;
  const same = sets.every((s) => s.kg === sets[0].kg && s.reps === sets[0].reps && s.sec === sets[0].sec);
  if (same) return `${sets.length} × ${fmtSet(item, sets[0])}`;
  return sets.map((s) => fmtSet(item, s)).join(', ');
}

/** Wochentag + Datum, z. B. "Do 12.11." */
export function fmtDay(isoDate) {
  const [y, m, d] = isoDate.split('-').map(Number);
  const wd = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'][new Date(y, m - 1, d).getDay()];
  return `${wd} ${String(d).padStart(2, '0')}.${String(m).padStart(2, '0')}.`;
}

/** Eingabe mit Komma oder Punkt in eine Zahl umwandeln, sonst null. */
export function parseNum(text) {
  const t = String(text ?? '').trim().replace(',', '.');
  if (t === '') return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}
