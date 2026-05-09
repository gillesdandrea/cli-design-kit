# Contributing

## Repo layout

- `commands/design-cli.md` — the slash command (thin dispatcher; three modes).
- `docs/design-cli/` — knowledge base (`principles.md`, `recipes.md`, `checklist.md`) plus the `scaffold/` starter the slash command copies in `scaffold` mode.
- `tools/design-cli-verify/` — language-agnostic runtime verifier; one rule per file under `src/rules/`.
- `tools/recipes-check/` — extracts and typechecks the TypeScript snippets in `recipes.md`.
- `.claude-plugin/` — `plugin.json` and `marketplace.json` manifests.

## Source corpus

Two reference repos shaped this project. They are not dependencies — clone them next to this directory only if you want to read them while contributing:

```sh
git clone https://github.com/mvanhorn/cli-printing-press
git clone https://github.com/mvanhorn/printing-press-library
```

`linear-pp-cli` (in `printing-press-library/library/project-management/linear/`) is the canonical worked example for `--select`, layered caching, and rungs 3–5 of the Creativity Ladder. Both clones are gitignored.

## Local dev loop

```sh
bun install                                # install root tools
bun run recipes-check                      # typecheck recipes.md snippets
cd tools/design-cli-verify && bun test     # parser + verifier tests
```

Run `bun run audit` from inside any scaffolded CLI to exercise the verifier end-to-end.

## Adding a verifier rule

Each rule is a single file under `tools/design-cli-verify/src/rules/` exporting a `Rule` (see `src/types.ts`). Register it in `src/run.ts`. Rules run against any CLI binary; prefer runtime probes (invoke the CLI, parse stdout/stderr/exit-code) over static parsing of source. If the rule needs CLI-side cooperation, extend `agent-context` rather than guessing from heuristics.

## Conventions

- One rule per file; kebab-case file and rule IDs (`tty-autodetect`, `agent-context`).
- Commits include a `Co-Authored-By:` trailer when an AI agent did meaningful work.
- New patterns land in `principles.md` first, then a `citty` translation in `recipes.md`, then a checklist item, then a verifier rule. The slash command's `What's here` count auto-derives from the verifier; don't hand-edit pattern counts.
- Don't bump version numbers in `package.json` / `plugin.json` / `marketplace.json` in the same PR as a feature — version bumps are their own commit.
