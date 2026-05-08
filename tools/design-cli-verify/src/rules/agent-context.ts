import type { Rule } from "../types";
import { run } from "../run";

const rule: Rule = async (target) => {
  const r = await run(target, { args: ["agent-context"] });
  if (r.exitCode !== 0) return { rule: "agent-context", severity: "fail", detail: `agent-context exited ${r.exitCode}` };
  let payload: unknown;
  try { payload = JSON.parse(r.stdout.trim()); }
  catch { return { rule: "agent-context", severity: "fail", detail: "agent-context output is not JSON" }; }
  const obj = payload as Record<string, unknown>;
  const required = ["schemaVersion", "commands", "flags", "exitCodes"];
  const missing = required.filter(k => !(k in obj));
  if (missing.length) return { rule: "agent-context", severity: "fail", detail: `missing: ${missing.join(", ")}` };
  if (!Array.isArray(obj.commands) || (obj.commands as unknown[]).length === 0) {
    return { rule: "agent-context", severity: "fail", detail: "commands[] is empty" };
  }
  return { rule: "agent-context", severity: "pass", detail: `schema v${obj.schemaVersion}, ${(obj.commands as unknown[]).length} commands` };
};

export default rule;
