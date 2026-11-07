# Cost and measurement
Last refreshed: 2026-11-07
Sources: [costs](https://code.claude.com/docs/en/costs), [commands](https://code.claude.com/docs/en/commands)

## What matters
- Cost scales with context size. [costs](https://code.claude.com/docs/en/costs#reduce-token-usage)
- Enterprise average: about $13 per developer per active day; under $30 for 90% of users. [costs](https://code.claude.com/docs/en/costs)
- `/usage` shows session cost, plan limits and activity. [commands](https://code.claude.com/docs/en/commands)
- The status line can show context usage continuously. [costs](https://code.claude.com/docs/en/costs#manage-context-proactively)
- Thinking bills as output and can reach tens of thousands of tokens per request. [costs](https://code.claude.com/docs/en/costs#adjust-extended-thinking)
- Session recap, idle compaction and prompt suggestions can use tokens in the background. [costs](https://code.claude.com/docs/en/costs#background-token-usage)

## Rules of thumb
- Use Sonnet for most coding and keep Opus for complex reasoning. [costs](https://code.claude.com/docs/en/costs#choose-the-right-model)
- Lower effort with `/effort` for simple tasks. [costs](https://code.claude.com/docs/en/costs#adjust-extended-thinking)
- Use plan mode for complex work, and press Escape early when off course. [costs](https://code.claude.com/docs/en/costs#work-efficiently-on-complex-tasks)

## Anti-patterns
- Letting Claude run far down a wrong path before correcting it. [costs](https://code.claude.com/docs/en/costs#work-efficiently-on-complex-tasks)

## Example
Bad: Opus at high effort for a rename. Good: a smaller model or lower effort, with `/usage` to check the session.
