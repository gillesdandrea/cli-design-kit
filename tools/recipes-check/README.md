# recipes-check

Typechecks the TypeScript snippets in [`docs/design-cli/recipes.md`](../../docs/design-cli/recipes.md), so the recipes can't silently rot.

## How it works

1. `src/extract.ts` walks `recipes.md`, finds every fenced ` ```ts ` / ` ```typescript ` block, and looks for a `// path/to/file.ts` comment in the first three non-empty lines.
2. Each block with a path tag is written to `.tmp/<path>` (multiple blocks for the same path are concatenated).
3. Blocks without a path tag are skipped and logged — those are illustrative one-offs (e.g., the `--compact` example), not full files.
4. `src/check.ts` runs the extractor, then `bunx tsc --noEmit` against the reconstructed tree.

## Usage

```sh
cd tools/recipes-check
bun install
bun run check
```

Or from the repo root: `bun run recipes-check`.

## What it catches

- Type errors in any recipe snippet that has a `// src/<path>.ts` comment.
- Missing imports (citty / bun) — `package.json` declares them.
- Incompatibilities between snippets (since they import each other across files).

## What it intentionally doesn't catch

- Snippets without path tags (illustrative examples).
- Runtime behavior — this is a typecheck, not an executor. Runtime correctness is the verifier's job (`tools/design-cli-verify`).
- Drift between the recipes and the scaffold — these are *separate teaching artifacts* that share patterns but may diverge in capability lists, hard-coded names, etc.
