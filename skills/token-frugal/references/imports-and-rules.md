# Imports and rules
Last refreshed: 2026-11-07
Sources: [memory](https://code.claude.com/docs/en/memory), [context-window](https://code.claude.com/docs/en/context-window), [prompt-caching](https://code.claude.com/docs/en/prompt-caching)

## What matters
- `@path` imports organize a long file but do not reduce its cost, because they load with the importing file. [memory](https://code.claude.com/docs/en/memory)
- Imports resolve relative to the importing file, and recurse at most four hops. [memory](https://code.claude.com/docs/en/memory#import-additional-files)
- Paths in backticks or code blocks are not imported. [memory](https://code.claude.com/docs/en/memory#import-additional-files)
- Rules with `paths:` frontmatter load only when Claude works with matching files. [memory](https://code.claude.com/docs/en/memory)
- Unscoped rules are part of project context, alongside CLAUDE.md. [prompt-caching](https://code.claude.com/docs/en/prompt-caching)
- Path-scoped rules are summarized away by compaction, then reload on demand. [context-window](https://code.claude.com/docs/en/context-window)

## Rules of thumb
- To save tokens, move text to a path-scoped rule or a skill, not an import. [memory](https://code.claude.com/docs/en/memory)
- Keep each path-scoped file within its per-file limit, because only the start arrives. [memory](https://code.claude.com/docs/en/memory)

## Anti-patterns
- Splitting CLAUDE.md into imports and expecting savings. [memory](https://code.claude.com/docs/en/memory)
- A must-persist rule with `paths:`: drop the frontmatter or move it to the root file. [context-window](https://code.claude.com/docs/en/context-window)

## Example
Bad: `@docs/api-rules.md`, loaded every session. Good: `.claude/rules/api.md` scoped with `paths:` to the API folder.
