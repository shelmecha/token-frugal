---
name: token-frugal
description: Answers Claude Code token, context and CLAUDE.md questions from evidence, and finds unneeded files in ~/.claude. Use for cost or tidying.
---

Hard rule: never edit a file or setting without showing the diff and getting a yes.
Honesty rule: label every number measured, estimate or unknown. Say "unknown" rather than guess. Report savings that are small or not worth the loss.

| Request | Do |
|---|---|
| Token or context question | Read `references/00-index.md`, then only the matching topic. Answer with its source links. Say so if it is not covered. |
| What should I clean, or why is it expensive | Run `node ${CLAUDE_SKILL_DIR}/scripts/slither-session.js`. Rank by measured tokens and calls. |
| Audit instruction files | Run `node ${CLAUDE_SKILL_DIR}/scripts/slither-local.js`. Counts are estimates; conflicts need a human check. |
| Test removing MCP servers | Run `node ${CLAUDE_SKILL_DIR}/scripts/measure.js whatif -- "<server>"`. It changes no settings and spends a little usage. |
| Fix | Run `propose.js`, show the diff and estimate, wait for a yes, then `apply.js <id> --approved`. |
| Before and after | `measure.js baseline <name>`, make the change, then `measure.js report <name>`. |
| Savings so far, all projects | `node ${CLAUDE_SKILL_DIR}/scripts/measure.js history`. What-ifs are labelled as probes. |
| What do people online say? | Read `references/community-tips.md`. Give the trust score; official docs win. |
| What files can I clean / tidy ~/.claude | Run `node ${CLAUDE_SKILL_DIR}/scripts/slither-files.js`. Rank by size. Run `files-apply.js propose`, show the list, wait for a yes, then `files-apply.js <id> --approved` (Recycle Bin). Other types are flag only. |
| Turn off the start-of-session nudge | Set env `TOKEN_FRUGAL_NUDGE=off`. The nudge runs once a day per project, plus a ~/.claude files check when started there, and is silent when clean. |
| Refresh references | Run `slither-docs.js`. It writes to `references/.staged/`. Never overwrite a topic silently. |
