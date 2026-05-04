import assert from 'node:assert/strict';
import test from 'node:test';
import { buildRegistry, checkCompatibility } from '../src/index.js';

test('builds a deterministic registry index from fixture folders', async () => {
  const registry = await buildRegistry('examples/fixtures', '2026-05-05T00:00:00.000Z');
  assert.equal(registry.schemaVersion, 'skillcrate-registry/v1');
  assert.deepEqual(registry.entries.map((entry) => entry.name), ['careful-code-review', 'hello-agent-skill']);
});

test('reports compatibility warnings and errors', async () => {
  const ok = await checkCompatibility('examples/fixtures/hello-skill', 'claude-code');
  assert.equal(ok.ok, true);
  const broken = await checkCompatibility('examples/fixtures/broken-skill', 'claude-code');
  assert.equal(broken.ok, false);
  assert.ok(broken.issues.some((issue) => issue.code === 'missing-entry'));
});
