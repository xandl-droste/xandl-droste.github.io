import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shareOrDownload } from '../training/src/export.js';

test('Teilen: nur die Datei, kein title/text (iOS legt sonst eine zusätzliche Textdatei an)', async () => {
  const calls = [];
  const fake = { canShare: () => true, share: async (data) => { calls.push(data); } };
  // navigator ist in Node ein Getter auf globalThis: ersetzen und danach wiederherstellen.
  const orig = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  Object.defineProperty(globalThis, 'navigator', { value: fake, configurable: true });
  try {
    const res = await shareOrDownload(new Blob(['x']), 'training-2026-11-19.fit', 'application/vnd.ant.fit');
    assert.deepEqual(res, { ok: true, method: 'share' });
    assert.equal(calls.length, 1);
    assert.deepEqual(Object.keys(calls[0]), ['files']);
    assert.equal(calls[0].files[0].name, 'training-2026-11-19.fit');
  } finally {
    if (orig) Object.defineProperty(globalThis, 'navigator', orig);
    else delete globalThis.navigator;
  }
});
