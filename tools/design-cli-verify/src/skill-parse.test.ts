import { describe, expect, test } from "bun:test";
import { parseSkill, tokenize } from "./skill-parse";

const knownPaths = ["example", "example list", "example create", "sync", "agent-context"];

describe("parseSkill — recipes", () => {
  test("captures a single-line recipe with flags and positionals", () => {
    const md = "```bash\ndemo-cli example create --title hi\n```";
    const { recipes } = parseSkill(md, "demo-cli", knownPaths, new Set(["json"]));
    expect(recipes).toHaveLength(1);
    expect(recipes[0]).toMatchObject({
      cmdPath: ["example", "create"],
      flags: ["title"],
      positionals: [],
    });
  });

  test("merges lines joined by trailing backslash", () => {
    const md = "```bash\ndemo-cli example list \\\n  --json --select id\n```";
    const { recipes } = parseSkill(md, "demo-cli", knownPaths, new Set(["json"]));
    expect(recipes).toHaveLength(1);
    expect(recipes[0]?.flags).toEqual(["json", "select"]);
  });

  test("recognises sh and shell fences alongside bash", () => {
    const md = "```sh\ndemo-cli sync\n```\n```shell\ndemo-cli example list\n```";
    const { recipes } = parseSkill(md, "demo-cli", knownPaths, new Set());
    expect(recipes.map(r => r.cmdPath.join(" "))).toEqual(["sync", "example list"]);
  });

  test("ignores recipes inside non-shell fenced blocks", () => {
    const md = "```text\ndemo-cli example list\n```\n```ts\ndemo-cli example list\n```";
    const { recipes } = parseSkill(md, "demo-cli", knownPaths, new Set());
    expect(recipes).toHaveLength(0);
  });

  test("stops at shell operators (|, &&, >)", () => {
    const md = "```bash\ndemo-cli example list --json | jq .id\n```";
    const { recipes } = parseSkill(md, "demo-cli", knownPaths, new Set(["json"]));
    expect(recipes).toHaveLength(1);
    expect(recipes[0]?.cmdPath).toEqual(["example", "list"]);
    expect(recipes[0]?.positionals).toEqual([]);
  });

  test("preserves positionals after a boolean flag (M2 regression)", () => {
    // Without the boolean-aware heuristic, `--json` would eat `id` as its value.
    const md = "```bash\ndemo-cli example list --json id\n```";
    const { recipes } = parseSkill(md, "demo-cli", knownPaths, new Set(["json"]));
    expect(recipes).toHaveLength(1);
    expect(recipes[0]?.flags).toEqual(["json"]);
    expect(recipes[0]?.positionals).toEqual(["id"]);
  });

  test("consumes the next token as value for non-boolean flags", () => {
    // `select` is a string flag; `id` should be its value, not a positional.
    const md = "```bash\ndemo-cli example list --select id\n```";
    const { recipes } = parseSkill(md, "demo-cli", knownPaths, new Set(["json"]));
    expect(recipes).toHaveLength(1);
    expect(recipes[0]?.flags).toEqual(["select"]);
    expect(recipes[0]?.positionals).toEqual([]);
  });

  test("greedy command-path matching prefers longer paths", () => {
    const md = "```bash\ndemo-cli example list extra-positional\n```";
    const { recipes } = parseSkill(md, "demo-cli", knownPaths, new Set());
    expect(recipes).toHaveLength(1);
    expect(recipes[0]?.cmdPath).toEqual(["example", "list"]);
    expect(recipes[0]?.positionals).toEqual(["extra-positional"]);
  });

  test("falls back to the first token for unknown command paths", () => {
    const md = "```bash\ndemo-cli totally-fake\n```";
    const { recipes } = parseSkill(md, "demo-cli", knownPaths, new Set());
    expect(recipes).toHaveLength(1);
    expect(recipes[0]?.cmdPath).toEqual(["totally-fake"]);
  });

  test("ignores lines that don't start with the cli binary", () => {
    const md = "```bash\nbun run demo-cli example list\n```";
    const { recipes } = parseSkill(md, "demo-cli", knownPaths, new Set());
    expect(recipes).toHaveLength(0);
  });
});

describe("parseSkill — inline command references", () => {
  test("scopes backtick mentions to '## Command Reference' only", () => {
    const md = [
      "# Top",
      "`demo-cli example list` should not count here.",
      "",
      "## Command Reference",
      "- `demo-cli example create` — does count",
      "- `demo-cli sync` — also counts",
    ].join("\n");
    const { inlineCommands } = parseSkill(md, "demo-cli", knownPaths, new Set());
    expect(inlineCommands.map(i => i.cmdPath.join(" "))).toEqual(["example create", "sync"]);
  });

  test("leaves the Command Reference scope when a new H2 starts", () => {
    const md = [
      "## Command Reference",
      "- `demo-cli sync`",
      "## Other",
      "- `demo-cli example list` should be ignored",
    ].join("\n");
    const { inlineCommands } = parseSkill(md, "demo-cli", knownPaths, new Set());
    expect(inlineCommands.map(i => i.cmdPath.join(" "))).toEqual(["sync"]);
  });
});

describe("tokenize", () => {
  test("respects single quotes", () => {
    expect(tokenize(`a 'b c' d`)).toEqual(["a", "b c", "d"]);
  });
  test("respects double quotes with escaped characters", () => {
    expect(tokenize(`a "b\\"c" d`)).toEqual(["a", `b"c`, "d"]);
  });
  test("treats backslash as escape outside quotes", () => {
    expect(tokenize(`a\\ b c`)).toEqual(["a b", "c"]);
  });
});
