import type { Rule } from "../types";
import { run, tokenize, hasAnsi } from "../run";

const rule: Rule = async (target, config) => {
  // Bun.spawn doesn't allocate a PTY by default, so stdout.isTTY=false in the child — exactly what we want.
  const r = await run(target, { args: tokenize(config.sampleReadCommand) });
  if (r.exitCode !== 0) return { rule: "tty-autodetect", severity: "warn", detail: `sample exited ${r.exitCode}, can't assess` };
  if (hasAnsi(r.stdout)) return { rule: "tty-autodetect", severity: "fail", detail: "ANSI in piped stdout (TTY autodetect not honored)" };
  // Bonus: piped output should likely be JSON. Don't fail on this — some CLIs choose otherwise.
  try {
    JSON.parse(r.stdout.trim());
    return { rule: "tty-autodetect", severity: "pass", detail: "piped stdout = JSON, no ANSI" };
  } catch {
    return { rule: "tty-autodetect", severity: "warn", detail: "no ANSI but stdout not JSON when piped" };
  }
};

export default rule;
