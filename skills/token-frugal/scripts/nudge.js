#!/usr/bin/env node
// SessionStart hook. Silent unless something is off, and then one line.
// 1. Once a day per project: audits the session's project and nudges on findings.
// 2. Once a week: refreshes the staged docs in the background (writes only to references/.staged/).
// It never edits a project file and never fails the session.
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawn, spawnSync } = require('child_process');

const DAY = 864e5;
const here = __dirname;
const DATA = process.env.TOKEN_FRUGAL_DATA || path.join(os.homedir(), '.cache', 'token-frugal');
const staged = path.join(here, '..', 'references', '.staged');

function readInput() {
  try { return JSON.parse(fs.readFileSync(0, 'utf8') || '{}'); } catch { return {}; }
}

const age = (file) => { try { return Date.now() - fs.statSync(file).mtimeMs; } catch { return Infinity; } };

function refreshDocs() {
  const stamp = path.join(DATA, 'docs-refreshed');
  if (age(stamp) < 7 * DAY) return;
  fs.writeFileSync(stamp, new Date().toISOString());
  const child = spawn(process.execPath, [path.join(here, 'slither-docs.js')], { detached: true, stdio: 'ignore', windowsHide: true });
  child.unref();
}

function audit(cwd) {
  const key = crypto.createHash('sha256').update(cwd).digest('hex').slice(0, 12);
  const dir = path.join(DATA, 'audit', key);
  const stamp = path.join(dir, 'stamp');
  if (age(stamp) < DAY) return null;
  fs.mkdirSync(dir, { recursive: true });
  const config = path.join(dir, 'config.json');
  fs.writeFileSync(config, JSON.stringify({ projects: [cwd] }));
  spawnSync(process.execPath, [path.join(here, 'slither-local.js'), config, dir], { timeout: 15000, stdio: 'ignore', windowsHide: true });
  fs.writeFileSync(stamp, new Date().toISOString());
  try { return JSON.parse(fs.readFileSync(path.join(dir, 'findings.json'), 'utf8')); } catch { return null; }
}

function main() {
  if (process.env.TOKEN_FRUGAL_NUDGE === 'off') return;
  const input = readInput();
  const cwd = input.cwd || process.cwd();
  fs.mkdirSync(DATA, { recursive: true });
  refreshDocs();
  const findings = audit(cwd);
  if (!findings || !findings.length) return;
  const counts = {};
  for (const f of findings) counts[f.type] = (counts[f.type] || 0) + 1;
  const list = Object.entries(counts).map(([t, n]) => `${n} ${t}`).join(', ');
  console.log(`token-frugal: instruction files here have ${list}. Run /token-frugal:token-frugal to review; nothing was changed.`);
}

try { main(); } catch { /* a nudge must never break a session */ }
