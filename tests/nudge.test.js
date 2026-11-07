const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const script = path.join(__dirname, '..', 'skills', 'token-frugal', 'scripts', 'nudge.js');

function run(cwd, data) {
  const env = { ...process.env, TOKEN_FRUGAL_DATA: data };
  // A fresh docs stamp stops the weekly refresh from fetching during tests.
  fs.mkdirSync(data, { recursive: true });
  fs.writeFileSync(path.join(data, 'docs-refreshed'), 'test');
  return spawnSync('node', [script], { input: JSON.stringify({ cwd }), env, encoding: 'utf8' });
}

test('nudges once a day on findings, then stays silent', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nudge-'));
  const p = path.join(dir, 'p');
  fs.mkdirSync(path.join(p, 'sub'), { recursive: true });
  fs.writeFileSync(path.join(p, 'CLAUDE.md'), 'Always use npm here.\n');
  fs.writeFileSync(path.join(p, 'sub', 'CLAUDE.md'), 'Always use pnpm here.\n');
  const first = run(p, path.join(dir, 'd'));
  assert.match(first.stdout, /1 possible-conflict.*nothing was changed/);
  assert.strictEqual(run(p, path.join(dir, 'd')).stdout, '');
});

test('silent and exit 0 on a clean project or bad input', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nudge-'));
  fs.writeFileSync(path.join(dir, 'CLAUDE.md'), 'Keep it short.\n');
  const r = run(dir, path.join(dir, 'd'));
  assert.strictEqual(r.status, 0);
  assert.ok(!/possible-conflict/.test(r.stdout));
  const bad = spawnSync('node', [script], { input: 'not json', env: { ...process.env, TOKEN_FRUGAL_NUDGE: 'off' }, encoding: 'utf8' });
  assert.strictEqual(bad.status, 0);
  assert.strictEqual(bad.stdout, '');
});
