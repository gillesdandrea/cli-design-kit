import type { Rule } from "../types";
import { run } from "../run";

const rule: Rule = async (target, config) => {
  const r = await run(target, { args: ["which", config.capability] });
  if (r.exitCode !== 0) return { rule: "which", severity: "fail", detail: `which "${config.capability}" exited ${r.exitCode}` };
  if (!r.stdout.trim()) return { rule: "which", severity: "fail", detail: "which produced no output" };
  const firstLine = r.stdout.trim().split("\n")[0] ?? "";
  return { rule: "which", severity: "pass", detail: `→ ${firstLine}` };
};

export default rule;
