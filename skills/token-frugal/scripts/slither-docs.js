#!/usr/bin/env node
// Fetches official docs pages and stages the sections about tokens and context.
// Writes only to references/.staged/. It never changes a topic file.
const fs = require('fs');
const path = require('path');

const here = __dirname;
const staged = path.join(here, '..', 'references', '.staged');
const { base, pages } = JSON.parse(fs.readFileSync(path.join(here, 'sources.json'), 'utf8'));
const TERMS = /token|context|memory|claude\.md|compact|cost|cache|caching/i;

function sections(markdown) {
  const out = [];
  let current = null;
  let fenced = false;
  for (const line of markdown.split(/\r?\n/)) {
    if (line.startsWith('```')) fenced = !fenced;
    if (!fenced && /^#{1,4} /.test(line)) {
      current = { heading: line, body: [] };
      out.push(current);
    } else if (current) {
      current.body.push(line);
    }
  }
  return out;
}

async function main() {
  fs.mkdirSync(staged, { recursive: true });
  let failed = 0;
  for (const page of pages) {
    const url = `${base}${page}.md`;
    const res = await fetch(url);
    if (!res.ok) {
      console.error(`FAILED ${url}: HTTP ${res.status}`);
      failed++;
      continue;
    }
    const kept = sections(await res.text()).filter(
      (s) => TERMS.test(s.heading) || TERMS.test(s.body.join('\n'))
    );
    const today = new Date().toISOString().slice(0, 10);
    const text = `Source: ${url}\nFetched: ${today}\n\n` +
      kept.map((s) => `${s.heading}\n${s.body.join('\n').trim()}\n`).join('\n');
    const file = path.join(staged, `${page}.md`);
    const old = fs.existsSync(file) ? fs.readFileSync(file, 'utf8').split('\n').slice(2).join('\n') : null;
    const changed = old !== text.split('\n').slice(2).join('\n');
    fs.writeFileSync(file, text);
    console.log(`${changed ? 'CHANGED' : 'same   '} ${page}: ${kept.length} sections, ${text.length} chars`);
  }
  if (failed) process.exitCode = 1;
}

main().catch((e) => { console.error(e.message); process.exitCode = 1; });
