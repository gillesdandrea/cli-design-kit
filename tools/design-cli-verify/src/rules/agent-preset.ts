import type { Rule } from "../types";
import { run, tokenize } from "../run";

const rule: Rule = async (target, config) => {
  const help = await run(target, { args: ["--help"] });
  if (!/--agent/.test(help.stdout + help.stderr)) {
    return { rule: "agent-preset", severity: "fail", detail: "--agent not advertised in --help" };
  }
  const r = await run(target, { args: ["--agent", ...tokenize(config.sampleReadCommand)] });
  if (r.exitCode !== 0) return { rule: "agent-preset", severity: "fail", detail: `--agent <sample> exited ${r.exitCode}: ${r.stderr.slice(0, 120)}` };
  try {
    JSON.parse(r.stdout.trim());
  } catch {
    return { rule: "agent-preset", severity: "fail", detail: "--agent did not produce JSON output" };
  }
  return { rule: "agent-preset", severity: "pass", detail: "--agent advertised and produces JSON" };
};

export default rule;
