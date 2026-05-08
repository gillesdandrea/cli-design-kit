# CLI Design Principles for Humans + Agents

> Agent-native design is just good CLI design taken seriously.
> — paraphrased from `cli-printing-press/AGENTS.md`

## The core tension

Humans and AI agents want opposite things from a CLI:

| Humans want                                    | Agents want                              |
| ---------------------------------------------- | ---------------------------------------- |
| Spinners, colors, progress bars                | No ANSI; deterministic byte streams      |
| Helpful prose, examples in `--help`            | A schema they can introspect             |
| Confirmation prompts on dangerous ops          | Never prompt; honor `--yes` / `--dry-run` |
| Tolerant input, fuzzy errors                   | Strict input, classified errors          |
| One-line summaries                             | Full payloads they can project from      |
| Discover by trying things                      | Discover by reading a manifest           |

Bad CLIs pick a side. Good CLIs offer both modes and switch deterministically — usually based on TTY detection plus a small set of override flags. The patterns below codify how to do that without bolting on `--json` as an afterthought.

## The 13 patterns

### 1. Single `--agent` preset flag

A single flag that expands to the agent posture: `--json --compact --no-input --no-color --yes`. Agents need one thing to remember; humans never see it. The preset is a *contract*: documented, stable, and never silently changes its expansion. If you add `--no-pager` to the agent posture, it's a minor version bump on the CLI.

### 2. Auto-JSON when piped

`process.stdout.isTTY === false` ⇒ JSON by default. No flag needed. Pipe-to-jq just works. Override with `--json` (force JSON when on a TTY) and `--no-color` (kill ANSI even on a TTY). `NO_COLOR=1` env var is honored — Bruce Williams's [no-color.org](https://no-color.org/) convention. Never emit ANSI on stderr-only either: that breaks `2>file`.

### 3. Typed exit codes

Agents branch on exit codes; humans glance at them. The printing-press canon, plus a bit:

| Code | Meaning              | Agent should…                          |
| ---- | -------------------- | -------------------------------------- |
| 0    | Success              | Continue                               |
| 1    | Generic error        | Avoid emitting this — always classify  |
| 2    | Usage error          | Re-read help, fix the invocation       |
| 3    | Not found            | Stop; the resource doesn't exist       |
| 4    | Auth failure         | Refresh credentials, run `doctor`      |
| 5    | Upstream API error   | Retry with backoff                     |
| 7    | Rate limited         | Back off; respect `Retry-After`        |
| 10   | Configuration error  | Stop; ask the user                     |

Source: `cli-printing-press/internal/cli/helpers.go:93-98`. Document them in `--help` and `agent-context`.

### 4. Three-layer introspection

Don't make agents parse `--help`. Provide three layers:

1. **`--help`** — for humans. Cobra-style command tree, examples, "see also."
2. **`<cli> which <capability>`** — natural-language → command lookup. Exit 0 with the command name; exit 2 with no match. Agents call this with the user's words.
3. **`<cli> agent-context`** — versioned JSON dump of every command, flag, exit code, and capability. `{ "schemaVersion": "2", "commands": [...], "flags": [...], "exitCodes": [...] }`. This is the schema. Bump `schemaVersion` on breaking changes.

Together they make the CLI self-describing. README and SKILL.md become enrichment, not requirements.

### 5. Errors with hints + classified codes

A failed command should:

- Exit with a typed code (#3 above).
- In TTY mode, print a one-line cause + a `hint:` block telling the human what to do next.
- In `--json` mode, write `{ "error": { "code": "auth", "message": "…", "hint": "…" } }` to stderr and a typed exit code.
- **Never echo secrets back.** Run API response bodies through a sanitizer (mask anything that looks like a token, key, or password) before logging. `cli-printing-press/internal/cliutil` has `SanitizeErrorBody` — port it.

### 6. `--dry-run` and `--yes`; never prompt by default

Interactive prompts are agent-hostile. Two flags eliminate them:

- `--dry-run` — preview the request/operation without executing. For mutations, print the diff and exit 0.
- `--yes` (or `--no-input`) — skip all confirmations. For agents and CI.

Default behavior of mutations should be: print what would happen, require explicit `--launch` / `--send` / `--confirm` (whichever verb is honest) to actually act. Don't silently mutate when stdin is a pipe.

### 7. `--select` with dotted paths

Token economy. `--select id,name` returns only those fields. Dotted paths descend: `--select items.id,items.owner.name`. Arrays traverse element-wise. Worked example from Linear (`linear/SKILL.md:147-151`):

```
linear-pp-cli today --json --select identifier,title,priority,cycle.endsAt
```

`--select` and `--compact` (#8) are different: `--select` is *what fields*; `--compact` is *which mode*. Both compose.

### 8. `--compact` for token economy

A *mode* that drops to high-gravity fields only — typically `id`, `name`/`title`, `status`, `created_at`, `updated_at`. Each command defines its own compact whitelist. Reduces output by 60–80% (per printing-press's measurements). Default for the agent posture (`--agent` includes it). Never used alone by humans, who get full output unless they ask for less.

### 9. Layered caching

Three layers, picked à la carte based on the API:

- **HTTP TTL cache.** GET responses cached on disk (5 min default). Bypass with `--no-cache`. Mostly invisible — the speedup is the feature.
- **Local sync store.** A `<cli> sync` command populates a local SQLite DB. Read commands then run offline. Worth it when reads dominate writes and the dataset fits locally (issue trackers, product catalogs). Skip for streaming/realtime APIs.
- **`--data-source auto|live`.** Explicit selector on read commands. `auto` (default) hits the local store with live fallback; `live` forces a network call for time-sensitive fields.

Caches must be visible (advertised in `--help`), bypassable (`--no-cache`), and invalidatable (`<cli> cache clear` is a friendly addition). Silent caches are bugs.

### 10. Shell completion

`<cli> completion bash|zsh|fish` emits a script users source. Cobra gives this for free; in Node/citty you wire it manually (`tabtab`, `omelette`, or a small hand-rolled emitter). Costs almost nothing, signals that the CLI is serious, and trains tab-completion's discoverability for humans.

### 11. The framework command set

Reserve and ship most of these. They're meta-commands every "serious" CLI provides:

| Command         | Purpose                                                    |
| --------------- | ---------------------------------------------------------- |
| `version`       | Semver + git sha + build date. One line, parseable.        |
| `completion`    | Shell completion (#10).                                    |
| `doctor`        | Diagnose env, creds, connectivity. Exit 0 ok, 4 auth, etc. |
| `auth`          | login / logout / status. Sub-commands.                     |
| `profile`       | Save/load/list named flag presets (config without dotfiles). |
| `which`         | Capability lookup (#4).                                    |
| `agent-context` | Schema dump (#4).                                          |
| `feedback`      | Open the GitHub issue URL prefilled with version/env.      |

Source: `cli-printing-press/AGENTS.md:28`. Reserve the names even if you don't ship a command yet — agents and humans rely on them being there.

### 12. Verb-noun + `which` to flatten discovery

Hierarchical commands are great for grouping (`issues list`, `issues create`, `cycles compare`) but bad for discovery — agents don't know to look under `cycles`. Solve this with `which`:

```
$ linear-pp-cli which "compare two cycles"
cycles compare    Side-by-side metrics between any two cycles
```

The `which` index is hand-curated (or generated from a feature manifest). Ranking: exact token match +3, substring +2, command group +1. Top match wins; ties produce a list with exit 0.

### 13. Pair the CLI with a SKILL.md (or equivalent prompt)

The CLI is the machinery; the SKILL.md (or `.cursor/rules/*.md`, or `AGENTS.md`) is the agent's manual. They must stay in lockstep — every flag in the prompt must exist; every command path must resolve. Enforce this with a verifier in CI.

`tools/design-cli-verify` ships four `skill-*` rules that cross-check SKILL.md against the CLI's `agent-context` output (so they don't need to parse source):

- `skill-flag-names` — every `--flag` in SKILL.md recipes is declared in `globalFlags[]` ∪ any `command.flags[]` (or in the user's `commonFlags` allowlist).
- `skill-flag-commands` — every flag used on a specific command is declared on that command, not on a sibling.
- `skill-positional-args` — positional counts in recipes match `command.positionals[]`.
- `skill-unknown-commands` — every command path in recipes and in `## Command Reference` inline mentions exists in `commands[].path`.

See `docs/design-cli/scaffold/SKILL.md` for the template the scaffold ships, and `tools/design-cli-verify/README.md` for the parsing rules (H2 scoping, recipe extraction, COMMON_FLAGS allowlist).

## The Creativity Ladder

Most CLIs stop at rung 1. Each rung up unlocks more agent leverage.

| Rung | What it is                                | Examples (Linear)                               |
| ---- | ----------------------------------------- | ----------------------------------------------- |
| 1    | API wrapper commands                      | `issues list`, `issues create`, `cycles get`    |
| 2    | Output formatting                         | `--json`, `--select`, `--compact`, `--csv`      |
| 3    | Local persistence / sync                  | `sync`, `search`, `sql` (read-only on store)    |
| 4    | Domain analytics                          | `stale`, `orphans`, `health`, `bottleneck`, `today` |
| 5    | Behavioral insights                       | `similar`, `velocity`, `cycles compare`         |

Climbing is judgment, not formula. Rung 3 is worth it when reads dominate and data fits locally; rung 4 needs domain understanding (what does *stale* mean for *your* API?); rung 5 is research-grade. The Creativity Ladder is the diagnostic at the end of every guided session: "you stopped at rung N — here's what rung N+1 would add."

## Anti-patterns

- **Interactive prompts by default.** `inquirer.prompt(...)` without a `--yes` skip. Agents hang.
- **ANSI in piped output.** Always check `process.stdout.isTTY` *and* `process.env.NO_COLOR`.
- **`panic` / uncaught throws.** Crash dumps aren't error messages. Wrap, classify, exit code.
- **Help text as the only spec.** `agent-context` exists so agents don't have to scrape `--help`.
- **Secrets in error bodies.** Sanitize before logging. Always.
- **Reserved-flag collisions.** Don't redefine `-h`, `-v`, `--help`, `--version` to mean something else.
- **Silent caches.** A cache without `--no-cache` and without docs is a bug factory.
- **Generic exit code 1.** It tells agents nothing. Classify or use 2.
- **Output to stderr that should be stdout** (or vice versa). Stdout is the data; stderr is the explanation. Pipes break otherwise.
- **Versionless schemas.** `agent-context` without a `schemaVersion` field is a breaking change waiting to happen.
