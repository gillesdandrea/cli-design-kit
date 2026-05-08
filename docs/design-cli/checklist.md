# CLI Audit Checklist

Each item maps to a `design-cli-verify` rule (right column). Run `bun run audit` (or the verifier directly) to check programmatically; this list is the human-readable counterpart.

## Output

- [ ] `--json` emits valid JSON to stdout, nothing on stderr (success path) — `json-mode`
- [ ] Piped stdout auto-detects and emits JSON without a flag — `tty-autodetect`
- [ ] `--quiet` writes nothing on success; exit code is the result — `quiet-mode`
- [ ] `--no-color` disables ANSI; `NO_COLOR=1` does too — `no-color-honored`
- [ ] `--select` accepts dotted paths, returns only requested fields — `select`
- [ ] `--compact` drops to high-gravity fields per command — *manual review*
- [ ] `--agent` exists and expands to the documented preset — `agent-preset`

## Errors and exit codes

- [ ] Bad flag exits 2 (not 1) — `typed-exit-codes`
- [ ] Auth failures exit 4; not-found 3; rate-limit 7; config 10 — *manual review*
- [ ] Errors include a `hint:` line in human mode — *manual review*
- [ ] Errors emit `{error: {code, message, hint}}` JSON in `--json` mode — *manual review*
- [ ] No secret material appears in error bodies — *manual review (sample-driven)*
- [ ] No raw `panic`/uncaught exception stack traces leak to stderr — *manual review*

## Introspection

- [ ] `--help` runs in <2s, exits 0, no prompts — `help-runs`
- [ ] `<cli> which <capability>` returns a real subcommand or exits 2 — `which`
- [ ] `<cli> agent-context` emits `{schemaVersion, commands, flags, exitCodes}` — `agent-context`
- [ ] `<cli> version` returns parseable semver in one line — `version-shape`
- [ ] `<cli> completion bash` emits a non-empty completion script — `completion`

## Safety

- [ ] Mutating commands support `--dry-run` and exit 0 with a preview — *manual review*
- [ ] Mutating commands support `--yes`; refuse to act in non-TTY mode without it — `no-prompts`
- [ ] No interactive prompts when `--no-input` is set or stdin is piped — `no-prompts`

## Naming

- [ ] Subcommands follow `<noun> <verb>` (`issues list`) consistently — *manual review*
- [ ] Reserved framework names (`version`, `completion`, `doctor`, `which`, `agent-context`) are present where applicable — `framework-commands`
- [ ] No collisions with `-h`, `-v`, `--help`, `--version` — *manual review*

## Configuration

- [ ] `--profile <name>` loads and applies a saved flag set — *manual review*
- [ ] Explicit flags override profile values — *manual review*
- [ ] Config sources documented (env vars, profiles, defaults), in that precedence order — *manual review*

## Caching (when applicable)

- [ ] HTTP cache exists with a TTL (default 5 min); `--no-cache` bypasses — `cache-bypass`
- [ ] Cache location documented (path, sqlite/file, etc.) — *manual review*
- [ ] If the CLI ships a `sync` command, `--data-source auto|live` is documented — *manual review*

## Distribution

- [ ] `bun install && bun run build` produces a single binary or invokable entry — *manual review*
- [ ] `--version` reflects the published version (no `0.0.0-dev` in releases) — *manual review*

## Pairing (CLI ↔ SKILL.md)

Set `"skill": "./SKILL.md"` in the verify config to enable. Skipped (warn) when absent.

- [ ] Every `--flag` in SKILL.md recipes exists in the CLI (global or per-command) — `skill-flag-names`
- [ ] Each flag is used on a command that actually accepts it — `skill-flag-commands`
- [ ] Recipe positional-arg counts match the command's signature — `skill-positional-args`
- [ ] Every command path (recipes + `## Command Reference` inline) resolves — `skill-unknown-commands`

## MCP twin

Set `"mcpArgs": ["mcp"]` in the verify config to enable. Skipped (warn) when absent.

- [ ] MCP server boots on stdio, advertises one tool per non-framework, non-group command, every tool has `name` / `description` / `inputSchema` — `mcp-twin-shape`
- [ ] Read commands carry `meta.readOnly: true` so MCP emits `readOnlyHint` — *manual review*
