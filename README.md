# cli-design-kit

**Design CLIs your AI agents can actually use — without making them worse for humans.**

A CLI that's hard for an agent to drive (silent flags, free-text errors, surprise prompts on stdin) is usually also hard for a careful human to script. `cli-design-kit` ships a Claude Code plugin that turns that hunch into discipline: a `/design-cli` slash command with three modes (guided, audit, scaffold), a 20-rule runtime verifier that works on any CLI binary regardless of language, and a `bun` + `citty` starter that ships every pattern wired and passes the verifier out of the box. The patterns themselves come from [printing-press](https://github.com/mvanhorn/cli-printing-press) — *agent-native design is just good CLI design taken seriously*.

## Install

```sh
/plugin marketplace add gillesdandrea/cli-design-kit   # or a local path: /plugin marketplace add /path/to/cli-design-kit
/plugin install cli-design-kit
```

Then `/design-cli` is available in any project.

## Quick start

```sh
/design-cli                        # guided session
/design-cli scaffold acme-cli      # generate a citty starter
/design-cli audit ./path/to/cli    # check against every verifier rule
```

## What's here

- **`commands/design-cli.md`** — the slash command. Three modes: `guided` (default), `audit <path>`, `scaffold <name>`.
- **`docs/design-cli/`** — the knowledge base it loads:
  - [`principles.md`](docs/design-cli/principles.md) — 14 patterns + the Creativity Ladder + anti-patterns. Framework-agnostic.
  - [`recipes.md`](docs/design-cli/recipes.md) — the same patterns translated to `citty`.
  - [`checklist.md`](docs/design-cli/checklist.md) — audit items, each tagged with a verifier rule ID.
  - [`scaffold/`](docs/design-cli/scaffold/) — a `bun` + `citty` starter that ships all patterns wired (including a paired `SKILL.md` and a stdio MCP twin) and passes the verifier cleanly out of the box.
- **`tools/design-cli-verify/`** — runtime verifier. Language-agnostic; works on any CLI binary. Includes cross-checks between the CLI, its `SKILL.md`, and an optional MCP twin.
- **`tools/recipes-check/`** — extracts the TypeScript snippets from `recipes.md` and `tsc --noEmit`s them, so the docs can't rot.
- **`.claude-plugin/`** — plugin + marketplace manifests.

## Roadmap

See [ROADMAP.md](ROADMAP.md).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for repo layout, the source-corpus reference repos, and the local dev loop.

## License

MIT — see [LICENSE](LICENSE).
