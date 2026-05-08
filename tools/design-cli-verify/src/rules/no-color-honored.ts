import type { Rule } from "../types";
import { run, hasAnsi } from "../run";

const rule: Rule = async (target) => {
  const r = await run(target, { args: ["--help"], env: { NO_COLOR: "1", FORCE_COLOR: "" } });
  if (hasAnsi(r.stdout + r.stderr)) {
    return { rule: "no-color-honored", severity: "fail", detail: "ANSI present in output despite NO_COLOR=1" };
  }
  return { rule: "no-color-honored", severity: "pass", detail: "NO_COLOR=1 strips ANSI" };
};

export default rule;
