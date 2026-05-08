import type { ArgsDef, CommandDef } from "citty";
import { globalArgs } from "./flags";

export const SCHEMA_VERSION = "2";

export type AgentFlag = {
  name: string;
  type: "string" | "boolean";
  description?: string;
  default?: string | boolean | number;
};
export type AgentPositional = {
  name: string;
  required: boolean;
  description?: string;
};
export type AgentCommand = {
  path: string;
  description?: string;
  flags: AgentFlag[];
  positionals: AgentPositional[];
};
export type AgentContext = {
  schemaVersion: string;
  cli: { name: string; version: string; description?: string };
  exitCodes: { code: number; name: string }[];
  globalFlags: AgentFlag[];
  commands: AgentCommand[];
  capabilities: string[];
};

type Resolvable<T> = T | Promise<T> | (() => T | Promise<T>);

async function resolveValue<T>(v: Resolvable<T> | undefined): Promise<T | undefined> {
  if (v === undefined || v === null) return undefined;
  if (typeof v === "function") return await Promise.resolve((v as () => T | Promise<T>)());
  return await Promise.resolve(v as T | Promise<T>);
}

const GLOBAL_KEYS = new Set(Object.keys(globalArgs));

type ArgValue = {
  type?: string;
  description?: string;
  required?: boolean;
  default?: string | boolean | number;
};

function classifyArgs(
  args: ArgsDef | undefined,
  scope: "root" | "subcommand",
): { flags: AgentFlag[]; positionals: AgentPositional[] } {
  const flags: AgentFlag[] = [];
  const positionals: AgentPositional[] = [];
  if (!args) return { flags, positionals };
  for (const [name, def] of Object.entries(args)) {
    if (scope === "subcommand" && GLOBAL_KEYS.has(name)) continue;
    const d = def as ArgValue;
    if (d.type === "positional") {
      positionals.push({
        name,
        required: d.required === true,
        ...(d.description !== undefined && { description: d.description }),
      });
    } else if (d.type === "string" || d.type === "boolean") {
      flags.push({
        name,
        type: d.type,
        ...(d.description !== undefined && { description: d.description }),
        ...(d.default !== undefined && { default: d.default }),
      });
    }
  }
  return { flags, positionals };
}

async function walk(node: CommandDef, pathParts: string[], out: AgentCommand[]): Promise<void> {
  const meta = ((await resolveValue(node.meta)) ?? {}) as { description?: string };
  const args = await resolveValue(node.args);
  const subCommands = ((await resolveValue(node.subCommands)) ?? {}) as Record<string, Resolvable<CommandDef>>;

  if (pathParts.length > 0) {
    const { flags, positionals } = classifyArgs(args as ArgsDef | undefined, "subcommand");
    out.push({
      path: pathParts.join(" "),
      ...(meta.description !== undefined && { description: meta.description }),
      flags,
      positionals,
    });
  }

  for (const [name, child] of Object.entries(subCommands)) {
    const resolved = await resolveValue(child);
    if (!resolved) continue;
    await walk(resolved, [...pathParts, name], out);
  }
}

export type BuildOptions = {
  exitCodes: { code: number; name: string }[];
  capabilities: string[];
};

export async function buildAgentContext(root: CommandDef, opts: BuildOptions): Promise<AgentContext> {
  const meta = ((await resolveValue(root.meta)) ?? {}) as { name?: string; version?: string; description?: string };
  const rootArgs = await resolveValue(root.args) as ArgsDef | undefined;
  const { flags: globalFlags } = classifyArgs(rootArgs, "root");
  const commands: AgentCommand[] = [];
  await walk(root, [], commands);
  return {
    schemaVersion: SCHEMA_VERSION,
    cli: {
      name: meta.name ?? "unknown",
      version: meta.version ?? "0.0.0",
      ...(meta.description !== undefined && { description: meta.description }),
    },
    exitCodes: opts.exitCodes,
    globalFlags,
    commands,
    capabilities: opts.capabilities,
  };
}
