// Export der .training.json: primär Teilen-Menü mit Datei, sonst Download.
// Ein Abbruch im Teilen-Menü gilt nicht als Export.

import { serialize, trainingFileName } from './model/training-file.js';

/** @returns {Promise<{ok: boolean, method?: 'share'|'download', aborted?: boolean}>} */
export async function exportTrainingFile(file) {
  const name = trainingFileName(file.plan.name);
  const blob = new Blob([serialize(file)], { type: 'application/json' });
  return shareOrDownload(blob, name, 'application/json');
}

export async function shareOrDownload(blob, name, type) {
  let shareFile = null;
  try {
    shareFile = new File([blob], name, { type });
  } catch {
    shareFile = null;
  }
  if (shareFile && navigator.canShare && navigator.canShare({ files: [shareFile] })) {
    try {
      // Nur die Datei teilen: iOS legt title/text beim Sichern in „Dateien“ als zusätzliche Textdatei ab.
      await navigator.share({ files: [shareFile] });
      return { ok: true, method: 'share' };
    } catch (e) {
      if (e?.name === 'AbortError') return { ok: false, aborted: true };
      // NotAllowedError o. Ä.: auf Download ausweichen
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.rel = 'noopener';
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return { ok: true, method: 'download' };
}
