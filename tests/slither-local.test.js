const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const script = path.join(__dirname, '..', 'skills', 'token-frugal', 'scripts', 'slither-local.js');

function audit(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'slither-'));
  const project = path.join(dir, 'p');
  for (const [name, text] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(project, name)), { recursive: true });
    fs.writeFileSync(path.join(project, name), text);
  }
  const config = path.join(dir, 'config.json');
  fs.writeFileSync(config, JSON.stringify({ projects: [project] }));
  const out = path.join(dir, 'out');
  execFileSync('node', [script, config, out], { encoding: 'utf8' });
  const findings = JSON.parse(fs.readFileSync(path.join(out, 'findings.json'), 'utf8'));
  const tree = JSON.parse(fs.readFileSync(path.join(out, 'tree.json'), 'utf8'))[0];
  return { types: findings.map((f) => f.type), tree };
}

test('reports a conflict across levels', () => {
  const { types } = audit({ 'CLAUDE.md': 'Always use npm here.\n', 'sub/CLAUDE.md': 'Always use pnpm here.\n' });
  assert.ok(types.includes('possible-conflict'));
});

test('no conflict for a comparison line or a tool named in code', () => {
  const { types } = audit({ 'CLAUDE.md': 'Use `npm` for scripts.\nWe use npm, not yarn.\n', 'sub/CLAUDE.md': 'Notes on yarn history.\n' });
  assert.ok(!types.includes('possible-conflict'));
});

test('reports dead imports and ignores imports in code', () => {
  const { types } = audit({ 'CLAUDE.md': 'See @docs/missing.md\nLiteral `@docs/none.md`\nAsk @someone\n' });
  assert.strictEqual(types.filter((t) => t === 'dead-import').length, 1);
});

test('follows imports and survives a cycle', () => {
  const { tree, types } = audit({ 'CLAUDE.md': '@a.md\n', 'a.md': '@CLAUDE.md\n' });
  assert.ok(tree.files.some((f) => f.path.endsWith('/a.md') && f.importedBy));
  assert.ok(!types.includes('dead-import'));
});

test('reports duplicates in a file and across files', () => {
  const line = 'Keep every migration reversible at all times.\n';
  const { types } = audit({ 'CLAUDE.md': line + line, 'sub/CLAUDE.md': line });
  assert.ok(types.includes('duplicate-in-file'));
  assert.ok(types.includes('duplicate-across-files'));
});

test('path-scoped rules load on demand', () => {
  const { tree } = audit({ '.claude/rules/api.md': '---\npaths: src/**\n---\nRule text.\n' });
  assert.strictEqual(tree.files.find((f) => f.path.endsWith('api.md')).load, 'on demand');
});

test('same text with a relative link is not a cross-file duplicate', () => {
  const line = 'Current truth for this area: [STATE.md](STATE.md).\n';
  const { types } = audit({ 'CLAUDE.md': line, 'sub/CLAUDE.md': line });
  assert.ok(!types.includes('duplicate-across-files'));
});
