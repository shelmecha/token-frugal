# Writing CLAUDE.md
Last refreshed: 2026-11-07
Sources: [memory](https://code.claude.com/docs/en/memory), [costs](https://code.claude.com/docs/en/costs), [features-overview](https://code.claude.com/docs/en/features-overview)

## What matters
- Every CLAUDE.md line that loads at start is sent on every request. [features-overview](https://code.claude.com/docs/en/features-overview#context-cost-by-feature)
- Target under 200 lines per file; longer files cost more and reduce adherence. [memory](https://code.claude.com/docs/en/memory)
- Claude Code warns at startup and in `/status` when a file is long, or when files together pass a combined limit. [memory](https://code.claude.com/docs/en/memory)
- `/doctor` proposes trims: it cuts what Claude can derive from the code and keeps pitfalls, rationale and non-default conventions. [memory](https://code.claude.com/docs/en/memory)
- Block-level HTML comments are stripped before injection, so maintainer notes there cost no tokens. [memory](https://code.claude.com/docs/en/memory)

## Rules of thumb
- Move workflow-specific detail, like PR review steps, into skills. [costs](https://code.claude.com/docs/en/costs#move-instructions-from-claudemd-to-skills)
- Add a "Compact instructions" section to say what compaction must keep. [costs](https://code.claude.com/docs/en/costs#manage-context-proactively)

## Anti-patterns
- Directory layouts, dependency lists and architecture overviews Claude can derive. [memory](https://code.claude.com/docs/en/memory)
- Using CLAUDE.md for rules that must always hold: that is a request, not a guarantee. Use a hook. [features-overview](https://code.claude.com/docs/en/features-overview)

## Example
Bad: a 40-line directory tree. Good: "Migrations are hand-written; never generate them", if that differs from the default.
