---
name: demo-cli
description: "demo-cli — agent-ready CLI scaffolded by /design-cli. Manage example records, run analytics, sync a local store. Trigger phrases: 'list examples', 'create an example', 'sync demo data', 'check demo CLI health'."
argument-hint: "<command> [args]"
allowed-tools: "Read Bash"
---

## When to Use

Use this CLI when the user asks to read or mutate example records: list them, create one, run a sync, or diagnose the local environment. The CLI is human-friendly by default and switches to agent mode under `--agent`. Prefer this CLI's commands over ad-hoc shell pipelines for anything in its capability index.

## Command Reference

- `demo-cli example list` — list example records (read-only; honors `--select`, `--compact`, `--data-source`)
- `demo-cli example create` — create one example (mutating; honors `--dry-run`, `--yes`)
- `demo-cli sync` — populate the local store from the API
- `demo-cli which` — capability lookup; resolves a natural-language phrase to a command path
- `demo-cli agent-context` — emit the CLI's machine-readable schema (versioned JSON)
- `demo-cli doctor` — diagnose env, credentials, and connectivity
- `demo-cli version` — print parseable semver
- `demo-cli completion` — output a shell completion script (bash, zsh, fish)
- `demo-cli profile save` — save a named flag profile
- `demo-cli profile list` — list saved profiles
- `demo-cli profile delete` — delete a profile
- `demo-cli feedback` — open a prefilled GitHub issue URL

## Recipes

### List in agent mode

```bash
demo-cli example list --agent
```

The `--agent` preset expands to `--json --compact --no-input --no-color --yes`, so the output is structured, terse, and free of TTY surprises.

### Project specific fields

```bash
demo-cli example list --json --select id,title
```

`--select` accepts dotted paths (`a.b.c`) and traverses arrays element-wise.

### Create with dry-run

```bash
demo-cli example create --title "draft" --dry-run
```

Mutating commands always support `--dry-run` to preview, and `--yes` to skip confirmation in non-interactive mode.

### Force a fresh fetch

```bash
demo-cli example list --no-cache --data-source live
```

`--no-cache` bypasses the 5-minute HTTP cache. `--data-source live` forces a network call instead of reading from the local store.

### Capability lookup

```bash
demo-cli which "list examples"
```

Exit code 0 with the matching command path on stdout; exit 2 if no confident match.

### Sync the local store

```bash
demo-cli sync
```

After sync, read commands run offline by default (`--data-source auto`).

### Self-diagnose

```bash
demo-cli doctor
```

Exit 0 if all checks pass; exit 4 on auth issues; exit 5 on connectivity issues.

## Agent Mode

`--agent` is a preset, not a single behavior. It expands to:

| Flag         | Effect                                                                |
| ------------ | --------------------------------------------------------------------- |
| `--json`     | Force JSON output regardless of TTY                                   |
| `--compact`  | Drop to high-gravity fields per command (id, title, status, updatedAt) |
| `--no-input` | Fail instead of prompting                                              |
| `--no-color` | Disable ANSI escapes                                                   |
| `--yes`      | Skip confirmation prompts                                              |

For complete schema introspection, run `demo-cli agent-context` — it emits `{schemaVersion, cli, exitCodes, globalFlags, commands, capabilities}`. Treat that JSON as the contract.

## Exit Codes

| Code | Meaning             | Agent should…                          |
| ---- | ------------------- | -------------------------------------- |
| 0    | Success             | Continue                               |
| 2    | Usage error         | Re-read help, fix the invocation       |
| 3    | Not found           | Stop; the resource doesn't exist       |
| 4    | Auth failure        | Refresh credentials, run `doctor`      |
| 5    | Upstream API error  | Retry with backoff                     |
| 7    | Rate limited        | Back off; respect `Retry-After`        |
| 10   | Configuration error | Stop; ask the user                     |
