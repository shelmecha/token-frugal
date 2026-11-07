# Context window
Last refreshed: 2026-11-07
Sources: [context-window](https://code.claude.com/docs/en/context-window), [prompt-caching](https://code.claude.com/docs/en/prompt-caching), [features-overview](https://code.claude.com/docs/en/features-overview), [commands](https://code.claude.com/docs/en/commands)

## What matters
- Before you type, CLAUDE.md, auto memory, MCP tool names and skill descriptions load. [context-window](https://code.claude.com/docs/en/context-window)
- Every request re-sends the system prompt, project context and all prior messages and tool results. [prompt-caching](https://code.claude.com/docs/en/prompt-caching)
- Caching matches an exact prefix, so a change near the start recomputes everything after it. [prompt-caching](https://code.claude.com/docs/en/prompt-caching)
- `/context` shows usage as a grid, with suggestions. [commands](https://code.claude.com/docs/en/commands)
- Output styles load their full instructions on every request; the Default style loads nothing. [features-overview](https://code.claude.com/docs/en/features-overview#context-cost-by-feature)

## Rules of thumb
- Pick model and effort at the start of a session. [prompt-caching](https://code.claude.com/docs/en/prompt-caching)
- Connecting an MCP server, or disabling one in `/mcp`, invalidates the cache, so change servers between tasks. [prompt-caching](https://code.claude.com/docs/en/prompt-caching)
- Editing files in the repo and editing CLAUDE.md mid-session both keep the cache. [prompt-caching](https://code.claude.com/docs/en/prompt-caching)

## Anti-patterns
- Switching models mid-task: each model has its own cache. [prompt-caching](https://code.claude.com/docs/en/prompt-caching)
- Long idle gaps: the main conversation's TTL is one hour within a subscription's plan usage, and five minutes on credits, API keys or cloud. [prompt-caching](https://code.claude.com/docs/en/prompt-caching#which-ttl-each-request-gets)

## Example
Bad: `/model` back and forth during a long task. Good: choose the model first, then switch at a task break.
