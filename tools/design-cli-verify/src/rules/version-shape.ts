import type { Rule } from "../types";
import { run } from "../run";

const SEMVER = /\b\d+\.\d+\.\d+(?:[-+][\w.+-]+)?\b/;

const rule: Rule = async (target) => {
  // Try `version` subcommand first, then `--version`
  let r = await run(target, { args: ["version"] });
  if (r.exitCode !== 0) r = await run(target, { args: ["--version"] });
  if (r.exitCode !== 0) return { rule: "version-shape", severity: "fail", detail: `neither 'version' nor '--version' worked` };
  const out = (r.stdout + r.stderr).trim().split("\n")[0] ?? "";
  if (!SEMVER.test(out)) return { rule: "version-shape", severity: "fail", detail: `no semver in: "${out}"` };
  return { rule: "version-shape", severity: "pass", detail: `parseable: "${out}"` };
};

export default rule;
