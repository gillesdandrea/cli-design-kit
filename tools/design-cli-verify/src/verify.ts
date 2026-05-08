#!/usr/bin/env bun
import { resolve } from "node:path";
import type { Rule, RuleResult, Target, VerifyConfig } from "./types";

import helpRuns from "./rules/help-runs";
import versionShape from "./rules/version-shape";
import jsonMode from "./rules/json-mode";
import quietMode from "./rules/quiet-mode";
import agentPreset from "./rules/agent-preset";
import typedExitCodes from "./rules/typed-exit-codes";
import noColorHonored from "./rules/no-color-honored";
import ttyAutodetect from "./rules/tty-autodetect";
import agentContext from "./rules/agent-context";
import noPrompts from "./rules/no-prompts";
import which from "./rules/which";
import select from "./rules/select";
import completion from "./rules/completion";
import cacheBypass from "./rules/cache-bypass";
import frameworkCommands from "./rules/framework-commands";

const rules: Rule[] = [
  helpRuns,
  versionShape,
  jsonMode,
  quietMode,
  agentPreset,
  typedExitCodes,
  noColorHonored,
  ttyAutodetect,
  agentContext,
  noPrompts,
  which,
  select,
  completion,
  cacheBypass,
  frameworkCommands,
];

async function main() {
  const configPath = process.argv[2];
  if (!configPath) {
    process.stderr.write("usage: design-cli-verify <config-path>\n");
    process.exit(2);
  }
  const cfgFile = Bun.file(resolve(configPath));
  if (!(await cfgFile.exists())) {
    process.stderr.write(`config not found: ${configPath}\n`);
    process.exit(2);
  }
  const config = (await cfgFile.json()) as VerifyConfig;

  const binAbs = resolve(configPath, "..", config.bin);
  const target: Target = config.runner
    ? { argv0: config.runner, argv: [binAbs] }
    : { argv0: binAbs, argv: [] };

  const results: RuleResult[] = [];
  for (const r of rules) {
    try {
      results.push(await r(target, config));
    } catch (e) {
      results.push({ rule: r.name || "unknown", severity: "fail", detail: `threw: ${(e as Error).message}` });
    }
  }

  const widest = Math.max(...results.map(r => r.rule.length));
  for (const r of results) {
    const icon = r.severity === "pass" ? "✓" : r.severity === "warn" ? "▲" : "✗";
    process.stdout.write(`${icon} ${r.rule.padEnd(widest)}  ${r.detail}\n`);
  }

  const fails = results.filter(r => r.severity === "fail").length;
  const warns = results.filter(r => r.severity === "warn").length;
  process.stdout.write(`\n${results.length - fails - warns} pass, ${warns} warn, ${fails} fail\n`);

  if (fails > 0) process.exit(2);
  if (warns > 0) process.exit(1);
  process.exit(0);
}

await main();
