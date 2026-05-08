import type { AgentCommand, AgentContext } from "../agent-context-builder";

/** Commands excluded from MCP tool generation. Matches printing-press's framework denylist + `mcp` itself. */
export const EXCLUDED_PATHS = new Set([
  "agent-context",
  "completion",
  "doctor",
  "feedback",
  "help",
  "mcp",
  "profile",
  "version",
  "which",
]);

export type McpTool = {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
  annotations?: {
    readOnlyHint?: boolean;
    destructiveHint?: boolean;
  };
};

export function isCommandGroup(path: string, allPaths: string[]): boolean {
  const prefix = path + " ";
  return allPaths.some(p => p !== path && p.startsWith(prefix));
}

export function toolNameFromPath(path: string): string {
  return path.replace(/[^a-zA-Z0-9]+/g, "_").toLowerCase().replace(/_+$/, "");
}

function jsonTypeFor(t: "string" | "boolean"): "string" | "boolean" {
  return t;
}

export function buildToolsFromContext(ctx: AgentContext): McpTool[] {
  const allPaths = ctx.commands.map(c => c.path);
  const tools: McpTool[] = [];

  for (const cmd of ctx.commands) {
    if (EXCLUDED_PATHS.has(cmd.path.split(" ")[0] ?? "")) continue;
    if (EXCLUDED_PATHS.has(cmd.path)) continue;
    if (isCommandGroup(cmd.path, allPaths)) continue;

    const properties: Record<string, unknown> = {};
    const required: string[] = [];

    // Globals first (every tool gets them, but the model can usually ignore).
    for (const g of ctx.globalFlags) {
      properties[g.name] = {
        type: jsonTypeFor(g.type),
        ...(g.description !== undefined && { description: g.description }),
      };
    }
    // Per-command flags.
    for (const f of cmd.flags) {
      properties[f.name] = {
        type: jsonTypeFor(f.type),
        ...(f.description !== undefined && { description: f.description }),
      };
    }
    // Per-command positionals.
    for (const p of cmd.positionals) {
      properties[p.name] = {
        type: "string",
        ...(p.description !== undefined && { description: p.description }),
      };
      if (p.required) required.push(p.name);
    }

    const tool: McpTool = {
      name: toolNameFromPath(cmd.path),
      description: cmd.description ?? `Run \`${ctx.cli.name} ${cmd.path}\``,
      inputSchema: { type: "object", properties, ...(required.length > 0 && { required }) },
    };
    if (cmd.readOnly === true) {
      tool.annotations = { readOnlyHint: true, destructiveHint: false };
    } else if (cmd.readOnly === false) {
      tool.annotations = { destructiveHint: true };
    }
    tools.push(tool);
  }

  return tools;
}

/** Convert MCP-supplied arguments → CLI argv. Path tokens, then --agent, then positionals (in order), then flags. */
export function argsFromMcpInput(cmd: AgentCommand, ctx: AgentContext, mcpArgs: Record<string, unknown> | undefined): string[] {
  const argv: string[] = cmd.path.split(" ");
  argv.push("--agent");

  const args = mcpArgs ?? {};

  // Positionals first (in declared order).
  for (const p of cmd.positionals) {
    const v = args[p.name];
    if (v !== undefined && v !== null) argv.push(String(v));
  }

  // Flags: per-command + globals.
  const allFlagNames = new Set<string>();
  for (const f of cmd.flags) allFlagNames.add(f.name);
  for (const g of ctx.globalFlags) allFlagNames.add(g.name);

  for (const name of allFlagNames) {
    const v = args[name];
    if (v === undefined || v === null) continue;
    if (typeof v === "boolean") {
      if (v) argv.push(`--${name}`);
    } else {
      argv.push(`--${name}`, String(v));
    }
  }

  return argv;
}

export type ToolCallResult = {
  content: { type: "text"; text: string }[];
  isError?: boolean;
};

export async function spawnToolCall(
  selfBin: string,
  ctx: AgentContext,
  params: { name: string; arguments?: Record<string, unknown> },
): Promise<ToolCallResult> {
  const cmd = ctx.commands.find(c => toolNameFromPath(c.path) === params.name);
  if (!cmd) {
    return { content: [{ type: "text", text: `unknown tool: ${params.name}` }], isError: true };
  }
  const argv = argsFromMcpInput(cmd, ctx, params.arguments);
  const cmdLine = process.argv[1] && selfBin === process.argv[1]
    ? [process.execPath, selfBin, ...argv]
    : [selfBin, ...argv];
  const proc = Bun.spawn({ cmd: cmdLine, stdout: "pipe", stderr: "pipe" });
  const exitCode = await proc.exited;
  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  if (exitCode !== 0) {
    const codeName = ctx.exitCodes.find(c => c.code === exitCode)?.name ?? "error";
    return {
      content: [{ type: "text", text: `[${codeName} (exit ${exitCode})] ${stderr || stdout}` }],
      isError: true,
    };
  }
  return { content: [{ type: "text", text: stdout }] };
}
