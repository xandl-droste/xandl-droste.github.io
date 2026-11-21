import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { expectedSw } from '../scripts/update-sw.mjs';

test('Service Worker: Precache-Liste und Version sind aktuell (sonst `npm run sw`)', () => {
  const current = readFileSync(new URL('../training/sw.js', import.meta.url), 'utf8');
  const { src } = expectedSw();
  assert.equal(current, src, 'training/sw.js ist veraltet: bitte `npm run sw` ausführen');
});

test('Service Worker: nur eigene Origin, eigener Cache-Präfix, kein clients.claim', () => {
  const sw = readFileSync(new URL('../training/sw.js', import.meta.url), 'utf8');
  assert.match(sw, /url\.origin !== self\.location\.origin\) return;/);
  assert.match(sw, /const PREFIX = 'training-pwa-';/);
  assert.doesNotMatch(sw, /clients\.claim/);
  assert.doesNotMatch(sw, /plans\//, 'kein mitgelieferter Plan im Precache');
  for (const f of ['./index.html', './src/app.js', './css/app.css', './manifest.webmanifest']) {
    assert.ok(sw.includes(`'${f}'`), `${f} fehlt im Precache`);
  }
});

test('Manifest: relative Pfade, standalone, Icons', () => {
  const m = JSON.parse(readFileSync(new URL('../training/manifest.webmanifest', import.meta.url), 'utf8'));
  assert.equal(m.start_url, './');
  assert.equal(m.scope, './');
  assert.equal(m.display, 'standalone');
  assert.ok(m.icons.every((i) => !i.src.startsWith('/') && !/^https?:/.test(i.src)));
  assert.ok(m.icons.some((i) => i.purpose === 'maskable'));
});
