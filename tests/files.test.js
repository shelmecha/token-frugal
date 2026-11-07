const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const scripts = path.join(__dirname, '..', 'skills', 'token-frugal', 'scripts');
const old = new Date(Date.now() - 40 * 864e5);

function fixture() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'files-'));
  const root = path.join(dir, 'claude');
  const data = path.join(dir, 'data');
  const mk = (rel, content, aged = true) => {
    const p = path.join(root, rel);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    if (content === null) fs.mkdirSync(p, { recursive: true }); else fs.writeFileSync(p, content);
    if (aged) fs.utimesSync(p, old, old);
    return p;
  };
  mk('README.md', '# Map\n- `skills/` skills\n- scratch: temp\n- empty: nothing\n');
  mk('.gitignore', '/*\n!/settings.json\n!/skills/\n');
  mk('settings.json', '{}');
  mk('history.jsonl', '');
  mk('policy-limits.json.stamp.json', '{}');
  mk('stray.txt', 'x');
  mk('fresh.txt', 'x', false);
  mk('skills/a.md', 'a');
  mk('mystery/b.txt', 'b');
  const stale = mk('scratch/old.txt', 'old data');
  mk('scratch/new.txt', 'new', false);
  const empty = mk('empty', null);
  mk('projects/x/huge.txt', 'p');
  mk('projects/empty', null);
  mk('backups/b1/f.txt', 'backup');
  const env = { ...process.env, TOKEN_FRUGAL_DATA: data, TOKEN_FRUGAL_RECYCLE: 'dry-run' };
  const run = (script, ...args) => spawnSync('node', [path.join(scripts, script), ...args], { env, encoding: 'utf8' });
  return { dir, root, data, stale, empty, run };
}

const scanOf = (f) => {
  const r = f.run('slither-files.js', f.root, f.data);
  assert.strictEqual(r.status, 0, r.stderr);
  return { out: r.stdout, json: JSON.parse(fs.readFileSync(path.join(f.data, 'files-findings.json'), 'utf8')) };
};
const names = (json, type) => json.findings.filter((x) => x.type === type).map((x) => path.basename(x.path)).sort();

test('finds each type and skips protected, allowed and recent items', () => {
  const f = fixture();
  const { out, json } = scanOf(f);
  assert.deepStrictEqual(names(json, 'empty-folder'), ['empty']);
  assert.deepStrictEqual(names(json, 'unmapped-folder'), ['mystery']);
  assert.deepStrictEqual(names(json, 'loose-root-file'), ['stray.txt']);
  const st = json.findings.find((x) => x.type === 'stale-temp');
  assert.deepStrictEqual(st.items.map((i) => path.basename(i.path)), ['old.txt']);
  assert.ok(!json.findings.some((x) => /projects|backups/.test(x.path)));
  assert.strictEqual(json.info[0].type, 'backups');
  assert.match(out, /Nothing was changed/);
});

test('heavy-env flags big environments up to depth 4 only', () => {
  const f = fixture();
  const big = Buffer.alloc(101 * 1048576);
  for (const rel of ['a/b/node_modules/x.bin', 'a/b/c/d/e/.venv/x.bin', 'projects/node_modules/x.bin']) {
    const p = path.join(f.root, rel);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, big);
  }
  const { json } = scanOf(f);
  const heavy = json.findings.filter((x) => x.type === 'heavy-env').map((x) => path.relative(f.root, x.path));
  assert.deepStrictEqual(heavy, [path.join('a', 'b', 'node_modules')]);
});

function proposed(f) {
  scanOf(f);
  const out = f.run('files-apply.js', 'propose').stdout;
  const id = out.trim().split('\n').pop().split(/\s+/)[0];
  return { id, file: path.join(f.data, 'proposals', `files-${id}.json`) };
}

test('propose lists only empty folders and stale temp files', () => {
  const f = fixture();
  const { file } = proposed(f);
  const p = JSON.parse(fs.readFileSync(file, 'utf8'));
  assert.deepStrictEqual(p.items.map((i) => path.basename(i.path)).sort(), ['empty', 'old.txt']);
});

test('apply refuses without --approved', () => {
  const f = fixture();
  const { id } = proposed(f);
  assert.strictEqual(f.run('files-apply.js', id).status, 1);
  assert.ok(!fs.existsSync(path.join(f.data, 'applied.log')));
});

test('approved apply recycles (dry run) and logs', () => {
  const f = fixture();
  const { id } = proposed(f);
  const r = f.run('files-apply.js', id, '--approved');
  assert.strictEqual(r.status, 0, r.stdout + r.stderr);
  assert.strictEqual((fs.readFileSync(path.join(f.data, 'applied.log'), 'utf8').match(/recycled/g) || []).length, 2);
  assert.ok(fs.existsSync(f.stale));
});

test('apply refuses changed, protected and outside paths', () => {
  const f = fixture();
  const { id, file } = proposed(f);
  fs.appendFileSync(f.stale, 'more');
  fs.writeFileSync(path.join(f.empty, 'now.txt'), 'x');
  const p = JSON.parse(fs.readFileSync(file, 'utf8'));
  const prot = path.join(f.root, 'projects', 'empty');
  p.items.push({ path: prot, kind: 'dir', bytes: 0, mtimeMs: fs.statSync(prot).mtimeMs });
  const outside = path.join(f.dir, 'outside.txt');
  fs.writeFileSync(outside, 'o');
  p.items.push({ path: outside, kind: 'file', bytes: 1, mtimeMs: fs.statSync(outside).mtimeMs });
  fs.writeFileSync(file, JSON.stringify(p));
  const r = f.run('files-apply.js', id, '--approved');
  assert.strictEqual(r.status, 1);
  const log = fs.readFileSync(path.join(f.data, 'applied.log'), 'utf8');
  assert.strictEqual((log.match(/refused=changed/g) || []).length, 2);
  assert.match(log, /refused=protected/);
  assert.match(log, /refused=outside-root/);
  assert.ok(!/recycled/.test(log));
});

test('nudge reports ~/.claude findings only at that root, once a day', () => {
  const f = fixture();
  const env = { ...process.env, TOKEN_FRUGAL_DATA: f.data, TOKEN_FRUGAL_CLAUDE_ROOT: f.root };
  fs.mkdirSync(f.data, { recursive: true });
  fs.writeFileSync(path.join(f.data, 'docs-refreshed'), 'test');
  const nudge = (cwd) => spawnSync('node', [path.join(scripts, 'nudge.js')], { input: JSON.stringify({ cwd }), env, encoding: 'utf8' });
  const elsewhere = nudge(path.join(f.root, 'skills'));
  assert.ok(!/~\/\.claude has/.test(elsewhere.stdout));
  const first = nudge(f.root.toUpperCase());
  assert.strictEqual(first.status, 0);
  assert.match(first.stdout, /token-frugal: ~\/\.claude has .*1 empty-folder.*nothing was changed/);
  assert.ok(!/~\/\.claude has/.test(nudge(f.root).stdout));
});
