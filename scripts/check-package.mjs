import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

const output = execFileSync('npm', ['pack', '--json', '--dry-run'], { encoding: 'utf8' });
const [{ files }] = JSON.parse(output);
const paths = files.map((file) => file.path);

assert.ok(paths.includes('dist/src/cli.js'), 'package must contain the CLI entry point');
assert.ok(paths.includes('dist/src/index.d.ts'), 'package must contain declarations');
assert.ok(paths.includes('examples/fixtures/hello-skill/SKILL.md'), 'package must contain examples');
assert.ok(!paths.some((file) => file.startsWith('dist/test/')), 'package must not contain compiled test artifacts');
console.log(`Verified ${paths.length} package files with no dist/test artifacts.`);
