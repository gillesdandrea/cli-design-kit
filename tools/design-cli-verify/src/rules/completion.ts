import type { Rule } from "../types";
import { run } from "../run";

const rule: Rule = async (target) => {
  const r = await run(target, { args: ["completion", "bash"] });
  if (r.exitCode !== 0) return { rule: "completion", severity: "fail", detail: `completion bash exited ${r.exitCode}` };
  if (r.stdout.trim().length < 20) return { rule: "completion", severity: "fail", detail: "completion output suspiciously short" };
  if (r.stderr.trim().length > 0) return { rule: "completion", severity: "warn", detail: "completion wrote stderr" };
  return { rule: "completion", severity: "pass", detail: `bash completion: ${r.stdout.length} bytes` };
};

export default rule;
