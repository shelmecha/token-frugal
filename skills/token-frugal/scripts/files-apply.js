#!/usr/bin/env node
// Moves approved ~/.claude items to the Windows Recycle Bin.
// Usage: files-apply.js propose        (from files-findings.json; only empty-folder and stale-temp items)
//        files-apply.js <id> --approved
// Env TOKEN_FRUGAL_RECYCLE=dry-run logs without deleting (tests).
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const { isProtected } = require('./slither-files.js');

const DATA = process.env.TOKEN_FRUGAL_DATA || path.join(os.homedir(), '.cache', 'token-frugal');
const dir = path.join(DATA, 'proposals');
const fail = (m) => { console.error(m); process.exit(1); };
const mb = (n) => `${(n / 1048576).toFixed(2)} MB`;

function propose() {
  let scan;
  try { scan = JSON.parse(fs.readFileSync(path.join(DATA, 'files-findings.json'), 'utf8')); } catch { fail('No files-findings.json. Run slither-files.js first.'); }
  const items = [];
  for (const f of scan.findings) {
    if (f.type === 'empty-folder') items.push({ path: f.path, kind: 'dir', bytes: 0, mtimeMs: f.mtimeMs });
    if (f.type === 'stale-temp') f.items.forEach((i) => items.push({ path: i.path, kind: 'file', bytes: i.bytes, mtimeMs: i.mtimeMs }));
  }
  if (!items.length) return console.log('No proposals. Only empty folders and stale temp files are ever proposed.');
  const id = crypto.createHash('sha256').update(JSON.stringify(items)).digest('hex').slice(0, 8);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `files-${id}.json`), JSON.stringify({ id, action: 'files-recycle', root: scan.root, items }, null, 2));
  items.forEach((i) => console.log(`${mb(i.bytes).padStart(10)}  ${i.kind}  ${i.path}`));
  console.log(`${id}  files-recycle  ${items.length} items, ${mb(items.reduce((n, i) => n + i.bytes, 0))}. Goes to the Recycle Bin. Nothing was changed.`);
}

// Returns a reason to refuse, or null.
function check(root, item) {
  const rel = path.relative(root, path.resolve(item.path));
  if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) return 'outside-root';
  if (isProtected(rel.split(/[\\/]/)[0])) return 'protected';
  let s;
  try { s = fs.lstatSync(item.path); } catch { return 'missing'; }
  if (s.isSymbolicLink()) return 'symlink';
  if (item.kind === 'dir') {
    if (!s.isDirectory() || fs.readdirSync(item.path).length) return 'changed';
  } else if (!s.isFile() || s.size !== item.bytes) return 'changed';
  if (Math.abs(s.mtimeMs - item.mtimeMs) > 1) return 'changed';
  return null;
}

function recycle(item) {
  if (process.env.TOKEN_FRUGAL_RECYCLE === 'dry-run') return true;
  const args = ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', path.join(__dirname, 'recycle.ps1'), '-Path', item.path, '-Kind', item.kind];
  return spawnSync('powershell.exe', args, { encoding: 'utf8', windowsHide: true, timeout: 60000 }).status === 0;
}

function apply(id) {
  const file = path.join(dir, `files-${path.basename(id).replace(/^files-/, '')}.json`);
  if (!fs.existsSync(file)) fail(`No files proposal ${id}.`);
  if (process.platform !== 'win32' && process.env.TOKEN_FRUGAL_RECYCLE !== 'dry-run') fail('The Recycle Bin step is Windows-only for now. Nothing was deleted.');
  const p = JSON.parse(fs.readFileSync(file, 'utf8'));
  const root = path.resolve(p.root);
  if (root === path.parse(root).root) fail('Refused: root is a drive root.');
  let bad = 0;
  for (const item of p.items) {
    const why = check(root, item);
    const ok = !why && recycle(item);
    const status = why ? `refused=${why}` : ok ? 'recycled' : 'failed';
    if (!ok) bad++;
    fs.appendFileSync(path.join(DATA, 'applied.log'), `${new Date().toISOString()} ${p.id} files-recycle ${item.path} ${status}\n`);
    console.log(`${status}  ${item.path}`);
  }
  console.log(`${p.items.length - bad} recycled, ${bad} refused or failed. Undo: restore from the Recycle Bin.`);
  if (bad) process.exitCode = 1;
}

const [a, flag] = process.argv.slice(2);
if (a === 'propose') propose();
else if (!a || flag !== '--approved') fail('Usage: files-apply.js propose | files-apply.js <id> --approved. Show the list and get a yes first.');
else apply(a);
