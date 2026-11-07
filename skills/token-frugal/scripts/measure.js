#!/usr/bin/env node
// Real token numbers from short probe sessions. Each probe spends a small amount of usage.
// measure.js baseline <name> [cwd]   save a baseline
// measure.js report <name> [cwd]     compare now with the baseline
// measure.js whatif [cwd] -- "claude.ai Figma" "claude.ai Clay"   test denying servers for the probe only
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const DATA = process.env.TOKEN_FRUGAL_DATA || path.join(require('os').homedir(), '.cache', 'token-frugal');
const RUNS = 3;

function probe(cwd, settings) {
  const args = ['-p', 'reply ok', '--output-format', 'json', '--max-turns', '1'];
  if (settings) args.push('--settings', JSON.stringify(settings));
  // No shell: arguments pass through unescaped and safe. Needs the native claude binary on PATH.
  const res = spawnSync('claude', args, { cwd, encoding: 'utf8', timeout: 180000, maxBuffer: 2e8 });
  if (res.error) throw new Error(`claude did not run: ${res.error.message}`);
  const j = JSON.parse(res.stdout);
  const u = j.usage;
  return { sessionId: j.session_id, input: u.input_tokens + u.cache_read_input_tokens + u.cache_creation_input_tokens };
}

function sample(cwd, settings) {
  const runs = Array.from({ length: RUNS }, () => probe(cwd, settings));
  const values = runs.map((r) => r.input).sort((a, b) => a - b);
  return { median: values[Math.floor(RUNS / 2)], min: values[0], max: values[RUNS - 1], sessions: runs.map((r) => r.sessionId), cwd, at: new Date().toISOString() };
}

const show = (label, s) => console.log(`${label}: ${s.median} input tokens at first request (median of ${RUNS}, range ${s.min}-${s.max})`);

function compare(before, after) {
  const diff = before.median - after.median;
  const noise = (before.max - before.min) + (after.max - after.min);
  console.log(`Saved: ${diff} tokens per request (${((diff / before.median) * 100).toFixed(1)}%).`);
  if (Math.abs(diff) <= noise) console.log(`Not distinguishable from run-to-run variation (${noise} tokens).`);
  console.log(`Transcripts to trace: ${[...before.sessions, ...after.sessions].join(' ')}`);
  return { before: before.median, after: after.median, saved: diff, noise, sessions: [...before.sessions, ...after.sessions] };
}

// One JSON line per measured comparison, across all projects.
const HISTORY = path.join(DATA, 'history.jsonl');
function record(kind, name, cwd, result) {
  fs.mkdirSync(DATA, { recursive: true });
  fs.appendFileSync(HISTORY, `${JSON.stringify({ at: new Date().toISOString(), kind, name, cwd, ...result })}\n`);
}

function history() {
  if (!fs.existsSync(HISTORY)) return console.log('No history yet. Run report or whatif first.');
  const rows = fs.readFileSync(HISTORY, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
  const byProject = {};
  for (const r of rows) (byProject[r.cwd] = byProject[r.cwd] || []).push(r);
  for (const [cwd, list] of Object.entries(byProject)) {
    console.log(cwd);
    for (const r of list) {
      const real = Math.abs(r.saved) > r.noise ? '' : '  (within variation)';
      console.log(`  ${r.at.slice(0, 10)}  ${r.kind.padEnd(7)} ${r.name}: ${r.before} -> ${r.after}, saved ${r.saved}${real}`);
    }
  }
  const applied = rows.filter((r) => r.kind === 'report' && Math.abs(r.saved) > r.noise);
  console.log(`Applied changes with a real saving: ${applied.length}, total ${applied.reduce((a, r) => a + r.saved, 0)} tokens per request. What-ifs are probes, not savings.`);
}

function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  const file = (name) => path.join(DATA, 'baseline', `${path.basename(name)}.json`);
  if (cmd === 'baseline') {
    const s = sample(rest[1] || os.tmpdir());
    fs.mkdirSync(path.dirname(file(rest[0])), { recursive: true });
    fs.writeFileSync(file(rest[0]), JSON.stringify(s, null, 2));
    show('Baseline', s);
  } else if (cmd === 'report') {
    const before = JSON.parse(fs.readFileSync(file(rest[0]), 'utf8'));
    const after = sample(rest[1] || before.cwd);
    show('Baseline', before);
    show('Now', after);
    record('report', rest[0], after.cwd, compare(before, after));
  } else if (cmd === 'whatif') {
    const split = rest.indexOf('--');
    const names = rest.slice(split + 1);
    const cwd = (split > 0 && rest[0]) || os.tmpdir();
    const before = sample(cwd);
    const after = sample(cwd, { deniedMcpServers: names.map((serverName) => ({ serverName })) });
    show('Current', before);
    show(`Without ${names.join(', ')}`, after);
    record('whatif', names.join(', '), cwd, compare(before, after));
  } else if (cmd === 'history') {
    history();
  } else {
    console.error('Usage: measure.js baseline <name> [cwd] | report <name> [cwd] | whatif [cwd] -- <server> ... | history');
    process.exitCode = 1;
  }
}

main();
