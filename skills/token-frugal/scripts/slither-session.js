#!/usr/bin/env node
// Answers "what should I clean?" from evidence. Read-only apart from data/session.json.
// Sources: /context in a headless session (uses no model tokens) and retained transcripts.
// Every number carries a label: measured, estimate or unknown.
const fs = require('fs');
const os = require('os');
const path = require('path');
const readline = require('readline');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..', '..');
const PROJECTS = path.join(os.homedir(), '.claude', 'projects');
const DAYS = 30;

const num = (s) => {
  const v = String(s).replace(/[~,\s]/g, '');
  return v.endsWith('k') ? parseFloat(v) * 1000 : parseFloat(v) || 0;
};

function parseContext(markdown) {
  const out = { categories: {}, servers: {}, tools: {}, skills: [], memory: [], agents: [] };
  for (const section of markdown.split(/^#{2,3} /m).slice(1)) {
    const [title] = section.split('\n');
    const rows = section.split('\n').filter((l) => l.startsWith('|')).slice(2)
      .map((l) => l.split('|').slice(1, -1).map((c) => c.trim()));
    if (title.startsWith('Estimated usage')) rows.forEach((r) => { out.categories[r[0]] = num(r[1]); });
    if (title === 'MCP Tools') {
      rows.forEach((r) => {
        out.servers[r[1]] = out.servers[r[1]] || { tools: 0, schemaTokens: 0, nameChars: 0 };
        out.servers[r[1]].tools++;
        out.servers[r[1]].schemaTokens += num(r[2]);
        out.servers[r[1]].nameChars += r[0].length + 1;
      });
    }
    if (title === 'Skills') out.skills = rows.map((r) => ({ name: r[0], source: r[1], tokens: num(r[2]) }));
    if (title === 'Memory Files') out.memory = rows.map((r) => ({ path: r[1], tokens: num(r[2]) }));
    if (title === 'Custom Agents') out.agents = rows.map((r) => ({ name: r[0], tokens: num(r[2]) }));
  }
  return out;
}

function readContext(cwd) {
  const res = spawnSync('claude', ['-p', '/context', '--output-format', 'json', '--max-turns', '1'], {
    cwd, encoding: 'utf8', shell: true, timeout: 180000, maxBuffer: 2e8,
    env: { ...process.env, MSYS_NO_PATHCONV: '1' },
  });
  return parseContext(JSON.parse(res.stdout).result);
}

function transcripts(root, cutoff) {
  const out = [];
  for (const e of fs.readdirSync(root, { withFileTypes: true })) {
    const full = path.join(root, e.name);
    if (e.isDirectory()) out.push(...transcripts(full, cutoff));
    else if (e.name.endsWith('.jsonl')) {
      const { mtimeMs, size } = fs.statSync(full);
      if (mtimeMs >= cutoff) out.push({ full, mtimeMs, size });
    }
  }
  return out;
}

async function scanUse(root = PROJECTS, days = DAYS) {
  const files = transcripts(root, Date.now() - days * 86400000);
  const servers = {};
  const skills = {};
  const seen = new Set();
  let hookChars = 0;
  let hookEvents = 0;
  for (const f of files) {
    const rl = readline.createInterface({ input: fs.createReadStream(f.full), crlfDelay: Infinity });
    for await (const line of rl) {
      // Request snapshots repeat the whole conversation, so they would double count.
      if (line.includes('"api-request') || line.includes('"prompt_snapshot"')) continue;
      for (const m of line.matchAll(/"type":"tool_use","id":"([^"]+)","name":"([^"]+)"(?:,"input":\{"(?:skill|name)":"([^"]+)")?/g)) {
        if (seen.has(m[1])) continue;
        seen.add(m[1]);
        const mcp = m[2].match(/^mcp__(.+?)__/);
        if (mcp) servers[mcp[1]] = (servers[mcp[1]] || 0) + 1;
        if (m[2] === 'Skill' && m[3]) skills[m[3]] = (skills[m[3]] || 0) + 1;
      }
      if (line.includes('"hook_additional_context"')) {
        hookEvents++;
        hookChars += line.length;
      }
    }
  }
  const oldest = files.length ? new Date(Math.min(...files.map((f) => f.mtimeMs))).toISOString().slice(0, 10) : null;
  return { files: files.length, oldest, servers, skills, hookEvents, hookChars };
}

function report(ctx, use) {
  const servers = Object.entries(ctx.servers).map(([name, s]) => ({
    name,
    tools: s.tools,
    listingTokensEstimate: Math.ceil(s.nameChars / 4),
    calls: use.servers[name] || 0,
  })).sort((a, b) => b.listingTokensEstimate - a.listingTokensEstimate);
  const skillUse = (name) => Object.entries(use.skills)
    .filter(([k]) => k === name || k.endsWith(`:${name}`) || name.endsWith(`:${k}`))
    .reduce((n, [, v]) => n + v, 0);
  const skills = ctx.skills.map((s) => ({ ...s, calls: skillUse(s.name) })).sort((a, b) => b.tokens - a.tokens);
  return {
    window: { days: DAYS, transcripts: use.files, oldest: use.oldest },
    categoriesMeasured: ctx.categories,
    servers,
    skills,
    memory: ctx.memory,
    hooks: { events: use.hookEvents, tokensEstimate: Math.ceil(use.hookChars / 4) },
    notes: [
      'Call counts cover only retained transcripts, so 0 calls means none seen in the window, not never.',
      'Connector servers can connect late; /context may list fewer or more servers between runs.',
      'Listing estimates are a lower bound: they cover tool names only. Run measure.js whatif for the real saving.',
    ],
  };
}

function print(r) {
  console.log(`Transcripts: ${r.window.transcripts}, oldest ${r.window.oldest} (window ${r.window.days} days)`);
  console.log('\nContext by category (measured by /context):');
  for (const [k, v] of Object.entries(r.categoriesMeasured)) console.log(`  ${String(Math.round(v)).padStart(7)}  ${k}`);
  console.log('\nMCP servers (listing tokens are estimates from tool names; calls are measured):');
  for (const s of r.servers) console.log(`  ${String(s.listingTokensEstimate).padStart(6)}  ${String(s.tools).padStart(4)} tools  ${String(s.calls).padStart(5)} calls  ${s.name}`);
  console.log('\nSkills (tokens from /context; calls are measured):');
  for (const s of r.skills) console.log(`  ${String(s.tokens).padStart(5)}  ${String(s.calls).padStart(4)} calls  ${s.name} [${s.source}]`);
  console.log(`\nHook context: ${r.hooks.events} events, ~${r.hooks.tokensEstimate} tokens across all sessions (estimate)`);
  r.notes.forEach((n) => console.log(`Note: ${n}`));
}

async function main() {
  const cwd = process.argv[2] || os.tmpdir();
  const r = report(readContext(cwd), await scanUse());
  const data = path.join(ROOT, 'data');
  fs.mkdirSync(data, { recursive: true });
  fs.writeFileSync(path.join(data, 'session.json'), JSON.stringify(r, null, 2));
  print(r);
}

if (require.main === module) main().catch((e) => { console.error(e.message); process.exitCode = 1; });
module.exports = { parseContext, scanUse, report };
