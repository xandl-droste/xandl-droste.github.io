// Erzeugt Precache-Liste und Version (Inhalts-Hash) in training/sw.js.
// Aufruf: npm run sw   (nach jeder Änderung an Dateien unter training/)
// Mit --check wird nur geprüft (für Tests), ob sw.js aktuell ist.

import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../training/', import.meta.url));
const SW = join(ROOT, 'sw.js');
const SKIP = new Set(['sw.js']);

function walk(dir) {
  return readdirSync(dir).sort().flatMap((name) => {
    const p = join(dir, name);
    if (name.startsWith('.')) return [];
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

export function expectedSw() {
  const files = walk(ROOT).map((p) => relative(ROOT, p).split(sep).join('/')).filter((p) => !SKIP.has(p));
  const hash = createHash('sha256');
  for (const f of files) {
    hash.update(f);
    hash.update(readFileSync(join(ROOT, f)));
  }
  const version = hash.digest('hex').slice(0, 12);
  const list = ['./', ...files.map((f) => `./${f}`)];
  // SHA-256 je Datei: Der Service Worker liefert nur Inhalte aus, die genau diesem Stand entsprechen.
  const sha = (f) => createHash('sha256').update(readFileSync(join(ROOT, f))).digest('hex');
  const hashes = [['./', sha('index.html')], ...files.map((f) => [`./${f}`, sha(f)])];
  const src = readFileSync(SW, 'utf8')
    .replace(/const VERSION = '[^']*';/, `const VERSION = '${version}';`)
    .replace(/const PRECACHE = \[[^\]]*\];/s, `const PRECACHE = [\n${list.map((f) => `  '${f}',`).join('\n')}\n];`)
    .replace(/const HASHES = \{[^}]*\};/s, `const HASHES = {\n${hashes.map(([f, h]) => `  '${f}': '${h}',`).join('\n')}\n};`);
  return { src, version, files: list };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { src, version, files } = expectedSw();
  const current = readFileSync(SW, 'utf8');
  if (process.argv.includes('--check')) {
    if (current !== src) {
      console.error('training/sw.js ist nicht aktuell. Bitte `npm run sw` ausführen.');
      process.exit(1);
    }
    console.log(`sw.js aktuell (${version}, ${files.length} Dateien)`);
  } else {
    writeFileSync(SW, src);
    console.log(`sw.js aktualisiert: Version ${version}, ${files.length} Dateien`);
  }
}
