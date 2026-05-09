import type { Rule, AgentContextV2 } from "../types";
import { run } from "../run";

/** Fallback denylist applied only when the agent-context has no `framework: true` annotations. */
const LEGACY_EXCLUDED_PATHS = new Set([
  "agent-context", "completion", "doctor", "feedback", "help", "mcp", "profile", "version", "which",
]);

function isCommandGroup(path: string, allPaths: string[]): boolean {
  const prefix = path + " ";
  return allPaths.some(p => p !== path && p.startsWith(prefix));
}

type AgentCmd = AgentContextV2["commands"][number];

function isFrameworkCmd(cmd: AgentCmd, all: AgentCmd[]): boolean {
  if (cmd.framework === true) return true;
  const parts = cmd.path.split(" ");
  for (let n = parts.length - 1; n >= 1; n--) {
    const ancestor = all.find(c => c.path === parts.slice(0, n).join(" "));
    if (ancestor?.framework === true) return true;
  }
  return false;
}

function expectedToolCount(ctx: AgentContextV2): number {
  const all = ctx.commands.map(c => c.path);
  const annotated = ctx.commands.some(c => c.framework === true);
  let n = 0;
  for (const cmd of ctx.commands) {
    const excluded = annotated
      ? isFrameworkCmd(cmd, ctx.commands)
      : LEGACY_EXCLUDED_PATHS.has(cmd.path.split(" ")[0] ?? "") || LEGACY_EXCLUDED_PATHS.has(cmd.path);
    if (excluded) continue;
    if (isCommandGroup(cmd.path, all)) continue;
    n++;
  }
  return n;
}

type JsonRpcMessage = {
  jsonrpc: "2.0";
  id?: number | string;
  method?: string;
  params?: unknown;
  result?: unknown;
  error?: { code: number; message: string };
};

const rule: Rule = async (target, config) => {
  const isSeparateBinary = !!config.mcpBin;
  const hasMcpArgs = !!(config.mcpArgs && config.mcpArgs.length > 0);
  if (!isSeparateBinary && !hasMcpArgs) {
    return { rule: "mcp-twin-shape", severity: "warn", detail: "mcp not configured (set mcpArgs or mcpBin)" };
  }

  // Subcommand mode: fetch agent-context for the count cross-check. Separate-binary
  // mode skips this — the MCP server and CLI are decoupled, so the CLI's command
  // tree isn't authoritative for the MCP tool set.
  let expected: number | null = null;
  if (!isSeparateBinary) {
    const ctxRun = await run(target, { args: ["agent-context"] });
    if (ctxRun.exitCode === 0) {
      try {
        const ctx = JSON.parse(ctxRun.stdout.trim()) as AgentContextV2;
        expected = expectedToolCount(ctx);
      } catch { /* fall through to shape-only */ }
    }
  }

  const cmd = isSeparateBinary
    ? [config.mcpBin!, ...(config.mcpArgs ?? [])]
    : [target.argv0, ...target.argv, ...(config.mcpArgs ?? [])];
  const proc = Bun.spawn({
    cmd,
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
  });

  const writer = proc.stdin!;
  const send = (msg: JsonRpcMessage): void => {
    writer.write(JSON.stringify(msg) + "\n");
  };

  // Read newline-delimited messages from stdout, with timeout.
  const reader = proc.stdout.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  const readMessage = async (timeoutMs = 5000): Promise<JsonRpcMessage> => {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const idx = buffer.indexOf("\n");
      if (idx >= 0) {
        const line = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 1);
        if (line.trim().length === 0) continue;
        return JSON.parse(line) as JsonRpcMessage;
      }
      const remaining = deadline - Date.now();
      if (remaining <= 0) break;
      const result = await Promise.race([
        reader.read(),
        new Promise<{ done: true; value: undefined }>(res => setTimeout(() => res({ done: true, value: undefined }), remaining)),
      ]);
      if (result.done || result.value === undefined) break;
      buffer += decoder.decode(result.value, { stream: true });
    }
    throw new Error("timeout reading MCP message");
  };

  try {
    send({ jsonrpc: "2.0", id: 1, method: "initialize", params: {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "design-cli-verify", version: "0.1.0" },
    }});
    const initResp = await readMessage();
    if (!initResp.result) throw new Error(`initialize failed: ${JSON.stringify(initResp.error)}`);

    send({ jsonrpc: "2.0", method: "notifications/initialized" });

    send({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} });
    const listResp = await readMessage();
    if (!listResp.result) throw new Error(`tools/list failed: ${JSON.stringify(listResp.error)}`);

    const tools = (listResp.result as { tools: { name: string; description?: string; inputSchema?: unknown }[] }).tools;
    if (!Array.isArray(tools)) {
      return { rule: "mcp-twin-shape", severity: "fail", detail: "tools/list result.tools is not an array" };
    }
    if (expected !== null && tools.length !== expected) {
      const names = tools.map(t => t.name).join(", ");
      return { rule: "mcp-twin-shape", severity: "fail", detail: `expected ${expected} tools, got ${tools.length} (${names})` };
    }
    for (const t of tools) {
      if (!t.name) return { rule: "mcp-twin-shape", severity: "fail", detail: "tool missing name" };
      if (!t.description) return { rule: "mcp-twin-shape", severity: "fail", detail: `tool ${JSON.stringify(t.name)} missing description` };
      if (!t.inputSchema) return { rule: "mcp-twin-shape", severity: "fail", detail: `tool ${JSON.stringify(t.name)} missing inputSchema` };
      const schema = t.inputSchema as { type?: string };
      if (schema.type !== "object") return { rule: "mcp-twin-shape", severity: "fail", detail: `tool ${JSON.stringify(t.name)} inputSchema.type !== "object"` };
    }
    const note = expected === null ? " (shape-only — no agent-context cross-check)" : "";
    return { rule: "mcp-twin-shape", severity: "pass", detail: `MCP twin advertises ${tools.length} tools${note}` };
  } catch (e) {
    const stderr = await new Response(proc.stderr).text();
    return {
      rule: "mcp-twin-shape",
      severity: "fail",
      detail: `${(e as Error).message}${stderr ? `; stderr: ${stderr.slice(0, 120)}` : ""}`,
    };
  } finally {
    try { writer.end(); } catch { /* ignore */ }
    proc.kill();
  }
};

export default rule;
