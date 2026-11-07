# Compaction and sessions
Last refreshed: 2026-11-07
Sources: [context-window](https://code.claude.com/docs/en/context-window), [costs](https://code.claude.com/docs/en/costs), [prompt-caching](https://code.claude.com/docs/en/prompt-caching), [commands](https://code.claude.com/docs/en/commands)

## What matters
- Auto-compaction runs near the limit; `/autocompact 500k` sets when. [context-window](https://code.claude.com/docs/en/context-window)
- Root CLAUDE.md, unscoped rules and auto memory are re-injected from disk. [context-window](https://code.claude.com/docs/en/context-window)
- Up to five recent files return; any over 5,000 tokens returns as a path only. [context-window](https://code.claude.com/docs/en/context-window)
- Context added earlier by hooks is summarized with the rest. [context-window](https://code.claude.com/docs/en/context-window)
- Long idle conversations on the one-hour TTL can compact; `idleCompaction: false` turns that off. [prompt-caching](https://code.claude.com/docs/en/prompt-caching)
- `/rewind` hits the cache, because the remaining history matches. [prompt-caching](https://code.claude.com/docs/en/prompt-caching)

## Rules of thumb
- `/clear` between unrelated tasks; `/rename` first so you can `/resume` later. [costs](https://code.claude.com/docs/en/costs#manage-context-proactively)
- `/compact focus on ...` before a long new task. [context-window](https://code.claude.com/docs/en/context-window)
- Save `/compact` for natural breaks. [prompt-caching](https://code.claude.com/docs/en/prompt-caching)
- Use `/btw` for a side question that stays out of the conversation. [commands](https://code.claude.com/docs/en/commands)

## Anti-patterns
- Carrying old conversation into new work: it costs tokens on every message. [context-window](https://code.claude.com/docs/en/context-window)

## Example
Bad: starting a new feature after an unrelated long bug fix. Good: `/rename bug-fix`, `/clear`, then start.
