import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { packSkillToFile, verifyCrateFile } from '../src/index.js';

test('verifies an intact crate without unpacking files', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'skillcrate-verify-'));
  try {
    const crate = path.join(dir, 'hello.skillcrate.json');
    await packSkillToFile('examples/fixtures/hello-skill', crate);
    const result = await verifyCrateFile(crate);

    assert.equal(result.ok, true);
    assert.equal(result.manifest.metadata.name, 'hello-agent-skill');
    assert.equal(result.digestMismatches.length, 0);
    assert.ok(result.bytes > 0);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('reports digest mismatches for tampered crates', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'skillcrate-tamper-'));
  try {
    const crate = path.join(dir, 'hello.skillcrate.json');
    await packSkillToFile('examples/fixtures/hello-skill', crate);
    const raw = JSON.parse(await readFile(crate, 'utf8')) as { files: Array<{ path: string; content: string }> };
    const skill = raw.files.find((file) => file.path === 'SKILL.md');
    assert.ok(skill);
    skill.content += '\nTampered after packing.\n';
    await writeFile(crate, `${JSON.stringify(raw, null, 2)}\n`);

    const result = await verifyCrateFile(crate);
    assert.equal(result.ok, false);
    assert.deepEqual(result.digestMismatches, ['SKILL.md']);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
