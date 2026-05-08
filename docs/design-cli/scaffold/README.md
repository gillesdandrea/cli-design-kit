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

## Pairing follow-up (deferred)

The printing-press toolchain pairs every CLI with a `SKILL.md` and an MCP twin. Not scaffolded here. When you're ready: a future `/design-cli pair <cli-path>` mode will generate a verified SKILL.md and a citty→MCP bridge.
