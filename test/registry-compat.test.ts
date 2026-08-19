import assert from 'node:assert/strict';
import { cp, mkdtemp, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { buildRegistry, checkCompatibility } from '../src/index.js';

test('builds a deterministic registry index from fixture folders', async () => {
  const registry = await buildRegistry('examples/fixtures', '2026-05-05T00:00:00.000Z');
  assert.equal(registry.schemaVersion, 'skillcrate-registry/v1');
  assert.deepEqual(registry.entries.map((entry) => entry.name), ['careful-code-review', 'hello-agent-skill']);
});

test('indexes only the canonical metadata marker in each skill directory', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'skillcrate-registry-'));
  const skill = path.join(root, 'hello-skill');
  await cp('examples/fixtures/hello-skill', skill, { recursive: true });
  await writeFile(path.join(skill, 'backup.skillcrate.json'), '{}\n');

  const registry = await buildRegistry(root, '2026-05-05T00:00:00.000Z');

  assert.deepEqual(registry.entries.map(({ name, cratePath }) => ({ name, cratePath })), [
    { name: 'hello-agent-skill', cratePath: 'hello-skill' },
  ]);
});

test('reports compatibility warnings and errors', async () => {
  const ok = await checkCompatibility('examples/fixtures/hello-skill', 'claude-code');
  assert.equal(ok.ok, true);
  const broken = await checkCompatibility('examples/fixtures/broken-skill', 'claude-code');
  assert.equal(broken.ok, false);
  assert.ok(broken.issues.some((issue) => issue.code === 'missing-entry'));
});
