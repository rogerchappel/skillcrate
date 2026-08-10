import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
assert.deepEqual(
  packageJson.publishConfig,
  { access: 'public', provenance: true },
  'package must publish publicly with npm provenance',
);

const tarball = process.argv[2];
const npmArgs = tarball
  ? ['publish', '--json', '--dry-run', tarball]
  : ['pack', '--json', '--dry-run'];
const output = execFileSync('npm', npmArgs, { encoding: 'utf8' });
const result = JSON.parse(output);
const packageResult = Array.isArray(result)
  ? result[0]
  : result.files
    ? result
    : Object.values(result)[0];
const { files } = packageResult;
const paths = files.map((file) => file.path);

assert.ok(paths.includes('dist/src/cli.js'), 'package must contain the CLI entry point');
assert.ok(paths.includes('dist/src/index.d.ts'), 'package must contain declarations');
assert.ok(paths.includes('examples/fixtures/hello-skill/SKILL.md'), 'package must contain examples');
assert.ok(!paths.some((file) => file.startsWith('dist/test/')), 'package must not contain compiled test artifacts');
console.log(
  `Verified ${paths.length} package files with no dist/test artifacts${tarball ? ` in ${tarball}` : ''}.`,
);
