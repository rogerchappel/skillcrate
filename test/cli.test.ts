import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

function cli(...args: string[]) {
  return spawnSync(process.execPath, ['dist/src/cli.js', ...args], { encoding: 'utf8' });
}

test('accepts valid command forms and defaults check target to generic', () => {
  const inspect = cli('inspect', 'examples/fixtures/hello-skill');
  assert.equal(inspect.status, 0);
  assert.match(inspect.stdout, /hello-agent-skill/);

  const check = cli('check', 'examples/fixtures/hello-skill');
  assert.equal(check.status, 0);
  assert.equal(JSON.parse(check.stdout).target, 'generic');
});

test('returns usage exit 2 for invalid command forms', () => {
  const cases: Array<[string[], RegExp]> = [
    [[], /missing command/],
    [['inspect'], /expected 1 argument/],
    [['inspect', 'examples/fixtures/hello-skill', 'extra'], /received 2/],
    [['inspect', 'examples/fixtures/hello-skill', '--bogus'], /unknown option --bogus/],
    [['check', 'examples/fixtures/hello-skill', '--target'], /requires a value/],
    [['check', 'examples/fixtures/hello-skill', '--target', 'nonsense'], /unsupported target nonsense/],
    [['check', 'examples/fixtures/hello-skill', '--bogus'], /unknown option --bogus/],
    [['unknown'], /unknown command unknown/]
  ];
  for (const [args, diagnostic] of cases) {
    const result = cli(...args);
    assert.equal(result.status, 2, args.join(' '));
    assert.match(result.stderr, diagnostic);
    assert.match(result.stderr, /Usage:/);
  }
});
