import type { Rule } from "../types";
import { run, tokenize } from "../run";

const rule: Rule = async (target, config) => {
  // Run the mutating command without --yes and with empty stdin; expect timely exit (no hang).
  const r = await run(target, {
    args: tokenize(config.sampleMutateCommand),
    timeoutMs: 3000,
    stdin: "",
  });
  if (r.timedOut) return { rule: "no-prompts", severity: "fail", detail: "mutating command hung — appears to be prompting" };
  return { rule: "no-prompts", severity: "pass", detail: `mutating command exited cleanly (${r.exitCode}) without --yes` };
};

export default rule;
