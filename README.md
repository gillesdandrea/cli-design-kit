# cli-skill

Design CLIs that work for humans and AI agents. Codifies the [printing-press](https://github.com/mvanhorn/cli-printing-press) philosophy — *agent-native design is just good CLI design taken seriously* — into a `/design-cli` slash command, a `bun` + `citty` scaffold, and a runtime verifier.

## What's here

- **`.claude/commands/design-cli.md`** — the slash command. Three modes: `guided` (default), `audit <path>`, `scaffold <name>`.
- **`docs/design-cli/`** — the knowledge base it loads:
  - [`principles.md`](docs/design-cli/principles.md) — 13 patterns + the Creativity Ladder + anti-patterns. Framework-agnostic.
  - [`recipes.md`](docs/design-cli/recipes.md) — the same patterns translated to `citty`.
  - [`checklist.md`](docs/design-cli/checklist.md) — audit items, each tagged with a verifier rule ID.
  - [`scaffold/`](docs/design-cli/scaffold/) — a `bun` + `citty` starter that ships all 13 patterns and passes the verifier 15/15 out of the box.
- **`tools/design-cli-verify/`** — runtime verifier. 15 rules. Language-agnostic; works on any CLI binary.
- **`tools/recipes-check/`** — extracts the TypeScript snippets from `recipes.md` and `tsc --noEmit`s them, so the docs can't rot.

## Quick start

```sh
/design-cli                        # guided session
/design-cli scaffold acme-cli      # generate a citty starter
/design-cli audit ./path/to/cli    # check against the 15 rules
```

From a shell:

```sh
bun install                        # install root tools
bun run recipes-check              # typecheck recipes.md
```

## Source corpus (vendored, gitignored)

Two reference repos shaped this project. Clone them next to this directory if you want to read them directly:

```sh
git clone https://github.com/mvanhorn/cli-printing-press
git clone https://github.com/mvanhorn/printing-press-library
```

`linear-pp-cli` (in `printing-press-library/library/project-management/linear/`) is the canonical worked example for `--select`, layered caching, and rungs 3–5 of the Creativity Ladder.

## Deferred follow-ups

Earmarked but not built:

1. CLI ↔ SKILL.md pairing verifier (port of `verify_skill.py`).
2. MCP twin generation (`/design-cli pair`).
3. AST-based static checks alongside the runtime verifier.
4. End-to-end rehearsal of guided mode.
5. Audit against a real `linear-pp-cli` to cross-check the verifier.
