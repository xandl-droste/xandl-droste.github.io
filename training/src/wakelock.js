// Screen Wake Lock, solange ein Training läuft. Wird nach der Rückkehr in die App neu angefordert.

let sentinel = null;
let wanted = false;
let pending = null; // laufende Anfrage: keine zweite parallel

async function acquire() {
  if (!wanted || sentinel || pending || !('wakeLock' in navigator) || document.visibilityState !== 'visible') return;
  try {
    pending = navigator.wakeLock.request('screen');
    const lock = await pending;
    // Inzwischen beendet (z. B. Training abgeschlossen, während die Anfrage lief): sofort wieder freigeben.
    if (!wanted) {
      await lock.release().catch(() => {});
      return;
    }
    sentinel = lock;
    lock.addEventListener('release', () => {
      if (sentinel === lock) sentinel = null;
    });
  } catch {
    sentinel = null; // z. B. Energiesparmodus: still ignorieren
  } finally {
    pending = null;
  }
}

export async function keepAwake(on) {
  wanted = on;
  if (on) return acquire();
  const s = sentinel;
  sentinel = null;
  try {
    await s?.release();
  } catch {
    /* bereits freigegeben */
  }
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') acquire();
});
