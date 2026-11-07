# Community tips
Fetched 2026-11-07. Trust scores are Claude's judgment from the evidence listed; official docs win over any tip here.

Docs checked: https://code.claude.com/docs/en/costs and https://code.claude.com/docs/en/memory (both fetched 2026-11-07). "Docs" column: Confirm, Contradict, or Not covered. Community pages were read for dates and numbers; most percentages are the author's own, not independent.

## What matters
- Context size drives cost. Every request resends the whole conversation, so a long session costs more per message even for a one-line question (docs confirm).
- Cheapest habits with the best evidence: `/clear` between unrelated tasks, Sonnet by default, lower effort for simple work, specific prompts.
- Keep CLAUDE.md short (under 200 lines). Move task-specific text to skills or path-scoped `.claude/rules/`. Do not rely on `@imports` to shrink it.
- Big outputs belong outside the main context: hooks that filter logs, and subagents for verbose work. Subagent tokens still count against usage.
- Many 2026 tips are out of date. MCP tool definitions are now deferred by default, so "each server costs 10-20k tokens" claims mostly no longer hold.
- `.claudeignore` is not a real Claude Code feature. Use `permissions.deny`. One popular article retracted it in August 2026.
- Most percentages online come from vendors or single authors (Firecrawl, RTK, context-mode, Caveman). Treat them as marketing until reproduced.
- Idle sessions still cost: scheduled tasks, goal check-ins, and cache expiry after a break (docs only; no community source needed).

## Claims
| Claim | Trust | Docs | Sources |
| --- | --- | --- | --- |
| Run `/clear` when switching to unrelated work; stale context is resent on every message. | 5 - Docs state it; every guide agrees. | Confirm | docs /costs; buildtolaunch.substack.com/p/claude-code-token-optimization (2026-04-14); composio.dev/content/ways-to-cut-token-consumption-in-claude-code (2026-05-29) |
| `/compact` on a large context is itself a large request; `/clear` costs nothing when you want a fresh start. | 5 - Docs say so directly. | Confirm | docs /costs (section "Why usage climbs") |
| Keep CLAUDE.md under about 200 lines; longer files cost context and lower adherence. | 5 - Docs give the same target; several guides repeat it. | Confirm | docs /memory; buildtolaunch (2026-04-14); firecrawl.dev/blog/claude-code-token-efficiency (2026-06-05) |
| Move workflow-specific instructions from CLAUDE.md into skills, which load only when invoked. | 5 - Docs recommend it. | Confirm | docs /costs; composio (2026-05-29) |
| Path-scoped rules in `.claude/rules/` (with `paths:`) load only when matching files are touched. One case cut always-loaded rules 41% (1,358 to 807 lines). | 4 - Mechanism is in docs; the 41% is one example. | Confirm (mechanism) | docs /memory; firecrawl (2026-06-05) |
| `@imports` in CLAUDE.md save tokens. CONTRADICTED. | 1 - Docs: imported files load with the importing file. | Contradict | docs /memory ("Imports ... don't reduce its context cost") |
| `.claudeignore` cuts context by 85.5%. CONTRADICTED. | 1 - The file is not a documented feature; the buildtolaunch author says the file "does not exist" in a later correction. Number is one author's. | Contradict / not covered | firecrawl (2026-06-05); buildtolaunch correction (Aug 2026) |
| `permissions.deny` rules keep files out of Claude's reach and are the enforced layer. | 5 - Docs show deny rules such as `Read(./.env)` that stop Claude reading files (settings page, checked 2026-11-07). | Confirms (https://code.claude.com/docs/en/settings) | firecrawl (2026-06-05); buildtolaunch (2026-04-14) |
| Disable unused MCP servers (`/mcp`) and prefer CLI tools (`gh`, `aws`) over MCP. | 5 - Docs say both. | Confirm | docs /costs; buildtolaunch (2026-04-14) |
| Each MCP server adds 10-20k tokens per session. OUTDATED. | 2 - Docs say tool definitions are deferred by default now; a Reddit user measured only about 4-5k (about 10%) saved by tool search. | Contradict (as stated) | firecrawl (2026-06-05); search summary of Reddit report, April 2026; docs /costs |
| A PreToolUse hook that filters test and build output cuts tokens sharply (RTK claims 60-90%). | 4 - Docs show the pattern and "tens of thousands to hundreds"; RTK numbers are tool-author and HN-commenter claims. | Confirm (pattern) | docs /costs; buildtolaunch (2026-04-14); firecrawl (2026-06-05) |
| Use Sonnet by default, Opus only for hard problems, Haiku for simple subagents. | 5 - Docs say it; all guides agree. "Up to 75%" saving is anecdotal. | Confirm | docs /costs; composio (2026-05-29); firecrawl (2026-06-05) |
| Lower `/effort` or set `MAX_THINKING_TOKENS` (for example 8000) on simple tasks. | 4 - Docs confirm, with a catch: adaptive-reasoning models ignore nonzero budgets, and thinking cannot be turned off on the newest models. | Confirm (with limits) | docs /costs; buildtolaunch (2026-04-14); composio (2026-05-29) |
| Delegate verbose work (tests, logs, docs fetch) to subagents so only a summary returns. Subagent tokens still count. | 5 - Docs say both halves. | Confirm | docs /costs; buildtolaunch (2026-04-14) |
| Name specific files and functions in prompts instead of "improve this codebase". | 5 - Docs give the same example; no practitioner measurement. | Confirm | docs /costs; buildtolaunch (2026-04-14) |
| Plan mode first prevents expensive rework. A five-phase structured flow used 14% fewer tokens, 9% lower cost. | 3 - Docs recommend plan mode; the 14% is one benchmark reported second-hand. | Confirm (advice) | docs /costs; firecrawl citing MindStudio (2026-06-05) |
| Agent teams use about 7x the tokens of a standard session. | 5 - Docs give the figure. | Confirm | docs /costs |
| March 2026 cache bugs (`--resume`, standalone binary) inflated token use 10-20x. | 2 - Reverse-engineering write-up; Anthropic said it was investigating on 2026-03-31; no confirmed fix seen. | Not covered (docs describe cache misses generally) | pasqualepillitteri.it/en/news/596; buildtolaunch (2026-04-14) |
| Compact at about 250-300k tokens; hand off around 120k. | 2 - One author's rule of thumb, no measurement. | Not covered | firecrawl (2026-06-05) |
| Shrinking CLAUDE.md from 3,847 to 312 tokens (92%) caused no quality loss. | 2 - Vendor-published benchmark, not reproduced. | Not covered (docs only say keep it short) | firecrawl (2026-06-05) |
| A skill costs only about 30-100 tokens at startup (name and description). | 3 - Two guides agree; docs say skills load on demand but give no number. | Partly confirm | composio (2026-05-29); firecrawl (2026-06-05) |
| The Caveman skill cuts output tokens 65% on average. | 1 - Single source, tool-promoter figure. | Not covered | firecrawl (2026-06-05) |

## Anti-patterns
- Using `@imports` to "split" a big CLAUDE.md and expecting savings. Use skills or path-scoped rules.
- Creating a `.claudeignore` and trusting it. Use `permissions.deny`.
- Keeping one session open all day, then asking small questions. Each one resends everything.
- Resuming or idling long, then expecting cache hits. A break past the cache lifetime reprocesses the full context.
- Running `/compact` at the last moment on a huge context. The summary request is itself expensive.
- Leaving Opus as the default model, or leaving max effort on for routine edits.
- Spawning agent teams or many subagents for small jobs. Each has its own context.
- Installing token-saver tools on the strength of vendor percentages alone. Measure with `/usage` first.
- Copying 2025-era MCP overhead numbers into current advice.
