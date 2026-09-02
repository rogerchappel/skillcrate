import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

export function versionFromTag(tag) {
  assert.match(tag ?? '', /^v\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/, `release tag must be v<semver>; received ${JSON.stringify(tag)}`);
  return tag.slice(1);
}

export function assertReleaseIdentity(tag, manifest = packageJson) {
  const version = versionFromTag(tag);
  assert.equal(version, manifest.version, `tag ${tag} does not match package.json version ${manifest.version}`);
  return { name: manifest.name, version };
}

function npmJson(args) {
  return JSON.parse(execFileSync('npm', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }));
}

function verifyInstalledCli(spec, name, version) {
  const root = mkdtempSync(path.join(tmpdir(), 'skillcrate-release-'));
  try {
    execFileSync('npm', ['install', '--prefix', root, '--ignore-scripts', '--no-audit', '--no-fund', spec], { stdio: 'inherit' });
    const installed = JSON.parse(readFileSync(path.join(root, 'node_modules', name, 'package.json'), 'utf8'));
    assert.equal(installed.version, version, `installed ${name}@${installed.version}; expected ${name}@${version}`);
    const cli = path.join(root, 'node_modules', '.bin', process.platform === 'win32' ? 'skillcrate.cmd' : 'skillcrate');
    execFileSync(cli, ['--help'], { stdio: 'inherit' });
    console.log(`Verified installed CLI for ${name}@${version}.`);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

export function verifyTarball(tarball, tag) {
  const { name, version } = assertReleaseIdentity(tag);
  verifyInstalledCli(path.resolve(tarball), name, version);
}

export async function verifyRegistry(tag, options = {}) {
  const { name, version } = assertReleaseIdentity(tag);
  const attempts = Number(options.attempts ?? process.env.NPM_VERIFY_ATTEMPTS ?? 12);
  const delayMs = Number(options.delayMs ?? process.env.NPM_VERIFY_DELAY_MS ?? 10_000);
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const visible = npmJson(['view', `${name}@${version}`, 'version', '--json', '--registry=https://registry.npmjs.org']);
      assert.equal(visible, version, `public registry returned ${JSON.stringify(visible)} for ${name}@${version}`);
      verifyInstalledCli(`${name}@${version}`, name, version);
      return;
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw new Error(`npm did not expose an installable ${name}@${version} after ${attempts} attempts. Confirm npm Trusted Publishing, inspect the publish log, then rerun the tag workflow. Last error: ${lastError?.message}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [mode, value, tag] = process.argv.slice(2);
  if (mode === '--tarball') verifyTarball(value, tag);
  else if (mode === '--registry') await verifyRegistry(value);
  else throw new Error('usage: node scripts/verify-release.mjs --tarball <file> <vX.Y.Z> | --registry <vX.Y.Z>');
}
