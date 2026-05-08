import type { Rule } from "../types";
import { loadSkillState } from "../skill-parse";

const rule: Rule = async (target, config) => {
  const state = await loadSkillState(target, config);
  if (!state) return { rule: "skill-unknown-commands", severity: "warn", detail: "skill not configured" };

  const known = new Set(state.knownPaths);

  type Mention = { cmdPath: string[]; line: number; surface: "recipe" | "inline" };
  const mentions: Mention[] = [
    ...state.parsed.recipes.map(r => ({ cmdPath: r.cmdPath, line: r.line, surface: "recipe" as const })),
    ...state.parsed.inlineCommands.map(i => ({ cmdPath: i.cmdPath, line: i.line, surface: "inline" as const })),
  ];

  const seen = new Set<string>();
  const violations: { cmdPath: string[]; line: number; surface: string; closestPrefix: string | null }[] = [];

  for (const m of mentions) {
    if (m.cmdPath.length === 0) continue;
    const key = m.cmdPath.join(" ");
    if (seen.has(key)) continue;
    seen.add(key);
    if (known.has(key)) continue;
    let closestPrefix: string | null = null;
    for (let n = m.cmdPath.length - 1; n >= 1; n--) {
      const prefix = m.cmdPath.slice(0, n).join(" ");
      if (known.has(prefix)) { closestPrefix = prefix; break; }
    }
    violations.push({ cmdPath: m.cmdPath, line: m.line, surface: m.surface, closestPrefix });
  }

  if (violations.length === 0) {
    return { rule: "skill-unknown-commands", severity: "pass", detail: `${mentions.length} command mentions; all resolve` };
  }
  const first = violations[0]!;
  const path = first.cmdPath.join(" ");
  const hint = first.closestPrefix ? ` (closest: \`${first.closestPrefix}\`)` : "";
  return {
    rule: "skill-unknown-commands",
    severity: "fail",
    detail: `${violations.length} unknown command path(s); first: \`${path}\`${hint} at SKILL.md:${first.line} (${first.surface})`,
  };
};

export default rule;
