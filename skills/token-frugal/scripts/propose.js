#!/usr/bin/env node
// Builds reviewable proposals. It changes no target file; only apply.js does, after approval.
// Usage: propose.js [--shorten] [memory-index-file ...]
// Long index hooks are only flagged by default: a mechanical cut loses meaning (checked on real indexes, 2026-11-07).
// --remove FILE TEXT... drops a line that is exactly TEXT (a trailing comma allowed) or deletes TEXT inside a line.
// --shorten builds cut proposals anyway, skipping cuts that drop a rule word, date or file pointer.
// With no files it uses the memory indexes and in-file duplicates from data/tree.json and findings.json.
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const DATA = process.env.TOKEN_FRUGAL_DATA || path.join(require('os').homedir(), '.cache', 'token-frugal');
const HOOK_LIMIT = 80;
const SHORTEN = process.argv.includes('--shorten');
const MEANING = /\b(not|never|no|only|always|must|don't|unless|except|first|then|before|after|wins?|still)\b|→|=>|\d{4}-\d{2}-\d{2}|[\w./-]+\.(md|js|json|mjs)\b/i;
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
const tokens = (s) => Math.ceil(s.length / 4);
const json = (name, fallback) => { try { return JSON.parse(fs.readFileSync(path.join(DATA, name), 'utf8')); } catch { return fallback; } };

// Shortens the hook after an index link. The link stays, and the topic file keeps the detail.
function shortenHook(line) {
  const m = line.match(/^(\s*- \[[^\]]+\]\([^)]+\)\s*(?:[—–-]|:)\s*)(.+)$/);
  if (!m || m[2].length <= HOOK_LIMIT) return line;
  const cut = m[2].slice(0, HOOK_LIMIT);
  const end = cut.lastIndexOf(' ');
  const kept = cut.slice(0, end > 40 ? end : HOOK_LIMIT).replace(/[,;:\s]+$/, '');
  // A cut that drops a rule word, a date or a file pointer changes meaning, so the line stays.
  if (MEANING.test(m[2].slice(kept.length))) return line;
  return `${m[1]}${kept}…`;
}

function longHooks(lines) {
  const out = [];
  lines.forEach((line, i) => {
    const m = line.match(/^\s*- \[[^\]]+\]\([^)]+\)\s*(?:[—–-]|:)\s*(.+)$/);
    if (m && m[1].length > HOOK_LIMIT) out.push(i + 1);
  });
  return out;
}

function deadLinks(file, lines) {
  const out = [];
  lines.forEach((line, i) => {
    const m = line.match(/^\s*- \[[^\]]+\]\(([^)#]+\.md)\)/);
    if (m && !/^https?:/.test(m[1]) && !fs.existsSync(path.resolve(path.dirname(file), m[1]))) out.push({ line: i + 1, target: m[1] });
  });
  return out;
}

function unified(file, before, after) {
  const body = [];
  before.forEach((line, i) => {
    if (line !== after[i]) {
      body.push(`@@ line ${i + 1} @@`, `-${line}`);
      if (after[i] !== null) body.push(`+${after[i]}`);
    }
  });
  return body.length ? [`--- ${file}`, `+++ ${file}`, ...body].join('\n') : '';
}

function build(file, action, dropLines = new Set(), remove = []) {
  const text = fs.readFileSync(file, 'utf8');
  const eol = text.includes('\r\n') ? '\r\n' : '\n';
  const before = text.split(/\r?\n/);
  const after = before.map((line, i) => {
    if (dropLines.has(i + 1)) return null;
    if (action === 'remove-text') {
      for (const t of [...remove].sort((a, b) => b.length - a.length)) {
        { const bare = line.trim().replace(/,$/, ''); if (bare === t || bare === JSON.stringify(t)) return null; }
        if (line.includes(t)) line = line.split(t).join('');
      }
      return line;
    }
    return action === 'shorten-index' && SHORTEN ? shortenHook(line) : line;
  });
  const diff = unified(file, before, after);
  const flags = action === 'shorten-index' ? { deadLinks: deadLinks(file, before), longHooks: SHORTEN ? [] : longHooks(before) } : { deadLinks: [], longHooks: [] };
  if (!diff) return { file, flags };
  const content = after.filter((l) => l !== null).join(eol);
  if (/\.json$/i.test(file)) {
    try { JSON.parse(content); } catch (e) { throw new Error(`proposal would break JSON in ${file}: ${e.message}`); }
  }
  return {
    id: sha(file + action).slice(0, 8),
    file,
    action,
    shaBefore: sha(text),
    content,
    diff,
    tokensSavedEstimate: tokens(text) - tokens(content),
    flags,
  };
}

function targets() {
  const args = process.argv.slice(2).filter((a) => a !== '--shorten');
  if (args[0] === '--remove') return [{ file: args[1], action: 'remove-text', remove: args.slice(2) }];
  if (args.length) return args.map((file) => ({ file, action: 'shorten-index' }));
  const out = [];
  const seen = new Set();
  for (const p of json('tree.json', [])) {
    for (const f of p.files) {
      if (f.level === 'memory' && !seen.has(f.path)) {
        seen.add(f.path);
        out.push({ file: f.path, action: 'shorten-index' });
      }
    }
  }
  const dups = {};
  for (const f of json('findings.json', [])) {
    if (f.type === 'duplicate-in-file') (dups[f.file] = dups[f.file] || new Set()).add(f.line);
  }
  Object.entries(dups).forEach(([file, drop]) => out.push({ file, action: 'remove-duplicates', drop }));
  return out;
}

function main() {
  const dir = path.join(DATA, 'proposals');
  fs.mkdirSync(dir, { recursive: true });
  const rows = [];
  const flagged = [];
  for (const t of targets()) {
    const p = build(t.file, t.action, t.drop, t.remove);
    p.flags.deadLinks.forEach((d) => flagged.push(`  dead link, needs a human: ${p.file} line ${d.line} -> ${d.target}`));
    if (p.flags.longHooks.length) flagged.push(`  long hook, review by hand: line ${p.flags.longHooks.join(', ')} in ${p.file}`);
    if (!p.diff) continue;
    fs.writeFileSync(path.join(dir, `${p.id}.json`), JSON.stringify(p, null, 2));
    fs.writeFileSync(path.join(dir, `${p.id}.diff`), `${p.diff}\n`);
    rows.push(p);
  }
  if (!rows.length) console.log('No proposals.');
  for (const p of rows) {
    console.log(`${p.id}  ${p.action}  ~${p.tokensSavedEstimate} tokens saved (estimate)  ${p.file}`);
  }
  flagged.forEach((f) => console.log(f));
  console.log(`Diffs: ${dir}. Conflicts are never proposed as edits. Nothing was changed.`);
}

main();
