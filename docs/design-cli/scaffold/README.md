# demo-cli

Scaffolded by [`/design-cli`](../../../.claude/commands/design-cli.md). Agent-ready by default.

## Quick start

```bash
bun install
bun run dev -- --help                  # explore (humans)
bun run dev -- agent-context           # introspect (agents)
bun run dev -- which "list examples"   # capability lookup
bun run build                          # compile to ./dist/demo-cli
./dist/demo-cli example list --agent   # JSON, compact, no prompts
bun run audit                          # run the design-cli verifier
```

## What's wired

| Pattern                        | Where                                   |
| ------------------------------ | --------------------------------------- |
| `--agent` preset               | `src/agent-preset.ts`                   |
| Auto-JSON when piped           | `src/output.ts` (`pickMode`)            |
| `NO_COLOR` honored             | `src/output.ts` (`colorEnabled`)        |
| Typed exit codes + `fail()`    | `src/errors.ts`                         |
| `--select` (dotted paths)      | `src/select.ts` + `output.ts`           |
| `--compact` whitelist          | `applyCompact` in `src/output.ts`       |
| `which`                        | `src/commands/which.ts`                 |
| `agent-context`                | `src/commands/agent-context.ts`         |
| `completion bash\|zsh\|fish`   | `src/commands/completion.ts`            |
| `doctor`, `profile`, `version` | `src/commands/{doctor,profile,version}.ts` |
| `--dry-run` / `--yes`          | `src/commands/example-create.ts`        |
| HTTP TTL cache                 | `src/cache.ts` (5-min default)          |
| Local sync store               | `src/store.ts` + `src/commands/sync.ts` |
| `--data-source auto\|live`     | `readExamples` in `src/store.ts`        |
| Stdin handling                 | `src/stdin.ts`                          |

## What to change to make it yours

1. **Rename**. Search-replace `demo-cli` → `your-cli`. Update `package.json`, `bin`, `cli.ts`, completion script, `agent-context`, `feedback` URL.
2. **Wire your API**. Replace `sampleLive` in `commands/example-list.ts` and the stub in `commands/sync.ts` with `cachedFetch` + your endpoint. Use `classifyHttpError()` to map status → `fail(kind, …)`.
3. **Edit the capability index**. `src/commands/which.ts` — add one entry per novel feature. Same list goes into `agent-context`'s `capabilities`.
4. **Define `--compact` fields per command**. The default whitelist in `example-list.ts` is `id, title, status, updatedAt` — pick yours.
5. **Climb the [Creativity Ladder](../principles.md#the-creativity-ladder)**. Add rung-3 commands (`sync`, `search`) when reads dominate. Add rung-4 (analytics: `stale`, `health`, `today`) once you have a synced store. Rung 5 (`similar`, `velocity`) is a research project — earn it.

## CLI ↔ SKILL.md ↔ MCP twin

The scaffold ships three coordinated surfaces from one source tree:

1. **CLI** — `dist/demo-cli`. Shell agents and humans use this directly.
2. **SKILL.md** — agent-facing manual. Cross-checked against the CLI by `skill-*` rules.
3. **MCP twin** — `demo-cli mcp` boots an MCP server on stdio. IDE agents (Claude Code, Cursor) speak this. The server reads `agent-context` at startup, generates one tool per non-framework command, and shells out to itself for each call.

Install in Claude Code:

```bash
claude mcp add demo-cli "$(pwd)/dist/demo-cli" mcp
```

## CLI ↔ SKILL.md pairing

`SKILL.md` is the agent-facing manual. It must stay in lockstep with the CLI — every flag mentioned must exist; every command path must resolve. The verifier enforces this:

| Rule                      | Catches                                                                  |
| ------------------------- | ------------------------------------------------------------------------ |
| `skill-flag-names`        | flags in SKILL.md not declared anywhere in the CLI                       |
| `skill-flag-commands`     | a flag used on a command but not declared on it (or as a global)          |
| `skill-positional-args`   | positional-arg counts in recipes that don't match the command signature   |
| `skill-unknown-commands`  | command paths in `## Command Reference` or recipes that don't exist       |

When you edit the CLI, run `bun run audit` — it cross-checks SKILL.md against the live `agent-context` output. The four pairing rules sit alongside the 15 agent-readiness rules.

## MCP twin (deferred)

A future `/design-cli pair <cli-path>` will generate a citty→MCP bridge so the CLI's commands surface as MCP tools.
