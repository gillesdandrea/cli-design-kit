import type { ArgsDef } from "citty";

export const globalArgs = {
  json:        { type: "boolean", description: "Force JSON output", default: false },
  compact:     { type: "boolean", description: "Drop to high-gravity fields only", default: false },
  select:      { type: "string",  description: "Dotted-path field projection (id,name,items.owner.name)" },
  quiet:       { type: "boolean", description: "Suppress non-essential output", default: false },
  "no-color":  { type: "boolean", description: "Disable ANSI colors", default: false },
  "no-input":  { type: "boolean", description: "Fail instead of prompting", default: false },
  yes:         { type: "boolean", description: "Skip confirmation prompts", default: false },
  "dry-run":   { type: "boolean", description: "Show what would happen, don't execute", default: false },
  "no-cache":  { type: "boolean", description: "Bypass HTTP cache", default: false },
  "data-source": { type: "string", default: "auto", description: "Data source: auto|live (auto = local store with live fallback)" },
  agent:       { type: "boolean", description: "Preset: --json --compact --no-input --no-color --yes", default: false },
  profile:     { type: "string",  description: "Apply a saved flag profile" },
} as const satisfies ArgsDef;

export function withGlobals<T extends ArgsDef>(localArgs: T): T & typeof globalArgs {
  return { ...globalArgs, ...localArgs };
}
