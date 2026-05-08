import type { Rule } from "../types";
import { run } from "../run";

const rule: Rule = async (target) => {
  const r = await run(target, { args: ["agent-context"] });
  if (r.exitCode !== 0) return { rule: "agent-context", severity: "fail", detail: `agent-context exited ${r.exitCode}` };
  let payload: unknown;
  try { payload = JSON.parse(r.stdout.trim()); }
  catch { return { rule: "agent-context", severity: "fail", detail: "agent-context output is not JSON" }; }
  const obj = payload as Record<string, unknown>;
  const required = ["schemaVersion", "cli", "exitCodes", "globalFlags", "commands", "capabilities"];
  const missing = required.filter(k => !(k in obj));
  if (missing.length) return { rule: "agent-context", severity: "fail", detail: `missing keys: ${missing.join(", ")}` };
  if (obj.schemaVersion !== "2") {
    return { rule: "agent-context", severity: "fail", detail: `schemaVersion must be "2" (got ${JSON.stringify(obj.schemaVersion)})` };
  }
  const commands = obj.commands;
  if (!Array.isArray(commands) || commands.length === 0) {
    return { rule: "agent-context", severity: "fail", detail: "commands[] is empty" };
  }
  for (const cmd of commands as Record<string, unknown>[]) {
    if (typeof cmd.path !== "string") return { rule: "agent-context", severity: "fail", detail: "command missing path" };
    if (!Array.isArray(cmd.flags))       return { rule: "agent-context", severity: "fail", detail: `command ${JSON.stringify(cmd.path)} missing flags[]` };
    if (!Array.isArray(cmd.positionals)) return { rule: "agent-context", severity: "fail", detail: `command ${JSON.stringify(cmd.path)} missing positionals[]` };
  }
  return { rule: "agent-context", severity: "pass", detail: `schema v2, ${commands.length} commands, ${(obj.globalFlags as unknown[]).length} globals` };
};

export default rule;
