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

test('repeatedly packs to an in-tree output without including that output', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'skillcrate-in-tree-'));
  try {
    const skill = path.join(dir, 'skill');
    await mkdir(skill);
    await writeFile(path.join(skill, 'skillcrate.json'), JSON.stringify({
      name: 'in-tree-output', version: '1.0.0', description: 'In-tree output fixture'
    }));
    await writeFile(path.join(skill, 'SKILL.md'), '# In-tree output\n');
    await writeFile(path.join(skill, 'archive.skillcrate.json.bak'), 'legitimate source file\n');
    const crate = path.join(skill, 'archive.skillcrate.json');

    const first = await packSkillToFile(skill, crate);
    const firstBytes = await readFile(crate);
    const second = await packSkillToFile(skill, crate);
    const secondBytes = await readFile(crate);

    assert.deepEqual(second, first);
    assert.deepEqual(secondBytes, firstBytes);
    assert.ok(second.files.some((file) => file.path === 'archive.skillcrate.json.bak'));
    assert.ok(!second.files.some((file) => file.path === 'archive.skillcrate.json'));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('round-trips binary assets byte-for-byte', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'skillcrate-binary-'));
  const fixture = Buffer.from([0x00, 0xff, 0x80, 0x50, 0x4e, 0x47, 0x0d, 0x0a]);
  try {
    const skill = path.join(dir, 'skill');
    await mkdir(skill);
    await writeFile(path.join(skill, 'skillcrate.json'), JSON.stringify({
      name: 'binary-fixture', version: '1.0.0', description: 'Binary round-trip fixture'
    }));
    await writeFile(path.join(skill, 'SKILL.md'), '# Binary fixture\n');
    await writeFile(path.join(skill, 'asset.bin'), fixture);

    const crate = path.join(dir, 'binary.skillcrate.json');
    const manifest = await packSkillToFile(skill, crate);
    const asset = manifest.files.find((file) => file.path === 'asset.bin');
    assert.deepEqual(asset, {
      path: 'asset.bin',
      content: fixture.toString('base64'),
      encoding: 'base64',
      bytes: fixture.byteLength,
      sha256: createHash('sha256').update(fixture).digest('hex')
    });

    const output = path.join(dir, 'out');
    await unpackSkillFromFile(crate, output);
    assert.deepEqual(await readFile(path.join(output, 'asset.bin')), fixture);
    assert.equal(await readFile(path.join(output, 'SKILL.md'), 'utf8'), '# Binary fixture\n');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('rejects malformed and unknown file encodings', () => {
  const manifest = manifestWithFile('asset.bin', 'AAAA');
  assert.throws(
    () => parseManifest(JSON.stringify({ ...manifest, files: [{ ...manifest.files[0], encoding: 'hex' }] })),
    /Unsupported file content encoding: hex/
  );
  assert.throws(
    () => parseManifest(JSON.stringify({ ...manifest, files: [{ ...manifest.files[0], encoding: 'base64', content: 'not base64!' }] })),
    /Manifest file content is not valid base64/
  );
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
