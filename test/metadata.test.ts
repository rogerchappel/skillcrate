import assert from 'node:assert/strict';
import test from 'node:test';
import { readMetadata, validateMetadata } from '../src/index.js';

test('reads skillcrate metadata from a fixture', async () => {
  const metadata = await readMetadata('examples/fixtures/hello-skill');
  assert.equal(metadata.name, 'hello-agent-skill');
  assert.equal(metadata.entry, 'SKILL.md');
  assert.ok(metadata.targets?.includes('claude-code'));
});

test('rejects invalid metadata', () => {
  assert.throws(() => validateMetadata({ name: '', version: '1.0.0', description: 'x' }), /metadata.name/);
});
