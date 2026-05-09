---
description: Design a CLI for both humans and AI agents. Modes — guided (default), audit <path>, scaffold <name>.
argument-hint: "[audit <path> | scaffold <name>]"
---

You are helping the user design or evaluate a CLI that works equally well for humans and for AI agents. Your guide is the printing-press philosophy at `${CLAUDE_PLUGIN_ROOT}/docs/design-cli/principles.md`: **agent-native design is just good CLI design taken seriously.** Humans and agents want opposite things; the patterns below let one CLI serve both modes deterministically.

## Mode dispatch

Parse `$ARGUMENTS`:

- `audit <path>` → **Audit mode** (review an existing CLI)
- `scaffold <name>` → **Scaffold mode** (emit a new citty CLI)
- otherwise → **Guided mode** (talk through design)

Tell the user which mode you've picked in one sentence. Then proceed.

## Loading rules

All plugin-internal paths below use `${CLAUDE_PLUGIN_ROOT}`. Resolve it once at the start of the session via `echo "${CLAUDE_PLUGIN_ROOT}"` and use the resolved absolute path in subsequent `Read` calls.

Don't read the reference docs in full upfront. Use them on demand:

- `${CLAUDE_PLUGIN_ROOT}/docs/design-cli/principles.md` — read the section headings always; deep-Read a section only when the user (or your reasoning) needs it.
- `${CLAUDE_PLUGIN_ROOT}/docs/design-cli/recipes.md` — only read in **scaffold** and **guided** modes when you're about to show citty code.
- `${CLAUDE_PLUGIN_ROOT}/docs/design-cli/checklist.md` — Read in **audit** mode after the verifier runs, to map rule IDs back to checklist items.

The verifier at `${CLAUDE_PLUGIN_ROOT}/tools/design-cli-verify/src/verify.ts` is **executed** in audit mode (Bash), never Read.

## Guided mode

Walk the user through, in order:

1. **Domain and audience.** What API or domain? Who runs this CLI — humans, agents, or both? (Default: both.)
2. **The Creativity Ladder rung.** Ask which rung they're aiming for (1=API wrapper → 5=behavioral insights). If they say "1", challenge: rung 2 (`--json`/`--select`/`--compact`) costs almost nothing. If they say "3+", verify reads dominate writes and the dataset fits on disk before committing to a `sync` store.
3. **Command tree.** Propose verb-noun groupings (`<noun> <verb>`). Pull the framework command set from `principles.md` pattern #11 and confirm which to ship: `version`, `completion`, `doctor`, `which`, `agent-context`, `profile`, `feedback`. Reserve the names even if not all shipped.
4. **Flag set.** Always include the universal globals (`--json`, `--compact`, `--select`, `--quiet`, `--no-color`, `--no-input`, `--yes`, `--dry-run`, `--no-cache`, `--data-source`, `--agent`, `--profile`). Point at recipe 0 (`${CLAUDE_PLUGIN_ROOT}/docs/design-cli/recipes.md#0--sharedglobal-args-helper`) for the citty syntax.
5. **Exit codes.** Restate the canon (0/2/3/4/5/7/10) and ask whether any domain-specific codes are needed.
6. **Errors.** Confirm `fail()` is the only path to non-zero exits — no raw `throw`. Ask whether their API has auth/rate-limit shapes that need a custom classifier.
7. **Caching.** Three layers: HTTP TTL, local sync store, `--data-source`. Pick à la carte. If they pick "all three", warn that sync is non-trivial — schema drift, partial syncs, eviction.
8. **Pairing (deferred).** Mention the CLI ↔ SKILL.md pairing pattern but don't implement it. Earmark as a follow-up.

End the session by:

- Naming the rung the user landed on.
- Naming **rung N+1** and what it would unlock for an agent.
- Offering to scaffold (`/design-cli scaffold <name>`) if they don't already have a CLI.

## Scaffold mode

Argument: `<name>` (e.g., `acme-cli`).

1. **Resolve the destination.** Default to `<cwd>/<name>/`, where `<cwd>` is the user's current working directory. Never default to anywhere inside `${CLAUDE_PLUGIN_ROOT}`. If `<cwd>` is the user's home directory or filesystem root, ask the user instead.
2. **Confirm with the user via `AskUserQuestion`** before copying. Offer:
   - the computed default (`<cwd>/<name>/`)
   - elsewhere — let the user paste a path
   Treat user-provided paths literally; expand `~` to `$HOME` if present.
3. Copy: `cp -R "${CLAUDE_PLUGIN_ROOT}/docs/design-cli/scaffold/" <dest>/`. Refuse if `<dest>` already exists; ask the user how to proceed.
4. **Rename `demo-cli` → `<name>` everywhere.** Don't hard-code the file list — sweep with `grep -rl demo-cli <dest>/` and rewrite each hit (skip `node_modules`, `dist`, `.tmp`). Robust against future scaffold edits.
5. **Rewrite the audit script path.** The scaffold's `package.json` ships `"audit": "bun run ../../../tools/design-cli-verify/src/verify.ts ./.design-cli-verify.json"` — that relative path resolves only from inside `cli-skill/docs/design-cli/scaffold/`, so `bun run audit` will fail from `<dest>`. Replace the `../../../tools/design-cli-verify/src/verify.ts` segment with the absolute path you resolved at session start: `${CLAUDE_PLUGIN_ROOT}/tools/design-cli-verify/src/verify.ts`. Use `Edit` on `<dest>/package.json` directly, not `sed`.
6. Run `cd <dest> && bun install`. Confirm it succeeds.
7. Run `bun run build`. Confirm `./dist/<name>` is produced.
8. Run `bun run audit`. Expect every rule green; the verifier prints `N pass, 0 warn, 0 fail` on success. If any rule fails, that's a bug in the scaffold — fix it before declaring done.
9. Tell the user: where the scaffold landed (absolute path), what to change first (their API client + the `which` capability index), and the Creativity-Ladder rung they're at (rung 2 — output formatting).

## Audit mode

Argument: `<path>` to an existing CLI directory or binary.

1. Locate the binary. If `<path>` is a directory, look for `dist/`, `bin/`, or `package.json#bin`. If a binary path can't be derived, ask the user for it.
2. **Auto-discover SKILL.md.** If `<path>` is a directory, check for `<path>/SKILL.md` (case-sensitive). If present, include it in the config as `"skill": "./SKILL.md"`. If absent, omit the field (the four `skill-*` rules will warn "skill not configured" rather than fail).
3. **Auto-discover the MCP entry point.** First, run `<cli> agent-context | jq '.commands[].path' | grep -w mcp`. If `mcp` is a real subcommand, include `"mcpArgs": ["mcp"]` in the config. Otherwise, look for a sibling binary at `<dirname(bin)>/<basename(bin)>-pp-mcp`, then `<dirname(bin)>/<basename(bin)>-mcp`. If found, include `"mcpBin": "<that path>"` (matches printing-press's two-binary `<name>-pp-cli` / `<name>-pp-mcp` convention). If neither pattern matches, omit both — `mcp-twin-shape` will warn "mcp not configured".
4. Build a `verify.json` config in a temp file. Subcommand pattern:
   ```json
   { "bin": "<absolute-path>", "runner": null,
     "sampleReadCommand": "<best guess>", "sampleMutateCommand": "<best guess>",
     "capability": "<best guess>", "knownField": "id",
     "skill": "./SKILL.md",
     "mcpArgs": ["mcp"] }
   ```
   Separate-binary pattern (printing-press style):
   ```json
   { "bin": "<absolute-path>", "runner": null,
     "sampleReadCommand": "<best guess>", "sampleMutateCommand": "<best guess>",
     "capability": "<best guess>", "knownField": "id",
     "skill": "./SKILL.md",
     "mcpBin": "<absolute-path-to-mcp-binary>" }
   ```
   Pull the best-guess values from the CLI's `--help` output. If you can't guess confidently, ask the user.
5. Run `bun run "${CLAUDE_PLUGIN_ROOT}/tools/design-cli-verify/src/verify.ts" <verify.json>`.
6. Map each rule result back to `${CLAUDE_PLUGIN_ROOT}/docs/design-cli/checklist.md` for the human-readable explanation.
7. For each failure, propose the smallest patch that fixes it. Cite the recipe (e.g., "see `recipes.md` recipe 4 for `agent-context`"). For `skill-*` failures, the fix is usually editing SKILL.md — point at the offending line. For `mcp-twin-shape` failures, check whether the user's framework commands are correctly annotated `meta: { framework: true }` (see the note below).
8. End with: a summary line (`X pass, Y warn, Z fail`), the rung the CLI is on, and the next rung's payoff.

> Note on `mcp-twin-shape` failures: the verifier prefers the `framework: true` annotation on commands in `agent-context.commands[]`. If the count cross-check is off, look at which commands the user has (or hasn't) annotated as framework — those are the ones excluded from MCP tool generation. The verifier falls back to a small built-in denylist (`agent-context`, `completion`, `doctor`, `feedback`, `mcp`, `profile`, `version`, `which`) only when no commands are annotated at all.

## Always do

- **Ground every recommendation in a pattern from `${CLAUDE_PLUGIN_ROOT}/docs/design-cli/principles.md`.** If you can't, you're freelancing — stop and reread the principles.
- **Use bun, not npm/npx, in every command you suggest.** This is a saved preference.
- **Cite file:line when referencing the source corpus** (e.g., `linear/SKILL.md:147` for `--select` semantics).
- **Don't implement the CLI ↔ SKILL.md ↔ MCP twin pattern**. It's earmarked as a follow-up; mentioning it is enough.

## Never do

- Don't auto-install bun deps in the user's repos without showing the command first.
- Don't skip the Creativity Ladder framing — it's the highest-leverage idea here.
- Don't add interactive prompts to the design conversation that aren't `AskUserQuestion`-shaped (no `read -p`, no inquirer).
- Don't claim the CLI is "agent-ready" until the verifier passes. The verifier is the contract.
