import type { Rule } from "../types";
import { run, tokenize } from "../run";

const rule: Rule = async (target, config) => {
  const r = await run(target, { args: [...tokenize(config.sampleReadCommand), "--json"] });
  if (r.exitCode !== 0) return { rule: "json-mode", severity: "fail", detail: `sample command --json exited ${r.exitCode}: ${r.stderr.slice(0, 120)}` };
  try {
    JSON.parse(r.stdout.trim());
  } catch {
    return { rule: "json-mode", severity: "fail", detail: `stdout is not valid JSON: ${r.stdout.slice(0, 120)}` };
  }
  return { rule: "json-mode", severity: "pass", detail: "stdout parses as JSON" };
};

export default rule;
