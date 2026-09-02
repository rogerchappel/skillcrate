import test from 'node:test';
import assert from 'node:assert/strict';
import { assertReleaseIdentity, versionFromTag } from './verify-release.mjs';

test('release tag must exactly match the package version', () => {
  assert.equal(versionFromTag('v1.2.3'), '1.2.3');
  assert.deepEqual(assertReleaseIdentity('v1.2.3', { name: 'fixture', version: '1.2.3' }), { name: 'fixture', version: '1.2.3' });
  assert.throws(() => assertReleaseIdentity('v1.2.4', { name: 'fixture', version: '1.2.3' }), /does not match/);
  assert.throws(() => versionFromTag('1.2.3'), /must be v<semver>/);
});
