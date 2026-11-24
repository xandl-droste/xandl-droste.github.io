// Arbeitsstand in IndexedDB. Die exportierten Dateien sind die Wahrheit, das hier ist nur der Zwischenstand.
// Stores: files (keyPath fileId) und kv (activeFileId, live, lastExport:<fileId>, stamp).
//
// Mehrere offene Instanzen (zwei Tabs, Tab und Home-Bildschirm): Jede Schreibaktion setzt einen neuen `stamp`.
// Eine Instanz schreibt nur, wenn der gespeicherte `stamp` noch der ist, den sie selbst zuletzt gelesen oder geschrieben hat.
// Sonst ist ihr Stand veraltet, und das Schreiben würde neuere Daten (z. B. ein beendetes Training) überschreiben.

const DB_NAME = 'training-pwa';
const DB_VERSION = 1;
let dbPromise = null;
/** Zuletzt gelesener oder geschriebener stamp dieser Instanz (undefined: noch nichts geladen). */
let knownStamp;

/** Fehler, wenn eine andere Instanz inzwischen gespeichert hat. */
export class StaleError extends Error {
  constructor() {
    super('Der gespeicherte Stand wurde in einem anderen Fenster geändert.');
    this.name = 'StaleError';
  }
}

/** Darf diese Instanz schreiben? Rein, damit testbar. */
export function isStale(stored, known) {
  return known !== undefined && (stored ?? null) !== known;
}

const newStamp = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

function openDb() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      if (!('indexedDB' in globalThis)) return reject(new Error('IndexedDB nicht verfügbar'));
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('files')) db.createObjectStore('files', { keyPath: 'fileId' });
        if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv');
      };
      req.onsuccess = () => {
        const db = req.result;
        db.onversionchange = () => db.close();
        resolve(db);
      };
      req.onerror = () => reject(req.error);
      req.onblocked = () => reject(new Error('Datenbank ist in einem anderen Tab geöffnet'));
    }).catch((e) => {
      dbPromise = null;
      throw e;
    });
  }
  return dbPromise;
}

/** Führt fn in einer Transaktion aus. Alles oder nichts. */
async function run(stores, mode, fn) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(stores, mode);
    const out = {};
    tx.oncomplete = () => resolve(out.value);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error('Speichern abgebrochen'));
    const result = fn(tx);
    if (result && typeof result.then === 'function') result.then((v) => { out.value = v; }, (e) => { tx.abort(); reject(e); });
    else out.value = result;
  });
}

const req = (r) => new Promise((resolve, reject) => {
  r.onsuccess = () => resolve(r.result);
  r.onerror = () => reject(r.error);
});

/**
 * Schreibt in einer Transaktion, aber nur, wenn seit dem letzten eigenen Lesen/Schreiben niemand anders gespeichert hat.
 * force: ohne Prüfung (ausdrückliche Übernahme eines Imports).
 */
async function guardedWrite(stores, write, { force = false } = {}) {
  const stamp = newStamp();
  await run([...new Set([...stores, 'kv'])], 'readwrite', async (tx) => {
    const kv = tx.objectStore('kv');
    if (!force && isStale(await req(kv.get('stamp')), knownStamp)) throw new StaleError();
    await write(tx);
    kv.put(stamp, 'stamp');
  });
  knownStamp = stamp;
}

/** Lädt den aktiven Stand: Datei, laufendes Training und letzten Export. */
export async function loadState() {
  return run(['files', 'kv'], 'readonly', async (tx) => {
    const kv = tx.objectStore('kv');
    const activeId = await req(kv.get('activeFileId'));
    const file = activeId ? await req(tx.objectStore('files').get(activeId)) : null;
    const live = await req(kv.get('live'));
    const lastExport = file ? await req(kv.get(`lastExport:${file.fileId}`)) : null;
    knownStamp = (await req(kv.get('stamp'))) ?? null;
    return { file: file ?? null, live: live && file && live.fileId === file.fileId ? live : null, lastExport: lastExport ?? null };
  });
}

export function saveFile(file) {
  return guardedWrite(['files'], (tx) => {
    tx.objectStore('files').put(file);
    tx.objectStore('kv').put(file.fileId, 'activeFileId');
  });
}

export function saveLive(live) {
  return guardedWrite(['kv'], (tx) => {
    tx.objectStore('kv').put(live, 'live');
  });
}

export function clearLive() {
  return guardedWrite(['kv'], (tx) => {
    tx.objectStore('kv').delete('live');
  });
}

/** Training beenden: Datei speichern und laufendes Training löschen, in einer Transaktion. */
export function saveFinished(file) {
  return guardedWrite(['files'], (tx) => {
    tx.objectStore('files').put(file);
    tx.objectStore('kv').put(file.fileId, 'activeFileId');
    tx.objectStore('kv').delete('live');
  });
}

export function setLastExport(fileId, record) {
  return run(['kv'], 'readwrite', (tx) => {
    tx.objectStore('kv').put(record, `lastExport:${fileId}`);
  });
}

/** Dauerhaften Speicher anfragen (Safari entscheidet selbst). */
export async function requestPersistence() {
  try {
    if (navigator.storage?.persisted && (await navigator.storage.persisted())) return true;
    return (await navigator.storage?.persist?.()) ?? false;
  } catch {
    return false;
  }
}

/** Verständliche Fehlermeldung für Speicherfehler. */
export function storageErrorMessage(e) {
  if (e?.name === 'StaleError') return 'Die App wurde in einem anderen Fenster neuer gespeichert. Dieses Fenster speichert nicht mehr. Bitte neu laden.';
  if (e?.name === 'QuotaExceededError') return 'Speicher voll. Bitte jetzt „Als Datei sichern“ und Platz freigeben.';
  return 'Speichern im Browser fehlgeschlagen. Bitte als Datei sichern, damit nichts verloren geht.';
}

export function getLastExport(fileId) {
  return run(['kv'], 'readonly', (tx) => req(tx.objectStore('kv').get(`lastExport:${fileId}`))).then((v) => v ?? null);
}

/**
 * Import oder Wechsel übernehmen: Datei als aktiv speichern und ggf. Exportstand setzen, in einer Transaktion.
 * dropFileId: bisherige Trainingsdatei, die beim Wechsel aus dem Browserspeicher entfernt wird (ab 2.0 liegt nur die
 * aktive Trainingsdatei im Browser; die bisherige muss vorher gesichert sein, das prüft die App).
 * Beim Entfernen gilt immer der Schutz gegen ein veraltetes Fenster (Review r4 Security M1): Hat ein anderes Fenster
 * inzwischen gespeichert (stamp) oder liegt die bisherige Datei mit höherer Revision als expectRevision im Browser,
 * wird nichts geschrieben (StaleError).
 * force: ohne Prüfung auf ein anderes Fenster, nur ohne dropFileId (ausdrückliche Übernahme eines Imports).
 */
export function saveImported(file, lastExport, { dropFileId = null, expectRevision = null, force = true } = {}) {
  const drop = dropFileId && dropFileId !== file.fileId ? dropFileId : null;
  return guardedWrite(['files'], async (tx) => {
    if (drop && expectRevision != null) {
      const stored = await req(tx.objectStore('files').get(drop));
      if (stored && Number(stored.revision) > expectRevision) throw new StaleError();
    }
    tx.objectStore('files').put(file);
    tx.objectStore('kv').put(file.fileId, 'activeFileId');
    if (lastExport) tx.objectStore('kv').put(lastExport, `lastExport:${file.fileId}`);
    if (drop) {
      tx.objectStore('files').delete(drop);
      tx.objectStore('kv').delete(`lastExport:${drop}`);
    }
  }, { force: force && !drop });
}

/** Eine Trainingsdatei aus dem Browser lesen (ungeprüft) oder null. */
export function getFile(fileId) {
  return run(['files'], 'readonly', (tx) => req(tx.objectStore('files').get(fileId))).then((v) => v ?? null);
}

/** Alle Trainingsdateien im Browser außer der aktiven, jeweils mit dem Stand der letzten Sicherung (oder null). */
export async function listOtherFiles() {
  return run(['files', 'kv'], 'readonly', async (tx) => {
    const kv = tx.objectStore('kv');
    const activeId = await req(kv.get('activeFileId'));
    const all = await req(tx.objectStore('files').getAll());
    const out = [];
    for (const file of all) {
      if (!file || file.fileId === activeId) continue;
      out.push({ file, lastExport: (await req(kv.get(`lastExport:${file.fileId}`))) ?? null });
    }
    return out;
  });
}

/** Eine Trainingsdatei aus dem Browser entfernen. Aufrufer übergeben nie die aktive (siehe model/switch.js). */
export function deleteFile(fileId) {
  return guardedWrite(['files'], (tx) => {
    tx.objectStore('files').delete(fileId);
    tx.objectStore('kv').delete(`lastExport:${fileId}`);
  });
}
