const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const scripts = path.join(__dirname, '..', 'skills', 'token-frugal', 'scripts');
const long = 'word '.repeat(40).trim();

function setup() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'frugal-'));
  const target = path.join(dir, 'MEMORY.md');
  fs.writeFileSync(path.join(dir, 'a.md'), 'topic\n');
  const original = `# Memory\n\n- [A](a.md) — ${long}\n- [Gone](gone.md) — short\n`;
  fs.writeFileSync(target, original);
  const env = { ...process.env, TOKEN_FRUGAL_DATA: path.join(dir, 'data') };
  const run = (script, ...args) => spawnSync('node', [path.join(scripts, script), ...args], { env, encoding: 'utf8' });
  const out = run('propose.js', '--shorten', target);
  const id = out.stdout.trim().split(/\s+/)[0];
  return { dir, target, original, run, id, out: out.stdout };
}

test('propose changes nothing and flags dead links', () => {
  const { target, original, out } = setup();
  assert.strictEqual(fs.readFileSync(target, 'utf8'), original);
  assert.match(out, /dead link.*gone\.md/);
});

test('apply refuses without approval', () => {
  const { target, original, run, id } = setup();
  assert.strictEqual(run('apply.js', id).status, 1);
  assert.strictEqual(fs.readFileSync(target, 'utf8'), original);
});

test('apply refuses when the target changed', () => {
  const { target, run, id } = setup();
  fs.appendFileSync(target, 'new line\n');
  assert.strictEqual(run('apply.js', id, '--approved').status, 1);
  assert.match(fs.readFileSync(target, 'utf8'), /new line/);
});

test('approved apply changes only the proposed line and keeps a backup', () => {
  const { dir, target, original, run, id } = setup();
  assert.strictEqual(run('apply.js', id, '--approved').status, 0);
  const after = fs.readFileSync(target, 'utf8').split('\n');
  const before = original.split('\n');
  assert.deepStrictEqual(after.filter((l, i) => l !== before[i]).length, 1);
  assert.match(after[2], /^- \[A\]\(a\.md\) — .+…$/);
  const backups = fs.readdirSync(path.join(dir, 'data', 'backups'));
  assert.strictEqual(fs.readFileSync(path.join(dir, 'data', 'backups', backups[0]), 'utf8'), original);
});

function proposeDefault(text) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'frugal-'));
  const target = path.join(dir, 'MEMORY.md');
  fs.writeFileSync(path.join(dir, 'a.md'), 'topic\n');
  fs.writeFileSync(target, text);
  return spawnSync('node', [path.join(scripts, 'propose.js'), target], { env: { ...process.env, TOKEN_FRUGAL_DATA: path.join(dir, 'data') }, encoding: 'utf8' }).stdout;
}

test('by default long hooks are flagged for a human, not edited', () => {
  const out = proposeDefault(`- [A](a.md) — ${long}\n`);
  assert.match(out, /No proposals/);
  assert.match(out, /long hook, review by hand: line 1/);
});

test('with --shorten a cut that would drop a rule word is not proposed', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'frugal-'));
  const target = path.join(dir, 'MEMORY.md');
  fs.writeFileSync(path.join(dir, 'a.md'), 'topic\n');
  fs.writeFileSync(target, `- [A](a.md) — ${'word '.repeat(18)}change the old line, do not ask\n`);
  const out = spawnSync('node', [path.join(scripts, 'propose.js'), '--shorten', target], { env: { ...process.env, TOKEN_FRUGAL_DATA: path.join(dir, 'data') }, encoding: 'utf8' }).stdout;
  assert.match(out, /No proposals/);
});

test('--remove drops an exact entry, trims text and keeps JSON valid', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'frugal-'));
  const target = path.join(dir, 's.json');
  fs.writeFileSync(target, JSON.stringify({ allow: ['old_tool', 'keep'], rule: 'use a and old_tool__*' }, null, 2) + '\n');
  const env = { ...process.env, TOKEN_FRUGAL_DATA: path.join(dir, 'data') };
  const out = spawnSync('node', [path.join(scripts, 'propose.js'), '--remove', target, 'old_tool', ' and old_tool__*'], { env, encoding: 'utf8' }).stdout;
  const id = out.trim().split(/\s+/)[0];
  assert.strictEqual(spawnSync('node', [path.join(scripts, 'apply.js'), id, '--approved'], { env, encoding: 'utf8' }).status, 0);
  const j = JSON.parse(fs.readFileSync(target, 'utf8'));
  assert.deepStrictEqual(j, { allow: ['keep'], rule: 'use a' });
});
