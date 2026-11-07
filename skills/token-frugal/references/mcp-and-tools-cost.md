# MCP and tool cost
Last refreshed: 2026-11-07
Sources: [mcp](https://code.claude.com/docs/en/mcp), [costs](https://code.claude.com/docs/en/costs), [prompt-caching](https://code.claude.com/docs/en/prompt-caching)

## What matters
- MCP tool definitions are deferred by default: only names and server instructions load until used. [costs](https://code.claude.com/docs/en/costs#reduce-mcp-server-overhead)
- So adding servers has minimal impact where tool search is on. It is unsupported on Azure-hosted Foundry deployments, and `CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS` keeps it off. [mcp](https://code.claude.com/docs/en/mcp#scale-with-mcp-tool-search)
- Output warns above 10,000 tokens and is limited to 25,000 by default; `MAX_MCP_OUTPUT_TOKENS` changes it. [mcp](https://code.claude.com/docs/en/mcp#mcp-output-limits-and-warnings)
- Oversized successful results go to a file, with the path left in the conversation. [mcp](https://code.claude.com/docs/en/mcp#mcp-output-limits-and-warnings)

## Rules of thumb
- Prefer CLIs like `gh` and `aws`, which add no per-tool listing. [costs](https://code.claude.com/docs/en/costs#reduce-mcp-server-overhead)
- Run `/context` to see cost and `/mcp` to disable unused servers. [costs](https://code.claude.com/docs/en/costs#reduce-mcp-server-overhead)
- Disable servers between tasks, because removal invalidates the cache. [prompt-caching](https://code.claude.com/docs/en/prompt-caching)

## Anti-patterns
- Leaving servers you do not use enabled. [costs](https://code.claude.com/docs/en/costs#reduce-mcp-server-overhead)

## Example
Bad: a GitHub MCP server for occasional PR reads. Good: `gh pr view`.
