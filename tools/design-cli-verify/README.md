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
  "knownField": "id"
}
```

- `bin` — path to the CLI binary or script (relative to the config file).
- `runner` — optional interpreter (`"bun"`, `"node"`, `"python"`, …). If null, `bin` is exec'd directly.
- `sampleReadCommand` — a read-only invocation that produces records in JSON mode.
- `sampleMutateCommand` — a mutating invocation. Used to verify `--dry-run`/`--yes` semantics.
- `capability` — natural-language phrase your `which` should resolve.
- `knownField` — a field guaranteed to exist on the read sample's records (used for `--select`).

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

Failures are blocking. Warnings indicate "advisory" issues — typically a feature isn't claimed (no `--no-cache` advertised) so the corresponding rule has nothing to check.
