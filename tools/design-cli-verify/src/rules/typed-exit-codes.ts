import type { Rule } from "../types";
import { run } from "../run";

const rule: Rule = async (target) => {
  const r = await run(target, { args: ["--definitely-not-a-real-flag-xyzzy"] });
  if (r.exitCode === 2) return { rule: "typed-exit-codes", severity: "pass", detail: "bad flag → exit 2" };
  if (r.exitCode === 0) return { rule: "typed-exit-codes", severity: "fail", detail: "bad flag exited 0 (silently accepted)" };
  return { rule: "typed-exit-codes", severity: "warn", detail: `bad flag exited ${r.exitCode} (expected 2)` };
};

export default rule;
