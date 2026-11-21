// Kurze Signaltöne über die Web Audio API (Oszillator, keine Audiodatei).
// iOS erlaubt Ton erst nach einer Nutzergeste: unlockAudio() wird deshalb nur in Tap-Handlern aufgerufen
// (Satz abschließen, Halten starten, Einstellung ändern), nie beim Laden der Seite.
// Fehler bleiben still: Ein fehlender Ton darf das Training nie stören.

export const DEFAULT_SOUND = 'loud';

/** Lautstärke und Klangform je Stufe. Laut: Rechteckwelle, im Studio besser hörbar als ein Sinus. */
const LEVELS = { quiet: { gain: 0.12, wave: 'sine' }, loud: { gain: 0.35, wave: 'square' } };

/** Signale: Pausenende zweimal kurz, Halten-Start einmal hoch, Halten-Ende einmal tief und länger. */
const PATTERNS = {
  rest: [{ at: 0, freq: 880, ms: 140 }, { at: 0.22, freq: 880, ms: 140 }],
  start: [{ at: 0, freq: 1320, ms: 160 }],
  stop: [{ at: 0, freq: 660, ms: 420 }],
};

let ctx = null;

/** In einem Tap-Handler aufrufen: legt den AudioContext an bzw. setzt ihn fort. */
export function unlockAudio() {
  try {
    const AC = globalThis.AudioContext ?? globalThis.webkitAudioContext;
    if (!AC) return;
    if (!ctx) ctx = new AC();
    if (ctx.state !== 'running') ctx.resume?.()?.catch?.(() => {});
  } catch {
    ctx = null;
  }
}

/** Spielt ein Signal (rest | start | stop) in der Stufe level. Ohne entsperrten Kontext passiert nichts. */
export function beep(level, kind = 'rest') {
  const lv = LEVELS[level];
  const pattern = PATTERNS[kind];
  if (!lv || !pattern || !ctx) return;
  try {
    if (ctx.state !== 'running') ctx.resume?.()?.catch?.(() => {});
    const t0 = ctx.currentTime + 0.02;
    for (const p of pattern) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = lv.wave;
      osc.frequency.value = p.freq;
      // Kurze Rampen gegen Knacken.
      const start = t0 + p.at;
      const end = start + p.ms / 1000;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(lv.gain, start + 0.01);
      gain.gain.setValueAtTime(lv.gain, end - 0.03);
      gain.gain.linearRampToValueAtTime(0, end);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(end + 0.01);
    }
  } catch {
    /* kein Ton möglich */
  }
}
