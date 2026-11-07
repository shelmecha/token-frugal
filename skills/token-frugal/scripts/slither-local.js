#!/usr/bin/env node
// Read-only audit of the instruction files Claude Code loads for each project in config.json.
// Writes tree.json and findings.json to ~/.cache/token-frugal (or TOKEN_FRUGAL_DATA), then prints a tree and a findings table.
// Projects come from config.json there; with none, the current folder.
// Token counts are estimates: characters / 4.
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = process.env.TOKEN_FRUGAL_DATA || path.join(require('os').homedir(), '.cache', 'token-frugal');
const HOME = os.homedir();
const MAX_HOPS = 4; // Official limit: https://code.claude.com/docs/en/memory#import-additional-files
const SKIP_DIRS = new Set(['.git', 'node_modules', 'dist', 'build', '.next', 'vendor', 'coverage', '__pycache__', '.venv']);
const MAX_NESTED_DEPTH = 6;
const LONG_CODE_LINES = 20;

// Each group holds alternatives for one choice. Two levels naming different ones may conflict.
const CHOICES = [
  { subject: 'package manager', options: ['npm', 'pnpm', 'yarn', 'bun'] },
  { subject: 'indentation', options: ['tabs', 'spaces'] },
  { subject: 'test runner', options: ['jest', 'vitest', 'mocha'] },
  { subject: 'python tooling', options: ['pip', 'poetry', 'uv'] },
];
const DIRECTIVE = /\b(use|always|prefer|must|run with|default to)\b/i;
const GENERIC = [
  /write (clean|good|readable) code/i,
  /follow best practices/i,
  /be (careful|thorough)\b/i,
  /handle errors (properly|appropriately)/i,
  /write tests? (for|when) (everything|appropriate)/i,
];

const tokens = (text) => Math.ceil(text.length / 4);
const norm = (p) => path.resolve(p).replace(/\\/g, '/');
const read = (p) => { try { return fs.readFileSync(p, 'utf8'); } catch { return null; } };

// Returns lines outside fenced code, with inline code spans removed.
function proseLines(text) {
  const out = [];
  let fenced = false;
  text.split(/\r?\n/).forEach((raw, i) => {
    if (/^\s*(```|~~~)/.test(raw)) { fenced = !fenced; return; }
    if (!fenced) out.push({ n: i + 1, text: raw.replace(/`[^`]*`/g, '') });
  });
  return out;
}

function importsOf(text) {
  const found = [];
  for (const { n, text: line } of proseLines(text)) {
    for (const m of line.matchAll(/(?:^|\s)@((?:\\ |[^\s,;)])+)/g)) {
      const value = m[1].replace(/\\ /g, ' ').replace(/[.:]$/, '');
      // Keep only values that look like paths, so "@name" mentions are not reported as dead imports.
      if (/[/\\]|\.[a-z0-9]+$/i.test(value) && !/^[\w.-]+@/.test(value)) found.push({ n, value });
    }
  }
  return found;
}

function resolveImport(value, fromFile) {
  if (value.startsWith('~/')) return path.join(HOME, value.slice(2));
  return path.isAbsolute(value) ? value : path.resolve(path.dirname(fromFile), value);
}

function pathScoped(text) {
  const fm = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  return Boolean(fm && /^paths\s*:/m.test(fm[1]));
}

function listMd(dir) {
  const out = [];
  let entries = [];
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...listMd(full));
    else if (e.name.toLowerCase().endsWith('.md')) out.push(full);
  }
  return out;
}

function nestedFiles(dir, depth = 0) {
  const out = [];
  if (depth > MAX_NESTED_DEPTH) return out;
  let entries = [];
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    if (!e.isDirectory() || SKIP_DIRS.has(e.name) || e.name === '.claude') continue;
    const sub = path.join(dir, e.name);
    for (const name of ['CLAUDE.md', 'CLAUDE.local.md']) {
      if (fs.existsSync(path.join(sub, name))) out.push(path.join(sub, name));
    }
    out.push(...nestedFiles(sub, depth + 1));
  }
  return out;
}

function ancestorsOf(project) {
  const out = [];
  let dir = path.dirname(project);
  while (dir !== path.dirname(dir)) {
    if (norm(dir) !== norm(HOME)) {
      for (const name of ['CLAUDE.md', 'CLAUDE.local.md']) out.unshift(path.join(dir, name));
    }
    dir = path.dirname(dir);
  }
  return out;
}

function memoryIndex(project) {
  const slug = norm(project).replace(/[/.:\\ ]/g, '-');
  return path.join(HOME, '.claude', 'projects', slug, 'memory', 'MEMORY.md');
}

function collect(project) {
  const seeds = [
    { file: path.join(HOME, '.claude', 'CLAUDE.md'), level: 'global', load: 'launch' },
    ...listMd(path.join(HOME, '.claude', 'rules')).map((file) => ({ file, level: 'global', load: 'launch' })),
    ...ancestorsOf(project).map((file) => ({ file, level: 'ancestor', load: 'launch' })),
    { file: path.join(project, 'CLAUDE.md'), level: 'project', load: 'launch' },
    { file: path.join(project, '.claude', 'CLAUDE.md'), level: 'project', load: 'launch' },
    { file: path.join(project, 'CLAUDE.local.md'), level: 'project', load: 'launch' },
    ...listMd(path.join(project, '.claude', 'rules')).map((file) => ({ file, level: 'project', load: 'launch' })),
    { file: memoryIndex(project), level: 'memory', load: 'launch' },
    ...nestedFiles(project).map((file) => ({ file, level: 'nested', load: 'on demand' })),
  ];
  const files = [];
  const findings = [];
  const seen = new Set();

  const visit = (seed, hops, via) => {
    const key = norm(seed.file).toLowerCase();
    if (seen.has(key)) return; // Also guards import cycles.
    const text = read(seed.file);
    if (text === null) return;
    seen.add(key);
    const load = pathScoped(text) ? 'on demand' : seed.load;
    files.push({ path: norm(seed.file), level: seed.level, load, tokens: tokens(text), importedBy: via || null, text });
    for (const imp of importsOf(text)) {
      const target = resolveImport(imp.value, seed.file);
      if (!fs.existsSync(target)) {
        findings.push({ type: 'dead-import', file: norm(seed.file), line: imp.n, detail: imp.value });
      } else if (hops >= MAX_HOPS) {
        findings.push({ type: 'import-too-deep', file: norm(seed.file), line: imp.n, detail: imp.value });
      } else if (fs.statSync(target).isFile()) {
        visit({ file: target, level: seed.level, load }, hops + 1, norm(seed.file));
      }
    }
  };
  seeds.forEach((s) => visit(s, 0, null));
  return { files, findings };
}

const lineKey = (line) => line.replace(/^[\s>*#-]+/, '').replace(/\s+/g, ' ').trim().toLowerCase();

function analyze(files, findings) {
  const where = new Map();
  for (const f of files) {
    const local = new Map();
    let codeStart = null;
    f.text.split(/\r?\n/).forEach((line, i) => {
      if (/^\s*(```|~~~)/.test(line)) {
        if (codeStart === null) codeStart = i;
        else {
          if (i - codeStart - 1 > LONG_CODE_LINES) findings.push({ type: 'long-code-block', file: f.path, line: codeStart + 1, detail: `${i - codeStart - 1} lines` });
          codeStart = null;
        }
      }
    });
    for (const { n, text } of proseLines(f.text)) {
      const key = lineKey(text);
      // Short lines such as headings and table rules are too generic to count as duplicates.
      if (key.length < 25 || /^\|?[\s:|-]+$/.test(key)) continue;
      if (local.has(key)) findings.push({ type: 'duplicate-in-file', file: f.path, line: n, detail: `same as line ${local.get(key)}` });
      else local.set(key, n);
      // A relative link points to a different file from each folder, so the same text is not a duplicate.
      if (/\]\((?!https?:)/.test(text)) continue;
      if (!where.has(key)) where.set(key, []);
      if (!where.get(key).some((w) => w.file === f.path)) where.get(key).push({ file: f.path, line: n, level: f.level, text: text.trim() });
      if (GENERIC.some((g) => g.test(text))) findings.push({ type: 'generic-advice', file: f.path, line: n, detail: text.trim().slice(0, 80) });
    }
  }
  for (const places of where.values()) {
    if (places.length > 1) {
      findings.push({ type: 'duplicate-across-files', file: places[0].file, line: places[0].line, detail: `also in ${places.slice(1).map((p) => `${p.file}:${p.line}`).join(', ')}` });
    }
  }
  for (const { subject, options } of CHOICES) {
    const hits = [];
    for (const f of files) {
      for (const { n, text } of proseLines(f.text)) {
        if (!DIRECTIVE.test(text)) continue;
        const named = options.filter((o) => new RegExp(`\\b${o}\\b`, 'i').test(text));
        // A line naming several options is usually a comparison or an exception, so it proves nothing.
        if (named.length === 1) hits.push({ file: f.path, line: n, option: named[0].toLowerCase() });
      }
    }
    const chosen = new Set(hits.map((h) => h.option));
    const fileCount = new Set(hits.map((h) => h.file)).size;
    if (chosen.size > 1 && fileCount > 1) {
      findings.push({ type: 'possible-conflict', file: hits[0].file, line: hits[0].line, detail: `${subject}: ${hits.map((h) => `${h.option} at ${h.file}:${h.line}`).join('; ')}` });
    }
  }
  return findings;
}

function mcpServers(project) {
  const out = {};
  const add = (source, obj) => { if (obj && Object.keys(obj).length) out[source] = Object.keys(obj); };
  const json = (p) => { try { return JSON.parse(read(p)); } catch { return null; } };
  add('project .mcp.json', json(path.join(project, '.mcp.json'))?.mcpServers);
  add('user settings', json(path.join(HOME, '.claude', 'settings.json'))?.mcpServers);
  add('project settings', json(path.join(project, '.claude', 'settings.json'))?.mcpServers);
  const state = json(path.join(HOME, '.claude.json'));
  add('user ~/.claude.json', state?.mcpServers);
  add('local ~/.claude.json', state?.projects?.[norm(project)]?.mcpServers);
  return out;
}

function main() {
  const cfg = process.argv[2] || path.join(ROOT, 'config.json');
  const { projects } = fs.existsSync(cfg) ? JSON.parse(read(cfg)) : { projects: [process.cwd()] };
  const tree = [];
  const allFindings = [];
  for (const project of projects) {
    const { files, findings } = collect(project);
    analyze(files, findings);
    const launch = files.filter((f) => f.load === 'launch').reduce((sum, f) => sum + f.tokens, 0);
    tree.push({ project, launchTokensEstimate: launch, mcpServers: mcpServers(project), files: files.map(({ text, ...rest }) => rest) });
    findings.forEach((f) => allFindings.push({ project, ...f }));

    console.log(`\n${project}  ~${launch} tokens at launch (estimate)`);
    for (const f of files) console.log(`  ${f.level.padEnd(8)} ${f.load.padEnd(9)} ~${String(f.tokens).padStart(5)}  ${f.path}${f.importedBy ? '  (imported)' : ''}`);
    const counts = {};
    findings.forEach((f) => { counts[f.type] = (counts[f.type] || 0) + 1; });
    console.log(`  findings: ${JSON.stringify(counts)}`);
    for (const f of findings) console.log(`    ${f.type} ${f.file}:${f.line} ${f.detail}`);
    console.log(`  MCP configured: ${JSON.stringify(mcpServers(project))}`);
  }
  const data = process.argv[3] || ROOT;
  fs.mkdirSync(data, { recursive: true });
  fs.writeFileSync(path.join(data, 'tree.json'), JSON.stringify(tree, null, 2));
  fs.writeFileSync(path.join(data, 'findings.json'), JSON.stringify(allFindings, null, 2));
}

main();
