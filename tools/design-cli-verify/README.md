# design-cli-verify

Runtime verifier for agent-ready CLIs. Language-agnostic — works on any compiled or scripted CLI.

## Install

```bash
cd tools/design-cli-verify
bun install
```

## Usage

```bash
bun run src/verify.ts ./path/to/config.json
```

## Config

```json
{
  "bin": "./dist/demo-cli",
  "runner": null,
  "sampleReadCommand": "example list",
  "sampleMutateCommand": "example create --title test",
  "capability": "list examples",
  "knownField": "id",
  "skill": "./SKILL.md",
  "commonFlags": ["help", "version"]
}
```

- `bin` — path to the CLI binary or script (relative to the config file).
- `runner` — optional interpreter (`"bun"`, `"node"`, `"python"`, …). If null, `bin` is exec'd directly.
- `sampleReadCommand` — a read-only invocation that produces records in JSON mode.
- `sampleMutateCommand` — a mutating invocation. Used to verify `--dry-run`/`--yes` semantics.
- `capability` — natural-language phrase your `which` should resolve.
- `knownField` — a field guaranteed to exist on the read sample's records (used for `--select`).
- `skill` *(optional)* — path to a SKILL.md to validate. When set, the four `skill-*` rules run; when absent, they warn "skill not configured" without failing.
- `commonFlags` *(optional)* — additional flag names (without `--`) that the SKILL pairing rules should accept as declared without source proof. Default allowlist is just `help`, `version`. Use this for external-tool flags from installers, package managers, etc.

## Exit codes

- `0` — all rules pass.
- `1` — one or more warnings; no failures.
- `2` — one or more failures.

## Rules

| Rule                  | What it checks                                                              |
| --------------------- | --------------------------------------------------------------------------- |
| `help-runs`           | `--help` exits 0 in <3s and prints something.                              |
| `version-shape`       | `version` (or `--version`) emits a parseable semver.                       |
| `json-mode`           | `<read> --json` emits valid JSON to stdout.                                |
| `quiet-mode`          | `<read> --quiet` writes nothing to stdout.                                 |
| `agent-preset`        | `--agent` is documented in `--help` AND `--agent <read>` returns JSON.     |
| `typed-exit-codes`    | A bogus flag exits with code 2 (not 0 or 1).                               |
| `no-color-honored`    | `NO_COLOR=1` strips ANSI from output.                                      |
| `tty-autodetect`      | Piping (no PTY) produces no ANSI; bonus: stdout is JSON.                   |
| `agent-context`       | `agent-context` exists and emits `{schemaVersion, commands, flags, exitCodes}`. |
| `no-prompts`          | Mutating command without `--yes` and empty stdin doesn't hang.             |
| `which`               | `which <capability>` exits 0 and names a real subcommand.                  |
| `select`              | `<read> --json --select <knownField>` returns only that field.             |
| `completion`          | `completion bash` emits a non-empty script with no stderr.                 |
| `cache-bypass`        | If `--no-cache` is advertised in `--help`, sample command honors it.       |
| `framework-commands`  | Standard meta-commands (`version`, `completion`, `doctor`, `which`, `agent-context`) appear in `--help`. |
| `skill-flag-names`    | Every `--flag` in SKILL.md recipes is declared somewhere in the CLI (or in `commonFlags`). |
| `skill-flag-commands` | Every flag used on a command in SKILL.md is declared on that command (or as a global). |
| `skill-positional-args` | Positional-arg counts in SKILL.md recipes match the command's signature from `agent-context`. |
| `skill-unknown-commands` | Every command path in SKILL.md (recipes + `## Command Reference` inline mentions) exists in `agent-context.commands[]`. |

Failures are blocking. Warnings indicate "advisory" issues — typically a feature isn't claimed (no `--no-cache` advertised, no `skill` configured) so the corresponding rule has nothing to check.

## SKILL.md format expectations

The four `skill-*` rules expect printing-press's H2 conventions:

- **Bash recipes** in fenced ` ```bash ` / ` ```sh ` / ` ```shell ` blocks. Lines beginning with the binary name (from `agent-context.cli.name`) are tokenized as recipes. Line continuations (`\`) are merged. Output is truncated at shell operators (`|`, `&&`, `>`).
- **Inline command references** as backticked `` `<cli> <cmd>` `` mentions, but **only inside the `## Command Reference` H2 section**. This scoping prevents false positives on prose elsewhere.
- The CLI binary name comes from `agent-context.cli.name` — keep it accurate.

## agent-context schema

This verifier expects `agent-context` v2:

```json
{
  "schemaVersion": "2",
  "cli":          { "name": "...", "version": "...", "description": "..." },
  "exitCodes":    [{ "code": 0, "name": "ok" }, ...],
  "globalFlags":  [{ "name": "json", "type": "boolean", "description": "..." }, ...],
  "commands": [
    { "path": "example create",
      "description": "...",
      "flags":       [{ "name": "title", "type": "string", "description": "..." }],
      "positionals": [{ "name": "id",    "required": true }] }
  ],
  "capabilities": ["list issues", "..."]
}
```

The scaffold's `src/agent-context-builder.ts` walks the citty `subCommands` tree to emit this shape automatically.
