# Citty Recipes for Agent-Ready CLIs

Working code for every pattern in `principles.md`, in [citty](https://github.com/unjs/citty) + [bun](https://bun.sh). Snippets compose; copy them into the scaffold or your own CLI.

> Citty does not have Cobra-style "persistent flags." We share flags across subcommands by composing arg objects (recipe 0).

## 0 — Shared/global args helper

```ts
// src/flags.ts
import type { ArgsDef } from "citty";

export const globalArgs = {
  json:          { type: "boolean", description: "Force JSON output", default: false },
  compact:       { type: "boolean", description: "Drop to high-gravity fields only", default: false },
  select:        { type: "string",  description: "Dotted-path field projection (id,name,items.owner.name)" },
  quiet:         { type: "boolean", description: "Suppress non-essential output", default: false },
  "no-color":    { type: "boolean", description: "Disable ANSI colors", default: false },
  "no-input":    { type: "boolean", description: "Fail instead of prompting", default: false },
  yes:           { type: "boolean", description: "Skip confirmation prompts", default: false },
  "dry-run":     { type: "boolean", description: "Show what would happen, don't execute", default: false },
  "no-cache":    { type: "boolean", description: "Bypass HTTP cache", default: false },
  "data-source": { type: "string",  default: "auto", description: "Data source: auto|live" },
  agent:         { type: "boolean", description: "Preset: --json --compact --no-input --no-color --yes", default: false },
  profile:       { type: "string",  description: "Apply a saved flag profile" },
} as const satisfies ArgsDef;

export function withGlobals<T extends ArgsDef>(localArgs: T): T & typeof globalArgs {
  return { ...globalArgs, ...localArgs };
}
```

Note: kebab-case keys (`"no-color"`) become kebab-case CLI flags (`--no-color`). Citty 0.1.6's `ArgDef` is `string | boolean | positional` only; `enum` arrives in 0.2.x.

Citty has no native "before-run hook" across the tree; we expand `--agent` with a small helper that every command's `run()` calls first.

## 1 — `--agent` preset

```ts
// src/agent-preset.ts
export type CommonArgs = {
  agent?: boolean;
  json?: boolean;
  compact?: boolean;
  "no-input"?: boolean;
  "no-color"?: boolean;
  yes?: boolean;
};

export function applyAgentPreset(args: CommonArgs): void {
  if (!args.agent) return;
  args.json = true;
  args.compact = true;
  args["no-input"] = true;
  args["no-color"] = true;
  args.yes = true;
}
```

Why a hand-rolled `CommonArgs` instead of citty's `ParsedArgs<...>`? `ParsedArgs` is generic over the args definition and has no fixed properties — destructuring it loses information. A small interface that names what we mutate is type-safe and self-documenting.

Call `applyAgentPreset(args)` at the top of every `run()`. The preset is a documented contract — bumping its expansion is a minor version of the CLI.

## 2 — Auto-JSON when piped + `NO_COLOR`

```ts
// src/output.ts
import { applyAgentPreset, type CommonArgs } from "./agent-preset";
import { project } from "./select"; // recipe 7

export type Mode = "json" | "human";

export type EmitArgs = CommonArgs & { select?: string; quiet?: boolean };

export function pickMode(args: EmitArgs): Mode {
  applyAgentPreset(args);
  if (args.json) return "json";
  if (!process.stdout.isTTY) return "json"; // piped → JSON
  return "human";
}

export function colorEnabled(args: EmitArgs): boolean {
  if (args["no-color"]) return false;
  if (process.env.NO_COLOR) return false;
  if (!process.stdout.isTTY) return false;
  return true;
}

export function emit(payload: unknown, args: EmitArgs, render?: (p: unknown) => string): void {
  if (args.quiet) return;
  const mode = pickMode(args);
  if (mode === "json") {
    const projected = args.select ? project(payload, args.select.split(",")) : payload;
    process.stdout.write(JSON.stringify(projected) + "\n");
    return;
  }
  process.stdout.write((render ?? defaultRender)(payload) + "\n");
}

function defaultRender(p: unknown): string { return typeof p === "string" ? p : JSON.stringify(p, null, 2); }
```

## 3 — Typed exit codes + classified errors

```ts
// src/errors.ts
export const ExitCode = {
  Ok: 0,
  Usage: 2,
  NotFound: 3,
  Auth: 4,
  Api: 5,
  RateLimit: 7,
  Config: 10,
} as const;
export type ExitCode = typeof ExitCode[keyof typeof ExitCode];

type ErrorKind = "usage" | "not_found" | "auth" | "api" | "rate_limit" | "config";

const codeForKind: Record<ErrorKind, ExitCode> = {
  usage: ExitCode.Usage, not_found: ExitCode.NotFound, auth: ExitCode.Auth,
  api: ExitCode.Api, rate_limit: ExitCode.RateLimit, config: ExitCode.Config,
};

export function fail(kind: ErrorKind, message: string, opts: { hint?: string; json?: boolean } = {}): never {
  const code = codeForKind[kind];
  if (opts.json) {
    process.stderr.write(JSON.stringify({ error: { code: kind, message, hint: opts.hint } }) + "\n");
  } else {
    process.stderr.write(`error: ${message}\n`);
    if (opts.hint) process.stderr.write(`hint:  ${opts.hint}\n`);
  }
  process.exit(code);
}

const SECRET = /(api[_-]?key|token|password|secret|bearer\s+\S+)["':\s=]+([A-Za-z0-9_\-+./=]{8,})/gi;
export function sanitize(s: string): string {
  return s.replace(SECRET, (_m, k) => `${k}=***REDACTED***`);
}
```

Wrap fetch/SDK calls and translate HTTP status to a kind:

```ts
// src/api-error.ts
import { fail } from "./errors";

export function classifyHttpError(status: number, body: string, json: boolean): never {
  const hintsByStatus: Record<number, string> = {
    401: "auth missing or invalid. Check your API key. Run `<cli> doctor`.",
    403: "your token can read but not perform this action. Check scopes.",
    404: "resource not found.",
    429: "you're rate-limited. Back off and retry.",
  };
  const kind = status === 401 || status === 403 ? "auth"
             : status === 404 ? "not_found"
             : status === 429 ? "rate_limit"
             : "api";
  return fail(kind, `HTTP ${status}`, { hint: hintsByStatus[status] ?? body.slice(0, 200), json });
}
```

## 4 — Three-layer introspection

### `which`

```ts
// src/commands/which.ts
import { defineCommand } from "citty";
import { ExitCode } from "../errors";

const index = [
  { capability: "list issues",         command: "issues list",      tokens: ["list", "issues", "issue"] },
  { capability: "compare two cycles",  command: "cycles compare",   tokens: ["compare", "cycle", "cycles"] },
  { capability: "today's queue",       command: "today",            tokens: ["today", "queue", "now"] },
];

export default defineCommand({
  meta: { name: "which", description: "Find the command that implements a capability" },
  args: { query: { type: "positional", required: true, valueHint: "QUERY" } },
  run({ args }) {
    const q = args.query.toLowerCase();
    const ranked = index.map(e => {
      let score = 0;
      for (const t of e.tokens) {
        if (q === t) score += 3;
        else if (q.includes(t)) score += 2;
      }
      return { e, score };
    }).filter(r => r.score > 0).sort((a,b) => b.score - a.score);
    if (!ranked.length) {
      process.stderr.write(`no match for "${args.query}"\n`);
      process.exit(ExitCode.Usage);
    }
    for (const { e } of ranked) process.stdout.write(`${e.command}\t${e.capability}\n`);
  },
});
```

### `agent-context`

```ts
// src/commands/agent-context.ts
import { defineCommand } from "citty";

const SCHEMA_VERSION = "1";

export default defineCommand({
  meta: { name: "agent-context", description: "Emit the CLI's machine-readable schema" },
  run() {
    const ctx = {
      schemaVersion: SCHEMA_VERSION,
      cli: { name: "demo-cli", version: "0.1.0" },
      exitCodes: [
        { code: 0, name: "ok" }, { code: 2, name: "usage" }, { code: 3, name: "not_found" },
        { code: 4, name: "auth" }, { code: 5, name: "api" }, { code: 7, name: "rate_limit" }, { code: 10, name: "config" },
      ],
      flags: ["--json","--compact","--select","--quiet","--no-color","--no-input","--yes","--dry-run","--no-cache","--data-source","--agent","--profile"],
      commands: [
        { path: "issues list",   readOnly: true,  description: "List issues" },
        { path: "issues create", readOnly: false, description: "Create an issue" },
        { path: "today",         readOnly: true,  description: "Today's queue" },
      ],
      capabilities: ["list issues", "compare two cycles", "today's queue"],
    };
    process.stdout.write(JSON.stringify(ctx) + "\n");
  },
});
```

## 5 — Errors with hints (already shown in recipe 3)

The `fail()` helper splits modes: human gets `error:` + `hint:`, agent (`--json`) gets a structured JSON object on stderr. Always sanitize bodies before passing them as hints.

## 6 — `--dry-run` and `--yes`

```ts
// src/commands/example-create.ts
import { defineCommand } from "citty";
import { withGlobals } from "../flags";
import { applyAgentPreset } from "../agent-preset";
import { fail } from "../errors";
import { emit } from "../output";

export default defineCommand({
  meta: { name: "create", description: "Create an issue" },
  args: withGlobals({
    title: { type: "string", required: true, description: "Issue title" },
  }),
  async run({ args }) {
    applyAgentPreset(args);
    const payload = { title: String(args.title), createdAt: new Date().toISOString() };
    if (args["dry-run"]) {
      emit({ wouldCreate: payload }, args);
      return;
    }
    const interactive = process.stdin.isTTY && !args["no-input"];
    if (!args.yes && !interactive) {
      fail("usage", "refusing to create without --yes in non-interactive mode", {
        hint: "pass --yes (or --agent) to proceed; --dry-run to preview",
        json: !!args.json,
      });
    }
    if (!args.yes && interactive) {
      process.stderr.write(`About to create issue "${payload.title}". Re-run with --yes to skip this notice.\n`);
      return;
    }
    emit({ created: payload }, args);
  },
});
```

## 7 — `--select` with dotted paths

```ts
// src/select.ts
export function project(value: unknown, paths: string[]): unknown {
  if (paths.length === 0) return value;
  if (Array.isArray(value)) return value.map(v => project(v, paths));
  if (value === null || typeof value !== "object") return value;
  const out: Record<string, unknown> = {};
  for (const path of paths) {
    const [head, ...rest] = path.split(".");
    if (head === undefined) continue;
    const v = (value as Record<string, unknown>)[head];
    if (v === undefined) continue;
    if (rest.length === 0) {
      out[head] = v;
    } else {
      const nested = project(v, [rest.join(".")]);
      out[head] = mergeNested(out[head], nested, head);
    }
  }
  return out;
}

function mergeNested(prev: unknown, next: unknown, _key: string): unknown {
  if (prev === undefined) return next;
  if (Array.isArray(prev) && Array.isArray(next)) {
    return prev.map((p, i) => ({ ...(p as object), ...(next[i] as object) }));
  }
  if (prev && next && typeof prev === "object" && typeof next === "object") {
    return { ...prev, ...next };
  }
  return next;
}
```

## 8 — `--compact` field whitelist per command

```ts
// each read command exposes a compactFields list; the renderer uses it.
const compactFields = ["id", "title", "status", "updatedAt"] as const;

function applyCompact<T extends Record<string, unknown>>(record: T, args: { compact?: boolean }): Partial<T> {
  if (!args.compact) return record;
  const out: Partial<T> = {};
  for (const f of compactFields) if (f in record) (out as Record<string, unknown>)[f] = record[f];
  return out;
}
```

## 9 — Layered caching

### HTTP TTL cache

```ts
// src/cache.ts
import { Database } from "bun:sqlite";

const db = new Database(`${process.env.HOME}/.cache/demo-cli/http.sqlite`, { create: true });
db.run(`CREATE TABLE IF NOT EXISTS http (key TEXT PRIMARY KEY, body TEXT, expiresAt INTEGER)`);

const TTL_MS = 5 * 60 * 1000;

export async function cachedFetch(url: string, init: RequestInit & { noCache?: boolean }): Promise<Response> {
  const key = `${init.method ?? "GET"} ${url}`;
  if (init.method && init.method !== "GET") return fetch(url, init);
  if (init.noCache) {
    db.run(`DELETE FROM http WHERE key = ?`, [key]);
  } else {
    const row = db.query<{ body: string; expiresAt: number }, [string]>(`SELECT body, expiresAt FROM http WHERE key = ?`).get(key);
    if (row && row.expiresAt > Date.now()) return new Response(row.body);
  }
  const res = await fetch(url, init);
  if (res.ok) {
    const body = await res.clone().text();
    db.run(`INSERT OR REPLACE INTO http (key, body, expiresAt) VALUES (?, ?, ?)`, [key, body, Date.now() + TTL_MS]);
  }
  return res;
}
```

### Local sync store + `--data-source`

```ts
// src/store.ts
import { Database } from "bun:sqlite";
export const store = new Database(`${process.env.HOME}/.local/share/demo-cli/store.sqlite`, { create: true });
store.run(`CREATE TABLE IF NOT EXISTS issues (id TEXT PRIMARY KEY, json TEXT, syncedAt INTEGER)`);

export async function readIssues(args: { dataSource: "auto" | "live" }, fetchLive: () => Promise<unknown[]>): Promise<{ source: "local" | "live"; data: unknown[] }> {
  if (args.dataSource === "live") return { source: "live", data: await fetchLive() };
  const rows = store.query<{ json: string }, []>(`SELECT json FROM issues`).all();
  if (rows.length > 0) return { source: "local", data: rows.map(r => JSON.parse(r.json)) };
  return { source: "live", data: await fetchLive() };
}
```

```ts
// src/commands/sync.ts
import { defineCommand } from "citty";
import { store } from "../store";

export default defineCommand({
  meta: { name: "sync", description: "Populate the local store from the API" },
  async run() {
    const live = (await fetch("https://api.example.com/issues").then(r => r.json())) as { id: string }[];
    const stmt = store.prepare(`INSERT OR REPLACE INTO issues (id, json, syncedAt) VALUES (?, ?, ?)`);
    const tx = store.transaction((rows: { id: string; json: string }[]) => {
      for (const r of rows) stmt.run(r.id, r.json, Date.now());
    });
    tx(live.map(i => ({ id: i.id, json: JSON.stringify(i) })));
    process.stdout.write(`synced ${live.length} issues\n`);
  },
});
```

## 10 — Shell completion

Hand-rolled. Citty exposes `meta` and `subCommands` so we can walk the tree:

```ts
// src/commands/completion.ts
import { defineCommand } from "citty";

const bashScript = (cli: string) => `_${cli}_complete() {
  local cur="\${COMP_WORDS[COMP_CWORD]}"
  local cmds="issues today cycles which agent-context completion doctor profile sync version --help"
  COMPREPLY=( $(compgen -W "$cmds" -- "$cur") )
}
complete -F _${cli}_complete ${cli}
`;

const zshScript = (cli: string) => `#compdef ${cli}
_${cli}() {
  local -a cmds
  cmds=('issues' 'today' 'cycles' 'which' 'agent-context' 'completion' 'doctor' 'profile' 'sync' 'version')
  _describe 'command' cmds
}
_${cli} "$@"
`;

const fishScript = (cli: string) => `complete -c ${cli} -f -n "__fish_use_subcommand" -a "issues today cycles which agent-context completion doctor profile sync version"
`;

export default defineCommand({
  meta: { name: "completion", description: "Output shell completion script" },
  args: {
    shell: { type: "positional", required: true, valueHint: "bash|zsh|fish" },
  },
  run({ args }) {
    const cli = "demo-cli";
    const script = args.shell === "bash" ? bashScript(cli)
                 : args.shell === "zsh"  ? zshScript(cli)
                 : args.shell === "fish" ? fishScript(cli)
                 : null;
    if (!script) { process.stderr.write(`unknown shell: ${args.shell}\n`); process.exit(2); }
    process.stdout.write(script);
  },
});
```

For richer completion, generate the cmd list dynamically by introspecting the root command's `subCommands` map.

## 11 — Framework commands

### `version`

```ts
// src/commands/version.ts
import { defineCommand } from "citty";
import pkg from "../../package.json" with { type: "json" };

export default defineCommand({
  meta: { name: "version", description: "Print version (parseable)" },
  run() {
    const sha = process.env.GIT_SHA ?? "unknown";
    process.stdout.write(`${pkg.name} ${pkg.version} (${sha})\n`);
  },
});
```

### `doctor`

```ts
// src/commands/doctor.ts
import { defineCommand } from "citty";
import { ExitCode } from "../errors";

export default defineCommand({
  meta: { name: "doctor", description: "Diagnose env, creds, connectivity" },
  async run() {
    const checks: { name: string; ok: boolean; detail: string }[] = [];
    checks.push({ name: "DEMO_API_KEY",   ok: !!process.env.DEMO_API_KEY, detail: process.env.DEMO_API_KEY ? "set" : "missing" });
    checks.push({ name: "network reach",   ok: await ping("https://api.example.com"), detail: "GET / 200" });
    for (const c of checks) process.stdout.write(`${c.ok ? "✓" : "✗"} ${c.name}: ${c.detail}\n`);
    const failed = checks.filter(c => !c.ok);
    if (failed.length) process.exit(failed.some(c => c.name.includes("KEY")) ? ExitCode.Auth : ExitCode.Api);
  },
});

async function ping(url: string): Promise<boolean> {
  try { const r = await fetch(url, { method: "HEAD" }); return r.ok; } catch { return false; }
}
```

### `profile`

```ts
// src/commands/profile.ts
import { defineCommand } from "citty";
import { Database } from "bun:sqlite";

const db = new Database(`${process.env.HOME}/.config/demo-cli/profiles.sqlite`, { create: true });
db.run(`CREATE TABLE IF NOT EXISTS profiles (name TEXT PRIMARY KEY, json TEXT)`);

export default defineCommand({
  meta: { name: "profile", description: "Save / load named flag profiles" },
  subCommands: {
    save: defineCommand({
      meta: { name: "save" },
      args: { name: { type: "positional", required: true }, json: { type: "string", required: true } },
      run({ args }) {
        // Citty positional/string args are typed `string | boolean | string[]` — narrow with String().
        db.run(`INSERT OR REPLACE INTO profiles (name, json) VALUES (?, ?)`, [String(args.name), String(args.json)]);
      },
    }),
    list: defineCommand({
      meta: { name: "list" },
      run() {
        const rows = db.query<{ name: string }, []>(`SELECT name FROM profiles`).all();
        for (const r of rows) process.stdout.write(`${r.name}\n`);
      },
    }),
  },
});
```

Profile values are loaded by `src/cli.ts`'s root before each `run()` and applied to `args` *unless* the user passed an explicit flag (explicit flags always win).

### `feedback`

```ts
// src/commands/feedback.ts
import { defineCommand } from "citty";

export default defineCommand({
  meta: { name: "feedback", description: "Open a prefilled GitHub issue" },
  run() {
    const url = `https://github.com/your-org/demo-cli/issues/new?title=&body=` +
      encodeURIComponent(`Version: ${process.env.npm_package_version ?? "?"}\nNode: ${process.version}\nOS: ${process.platform}\n\n---\n\n`);
    process.stdout.write(url + "\n");
  },
});
```

## 12 — Verb-noun + `which` (covered in recipe 4)

Structure subcommands as `<noun> <verb>` (`issues list`, `cycles compare`); use `which` to flatten discovery so agents don't need to know the hierarchy.

## 13 — CLI ↔ SKILL.md pairing

Out of scope for the scaffold. The pattern (printing-press-library): every CLI ships with a paired `SKILL.md` in `cli-skills/pp-<name>/`. A `verify_skill.py` checks that every `--flag` and command path in `SKILL.md` exists in code. Future follow-up: `/design-cli pair` mode that scaffolds and verifies the skill.

## Stdin handling

```ts
// src/stdin.ts
export async function readStdin(): Promise<string | null> {
  if (process.stdin.isTTY) return null; // no piped input
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString("utf8");
}
```

Use in commands that accept `--stdin`. Document in help when present. Default to line-oriented JSON (one object per line) for compact mode.
