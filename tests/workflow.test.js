import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const wf = readFileSync(new URL('../.github/workflows/pages.yml', import.meta.url), 'utf8');

test('Pages-Workflow: Actions per Commit-SHA gepinnt', () => {
  const uses = [...wf.matchAll(/uses:\s*(\S+)/g)].map((m) => m[1]);
  assert.ok(uses.length >= 3);
  for (const u of uses) assert.match(u, /^actions\/[a-z-]+@[0-9a-f]{40}$/, u);
});

test('Pages-Workflow: minimale Rechte, Schreibrechte nur im Deploy-Job', () => {
  assert.match(wf, /^permissions:\n {2}contents: read\n/m);
  assert.equal((wf.match(/pages: write/g) ?? []).length, 1);
  assert.match(wf, /persist-credentials: false/);
});

test('Pages-Workflow: liefert nur die App aus', () => {
  const copies = [...wf.matchAll(/^\s+cp .*$/gm)].map((m) => m[0].trim());
  assert.deepEqual(copies, ['cp index.html root.css _site/', 'cp -R training _site/training']);
  assert.match(wf, /path: _site\n/);
});
