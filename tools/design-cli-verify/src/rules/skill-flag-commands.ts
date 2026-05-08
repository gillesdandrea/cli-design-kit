import type { Rule } from "../types";
import { loadSkillState } from "../skill-parse";

const rule: Rule = async (target, config) => {
  const load = await loadSkillState(target, config);
  if (load.kind === "skipped") return { rule: "skill-flag-commands", severity: "warn", detail: load.reason };
  const state = load.state;

  const globalNames = new Set<string>([
    ...state.commonFlags,
    ...state.ctx.globalFlags.map(f => f.name),
  ]);
  const localFlagsByPath = new Map<string, Set<string>>();
  for (const c of state.ctx.commands) {
    localFlagsByPath.set(c.path, new Set(c.flags.map(f => f.name)));
  }

  const violations: { flag: string; cmd: string; line: number }[] = [];
  for (const r of state.parsed.recipes) {
    if (r.cmdPath.length === 0) continue;
    const cmdKey = r.cmdPath.join(" ");
    const local = localFlagsByPath.get(cmdKey);
    // If cmdPath isn't a real command (skill-unknown-commands will catch that), skip the flag check.
    if (!local) continue;
    for (const flag of r.flags) {
      if (globalNames.has(flag)) continue;
      if (local.has(flag)) continue;
      violations.push({ flag, cmd: cmdKey, line: r.line });
    }
  }

  if (violations.length === 0) {
    return { rule: "skill-flag-commands", severity: "pass", detail: `${state.parsed.recipes.length} recipes; flag-on-command bindings ok` };
  }
  const first = violations[0]!;
  return {
    rule: "skill-flag-commands",
    severity: "fail",
    detail: `${violations.length} flag(s) on the wrong command; first: --${first.flag} on \`${first.cmd}\` at SKILL.md:${first.line}`,
  };
};

export default rule;
