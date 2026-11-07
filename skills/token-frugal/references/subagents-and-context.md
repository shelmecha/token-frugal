# Subagents and context
Last refreshed: 2026-11-07
Sources: [sub-agents](https://code.claude.com/docs/en/sub-agents), [costs](https://code.claude.com/docs/en/costs), [context-window](https://code.claude.com/docs/en/context-window), [features-overview](https://code.claude.com/docs/en/features-overview)

## What matters
- A subagent has its own context window; only a summary and small trailer return. [context-window](https://code.claude.com/docs/en/context-window)
- Its requests still count toward the same usage limits. [sub-agents](https://code.claude.com/docs/en/sub-agents)
- Subagent descriptions take up context; a warning appears above 15,000 tokens combined. [sub-agents](https://code.claude.com/docs/en/sub-agents)
- Skills listed in a subagent's `skills` field load in full at launch. [features-overview](https://code.claude.com/docs/en/features-overview)
- A switch to Opus also applies to subagents that inherit the session model. [costs](https://code.claude.com/docs/en/costs#choose-the-right-model)
- Agent teams use about 7x more tokens than standard sessions when teammates run in plan mode. [costs](https://code.claude.com/docs/en/costs#manage-agent-team-costs)

## Rules of thumb
- Delegate tests, docs fetching and log processing. [costs](https://code.claude.com/docs/en/costs#delegate-verbose-operations-to-subagents)
- Set `model: haiku` for simple subagent tasks. [costs](https://code.claude.com/docs/en/costs#choose-the-right-model)
- Keep descriptions short; move detail to the system prompt. [sub-agents](https://code.claude.com/docs/en/sub-agents)

## Anti-patterns
- Ignoring subagent spend because it is out of the main context. [costs](https://code.claude.com/docs/en/costs#delegate-verbose-operations-to-subagents)

## Example
Bad: reading a 10,000-line log in the main session. Good: a Haiku subagent returning the errors.
