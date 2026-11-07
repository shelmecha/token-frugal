# token-frugal

A Claude Code plugin that finds where your tokens go and helps you cut them, without guessing and without touching anything you didn't approve.

Real result on the author's setup: turning off unused claude.ai connectors cut the first request of every session from 52,860 to 44,997 input tokens, **7,863 tokens (14.9%) per request**, measured as the median of 3 runs before and after.

## Install

In Claude Code:

    /plugin marketplace add shelmecha/token-frugal
    /plugin install token-frugal@token-frugal

Then start a new session and run `/token-frugal:token-frugal`, or just ask "why is my session expensive?"

Needs Node.js 18+ and the `claude` CLI on your PATH (for measuring).

## What it does

- **Answers token questions from sources.** Context window, CLAUDE.md size, MCP cost, compaction, subagents, skills vs CLAUDE.md. Every answer links to the official Claude Code docs. Popular community tips are included with a trust score, and the ones the docs contradict are marked.
- **Audits your instruction files.** Walks the full CLAUDE.md, rules and memory tree for a project, including imports, and reports dead imports, duplicate lines, dead links and possible conflicting rules across levels.
- **Proposes fixes as diffs.** Nothing is edited until you see the diff and say yes. Every applied change keeps a backup.
- **Measures, not estimates.** `measure.js` runs short `claude -p` probes and reports real input tokens before and after a change, with run-to-run variation, so you know if a saving is real. `whatif` tests denying MCP servers without changing your settings.
- **Keeps a savings history** across projects.
- **Optional start-of-session check.** Once a day per project it audits the instruction files and prints one line only if something is off. It never edits anything. Turn it off with `TOKEN_FRUGAL_NUDGE=off`.

## Honesty rules

Every number is labelled measured, estimate or unknown. Small savings are reported as small. Conflicts are flagged for a human, never auto-edited.

## Data

Proposals, backups, audit results and history live in `~/.cache/token-frugal` (override with `TOKEN_FRUGAL_DATA`). To audit several projects at once, copy `config.example.json` to `~/.cache/token-frugal/config.json` and list them; otherwise the audit checks the current folder.

## Develop

    claude --plugin-dir .
    node --test tests/*.test.js

## License

MIT
