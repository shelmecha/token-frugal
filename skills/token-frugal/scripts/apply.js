#!/usr/bin/env node
// Applies one proposal the user approved in chat. Usage: apply.js <id> --approved
// Refuses if the target changed since the proposal. Backs up the original first.
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const DATA = process.env.TOKEN_FRUGAL_DATA || path.join(require('os').homedir(), '.cache', 'token-frugal');
const [id, flag] = process.argv.slice(2);

function fail(message) {
  console.error(message);
  process.exit(1);
}

if (!id || flag !== '--approved') fail('Usage: apply.js <id> --approved. Show the diff and get a yes first.');
const file = path.join(DATA, 'proposals', `${path.basename(id)}.json`);
if (!fs.existsSync(file)) fail(`No proposal ${id}.`);
const p = JSON.parse(fs.readFileSync(file, 'utf8'));
const current = fs.readFileSync(p.file, 'utf8');
if (crypto.createHash('sha256').update(current).digest('hex') !== p.shaBefore) {
  fail(`${p.file} changed since the proposal. Run propose.js again.`);
}
const backups = path.join(DATA, 'backups');
fs.mkdirSync(backups, { recursive: true });
const backup = path.join(backups, `${p.id}-${Date.now()}-${path.basename(p.file)}`);
fs.writeFileSync(backup, current);
fs.writeFileSync(p.file, p.content);
fs.appendFileSync(path.join(DATA, 'applied.log'), `${new Date().toISOString()} ${p.id} ${p.action} ${p.file} backup=${backup}\n`);
console.log(`Applied ${p.id} to ${p.file}. Undo: copy ${backup} back.`);
