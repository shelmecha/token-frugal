# Skills vs CLAUDE.md
Last refreshed: 2026-11-07
Sources: [features-overview](https://code.claude.com/docs/en/features-overview), [skills](https://code.claude.com/docs/en/skills), [costs](https://code.claude.com/docs/en/costs), [context-window](https://code.claude.com/docs/en/context-window)

## What matters
- CLAUDE.md costs tokens on every request; skills cost a description, then full content when used. [features-overview](https://code.claude.com/docs/en/features-overview#context-cost-by-feature)
- `disable-model-invocation: true` keeps a description out of context until you invoke the skill. [skills](https://code.claude.com/docs/en/skills)
- Description plus `when_to_use` is truncated at 1,536 characters in the listing, so put the key use first. [skills](https://code.claude.com/docs/en/skills)
- Hooks cost nothing unless they return output. [features-overview](https://code.claude.com/docs/en/features-overview#context-cost-by-feature)
- Skill bodies return after compaction at up to 5,000 tokens each and 25,000 total, keeping the start. [context-window](https://code.claude.com/docs/en/context-window)

## Rules of thumb
- CLAUDE.md: facts needed in every session. Skill: workflows and reference material. [costs](https://code.claude.com/docs/en/costs#move-instructions-from-claudemd-to-skills)
- Put the most important instructions near the top of `SKILL.md`. [context-window](https://code.claude.com/docs/en/context-window)
- Use a hook to filter noisy output before Claude sees it. [costs](https://code.claude.com/docs/en/costs#offload-processing-to-hooks-and-skills)

## Anti-patterns
- Task skills with side effects left open to automatic invocation. [skills](https://code.claude.com/docs/en/skills)

## Example
Bad: a 60-line release checklist in CLAUDE.md. Good: a `/release` skill with `disable-model-invocation: true`.
