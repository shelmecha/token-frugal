#!/usr/bin/env node
// Reports what in ~/.claude may not be needed. Read-only: reads no file contents except README.md and .gitignore.
// Usage: slither-files.js [root] [outDir]. Writes files-findings.json to outDir. Edit files-config.json to change the lists.
const fs = require('fs');
const os = require('os');
const path = require('path');

const DAY = 864e5;
const DATA = process.env.TOKEN_FRUGAL_DATA || path.join(os.homedir(), '.cache', 'token-frugal');
const config = JSON.parse(fs.readFileSync(path.join(__dirname, 'files-config.json'), 'utf8'));
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const glob = (p) => new RegExp(`^${esc(p).replace(/\\\*/g, '.*').replace(/\\\?/g, '.')}$`, 'i');
const isProtected = (name) => config.protected.some((p) => p.toLowerCase() === String(name).toLowerCase());
const mb = (n) => `${(n / 1048576).toFixed(1)} MB`;
const stat = (p) => { try { return fs.lstatSync(p); } catch { return null; } };
const list = (p) => { try { return fs.readdirSync(p, { withFileTypes: true }); } catch { return []; } };
const read = (p) => { try { return fs.readFileSync(p, 'utf8'); } catch { return ''; } };

function size(p) {
  const s = stat(p);
  if (!s || s.isSymbolicLink()) return 0;
  if (!s.isDirectory()) return s.size;
  return list(p).reduce((n, e) => n + size(path.join(p, e.name)), 0);
}

function allowlist(root) {
  const pats = config.allowRootFiles.concat(config.allowRootPatterns);
  for (const line of read(path.join(root, '.gitignore')).split(/\r?\n/)) {
    if (!line.startsWith('!')) continue;
    const name = line.slice(1).replace(/^\//, '').replace(/\/$/, '');
    if (name && !name.includes('/')) pats.push(name);
  }
  return pats.map(glob);
}

// Heavy environments anywhere up to heavyDepth (top level = depth 1). Never descends into one.
function heavy(dir, depth, out, res) {
  for (const e of list(dir)) {
    if (!e.isDirectory() || e.isSymbolicLink()) continue;
    if (depth === 1 && isProtected(e.name)) continue;
    const p = path.join(dir, e.name);
    if (res.some((r) => r.test(e.name))) {
      const bytes = size(p);
      if (bytes > config.heavyMinMB * 1048576) out.push({ type: 'heavy-env', path: p, bytes, note: 'flag only' });
    } else if (depth < config.heavyDepth) heavy(p, depth + 1, out, res);
  }
}

function staleFiles(dir, cutoff, out) {
  for (const e of list(dir)) {
    const p = path.join(dir, e.name);
    const s = stat(p);
    if (!s || s.isSymbolicLink()) continue;
    if (s.isDirectory()) staleFiles(p, cutoff, out);
    else if (s.mtimeMs < cutoff) out.push({ path: p, bytes: s.size, mtimeMs: s.mtimeMs });
  }
}

function scan(root) {
  root = path.resolve(root);
  const now = Date.now();
  const recent = now - config.recentMinutes * 60e3;
  const findings = [];
  const info = [];
  const readme = read(path.join(root, 'README.md'));
  const allow = allowlist(root);
  for (const e of list(root)) {
    const p = path.join(root, e.name);
    const s = stat(p);
    if (!s || s.isSymbolicLink()) continue;
    if (s.isDirectory()) {
      if (e.name.toLowerCase() === 'backups') { info.push({ type: 'backups', path: p, bytes: size(p), note: 'kept by decision' }); continue; }
      if (isProtected(e.name)) continue;
      if (!list(p).length) {
        if (s.mtimeMs < recent) findings.push({ type: 'empty-folder', path: p, bytes: 0, mtimeMs: s.mtimeMs });
        continue;
      }
      if (readme && !new RegExp(`(^|[^\\w.-])${esc(e.name)}([^\\w-]|$)`, 'im').test(readme)) {
        findings.push({ type: 'unmapped-folder', path: p, bytes: size(p), note: 'flag only' });
      }
      if (config.tempFolders.includes(e.name.toLowerCase())) {
        const items = [];
        staleFiles(p, Math.min(now - config.staleDays * DAY, recent), items);
        if (items.length) findings.push({ type: 'stale-temp', path: p, bytes: items.reduce((n, i) => n + i.bytes, 0), count: items.length, items });
      }
    } else if (s.mtimeMs < recent && !allow.some((r) => r.test(e.name))) {
      findings.push({ type: 'loose-root-file', path: p, bytes: s.size, note: 'flag only' });
    }
  }
  heavy(root, 1, findings, config.heavyNames.map(glob));
  findings.sort((a, b) => b.bytes - a.bytes);
  return { root, scannedAt: new Date(now).toISOString(), findings, info };
}

function main() {
  const root = process.argv[2] || path.join(os.homedir(), '.claude');
  const out = process.argv[3] || DATA;
  const result = scan(root);
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, 'files-findings.json'), JSON.stringify(result, null, 2));
  if (!result.findings.length) console.log(`No findings in ${result.root}.`);
  for (const f of result.findings) {
    const extra = f.type === 'stale-temp' ? ` (${f.count} files older than ${config.staleDays} days)` : f.note ? ` (${f.note})` : '';
    console.log(`${mb(f.bytes).padStart(10)}  ${f.type}  ${f.path}${extra}`);
  }
  for (const i of result.info) console.log(`${mb(i.bytes).padStart(10)}  info: ${i.type}, ${i.note}  ${i.path}`);
  console.log('Read-only scan. Nothing was changed.');
}

module.exports = { scan, config, isProtected };
if (require.main === module) main();
