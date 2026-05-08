import type { Rule } from "../types";
import { run, tokenize } from "../run";

const rule: Rule = async (target, config) => {
  const r = await run(target, { args: [...tokenize(config.sampleReadCommand), "--quiet"] });
  if (r.exitCode !== 0) return { rule: "quiet-mode", severity: "fail", detail: `--quiet exited ${r.exitCode}` };
  if (r.stdout.trim().length > 0) return { rule: "quiet-mode", severity: "fail", detail: `--quiet wrote stdout: ${r.stdout.slice(0, 60)}` };
  return { rule: "quiet-mode", severity: "pass", detail: "stdout silent under --quiet" };
};

export default rule;
