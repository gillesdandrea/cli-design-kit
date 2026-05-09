# Roadmap

## Open

- **AST-based static checks** alongside the runtime verifier — catch pattern violations at build time, not just at audit time.
- **End-to-end rehearsal of guided mode** — automated transcript replay against `/design-cli` (default mode) to catch slash-command regressions.

## Considered, not committed

- **Framework adapters beyond citty** — recipes for `oclif` (Node), `commander` (Node), `cobra` (Go), `clap` (Rust). Same patterns, framework-specific code.
- **SKILL.md generation** — the verifier already cross-checks `SKILL.md` against the CLI; a generator that emits a starter `SKILL.md` from `agent-context` output would close the loop.
- **`/design-cli pair`** — a dedicated mode for retrofitting an MCP twin onto an existing CLI (today the scaffold ships one; existing CLIs have to copy the pattern manually).

## Done

Originally listed as deferred follow-ups; now shipped:

- CLI ↔ `SKILL.md` pairing verifier (commit `0024e32`)
- MCP twin generation in the scaffold (commit `5cb3a3c`)
- Audit against the source-corpus `linear-pp-cli` (commit `156c559`)
