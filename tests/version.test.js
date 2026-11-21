import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { expectedVersionFile } from '../scripts/update-sw.mjs';
import { SCHEMA_VERSION } from '../training/src/model/validate.js';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

test('Version: package.json hat MAJOR.MINOR.PATCH', () => {
  assert.match(pkg.version, /^\d+\.\d+\.\d+$/);
});

test('Version: Major-Version entspricht SCHEMA_VERSION (Formatwechsel = neue Major-Version)', () => {
  const major = Number(pkg.version.split('.')[0]);
  assert.equal(major, SCHEMA_VERSION,
    `package.json ${pkg.version} passt nicht zu SCHEMA_VERSION ${SCHEMA_VERSION}. Ein Formatwechsel braucht eine neue Major-Version und umgekehrt.`);
});

test('Version: training/src/version.js ist aktuell (sonst `npm run sw`)', () => {
  const current = readFileSync(new URL('../training/src/version.js', import.meta.url), 'utf8');
  assert.equal(current, expectedVersionFile(), 'training/src/version.js ist veraltet: bitte `npm run sw` ausführen');
});
