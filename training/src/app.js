// Einstieg der App: Zustand, Navigation und Bildschirme.

// Nicht eingebettet laufen (Clickjacking). GitHub Pages erlaubt keine Header wie frame-ancestors.
if (window.top !== window.self) {
  document.documentElement.replaceChildren();
  throw new Error('Die App läuft nicht eingebettet in fremden Seiten.');
}

import { h, icon } from './dom.js';
import { fmtNum } from './format.js';
import { parseImportText, ValidationError, validateTrainingFile, validateSession } from './model/validate.js';
import { createTrainingFile, bumpRevision, trainingFileName, themeFor, deleteSession } from './model/training-file.js';
import { findPlanSession, estimateMinutes } from './model/plan.js';
import { nextPlanSession, setCurrentWeek, repeatWeek, startNewCycle, countsAsUnitDone, doneShare, cycleOf } from './model/weeks.js';
import { updateLoggedSet, setLoggedNote, nameIndex, loggedUnit, lastTrained } from './model/history.js';
import { backupStatus, backupText } from './model/backup.js';
import { finishInto, isAlreadyFinished, dropDuplicateSessions } from './model/finish.js';
import {
  startLive, toggleSet, updateSet, addSet, removeSet, setSkipped, setNote, setVariant, applyIncreaseTo,
  extendRest, clearRest, restRemaining, summarize, progress, hasAnyDone, restoreLive,
  activeSlot, isDeferred, setDeferred, canDefer, holdPhase, localDate,
} from './model/live.js';
import { liveView, steppersFor, holdLabel, holdSeconds, lastNoteText } from './views/live.js';
import { unlockAudio, beep, DEFAULT_SOUND } from './sound.js';
import { historyList, historyDetail } from './views/history.js';
import { planScreen as planView } from './views/plan.js';
import { infoScreen } from './views/info.js';
import { buildAgentPrompt, resultLines } from './agent-prompt.js';
import { readImportFiles, previewImport, applyImports, overlapText } from './model/import.js';
import { historyCsv } from './model/csv.js';
import { fmtClock, fmtSet, fmtDay } from './format.js';
import * as store from './storage.js';
import { keepAwake } from './wakelock.js';
import { exportTrainingFile, shareOrDownload } from './export.js';
import { sessionToFit, garminFileName } from './garmin/session-fit.js';

const root = document.getElementById('app');

const S = {
  ready: false,
  fatal: null,
  file: null,
  live: null,
  lastExport: null,
  screen: 'home', // empty | home | hist | plan | live | done
  sheet: null, // () => Node
  toast: null, // { text, action?: {label, run} }
  done: null, // { sessionId, summary, title, week, planCompleted, exported }
  histId: null, // Detailansicht im Verlauf
  chartExercise: null,
  importState: null, // { items, preview, choices }
  infoReturn: null, // Bildschirm vor der Info-Seite
  undo: null, // { i, s, liveId, text } zuletzt abgeschlossener Satz, Rückgängig im Timer
  readyUntil: 0, // Zeitpunkt, bis zu dem der Timer „Los!“ zeigt
  sheetReturn: null, // data-fid des Auslösers eines Sheets
  hold: null, // { i, s, liveId, startedAt, sec, perSide, index } laufender Countdown (nur im Speicher)
  warmupOpen: null, // id des Trainings, dessen Warm-up aufgeklappt ist (nur im Speicher)
  scrollToActive: false, // nach dem Wechsel zur Liste einmal zum aktuellen Satz scrollen
};

// Ansagen für Screenreader: eine dauerhafte Live-Region außerhalb von #app.
const announcer = document.getElementById('announce');
function announce(text) {
  if (!announcer) return;
  announcer.textContent = '';
  requestAnimationFrame(() => { announcer.textContent = text; });
}

// Zuletzt angetippter Button (Safari fokussiert Buttons beim Tippen nicht). Dient der Fokus-Wiederherstellung.
let lastFid = null;
document.addEventListener('click', (e) => {
  const el = e.target instanceof Element ? e.target.closest('button[data-fid]') : null;
  lastFid = el ? el.dataset.fid : null;
}, true);
// Art des letzten Zeigers (Maus, Touch, Stift); eine Taste setzt sie zurück. Nach Touch wird ein Auswahlfeld
// nicht neu fokussiert, sonst öffnet iOS die Auswahl erneut. Per Tastatur bleibt der Fokus im Feld.
let lastPointerType = '';
document.addEventListener('pointerdown', (e) => { lastPointerType = e.pointerType; }, true);
document.addEventListener('keydown', () => { lastPointerType = ''; }, true);

// ---------- Hilfen ----------

const THEME_COLORS = { light: '#f4f6f4', dark: '#0f1412', fancy: '#2a1457' };

// Ohne geöffneten Plan gibt es noch keinen Trainingsstand. Einstellungen bleiben bis dahin hier
// und werden beim Öffnen des ersten Plans übernommen.
let draftSettings = {};
const activeSettings = () => S.file?.settings ?? draftSettings;
function currentTheme() {
  return themeFor(activeSettings(), matchMedia('(prefers-color-scheme: light)').matches);
}

// Einmalig registriert: Info-Seite per Hash-Wechsel öffnen.
window.addEventListener('hashchange', () => {
  if (location.hash === '#info' && S.ready && S.screen !== 'info') openInfo();
});
const currentView = () => activeSettings().view ?? 'list';
const currentSound = () => activeSettings().sound ?? DEFAULT_SOUND;
const settingsForNewFile = () => ({ theme: currentTheme(), view: currentView(), sound: activeSettings().sound });

// Ton nur, wenn eingeschaltet. unlock* nur aus Tap-Handlern aufrufen (iOS).
const unlockSound = () => { if (currentSound() !== 'off') unlockAudio(); };
const signal = (kind, vibrate) => {
  navigator.vibrate?.(vibrate);
  if (currentSound() !== 'off') beep(currentSound(), kind);
};

function applyTheme() {
  const t = currentTheme();
  document.documentElement.dataset.theme = t;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLORS[t]);
}

// ---------- Neuzeichnen ohne Eingaben oder Taps zu stören ----------
// render() ersetzt den ganzen Bildschirm. Zwei Regeln:
// 1. Während ein Finger auf dem Display ist, wird nicht neu gezeichnet. Sonst trifft der click einen ersetzten Button
//    (z. B. „Satz fertig“ direkt nach dem Tippen eines Werts: blur → change → render vor dem click).
// 2. Zeitgesteuerte Aktualisierungen (Toast weg, Rückgängig-Fenster vorbei, Pausenende) warten, solange getippt wird.
let pointerDown = false;
let tapRenderPending = false;
let softRenderPending = false;
document.addEventListener('pointerdown', () => { pointerDown = true; }, true);
const releasePointer = () => {
  pointerDown = false;
  if (tapRenderPending) setTimeout(() => { if (tapRenderPending && !pointerDown) render(); }, 120);
};
document.addEventListener('pointerup', releasePointer, true);
document.addEventListener('pointercancel', releasePointer, true);

function renderAfterTap() {
  if (pointerDown) {
    tapRenderPending = true;
    return;
  }
  render();
}
const isEditing = () => {
  const a = document.activeElement;
  return Boolean(a && root.contains(a) && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA'));
};
function softRender() {
  if (isEditing()) {
    softRenderPending = true;
    return;
  }
  renderAfterTap();
}
document.addEventListener('focusout', () => {
  if (!softRenderPending) return;
  softRenderPending = false;
  setTimeout(renderAfterTap, 0);
}, true);

let toastTimer = null;
function showToast(text, action = null, ms = 4000) {
  S.toast = { text, action };
  announce(text);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    S.toast = null;
    softRender();
  }, ms);
  render();
}

let saveChain = Promise.resolve();
function queueSave(fn) {
  saveChain = saveChain.then(fn).catch((e) => {
    console.error(e);
    showStorageError(e);
  });
  return saveChain;
}

function showStorageError(e) {
  if (e?.name === 'StaleError') showToast(store.storageErrorMessage(e), { label: 'Neu laden', run: () => location.reload() }, 30000);
  else showToast(store.storageErrorMessage(e), null, 8000);
}

/** Laufendes Training sichern, über die Warteschlange. Ist es inzwischen beendet oder verworfen, passiert nichts. */
function saveLiveNow() {
  return queueSave(() => (S.live ? store.saveLive(S.live) : undefined));
}

function setLive(next, { quiet = false } = {}) {
  if (next === S.live) return;
  S.live = next;
  queueSave(() => store.saveLive(next));
  if (!quiet) render();
}

function setFile(next) {
  S.file = next;
  queueSave(() => store.saveFile(next));
  render();
}

function openSheet(builder) {
  if (!S.sheet) S.sheetReturn = lastFid;
  S.sheet = builder;
  render();
  requestAnimationFrame(() => root.querySelector('.sheet [data-autofocus]')?.focus());
}
function closeSheet() {
  S.sheet = null;
  render();
  const fid = S.sheetReturn;
  S.sheetReturn = null;
  if (fid) root.querySelector(`[data-fid="${CSS.escape(fid)}"]`)?.focus({ preventScroll: true });
}

function go(screen) {
  if (screen === 'hist' && S.screen !== 'hist') S.histId = null;
  S.screen = screen;
  S.sheet = null;
  S.toast = null;
  render();
  window.scrollTo(0, 0);
}

// ---------- Rahmen ----------

function menuButton() {
  return h('button', { class: 'icon-btn menu-btn', 'aria-label': 'Menü', 'aria-haspopup': 'dialog', 'data-fid': 'menu', onclick: () => openSheet(menuSheet) }, icon('menu'));
}

function tabs() {
  const items = [['home', 'Heute'], ['hist', 'Verlauf'], ['plan', 'Plan']];
  return h('nav', { class: 'tabs', 'aria-label': 'Hauptnavigation' },
    items.map(([k, label]) => h('button', { 'aria-current': S.screen === k ? 'page' : false, 'data-fid': `tab-${k}`, onclick: () => go(k) }, label)));
}

function sheetFrame(title, ...content) {
  return h('div', {
    class: 'sheet', onclick: (e) => { if (e.target === e.currentTarget) closeSheet(); },
    onkeydown: (e) => { if (e.key === 'Escape') closeSheet(); },
  },
  h('div', { class: 'card', role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
    h('h2', { tabindex: '-1', 'data-autofocus': true }, title), ...content));
}

function toastNode() {
  const t = S.toast;
  return h('div', { class: 'toast' }, h('span', { class: 'grow' }, t.text),
    t.action ? h('button', { class: 'link', onclick: () => { S.toast = null; t.action.run(); } }, t.action.label) : null);
}

function seg(options, current, onPick, label) {
  return h('div', { class: 'seg', role: 'group', 'aria-label': label },
    options.map(([v, l]) => h('button', { 'aria-pressed': current === v, 'data-fid': `seg-${label}-${v}`, onclick: () => onPick(v) }, l)));
}

// ---------- Info ----------

function openInfo() {
  if (S.screen !== 'info') S.infoReturn = S.screen;
  go('info');
}

function closeInfo() {
  const back = S.infoReturn ?? (S.file ? 'home' : 'empty');
  S.infoReturn = null;
  if (location.hash === '#info') history.replaceState(null, '', location.pathname + location.search);
  go(back === 'info' ? 'home' : back);
}

function footerLink() {
  return h('button', { class: 'link footer-link', 'data-fid': 'footer-info', onclick: openInfo }, 'Impressum & Datenschutz');
}

// ---------- Menü ----------

function updateSettings(patch) {
  if (patch.view === 'list' && currentView() !== 'list' && S.live) S.scrollToActive = true;
  if (!S.file) {
    draftSettings = { ...draftSettings, ...patch };
    render();
    return;
  }
  setFile({ ...S.file, settings: { ...S.file.settings, ...patch } });
}

function menuSheet() {
  return sheetFrame('Menü',
    h('div', { class: 'stack' },
      h('div', { class: 'mut' }, 'Stil'),
      seg([['light', 'Hell'], ['dark', 'Dunkel'], ['fancy', 'Fancy']], currentTheme(), (v) => updateSettings({ theme: v }), 'Stil')),
    h('div', { class: 'stack' },
      h('div', { class: 'mut' }, 'Ansicht im Training'),
      seg([['list', 'Liste'], ['focus', 'Fokus']], currentView(), (v) => updateSettings({ view: v }), 'Ansicht im Training')),
    h('div', { class: 'stack' },
      h('div', { class: 'mut' }, 'Signalton'),
      seg([['off', 'Aus'], ['quiet', 'Leise'], ['loud', 'Laut']], currentSound(), (v) => {
        // Probeton: Der Tap entsperrt zugleich den Ton auf iOS.
        if (v !== 'off') {
          unlockAudio();
          beep(v, 'rest');
        }
        updateSettings({ sound: v });
      }, 'Signalton')),
    S.file ? null : h('p', { class: 'mut small' }, 'Einstellungen werden gespeichert, sobald ein Plan geöffnet ist.'),
    h('button', { class: 'btn ghost', onclick: openInfo }, 'Info, Impressum & Datenschutz'),
    h('button', { class: 'btn ghost', onclick: closeSheet }, 'Schließen'));
}

// ---------- Onboarding ----------

function emptyScreen() {
  return [
    h('div', { class: 'hero' },
      h('div', { class: 'logo' }, 'Training'),
      h('h1', {}, 'Hast du schon einen Plan?'),
      h('p', { class: 'mut' }, 'Pläne und Verlauf liegen als Dateien bei dir. Es wird nichts hochgeladen.')),
    h('div', { class: 'stack onboard-actions' },
      h('button', { class: 'btn', 'data-fid': 'open', onclick: openFiles }, 'Plan öffnen'),
      h('button', { class: 'btn ghost', 'data-fid': 'create', onclick: () => openSheet(() => agentSheet('Neuen Plan erstellen')) }, 'Neuen Plan erstellen'),
      h('p', { class: 'mut small' }, 'Pläne sind keine medizinische Beratung. Bei Beschwerden bitte ärztlich oder physiotherapeutisch abklären.')),
  ];
}

// ---------- Plan mit KI ----------

function agentSheet(title) {
  const plain = buildAgentPrompt();
  const results = S.file ? resultLines(S.file) : [];
  const copy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast('Prompt kopiert.');
    } catch {
      const pre = root.querySelector('.prompt');
      if (pre) {
        const r = document.createRange();
        r.selectNodeContents(pre);
        const sel = getSelection();
        sel.removeAllRanges();
        sel.addRange(r);
      }
      showToast('Kopieren nicht möglich. Text ist markiert, bitte manuell kopieren.');
    }
  };
  const share = async (text) => {
    try {
      if (!navigator.share) throw new Error('kein Teilen');
      await navigator.share({ title: 'Prompt für plan.json', text });
    } catch (e) {
      if (e?.name !== 'AbortError') copy(text);
    }
  };
  return sheetFrame(title,
    h('p', { class: 'mut' }, 'Kopiere den Prompt in einen KI-Agenten deiner Wahl. Er berät dich, fragt nach und liefert am Ende eine plan.json, die du hier öffnest.'),
    h('p', { class: 'mut small' }, 'Was du dem KI-Dienst erzählst, geht an dessen Anbieter. Der erzeugte Plan ist nicht geprüft und keine medizinische Beratung. Bei Beschwerden bitte ärztlich oder physiotherapeutisch abklären.'),
    h('pre', { class: 'prompt', tabindex: '0', 'aria-label': 'Prompt' }, plain),
    h('div', { class: 'row2' },
      h('button', { class: 'btn sm grow-btn', onclick: () => copy(plain) }, 'Kopieren'),
      h('button', { class: 'btn ghost sm grow-btn', onclick: () => share(plain) }, 'Teilen')),
    S.file ? h('button', { class: 'btn ghost', onclick: () => copy(buildAgentPrompt({ currentPlan: S.file.plan })) }, 'Mit aktuellem Plan kopieren (zum Anpassen)') : null,
    results.length ? h('button', { class: 'btn ghost', 'data-fid': 'copy-results', onclick: () => copy(buildAgentPrompt({ currentPlan: S.file.plan, results })) }, 'Mit Plan und letzten Ergebnissen kopieren') : null,
    results.length ? h('p', { class: 'mut small' }, 'Die Ergebnisse (Gewichte, Wiederholungen, Daten) gehen dann ebenfalls an den Anbieter des KI-Dienstes.') : null,
    h('button', { class: 'btn ghost', onclick: () => { S.sheet = null; render(); openFiles(); } }, 'plan.json jetzt öffnen'),
    h('button', { class: 'btn ghost', onclick: closeSheet }, 'Schließen'));
}

// ---------- Import ----------

function openFiles() {
  if (S.live) {
    showToast('Bitte zuerst das laufende Training beenden.');
    return;
  }
  const input = h('input', { type: 'file', accept: '.json,application/json', multiple: true, class: 'sr-only', 'aria-hidden': 'true', tabindex: '-1' });
  input.addEventListener('change', async () => {
    const files = [...(input.files ?? [])];
    input.remove();
    if (!files.length) return;
    try {
      const r = await readImportFiles(files);
      if (!r.ok) {
        openSheet(() => importErrorSheet(r.errors));
        return;
      }
      const preview = previewImport(S.file, r.items);
      const choices = {};
      preview.forEach((p, idx) => { if (p.action === 'choose') choices[idx] = p.defaultChoice; });
      S.importState = { items: r.items, preview, choices };
      openSheet(importPreviewSheet);
    } catch (e) {
      // Nie still scheitern: sonst passiert nach der Dateiauswahl scheinbar nichts.
      console.error(e);
      showToast('Die Datei konnte nicht geöffnet werden. Bitte erneut versuchen.', null, 8000);
    }
  }, { once: true });
  input.addEventListener('cancel', () => input.remove(), { once: true });
  document.body.append(input);
  input.click();
}

function importErrorSheet(errors) {
  return sheetFrame('Import abgebrochen',
    h('p', { class: 'mut' }, 'Es wurde nichts geändert. Bitte die Datei korrigieren (oder vom Agenten korrigieren lassen) und erneut öffnen.'),
    errors.map((f) => h('section', { class: 'stack' },
      h('h3', {}, f.name),
      h('ul', { class: 'errors' },
        f.errors.slice(0, 8).map((e) => h('li', {}, e)),
        f.errors.length > 8 ? h('li', { class: 'mut' }, `… und ${f.errors.length - 8} weitere`) : null))),
    h('button', { class: 'btn', onclick: closeSheet }, 'Schließen'));
}

const ACTION_TEXT = {
  restore: 'Wird als Trainingsstand übernommen.',
  unchanged: 'Entspricht dem gespeicherten Stand. Nichts zu tun.',
  new: 'Legt einen neuen Trainingsstand mit leerer Historie an.',
};

function importPreviewSheet() {
  const st = S.importState;
  const unsavedNow = S.file ? backupStatus(S.file, S.lastExport).unsavedChanges : false;
  const items = st.preview.map((p, idx) => {
    const sum = p.summary;
    let action;
    if (p.action === 'merge') {
      action = p.merge.winner === 'incoming'
        ? `Die Datei ist neuer (Stand ${p.revision}, im Browser ${p.localRevision}) und wird übernommen.${p.merge.addedSessions ? ` ${p.merge.addedSessions} Training(s), die nur im Browser sind, werden ergänzt.` : ''}`
        : `Der Browser-Stand ist neuer (Stand ${p.localRevision}, Datei ${p.revision}).${p.merge.addedSessions ? ` ${p.merge.addedSessions} Training(s) aus der Datei werden ergänzt.` : ''}`;
      if (p.merge.removedSessions) action += ` ${p.merge.removedSessions} gelöschte(s) Training(s) werden entfernt.`;
    } else if (p.action === 'switch') {
      action = `Anderer Trainingsstand: Er ersetzt den aktuellen in der App. Der aktuelle bleibt im Browser gespeichert.${unsavedNow ? ' Achtung: Der aktuelle Stand ist noch nicht als Datei gesichert.' : ''}`;
    } else if (p.action === 'choose') {
      const choice = st.choices[idx] ?? p.defaultChoice;
      const text = {
        keep: `Der laufende Plan wird angepasst, du bleibst in Woche ${p.currentWeek}. Deine ${p.historyCount} Trainings bleiben und werden über die Übungs-IDs zugeordnet.`,
        cycle: `Neuer Durchgang ab Woche 1. Deine ${p.historyCount} Trainings bleiben, die Gewichte werden daraus vorgeschlagen.`,
        new: 'Neuer Trainingsstand mit leerer Historie. Der bisherige bleibt im Browser gespeichert.',
      };
      const overlap = choice === 'new' ? null : overlapText(p.overlap);
      action = h('div', { class: 'stack' },
        seg([['keep', 'Anpassen'], ['cycle', 'Von vorn'], ['new', 'Ganz neu']], choice, (v) => { st.choices[idx] = v; render(); }, `Neuer Plan ${idx + 1}`),
        h('p', { class: 'mut small' }, text[choice]),
        overlap ? h('p', { class: 'mut small', 'data-fid': `overlap-${idx}` }, overlap) : null);
    } else action = ACTION_TEXT[p.action];
    return h('section', { class: 'card' },
      h('h3', {}, p.name),
      h('p', { class: 'mut small' }, `${p.kind === 'plan' ? 'Plan' : 'Trainingsstand'}: „${sum.planName}“ · ${sum.weeks} Wochen · ${sum.planSessions} Einheiten · ${sum.exercises} Übungen`),
      sum.history ? h('p', { class: 'mut small' }, sum.history.count ? `${sum.history.count} Trainings (${fmtDay(sum.history.from)} bis ${fmtDay(sum.history.to)})` : 'Noch keine Trainings') : null,
      typeof action === 'string' ? h('p', {}, action) : action);
  });
  const nothing = st.preview.every((p) => p.action === 'unchanged');
  return sheetFrame('Import prüfen',
    items,
    nothing ? null : h('button', { class: 'btn', 'data-fid': 'import-ok', onclick: confirmImport }, 'Übernehmen'),
    h('button', { class: 'btn ghost', onclick: () => { S.importState = null; closeSheet(); } }, nothing ? 'Schließen' : 'Abbrechen'));
}

async function confirmImport() {
  const st = S.importState;
  const now = new Date();
  let file;
  let notes;
  try {
    ({ file, notes } = applyImports(S.file, st.items, st.choices, { now, settings: S.file?.settings ?? settingsForNewFile() }));
  } catch (e) {
    console.error(e);
    showToast('Übernehmen fehlgeschlagen. Es wurde nichts geändert.', null, 8000);
    return;
  }
  // Was gespeichert wird, muss sich auch wieder einlesen lassen (z. B. nicht mehr als 5000 Trainings nach dem Zusammenführen).
  const problem = checkReimport(file);
  if (problem) {
    showToast(`Nicht übernommen: ${problem}`, null, 10000);
    return;
  }
  const fromFile = st.items.some((i) => i.kind === 'training' && i.file.fileId === file.fileId && i.file.revision === file.revision);
  const exportRec = fromFile ? { revision: file.revision, at: now.toISOString(), method: 'import' } : null;
  try {
    await saveChain;
    await store.saveImported(file, exportRec);
    S.lastExport = exportRec ?? (await store.getLastExport(file.fileId));
  } catch (e) {
    showStorageError(e);
    return;
  }
  S.file = file;
  S.importState = null;
  go('home');
  showToast(notes.length ? `Übernommen. ${notes.join(' ')}` : 'Übernommen.', null, notes.length ? 8000 : 3000);
}

// ---------- Plan-Tab ----------

const PA = {
  setWeek(w) {
    try {
      setFile(bumpRevision(setCurrentWeek(S.file, w)));
    } catch {
      /* außerhalb des Plans */
    }
  },
  repeatWeek() {
    if (blockedByLive()) return;
    setFile(repeatWeek(S.file));
    showToast(`Woche ${S.file.progress.currentWeek} wird wiederholt.`);
  },
  restartPlan: () => askRestartPlan(),
  openFiles: () => openFiles(),
  agentPrompt: () => openSheet(() => agentSheet('Plan mit KI erstellen oder anpassen')),
  exportAll: () => doExport(),
  async exportCsv() {
    if (!S.file.sessions.some((s) => s.endedAt)) {
      showToast('Noch keine Trainings für den CSV-Export.');
      return;
    }
    const name = trainingFileName(S.file.plan.name).replace(/\.training\.json$/, '-verlauf.csv');
    const res = await shareOrDownload(new Blob([historyCsv(S.file)], { type: 'text/csv' }), name, 'text/csv');
    if (res.ok) showToast(res.method === 'share' ? 'CSV geteilt.' : 'CSV heruntergeladen.');
  },
};

function blockedByLive() {
  if (!S.live) return false;
  showToast('Bitte zuerst das laufende Training beenden.');
  return true;
}

function askRestartPlan() {
  if (blockedByLive()) return;
  openSheet(() => sheetFrame('Plan erneut starten?',
    h('p', { class: 'mut' }, `„${S.file.plan.name}“ beginnt als Durchgang ${cycleOf(S.file.progress) + 1} wieder in Woche 1. Dein Verlauf bleibt erhalten, die Gewichte werden daraus vorgeschlagen.`),
    h('button', { class: 'btn', 'data-fid': 'restart-ok', onclick: () => { S.sheet = null; setFile(startNewCycle(S.file)); showToast('Plan neu gestartet: Woche 1.'); } }, 'Erneut starten'),
    h('button', { class: 'btn ghost', onclick: closeSheet }, 'Abbrechen')));
}

// ---------- Heute ----------

function homeScreen() {
  const f = S.file;
  const nodes = [h('h1', {}, 'Heute')];
  if (S.live) {
    const p = progress(S.live);
    const since = new Date(S.live.session.startedAt).toLocaleTimeString('de-AT', { hour: '2-digit', minute: '2-digit' });
    nodes.push(h('section', { class: 'card', 'aria-label': 'Laufendes Training' },
      h('div', { class: 'mut' }, 'Training läuft'),
      h('h2', {}, S.live.title),
      h('p', { class: 'mut' }, `Woche ${S.live.session.week} · seit ${since} Uhr · ${p.done} von ${p.total} Sätzen`),
      h('button', { class: 'btn', 'data-fid': 'resume', onclick: resumeLive }, 'Training fortsetzen'),
      h('button', { class: 'btn danger', onclick: askDiscard }, 'Training verwerfen')));
  } else if (f.progress.status === 'completed') {
    nodes.push(h('section', { class: 'card' },
      h('h2', {}, 'Plan abgeschlossen'),
      h('p', { class: 'mut' }, `Alle ${f.plan.weeks} Wochen von „${f.plan.name}“ sind geschafft. Sichere den Stand als Archiv.`),
      h('button', { class: 'btn', onclick: doExport }, 'Als Datei sichern'),
      h('button', { class: 'btn ghost', 'data-fid': 'next-plan', onclick: () => openSheet(() => agentSheet('Nächsten Plan mit KI erstellen')) }, 'Nächsten Plan mit KI erstellen'),
      h('button', { class: 'btn ghost', 'data-fid': 'restart', onclick: askRestartPlan }, 'Plan erneut starten')));
  } else {
    const ps = nextPlanSession(f);
    nodes.push(nextSessionCard(f, ps));
  }
  nodes.push(backupCard());
  return nodes;
}

function nextSessionCard(f, ps) {
  const w = f.progress.currentWeek;
  const rir = f.plan.rirTargets?.[String(w)];
  const cycle = cycleOf(f.progress);
  const last = lastTrained(f, localDate(new Date()));
  const meta = [`Woche ${w} von ${f.plan.weeks}`, cycle > 1 ? `Durchgang ${cycle}` : null, rir ? `RIR ${rir}` : null, `${ps.blocks.length} Blöcke`, `ca. ${estimateMinutes(f.plan, ps, w)} Min`].filter(Boolean);
  return h('section', { class: 'card', 'aria-label': 'Nächste Einheit' },
    h('div', { class: 'mut' }, 'Nächste Einheit'),
    h('h2', {}, ps.name),
    h('p', { class: 'mut' }, meta.join(' · ')),
    ps.suggestedDay ? h('p', { class: 'mut small' }, ps.suggestedDay) : null,
    last ? h('p', { class: 'mut small' }, `Zuletzt: ${last.name}, ${last.when}`) : null,
    h('button', { class: 'btn', 'data-fid': 'start', onclick: () => beginLive(ps.key) }, 'Training starten'),
    f.plan.sessions.length > 1 ? h('button', { class: 'link', onclick: () => openSheet(chooseSessionSheet) }, 'Andere Einheit wählen') : null);
}

function chooseSessionSheet() {
  return sheetFrame('Einheit wählen',
    S.file.plan.sessions.map((ps) => h('button', { class: 'btn ghost', onclick: () => { S.sheet = null; beginLive(ps.key); } }, ps.name)),
    h('button', { class: 'btn ghost', onclick: closeSheet }, 'Abbrechen'));
}

function backupCard() {
  const st = backupStatus(S.file, S.lastExport);
  const n = st.unsavedSessionIds.length;
  let text;
  if (!S.file.sessions.length) text = 'Noch keine Trainings gespeichert.';
  else if (n === 1) text = '1 Training noch nicht gesichert.';
  else if (n > 1) text = `${n} Trainings noch nicht gesichert.`;
  else if (st.unsavedChanges) text = 'Änderungen noch nicht gesichert.';
  else if (st.remind) text = backupText(st);
  else text = 'Alle Trainings gesichert.';
  return h('section', { class: 'card', 'aria-label': 'Backup' },
    h('h3', {}, 'Backup'),
    h('p', { class: 'mut' }, text),
    st.remind || st.unsavedChanges ? h('button', { class: 'btn ghost', onclick: doExport }, 'Jetzt sichern') : null);
}

// ---------- Verlauf ----------

const HA = {
  openSession(id) {
    S.histId = id;
    render();
    window.scrollTo(0, 0);
  },
  back() {
    const id = S.histId;
    S.histId = null;
    render();
    root.querySelector(`[data-fid="sess-${CSS.escape(id ?? '')}"]`)?.focus();
  },
  exportAll: () => doExport(),
  exportGarmin: (id) => doGarminExport(id),
  chartExercise(id) {
    S.chartExercise = id;
    render();
  },
  editSet: (bi, si) => openSheet(() => histSetSheet(bi, si)),
  editNote: (bi) => openSheet(() => histNoteSheet(bi)),
  askDelete: (id) => openSheet(() => deleteSessionSheet(id)),
};

// Korrigieren beendeter Trainings im Verlauf. Jede Änderung erhöht die Revision.
const histSession = () => S.file.sessions.find((x) => x.id === S.histId) ?? null;

function saveFileQuiet(next) {
  if (next === S.file) return;
  S.file = next;
  queueSave(() => store.saveFile(next));
}

const HE = {
  setValue(i, s, field, value) {
    saveFileQuiet(updateLoggedSet(S.file, S.histId, i, s, { [field]: value }));
    render();
  },
  // Während des Tippens nichts speichern; übernommen wird beim Verlassen des Felds.
  typeValue() {},
  commitValue(i, s, field, value) {
    saveFileQuiet(updateLoggedSet(S.file, S.histId, i, s, { [field]: value }));
    renderAfterTap();
  },
};

function histSetSheet(bi, si) {
  const sess = histSession();
  const block = sess?.blocks[bi];
  const set = block?.sets[si];
  if (!set) return null;
  const names = nameIndex(S.file.plan);
  const item = { name: names.exercise(block.exerciseId), unit: loggedUnit(names.unit(block.exerciseId), block), perSide: names.perSide(block.exerciseId) };
  return sheetFrame(`${item.name} · Satz ${si + 1}`,
    h('p', { class: 'mut small' }, `${fmtDay(sess.date)} · Aktuell: ${fmtSet(item, set)}${set.done ? '' : ' (nicht erledigt)'}`),
    steppersFor(item, set, bi, si, HE),
    h('button', { class: 'btn', onclick: closeSheet }, 'Fertig'));
}

function histNoteSheet(bi) {
  const sess = histSession();
  const block = sess?.blocks[bi];
  if (!block) return null;
  const name = nameIndex(S.file.plan).exercise(block.exerciseId);
  const save = () => {
    const el = root.querySelector('#hist-note');
    S.sheet = null;
    setFile(setLoggedNote(S.file, sess.id, bi, el ? el.value : block.note));
  };
  return sheetFrame(`Notiz · ${name}`,
    h('label', { class: 'field', for: 'hist-note' }, h('span', { class: 'mut' }, 'Notiz zur Übung'),
      h('textarea', { id: 'hist-note', 'data-fid': 'hist-note', maxlength: 2000, rows: 4, value: block.note })),
    h('button', { class: 'btn', onclick: save }, 'Speichern'),
    h('button', { class: 'btn ghost', onclick: closeSheet }, 'Abbrechen'));
}

function deleteSessionSheet(id) {
  const sess = S.file.sessions.find((x) => x.id === id);
  if (!sess) return null;
  const names = nameIndex(S.file.plan);
  return sheetFrame('Training löschen?',
    h('p', { class: 'mut' }, `${fmtDay(sess.date)} · ${names.session(sess.sessionKey)} wird aus dem Verlauf entfernt und zählt nicht mehr für die Wochen. Die aktuelle Woche bleibt, wie sie ist. Das lässt sich nicht rückgängig machen.`),
    h('button', { class: 'btn danger', 'data-fid': 'delete-ok', onclick: () => {
      S.sheet = null;
      S.histId = null;
      setFile(deleteSession(S.file, id));
      showToast('Training gelöscht.');
    } }, 'Ja, löschen'),
    h('button', { class: 'btn ghost', onclick: closeSheet }, 'Abbrechen'));
}

function histScreen() {
  const backup = backupStatus(S.file, S.lastExport);
  if (S.histId) return historyDetail(S.file, S.histId, backup, HA);
  return historyList(S.file, backup, { chartExercise: S.chartExercise }, HA);
}

// ---------- Live-Training ----------

async function beginLive(key) {
  if (S.live) return resumeLive();
  if (!findPlanSession(S.file.plan, key)) return;
  unlockSound();
  S.live = startLive(S.file, key);
  await queueSave(() => store.saveLive(S.live));
  keepAwake(true);
  go('live');
}

function resumeLive() {
  unlockSound();
  keepAwake(true);
  go('live');
}

function askDiscard() {
  openSheet(() => sheetFrame('Training verwerfen?',
    h('p', { class: 'mut' }, 'Alle Sätze dieses Trainings gehen verloren. Das lässt sich nicht rückgängig machen.'),
    h('button', { class: 'btn danger', onclick: discardLive }, 'Ja, verwerfen'),
    h('button', { class: 'btn ghost', onclick: closeSheet }, 'Abbrechen')));
}

async function discardLive() {
  S.live = null;
  S.hold = null;
  S.sheet = null;
  await queueSave(() => store.clearLive());
  keepAwake(false);
  go('home');
  offerPendingUpdate();
}

// Zweiter Tap kurz nach dem ersten (nasse Finger) wird ignoriert, sonst schließt er den nächsten Satz ab.
const DOUBLE_TAP_MS = 600;
const UNDO_MS = 10_000;
let lastToggleAt = 0;
let undoTimer = null;

const A = {
  /** Ansicht im Training wechseln (Umschalter in der Leiste, gleiche Einstellung wie im Menü). */
  setView(view) {
    updateSettings({ view });
    announce(view === 'list' ? 'Ansicht Liste' : 'Ansicht Fokus');
  },
  /** Warm-up auf- oder zugeklappt: merken, damit Neuzeichnen es nicht schließt. Kein render nötig. */
  warmupToggle(open) {
    if (!S.live) return;
    S.warmupOpen = open ? S.live.session.id : null;
  },
  /** at: Zeitpunkt des Abschlusses (Countdown-Ende), sonst jetzt. */
  toggle(i, s, at = new Date()) {
    const t = Date.now();
    if (t - lastToggleAt < DOUBLE_TAP_MS) return;
    lastToggleAt = t;
    unlockSound();
    S.hold = null;
    const wasDone = S.live.session.blocks[i].sets[s].done;
    const next = toggleSet(S.live, i, s, at);
    restExpiredNotified = false;
    S.readyUntil = 0;
    const item = next.items[i];
    clearTimeout(undoTimer);
    if (!wasDone) {
      S.undo = { i, s, liveId: next.session.id, text: `${item.slot ? `${item.slot}) ` : ''}${item.name}: Satz ${s + 1} erledigt` };
      undoTimer = setTimeout(() => { S.undo = null; if (S.screen === 'live') softRender(); }, UNDO_MS);
      const rest = next.rest ? `, Pause ${fmtClock(restRemaining(next))}` : '';
      const end = activeSlot(next) ? '' : '. Alle Sätze erledigt, unten Abschließen';
      announce(`${item.name}, Satz ${s + 1} erledigt${rest}${end}`);
    } else {
      S.undo = null;
      announce(`${item.name}, Satz ${s + 1} wieder offen`);
    }
    setLive(next);
  },
  undo() {
    const u = S.undo;
    S.undo = null;
    if (u && S.live?.session.id === u.liveId && S.live.session.blocks[u.i]?.sets[u.s]?.done) {
      lastToggleAt = 0;
      A.toggle(u.i, u.s);
    } else render();
  },
  edit(i, s) {
    openSheet(() => editSheet(i, s));
  },
  setValue(i, s, field, value) {
    setLive(updateSet(S.live, i, s, { [field]: value }));
  },
  // Während des Tippens: Zustand ohne Neuzeichnen aktualisieren (der Wert ist sofort gültig, auch für „Satz fertig“).
  typeValue(i, s, field, value) {
    setLive(updateSet(S.live, i, s, { [field]: value }), { quiet: true });
  },
  // Feld verlassen: anzeigen, aber erst nach einem eventuell laufenden Tap.
  commitValue(i, s, field, value) {
    setLive(updateSet(S.live, i, s, { [field]: value }), { quiet: true });
    renderAfterTap();
  },
  variant(i, id) {
    setLive(setVariant(S.live, i, id));
  },
  increase(i) {
    setLive(applyIncreaseTo(S.live, i));
    const inc = S.live.items[i].increase;
    showToast(`+${fmtNum(inc.incrementKg)} kg übernommen: ${fmtNum(inc.toKg)} kg`);
  },
  options(i) {
    openSheet(() => optionsSheet(i));
  },
  restPlus() {
    setLive(extendRest(S.live, 30, Date.now()));
    restExpiredNotified = false;
  },
  restSkip() {
    S.readyUntil = 0;
    setLive(clearRest(S.live));
  },
  holdStart(i, s) {
    const item = S.live.items[i];
    const set = S.live.session.blocks[i]?.sets[s];
    const sec = set && !set.done ? holdSeconds(item, set) : null;
    if (!sec) return;
    unlockSound();
    S.hold = { i, s, liveId: S.live.session.id, startedAt: Date.now(), sec, perSide: Boolean(item.perSide), index: 0 };
    // Der nächste Satz beginnt: eine laufende Pause endet.
    S.readyUntil = 0;
    S.undo = null;
    clearTimeout(undoTimer);
    announce(`${item.name}, Satz ${s + 1}: ${holdLabel(holdPhase(S.hold))}`);
    if (S.live.rest) setLive(clearRest(S.live));
    else render();
  },
  holdCancel() {
    // „Abbrechen“ liegt im Fokus dort, wo eben „Halten starten“ war: ein zweiter Tap direkt danach zählt nicht.
    if (!S.hold || Date.now() - S.hold.startedAt < DOUBLE_TAP_MS) return;
    S.hold = null;
    announce('Halten abgebrochen, Satz bleibt offen');
    render();
  },
  defer(i, later) {
    S.hold = null;
    setLive(setDeferred(S.live, i, later));
    closeSheet();
    announce(later ? `${S.live.items[i].name} kommt später` : `${S.live.items[i].name} wieder in der Reihenfolge`);
  },
  askFinish() {
    openSheet(finishSheet);
  },
};

function editSheet(i, s) {
  const item = S.live.items[i];
  const set = S.live.session.blocks[i].sets[s];
  if (!set) return null;
  return sheetFrame(`${item.name} · Satz ${s + 1}`,
    h('p', { class: 'mut small' }, `Aktuell: ${fmtSet(item, set)}`),
    steppersFor(item, set, i, s, A),
    h('button', { class: 'btn', onclick: closeSheet }, 'Fertig'));
}

function optionsSheet(i) {
  const item = S.live.items[i];
  const block = S.live.session.blocks[i];
  const noteId = `note-${i}`;
  const later = isDeferred(S.live, i);
  const isSuperset = item.type === 'superset';
  const lastNote = lastNoteText(item);
  return sheetFrame(item.name,
    lastNote ? h('p', { class: 'mut small' }, lastNote) : null,
    h('div', { class: 'row2' },
      h('button', { class: 'btn ghost sm', onclick: () => setLive(addSet(S.live, i)) }, '+ Satz hinzufügen'),
      h('button', { class: 'btn ghost sm', disabled: block.sets.length <= 1 || block.sets.every((x) => x.done), onclick: () => setLive(removeSet(S.live, i)) }, '− Satz entfernen')),
    h('p', { class: 'mut small' }, `${block.sets.length} Sätze geplant (Vorgabe ${item.plannedSets}).`),
    h('label', { class: 'field', for: noteId }, h('span', { class: 'mut' }, 'Notiz zur Übung'),
      h('textarea', {
        id: noteId, maxlength: 2000, rows: 3, value: block.note,
        oninput: (e) => setLive(setNote(S.live, i, e.target.value), { quiet: true }),
        // Nicht sofort neu zeichnen: Sonst geht der Tap auf „Fertig“ oder „Später“ nach dem Tippen verloren.
        onchange: () => renderAfterTap(),
      })),
    // Später: ganzer Block (bei Supersets beide Übungen), z. B. wenn das Gerät belegt ist.
    later || canDefer(S.live, i) ? h('div', { class: 'stack' },
      h('button', {
        class: 'btn ghost', 'data-fid': `defer-${i}`,
        'aria-label': later ? `Jetzt machen: ${isSuperset ? 'Superset' : item.name} wieder in der Reihenfolge` : `Später: ${isSuperset ? 'Superset' : item.name} zurückstellen`,
        onclick: () => A.defer(i, !later),
      }, later ? 'Jetzt machen' : 'Später'),
      h('p', { class: 'mut small' }, later
        ? `${isSuperset ? 'Das Superset kommt' : 'Die Übung kommt'} erst dran, wenn alle anderen Sätze erledigt sind.`
        : `${isSuperset ? 'Das Superset kommt' : 'Die Übung kommt'} ans Ende, z. B. wenn das Gerät belegt ist.`)) : null,
    h('button', { class: block.skipped ? 'btn ghost' : 'btn danger', onclick: () => { setLive(setSkipped(S.live, i, !block.skipped)); closeSheet(); } },
      block.skipped ? 'Übung wieder aufnehmen' : 'Übung überspringen'),
    h('button', { class: 'btn', onclick: closeSheet }, 'Fertig'));
}

function finishSheet() {
  const p = progress(S.live);
  const any = hasAnyDone(S.live);
  const counts = countsAsUnitDone(S.live.session);
  const share = doneShare(S.live.session);
  return sheetFrame('Training beenden?',
    h('p', { class: 'mut' }, `${p.done} von ${p.total} Sätzen erledigt.`),
    p.done < p.total && any ? h('p', { class: 'mut small' }, 'Offene Sätze werden als nicht erledigt gespeichert.') : null,
    any && !counts ? h('p', { class: 'mut small' }, `Nur ${share.done} von ${share.total} geplanten Sätzen erledigt (übersprungene Übungen zählen mit), also weniger als die Hälfte: Das Training wird gespeichert, die Einheit bleibt in dieser Woche aber offen.`) : null,
    any ? h('button', { class: 'btn', onclick: finishLiveNow }, 'Beenden und speichern') : h('p', { class: 'mut small' }, 'Noch kein Satz erledigt, es gibt nichts zu speichern.'),
    h('button', { class: 'btn ghost', onclick: closeSheet }, 'Weiter trainieren'),
    h('button', { class: 'btn danger', onclick: askDiscard }, 'Training verwerfen'));
}

let finishing = false;

async function finishLiveNow() {
  if (finishing || !S.live) return;
  finishing = true;
  const now = new Date();
  const live = S.live;
  const summary = summarize(live, now);
  const { file, session, progress: prog } = finishInto(S.file, live, now);
  // Sofort umschalten, damit kein späteres Speichern (App verlassen, Pausenende) das beendete Training wieder als laufend ablegt.
  S.live = null;
  S.file = file;
  S.undo = null;
  S.hold = null;
  let storageFailed = false;
  saveChain = saveChain.catch(() => {}).then(() => store.saveFinished(file)).catch((e) => {
    // Nicht abbrechen: Das Training bleibt im Speicher der Seite und lässt sich als Datei sichern.
    console.error(e);
    storageFailed = true;
    if (e?.name === 'StaleError') showStorageError(e);
  });
  await saveChain;
  finishing = false;
  S.done = { sessionId: session.id, summary, title: live.title, week: live.session.week, planCompleted: prog.planCompleted, exported: false, storageFailed };
  keepAwake(false);
  go('done');
  setTimeout(() => offerPendingUpdate(), 1500);
}

function doneScreen() {
  const d = S.done;
  const sum = d.summary;
  return [
    h('h1', {}, 'Training abgeschlossen'),
    d.storageFailed ? h('section', { class: 'card warn', role: 'alert' },
      h('h3', {}, 'Nicht im Browser gespeichert'),
      h('p', { class: 'mut' }, 'Der Browserspeicher ist voll oder nicht verfügbar. Sichere das Training jetzt als Datei, bevor du die App schließt. Danach in den Einstellungen Platz freigeben und die Datei über „Plan öffnen“ wieder einlesen.')) : null,
    h('section', { class: 'card' },
      h('h3', {}, `${d.title} · Woche ${d.week}`),
      h('div', { class: 'stats' },
        h('div', {}, h('b', {}, sum.minutes), h('span', { class: 'mut small' }, 'Minuten')),
        h('div', {}, h('b', {}, `${sum.setsDone}/${sum.setsTotal}`), h('span', { class: 'mut small' }, 'Sätze')),
        h('div', {}, h('b', {}, sum.reps), h('span', { class: 'mut small' }, 'Wdh.'))),
      sum.skipped ? h('p', { class: 'mut small' }, `${sum.skipped} Übung${sum.skipped > 1 ? 'en' : ''} übersprungen.`) : null),
    d.planCompleted ? h('section', { class: 'card' },
      h('h2', {}, 'Plan abgeschlossen'),
      h('p', { class: 'mut' }, `Alle ${S.file.plan.weeks} Wochen geschafft. Sichere den Stand jetzt als Archiv.`)) : null,
    h('section', { class: 'card', 'aria-label': 'Export' },
      h('h3', {}, 'Als Datei sichern'),
      h('p', { class: 'mut small' }, trainingFileName(S.file.plan.name)),
      h('p', { class: 'mut small' }, 'Im Teilen-Menü „In Dateien sichern“ wählen, bei Rückfrage „Ersetzen“.'),
      d.exported ? h('p', { class: 'tag' }, 'Gesichert') : null,
      h('button', { class: d.exported ? 'btn ghost' : 'btn', 'data-fid': 'export', onclick: async () => { if (await doExport()) { d.exported = true; render(); } } }, d.exported ? 'Nochmal sichern' : 'Als Datei sichern')),
    h('button', { class: 'btn ghost', 'data-fid': 'done-garmin', onclick: () => doGarminExport(d.sessionId) }, 'Für Garmin exportieren'),
    h('button', { class: 'btn ghost', onclick: () => { S.done = null; go('home'); } }, 'Zur Übersicht'),
  ];
}

// ---------- Export ----------

/** Liefert eine Fehlermeldung, wenn der Stand den eigenen Validator nicht bestehen würde. */
function checkReimport(file) {
  try {
    validateTrainingFile(JSON.parse(JSON.stringify(file)));
    return null;
  } catch (e) {
    if (e instanceof ValidationError) return e.errors.slice(0, 2).join('; ');
    throw e;
  }
}

async function doExport() {
  const problem = checkReimport(S.file);
  if (problem) {
    showToast(`Export nicht möglich, die Datei wäre nicht wieder einlesbar: ${problem}`, null, 10000);
    return false;
  }
  try {
    const res = await exportTrainingFile(S.file);
    if (!res.ok) {
      if (res.aborted) showToast('Nicht gesichert: Teilen abgebrochen.');
      return false;
    }
    const rec = { revision: S.file.revision, at: new Date().toISOString(), method: res.method };
    await store.setLastExport(S.file.fileId, rec);
    S.lastExport = rec;
    showToast(res.method === 'share' ? 'Gesichert.' : 'Datei heruntergeladen. Bitte prüfen, ob sie in „Dateien“ bzw. im Download-Ordner liegt.', null, res.method === 'share' ? 4000 : 7000);
    return true;
  } catch (e) {
    console.error(e);
    showToast('Export fehlgeschlagen. Bitte erneut versuchen.');
    return false;
  }
}

async function doGarminExport(sessionId) {
  const s = S.file.sessions.find((x) => x.id === sessionId);
  if (!s) return;
  try {
    const blob = new Blob([sessionToFit(S.file.plan, s)], { type: 'application/vnd.ant.fit' });
    const res = await shareOrDownload(blob, garminFileName(s), 'application/vnd.ant.fit');
    if (!res.ok) {
      if (res.aborted) showToast('Garmin-Export abgebrochen.');
      return;
    }
    showToast(res.method === 'share' ? 'FIT-Datei geteilt. In Garmin Connect importieren.' : 'FIT-Datei heruntergeladen. In Garmin Connect importieren.');
  } catch (e) {
    console.error(e);
    showToast(e instanceof RangeError
      ? 'Garmin-Export nicht möglich: Die Sätze dieses Trainings liegen zu weit auseinander (über 49 Tage).'
      : 'Garmin-Export fehlgeschlagen.', null, 7000);
  }
}

// ---------- Rendern ----------

const SCREENS = {
  empty: emptyScreen,
  home: homeScreen,
  hist: histScreen,
  plan: () => planView(S.file, PA),
  live: () => liveView(S.live, currentView(), A, { undo: S.undo, ready: Date.now() < S.readyUntil, hold: S.hold, warmupOpen: S.warmupOpen === S.live.session.id }),
  done: doneScreen,
  info: () => infoScreen(closeInfo),
};

/** Wenn ein Bildschirm nicht gezeichnet werden kann: sichern, verwerfen oder neu laden statt leerer Seite. */
function emergencyView() {
  return [h('div', { class: 'hero' },
    h('h1', {}, 'Etwas ist schiefgelaufen'),
    h('p', { class: 'mut' }, 'Dieser Bildschirm lässt sich nicht anzeigen. Sichere zuerst deinen Trainingsstand als Datei.'),
    S.file ? h('button', { class: 'btn', onclick: () => doExport() }, 'Trainingsstand als Datei sichern') : null,
    S.live ? h('button', { class: 'btn danger', onclick: async () => { S.live = null; await queueSave(() => store.clearLive()); go('home'); } }, 'Laufendes Training verwerfen') : null,
    h('button', { class: 'btn ghost', onclick: () => location.reload() }, 'Neu laden'))];
}

function render() {
  tapRenderPending = false;
  softRenderPending = false;
  applyTheme();
  if (!S.ready) return;
  if (S.fatal) {
    root.replaceChildren(h('div', { class: 'hero' }, h('h1', {}, 'Speicher nicht verfügbar'), h('p', { class: 'mut' }, S.fatal)));
    return;
  }
  const active = document.activeElement;
  const focusId = active && active !== document.body ? active.dataset?.fid : lastFid;
  // Falls doch während des Tippens neu gezeichnet wird: Text und Cursor ins neue Feld übernehmen.
  const typed = isEditing() && active.dataset?.fid ? { value: active.value, start: active.selectionStart, end: active.selectionEnd } : null;
  const screen = S.screen === 'live' && !S.live ? 'home' : S.screen;
  let body;
  try {
    body = SCREENS[screen]();
  } catch (e) {
    console.error(e);
    root.replaceChildren(...emergencyView());
    return;
  }
  const nodes = [screen === 'info' ? null : menuButton(), body];
  // Info-Link auf jedem Bildschirm außer im laufenden Training (dort über das Menü, damit der Fokus-Modus ohne Scrollen passt).
  if (screen !== 'live' && screen !== 'info') nodes.push(footerLink());
  if (['home', 'hist', 'plan'].includes(screen)) nodes.push(tabs());
  if (S.sheet) nodes.push(S.sheet());
  if (S.toast) nodes.push(toastNode());
  root.replaceChildren(...nodes.flat(Infinity).filter(Boolean));
  const target = focusId ? root.querySelector(`[data-fid="${CSS.escape(focusId)}"]`) : null;
  if (target && typed && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
    target.value = typed.value;
    try { target.setSelectionRange(typed.start, typed.end); } catch { /* nicht jedes Feld kennt eine Auswahl */ }
  }
  if (target && !(target.tagName === 'SELECT' && lastPointerType === 'touch')) target.focus({ preventScroll: true });
  scrollToActiveSetOnce(screen);
}

/** Nach dem Wechsel von Fokus zu Liste: aktuellen Satz (oder „Alle Sätze erledigt“) in die Mitte holen, sobald kein Sheet mehr offen ist. */
function scrollToActiveSetOnce(screen) {
  if (!S.scrollToActive || S.sheet) return;
  S.scrollToActive = false;
  if (screen !== 'live' || currentView() !== 'list') return;
  const el = root.querySelector('.row.act, .ss-cell.act') ?? root.querySelector('[data-fid="all-done"]');
  el?.scrollIntoView({ block: 'center' });
}

// Timer: nur die Anzeige aktualisieren, nicht neu rendern.
let restExpiredNotified = false;
// Signale beim Halten nur, wenn der Wechsel gerade erst war (nicht nach der Rückkehr in die App lange danach).
const HOLD_SIGNAL_MS = 3000;

function tickHold() {
  const hd = S.hold;
  if (!hd) return;
  const set = S.live?.session.id === hd.liveId ? S.live.session.blocks[hd.i]?.sets[hd.s] : null;
  const act = S.live ? activeSlot(S.live) : null;
  // Satz nicht mehr offen oder nicht mehr dran (z. B. übersprungen): Countdown verwerfen.
  if (!set || set.done || !act || act.i !== hd.i || act.s !== hd.s) {
    S.hold = null;
    softRender();
    return;
  }
  const now = Date.now();
  const ph = holdPhase(hd, now);
  if (ph.index !== hd.index) {
    hd.index = ph.index;
    if (now - ph.phaseStartedAt < HOLD_SIGNAL_MS) {
      if (ph.phase === 'hold') signal('start', 150);
      else signal('stop', 300);
    }
    announce(ph.finished ? 'Geschafft' : holdLabel(ph));
  }
  if (ph.finished) {
    // Wie ein Tap auf den Haken (Pause und Rückgängig inklusive), mit der gehaltenen Zeit und dem Endzeitpunkt.
    S.hold = null;
    S.live = updateSet(S.live, hd.i, hd.s, { sec: hd.sec });
    lastToggleAt = 0;
    A.toggle(hd.i, hd.s, new Date(ph.endsAt));
    return;
  }
  const t = document.getElementById('hold-time');
  if (t) t.textContent = fmtClock(ph.remaining);
  const p = document.getElementById('hold-phase');
  const label = holdLabel(ph);
  if (p && p.textContent !== label) p.textContent = label;
}

setInterval(() => {
  tickHold();
  if (S.screen !== 'live' || !S.live?.rest) return;
  const rem = restRemaining(S.live);
  const el = document.getElementById('rest-time');
  if (el) el.textContent = fmtClock(rem);
  if (rem === 0 && !restExpiredNotified) {
    restExpiredNotified = true;
    // „Los!“ bis 60 s nach dem echten Pausenende, auch wenn die App erst später wieder sichtbar wird.
    S.readyUntil = S.live.rest.endsAt + 60_000;
    if (Date.now() < S.readyUntil) {
      signal('rest', 200);
      announce('Pause vorbei');
      setTimeout(() => { if (S.screen === 'live') softRender(); }, S.readyUntil - Date.now() + 500);
    }
    setLive(clearRest(S.live), { quiet: true });
    softRender();
  }
}, 250);

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden' && S.live) saveLiveNow();
  if (document.visibilityState === 'visible') softRender();
});

matchMedia('(prefers-color-scheme: light)').addEventListener?.('change', () => render());

async function boot() {
  applyTheme();
  store.requestPersistence();
  try {
    const st = await store.loadState();
    S.file = st.file;
    S.live = st.live;
    // Gespeicherten Stand wie einen Import prüfen (beschädigt, manipuliert oder aus einer anderen Version).
    if (S.file) {
      try {
        // Doppelte Trainings (Folge eines früheren Fehlers) nicht den ganzen Stand kosten lassen.
        const fixed = dropDuplicateSessions(S.file);
        S.file = validateTrainingFile(fixed.file);
        if (fixed.dropped) {
          await queueSave(() => store.saveFile(S.file));
          S.loadProblem = `${fixed.dropped === 1 ? 'Ein Training war' : `${fixed.dropped} Trainings waren`} doppelt gespeichert und ${fixed.dropped === 1 ? 'wurde' : 'wurden'} zusammengeführt.`;
        }
      } catch (e) {
        console.error(e);
        S.file = null;
        S.live = null;
        S.lastExport = null;
        S.loadProblem = 'Der gespeicherte Trainingsstand ist beschädigt und wurde nicht geladen. Bitte die letzte .training.json über „Plan öffnen“ einlesen.';
      }
    }
    // Laufendes Training ebenfalls prüfen. Ist es kaputt, wird es verworfen statt die App zu blockieren.
    if (S.file && st.live && isAlreadyFinished(S.file, st.live)) {
      // Rest eines schon beendeten Trainings (z. B. Speichern beim Beenden fehlgeschlagen): still verwerfen.
      S.live = null;
      await queueSave(() => store.clearLive());
    } else if (S.file && st.live) {
      try {
        S.live = restoreLive(S.file, st.live, validateSession);
      } catch (e) {
        console.error(e);
        S.live = null;
      }
      if (!S.live) {
        await queueSave(() => store.clearLive());
        S.loadProblem = 'Das gespeicherte laufende Training war beschädigt oder passt nicht mehr zum Plan und wurde verworfen. Der Trainingsstand ist unverändert.';
      }
    } else S.live = null;
    S.lastExport = S.file ? st.lastExport : null;
    S.screen = S.file ? (S.live ? 'live' : 'home') : 'empty';
    if (S.live) document.addEventListener('pointerdown', () => { if (S.live) keepAwake(true); }, { once: true });
    if (location.hash === '#info') {
      S.infoReturn = S.screen;
      S.screen = 'info';
    }
  } catch (e) {
    console.error(e);
    S.fatal = 'Der Browserspeicher ist nicht verfügbar (z. B. im privaten Modus). Bitte die App normal öffnen.';
  }
  S.ready = true;
  render();
  if (S.loadProblem) showToast(S.loadProblem, null, 15000);
  else if (!window.isSecureContext) {
    // z. B. im WLAN über http://<IP> geöffnet: Service Worker, Wake Lock und Teilen-Menü fehlen dann.
    showToast('Ohne https (oder localhost) laufen Offline-Modus, Bildschirm-an und Teilen nicht. Sichern geht dann nur als Download, und jedes Mal entsteht eine neue Datei (z. B. „… (1)“). Die App funktioniert sonst normal.', null, 15000);
  }
  if (S.file && !S.live) {
    const st = backupStatus(S.file, S.lastExport);
    if (st.remind) {
      const text = backupText(st) ?? 'Noch nicht als Datei gesichert.';
      showToast(text, { label: 'Sichern', run: () => doExport() }, 7000);
    }
  }
}

boot();

// ---------- Service Worker (offline, Updates) ----------

let pendingUpdate = null;
let offerPendingUpdate = () => {};

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  // Trusted Types (CSP): einzige erlaubte Skript-URL ist der eigene Service Worker.
  const tt = window.trustedTypes?.createPolicy('sw', {
    createScriptURL: (u) => {
      if (u !== './sw.js') throw new TypeError('Skript-URL nicht erlaubt');
      return u;
    },
  });
  navigator.serviceWorker.register(tt ? tt.createScriptURL('./sw.js') : './sw.js', { scope: './' }).then((reg) => {
    // Nicht mitten im Training anbieten (der Hinweis liegt oben über „Beenden“ und Menü). Danach wird erneut angeboten.
    const offer = (worker) => {
      if (S.live) {
        pendingUpdate = worker;
        return;
      }
      showToast('Neue Version verfügbar.', { label: 'Aktualisieren', run: () => worker.postMessage('SKIP_WAITING') }, 20000);
    };
    offerPendingUpdate = () => { if (pendingUpdate && !S.live) { const w = pendingUpdate; pendingUpdate = null; offer(w); } };
    if (reg.waiting && navigator.serviceWorker.controller) offer(reg.waiting);
    reg.addEventListener('updatefound', () => {
      const w = reg.installing;
      w?.addEventListener('statechange', () => {
        if (w.state === 'installed' && navigator.serviceWorker.controller) offer(w);
      });
    });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') reg.update().catch(() => {});
    });
  }).catch((e) => console.warn('Service Worker nicht registriert', e));
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', async () => {
    if (reloading) return;
    reloading = true;
    await saveLiveNow();
    location.reload();
  });
}
