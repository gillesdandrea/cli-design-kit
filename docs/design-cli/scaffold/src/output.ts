import { applyAgentPreset, type CommonArgs } from "./agent-preset";
import { parseSelect, project } from "./select";

export type Mode = "json" | "human";

export type EmitArgs = CommonArgs & {
  select?: string;
  quiet?: boolean;
};

export function pickMode(args: EmitArgs): Mode {
  applyAgentPreset(args);
  if (args.json) return "json";
  if (!process.stdout.isTTY) return "json";
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
    const projected = args.select ? project(payload, parseSelect(args.select)) : payload;
    process.stdout.write(JSON.stringify(projected) + "\n");
    return;
  }
  process.stdout.write((render ?? defaultRender)(payload) + "\n");
}

function defaultRender(p: unknown): string {
  return typeof p === "string" ? p : JSON.stringify(p, null, 2);
}

export function applyCompact<T extends Record<string, unknown>>(record: T, fields: readonly string[], args: EmitArgs): Partial<T> | T {
  applyAgentPreset(args);
  if (!args.compact) return record;
  const out: Partial<T> = {};
  for (const f of fields) if (f in record) (out as Record<string, unknown>)[f] = record[f];
  return out;
}
