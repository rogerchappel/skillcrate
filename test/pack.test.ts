import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { packSkill, packSkillToFile, unpackSkillFromFile } from '../src/index.js';

test('packs a skill with checksummed files', async () => {
  const manifest = await packSkill('examples/fixtures/hello-skill');
  assert.equal(manifest.schemaVersion, 'skillcrate/v1');
  assert.ok(manifest.files.find((file) => file.path === 'SKILL.md'));
  assert.ok(manifest.files.every((file) => file.sha256.length === 64));
});

test('round-trips a packed skill', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'skillcrate-'));
  try {
    const crate = path.join(dir, 'hello.skillcrate.json');
    await packSkillToFile('examples/fixtures/hello-skill', crate);
    const manifest = await unpackSkillFromFile(crate, path.join(dir, 'out'));
    assert.equal(manifest.metadata.name, 'hello-agent-skill');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
