import type { Rule } from "../types";
import { loadSkillState } from "../skill-parse";

const rule: Rule = async (target, config) => {
  const state = await loadSkillState(target, config);
  if (!state) return { rule: "skill-flag-names", severity: "warn", detail: "skill not configured" };

  // Build a set of every declared flag name (globals + per-command).
  const declared = new Set<string>(state.commonFlags);
  for (const f of state.ctx.globalFlags) declared.add(f.name);
  for (const c of state.ctx.commands) for (const f of c.flags) declared.add(f.name);

  const missing: { flag: string; line: number; cmdPath: string[] }[] = [];
  const seen = new Set<string>();
  for (const r of state.parsed.recipes) {
    for (const flag of r.flags) {
      if (declared.has(flag) || seen.has(flag)) continue;
      seen.add(flag);
      missing.push({ flag, line: r.line, cmdPath: r.cmdPath });
    }
  }

  if (missing.length === 0) {
    return { rule: "skill-flag-names", severity: "pass", detail: `${state.parsed.recipes.length} recipes; all flags declared` };
  }
  const first = missing[0]!;
  const cmd = first.cmdPath.join(" ") || "(root)";
  return {
    rule: "skill-flag-names",
    severity: "fail",
    detail: `${missing.length} undeclared flag(s); first: --${first.flag} on \`${cmd}\` at SKILL.md:${first.line}`,
  };
};

export default rule;
