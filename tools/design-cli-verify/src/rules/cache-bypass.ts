import type { Rule } from "../types";
import { run, tokenize } from "../run";

const rule: Rule = async (target, config) => {
  const help = await run(target, { args: ["--help"] });
  if (!/--no-cache/.test(help.stdout + help.stderr)) {
    return { rule: "cache-bypass", severity: "warn", detail: "--no-cache not advertised in --help (skip if no caching)" };
  }
  const r = await run(target, { args: [...tokenize(config.sampleReadCommand), "--no-cache"] });
  if (r.exitCode !== 0) return { rule: "cache-bypass", severity: "fail", detail: `--no-cache exited ${r.exitCode}` };
  return { rule: "cache-bypass", severity: "pass", detail: "--no-cache wired" };
};

export default rule;
