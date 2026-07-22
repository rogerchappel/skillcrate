import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { packSkill, packSkillToFile, parseManifest, SkillManifest, unpackSkill, unpackSkillFromFile } from '../src/index.js';

function manifestWithFile(filePath: string, content: string): SkillManifest {
  return {
    schemaVersion: 'skillcrate/v1',
    metadata: {
      name: 'unpack-test',
      version: '1.0.0',
      description: 'Unpack security test fixture'
    },
    files: [{
      path: filePath,
      content,
      bytes: Buffer.byteLength(content),
      sha256: createHash('sha256').update(content).digest('hex')
    }]
  };
}

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

test('unpacks ordinary nested files beneath the output directory', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'skillcrate-'));
  try {
    const output = path.join(dir, 'out');
    await unpackSkill(manifestWithFile('nested/deeper/file.txt', 'safe'), output);
    assert.equal(await readFile(path.join(output, 'nested/deeper/file.txt'), 'utf8'), 'safe');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('refuses to unpack through a symlinked destination directory', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'skillcrate-'));
  try {
    const output = path.join(dir, 'out');
    const outside = path.join(dir, 'outside');
    await mkdir(output);
    await mkdir(outside);
    await symlink(outside, path.join(output, 'link'), 'dir');

    await assert.rejects(
      unpackSkill(manifestWithFile('link/pwned.txt', 'escaped'), output),
      (error: unknown) => error instanceof Error && 'code' in error && error.code === 'UNSAFE_PATH'
    );
    await assert.rejects(readFile(path.join(outside, 'pwned.txt'), 'utf8'), { code: 'ENOENT' });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('refuses to replace a symlinked destination file', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'skillcrate-'));
  try {
    const output = path.join(dir, 'out');
    const outside = path.join(dir, 'outside.txt');
    await mkdir(output);
    await writeFile(outside, 'original');
    await symlink(outside, path.join(output, 'file.txt'), 'file');

    await assert.rejects(
      unpackSkill(manifestWithFile('file.txt', 'escaped'), output),
      (error: unknown) => error instanceof Error && 'code' in error && error.code === 'UNSAFE_PATH'
    );
    assert.equal(await readFile(outside, 'utf8'), 'original');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('rejects duplicate and conflicting archive destinations before unpacking', () => {
  const first = manifestWithFile('nested/../file.txt', 'first');
  const duplicate = manifestWithFile('file.txt', 'second').files[0];
  assert.throws(
    () => parseManifest(JSON.stringify({ ...first, files: [...first.files, duplicate] })),
    (error: unknown) => error instanceof Error && 'code' in error && error.code === 'INVALID_MANIFEST'
  );

  const parent = manifestWithFile('nested', 'parent');
  const child = manifestWithFile('nested/file.txt', 'child').files[0];
  assert.throws(
    () => parseManifest(JSON.stringify({ ...parent, files: [...parent.files, child] })),
    (error: unknown) => error instanceof Error && 'code' in error && error.code === 'INVALID_MANIFEST'
  );
});
