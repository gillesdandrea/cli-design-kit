import type { Rule } from "../types";
import { run } from "../run";

const rule: Rule = async (target) => {
  const r = await run(target, { args: ["--help"], timeoutMs: 3000 });
  if (r.timedOut) return { rule: "help-runs", severity: "fail", detail: "timed out (>3s) — likely waiting on a prompt" };
  if (r.exitCode !== 0) return { rule: "help-runs", severity: "fail", detail: `--help exited ${r.exitCode}` };
  if (!r.stdout && !r.stderr) return { rule: "help-runs", severity: "fail", detail: "--help printed nothing" };
  return { rule: "help-runs", severity: "pass", detail: `--help exited 0 in ${r.durationMs}ms` };
};

export default rule;
