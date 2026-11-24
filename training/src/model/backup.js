// Backup-Status. Die zuletzt exportierte Revision und deren Zeitpunkt speichert die App lokal
// (IndexedDB), nicht in der exportierten Datei.

export const EXPORT_REMINDER_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * @param {object} file Trainingsdatei
 * @param {{revision: number, at: string} | null} lastExport
 * @param {Date} now
 */
export function backupStatus(file, lastExport, now = new Date()) {
  const ended = file.sessions.filter((s) => s.endedAt);
  const exportedAt = lastExport ? Date.parse(lastExport.at) : null;
  // Revision als Hauptkriterium. Zusätzlich updatedAt, falls die Revision an ihrer Obergrenze stehen bleibt.
  const unsavedChanges = !lastExport || file.revision > lastExport.revision
    || (file.revision === lastExport.revision && Date.parse(file.updatedAt) > exportedAt);
  // Andere Trainings (ab Schema 3) zählen mit, maßgeblich ist der Zeitpunkt des Eintrags.
  const activities = file.activities ?? [];
  const unsavedSessionIds = unsavedChanges
    ? [
      ...ended.filter((s) => exportedAt == null || Date.parse(s.endedAt) > exportedAt).map((s) => s.id),
      ...activities.filter((a) => exportedAt == null || Date.parse(a.createdAt) > exportedAt).map((a) => a.id),
    ]
    : [];
  const daysSinceExport = exportedAt == null ? null : Math.floor((now.getTime() - exportedAt) / DAY_MS);
  const hasData = ended.length > 0 || activities.length > 0;
  return {
    unsavedChanges: unsavedChanges && (hasData || file.revision > 0),
    unsavedSessionIds,
    daysSinceExport,
    remind: hasData && (unsavedChanges || (daysSinceExport != null && daysSinceExport >= EXPORT_REMINDER_DAYS)),
  };
}

/**
 * Ein Satz für Hinweise (Start, Verlauf): zuerst neue Trainings, dann sonstige Änderungen (Korrektur, Löschen, Woche), dann das Alter.
 * null, wenn es nichts zu sagen gibt.
 */
export function backupText(st) {
  const n = st.unsavedSessionIds.length;
  if (n === 1) return '1 Training ist noch nicht als Datei gesichert.';
  if (n > 1) return `${n} Trainings sind noch nicht als Datei gesichert.`;
  if (st.unsavedChanges) return 'Änderungen sind noch nicht als Datei gesichert.';
  if (st.remind && st.daysSinceExport != null) return `Letzte Sicherung vor ${st.daysSinceExport} ${st.daysSinceExport === 1 ? 'Tag' : 'Tagen'}.`;
  return null;
}

/**
 * Sicherungsstand eines Trainings im Verlauf: 'unsaved' (neu seit dem Export), 'saved' (alles gesichert)
 * oder null (es gibt ungesicherte Änderungen, die App weiß aber nicht, an welchem Training).
 */
export function sessionSaveState(st, sessionId) {
  if (st.unsavedSessionIds.includes(sessionId)) return 'unsaved';
  return st.unsavedChanges ? null : 'saved';
}
