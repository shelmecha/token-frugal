# CLAUDE.md hierarchy
Last refreshed: 2026-11-07
Sources: [memory](https://code.claude.com/docs/en/memory), [features-overview](https://code.claude.com/docs/en/features-overview)

## What matters
- Files add up; a lower level does not replace a higher one. All levels contribute at once, and Claude uses judgment on conflicts. [features-overview](https://code.claude.com/docs/en/features-overview)
- CLAUDE.md and CLAUDE.local.md at or above the working directory load at launch. [memory](https://code.claude.com/docs/en/memory#how-claude-md-files-load)
- Across the tree, content is ordered from the filesystem root down to the working directory. [memory](https://code.claude.com/docs/en/memory#how-claude-md-files-load)
- Subdirectory files load when Claude reads, writes or edits a file in that subdirectory. [memory](https://code.claude.com/docs/en/memory#how-claude-md-files-load)
- Each launch-time file arrives whole up to 4 MiB; above that, none of it loads. [memory](https://code.claude.com/docs/en/memory)
- Subdirectory files and path-scoped rules have a smaller limit: 40,000 characters on a 200K window, and only the start arrives. [memory](https://code.claude.com/docs/en/memory)

## Rules of thumb
- Put a rule at the narrowest level that still covers it. [memory](https://code.claude.com/docs/en/memory)
- In monorepos, skip other teams' files with `claudeMdExcludes`. [memory](https://code.claude.com/docs/en/memory#exclude-specific-claude-md-files)

## Anti-patterns
- Conflicting levels: Claude may pick one instruction arbitrarily. [memory](https://code.claude.com/docs/en/memory)

## Example
Bad: "use npm" in the global file and "use pnpm" in the project file. Good: only the project file says it.
