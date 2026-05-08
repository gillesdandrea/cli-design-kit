import type { Rule } from "../types";
import { run } from "../run";

const expected = ["version", "completion", "doctor", "which", "agent-context"];

const rule: Rule = async (target) => {
  const r = await run(target, { args: ["--help"] });
  const help = r.stdout + r.stderr;
  const missing = expected.filter(c => !new RegExp(`(^|\\s)${c}(\\s|$)`, "m").test(help));
  if (missing.length === 0) return { rule: "framework-commands", severity: "pass", detail: "all present" };
  return {
    rule: "framework-commands",
    severity: "warn",
    detail: `missing from --help: ${missing.join(", ")}`,
  };
};

export default rule;
