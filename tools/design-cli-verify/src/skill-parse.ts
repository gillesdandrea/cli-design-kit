import type { AgentContextV2, Target, VerifyConfig } from "./types";
import { run } from "./run";

/** Default allowlist: flags citty handles natively without explicit declaration. */
export const DEFAULT_COMMON_FLAGS = new Set(["help", "version"]);

export type SkillState = {
  ctx: AgentContextV2;
  parsed: ParsedSkill;
  skillPath: string;
  skillText: string;
  commonFlags: Set<string>;
  knownPaths: string[];
};

/** Run agent-context, parse SKILL.md. Returns null if skill not configured. `config.skill` must be absolute by the time it reaches here. */
export async function loadSkillState(
  target: Target,
  config: VerifyConfig,
): Promise<SkillState | null> {
  if (!config.skill) return null;
  const skillPath = config.skill;
  const skillText = await Bun.file(skillPath).text();
  const ctx = await fetchAgentContext(() => run(target, { args: ["agent-context"] }));
  const knownPaths = ctx.commands.map(c => c.path);
  const parsed = parseSkill(skillText, ctx.cli.name, knownPaths);
  const commonFlags = new Set([...DEFAULT_COMMON_FLAGS, ...(config.commonFlags ?? [])]);
  return { ctx, parsed, skillPath, skillText, commonFlags, knownPaths };
}

export type Recipe = {
  cmdPath: string[];
  positionals: string[];
  flags: string[];
  line: number;
};

export type InlineCommand = {
  cmdPath: string[];
  line: number;
};

export type ParsedSkill = {
  recipes: Recipe[];
  inlineCommands: InlineCommand[];
};

/** Run agent-context, parse output, return v2 context. Throws on shape mismatch. */
export async function fetchAgentContext(spawn: () => Promise<{ exitCode: number; stdout: string; stderr: string }>): Promise<AgentContextV2> {
  const r = await spawn();
  if (r.exitCode !== 0) throw new Error(`agent-context exited ${r.exitCode}: ${r.stderr.slice(0, 120)}`);
  const obj = JSON.parse(r.stdout.trim()) as AgentContextV2;
  if (obj.schemaVersion !== "2") throw new Error(`agent-context schemaVersion is ${JSON.stringify(obj.schemaVersion)}, expected "2"`);
  return obj;
}

/** Parse a SKILL.md text into recipes + inline command references. */
export function parseSkill(text: string, cliBinary: string, knownPaths: string[]): ParsedSkill {
  const lines = text.split("\n");
  const recipes: Recipe[] = [];
  const inlineCommands: InlineCommand[] = [];

  let inFenced: "bash" | "other" | null = null;
  let inCommandReference = false;
  let buffer: { line: number; text: string } | null = null;

  const flushRecipe = (): void => {
    if (!buffer) return;
    const tokens = tokenize(replaceShellSubstitutions(buffer.text));
    if (tokens[0] === cliBinary) {
      const r = classifyTokens(tokens.slice(1), knownPaths, buffer.line);
      if (r) recipes.push(r);
    }
    buffer = null;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    const lineNo = i + 1;

    // Fenced-block boundary detection.
    const fenceMatch = /^```(\w*)\s*$/.exec(line);
    if (fenceMatch) {
      if (inFenced === null) {
        inFenced = fenceMatch[1] === "bash" || fenceMatch[1] === "sh" || fenceMatch[1] === "shell" ? "bash" : "other";
      } else {
        if (inFenced === "bash") flushRecipe();
        inFenced = null;
      }
      continue;
    }

    // H2 heading detection (controls inline-command scoping).
    const h2Match = /^##\s+(.+?)\s*$/.exec(line);
    if (h2Match) {
      flushRecipe();
      inCommandReference = /^command reference\b/i.test(h2Match[1] ?? "");
      continue;
    }

    if (inFenced === "bash") {
      // Line continuation: append next line.
      if (buffer) {
        buffer.text += " " + line;
      } else if (line.trim().startsWith(cliBinary)) {
        buffer = { line: lineNo, text: line };
      }
      // If buffer ends with `\`, keep buffering.
      if (buffer && buffer.text.trim().endsWith("\\")) {
        buffer.text = buffer.text.replace(/\\\s*$/, "");
        continue;
      }
      // Otherwise stop at shell operators.
      if (buffer) {
        const stopMatch = /\s(\||&&|\|\||;|>|>>|<)\s/.exec(buffer.text);
        if (stopMatch) buffer.text = buffer.text.slice(0, stopMatch.index);
        flushRecipe();
      }
      continue;
    }

    if (inCommandReference) {
      // Inline-command extraction: every `<cliBinary> ...` backtick mention on this line.
      const re = new RegExp("`" + escapeRegex(cliBinary) + "\\s+([^`]+)`", "g");
      let m: RegExpExecArray | null;
      while ((m = re.exec(line)) !== null) {
        const inner = m[1] ?? "";
        const tokens = tokenize(inner);
        const cmdPath = takeCommandPath(tokens, knownPaths);
        if (cmdPath.length > 0) {
          inlineCommands.push({ cmdPath, line: lineNo });
        }
      }
    }
  }

  flushRecipe();
  return { recipes, inlineCommands };
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Replace $(...) substitutions with a single placeholder so the tokenizer doesn't choke. */
function replaceShellSubstitutions(s: string): string {
  return s.replace(/\$\([^)]*\)/g, "__SUBST__").replace(/`[^`]*`/g, "__SUBST__");
}

/** Minimal POSIX-ish shell tokenizer: respects single/double quotes; treats `\` as escape outside quotes. */
export function tokenize(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inSingle = false;
  let inDouble = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i] ?? "";
    if (inSingle) {
      if (c === "'") inSingle = false;
      else cur += c;
      continue;
    }
    if (inDouble) {
      if (c === '"') inDouble = false;
      else if (c === "\\" && i + 1 < line.length) {
        cur += line[i + 1];
        i++;
      } else cur += c;
      continue;
    }
    if (c === "'") { inSingle = true; continue; }
    if (c === '"') { inDouble = true; continue; }
    if (c === "\\" && i + 1 < line.length) {
      cur += line[i + 1];
      i++;
      continue;
    }
    if (/\s/.test(c)) {
      if (cur.length > 0) { out.push(cur); cur = ""; }
      continue;
    }
    cur += c;
  }
  if (cur.length > 0) out.push(cur);
  return out;
}

/** Walk tokens; classify into cmdPath / positionals / flags. Uses knownPaths for greedy disambiguation. */
function classifyTokens(tokens: string[], knownPaths: string[], line: number): Recipe | null {
  if (tokens.length === 0) return null;

  const flags: string[] = [];
  const nonFlags: string[] = [];

  // Skip flag values (the token immediately after a non-`=` flag with `string` semantics).
  // Without command context, we can't be sure which flags consume values, so a heuristic:
  // a token after `--name` that doesn't start with `-` is a value iff `--name` doesn't match
  // a known boolean. Since we don't know that here, assume value-consumption when the flag
  // has no inline `=`. Mark consumed values so they don't show up as positionals.
  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i] ?? "";
    if (tok.startsWith("--")) {
      const eq = tok.indexOf("=");
      const name = (eq >= 0 ? tok.slice(2, eq) : tok.slice(2)).trim();
      if (name) flags.push(name);
      if (eq < 0 && i + 1 < tokens.length && !(tokens[i + 1] ?? "").startsWith("-")) {
        // Heuristic: assume next token is the value. Skip it.
        i++;
      }
      continue;
    }
    if (tok.startsWith("-") && tok.length > 1) {
      // Short flag (single char). Capture name without leading -. Don't consume value.
      flags.push(tok.slice(1));
      continue;
    }
    nonFlags.push(tok);
  }

  // Greedy longest-prefix match in knownPaths.
  let cmdPath: string[] = [];
  for (let n = Math.min(nonFlags.length, 5); n >= 1; n--) {
    const candidate = nonFlags.slice(0, n).join(" ");
    if (knownPaths.includes(candidate)) { cmdPath = nonFlags.slice(0, n); break; }
  }
  if (cmdPath.length === 0 && nonFlags.length > 0) {
    // No matching command path; treat the first token as the cmdPath head (so unknown-commands fires).
    cmdPath = [nonFlags[0] as string];
  }
  const positionals = nonFlags.slice(cmdPath.length);
  return { cmdPath, positionals, flags, line };
}

/** Extract the longest matching cmdPath prefix from a list of tokens (used for inline mentions). */
function takeCommandPath(tokens: string[], knownPaths: string[]): string[] {
  const nonFlags: string[] = [];
  for (const t of tokens) {
    if (t.startsWith("-")) break;
    nonFlags.push(t);
  }
  for (let n = Math.min(nonFlags.length, 5); n >= 1; n--) {
    const candidate = nonFlags.slice(0, n).join(" ");
    if (knownPaths.includes(candidate)) return nonFlags.slice(0, n);
  }
  return nonFlags.length > 0 ? [nonFlags[0] as string] : [];
}
