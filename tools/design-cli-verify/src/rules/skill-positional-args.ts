import type { Rule } from "../types";
import { loadSkillState } from "../skill-parse";

const rule: Rule = async (target, config) => {
  const load = await loadSkillState(target, config);
  if (load.kind === "skipped") return { rule: "skill-positional-args", severity: "warn", detail: load.reason };
  const state = load.state;

  const positionalsByPath = new Map<string, { name: string; required: boolean }[]>();
  for (const c of state.ctx.commands) positionalsByPath.set(c.path, c.positionals);

  const violations: { cmd: string; got: number; min: number; max: number; line: number }[] = [];
  for (const r of state.parsed.recipes) {
    if (r.cmdPath.length === 0) continue;
    const cmdKey = r.cmdPath.join(" ");
    const expected = positionalsByPath.get(cmdKey);
    if (!expected) continue; // skill-unknown-commands will catch missing commands
    const required = expected.filter(p => p.required).length;
    const max = expected.length;
    const got = r.positionals.length;
    if (got < required || got > max) {
      violations.push({ cmd: cmdKey, got, min: required, max, line: r.line });
    }
  }

  if (violations.length === 0) {
    return { rule: "skill-positional-args", severity: "pass", detail: `${state.parsed.recipes.length} recipes; positional counts match` };
  }
  const first = violations[0]!;
  return {
    rule: "skill-positional-args",
    severity: "fail",
    detail: `${violations.length} recipe(s) with wrong positional count; first: \`${first.cmd}\` got ${first.got}, expected ${first.min}–${first.max} at SKILL.md:${first.line}`,
  };
};

export default rule;
