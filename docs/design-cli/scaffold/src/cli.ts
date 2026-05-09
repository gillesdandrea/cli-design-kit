#!/usr/bin/env bun
import { defineCommand, runCommand, showUsage, type CommandDef } from "citty";

import { globalArgs } from "./flags";
import { ExitCode } from "./errors";
import example from "./commands/example";
import which from "./commands/which";
import agentContext, { setRoot as setAgentContextRoot } from "./commands/agent-context";
import version from "./commands/version";
import completion, { setRoot as setCompletionRoot } from "./commands/completion";
import doctor from "./commands/doctor";
import profile from "./commands/profile";
import sync from "./commands/sync";
import feedback from "./commands/feedback";
import mcp from "./commands/mcp";

const main = defineCommand({
  meta: {
    name: "demo-cli",
    version: "0.1.0",
    description: "A CLI scaffolded by /design-cli — agent-ready by default. Run `demo-cli agent-context` to introspect.",
  },
  args: globalArgs,
  subCommands: {
    example,
    which,
    "agent-context": agentContext,
    version,
    completion,
    doctor,
    profile,
    sync,
    feedback,
    mcp,
  },
});
// `main` is narrowed by `globalArgs as const`; setters want generic CommandDef.
setAgentContextRoot(() => main as unknown as CommandDef);
setCompletionRoot(() => main as unknown as CommandDef);

const rawArgs = process.argv.slice(2);

try {
  if (rawArgs.includes("--help") || rawArgs.includes("-h")) {
    await showUsage(main);
    process.exit(ExitCode.Ok);
  }
  await runCommand(main, { rawArgs });
} catch (err) {
  const e = err as { code?: string; message?: string };
  const isUsage = e.code === "EARG" || e.code === "E_UNKNOWN_COMMAND" || e.code === "E_NO_COMMAND";
  process.stderr.write(`error: ${e.message ?? String(err)}\n`);
  process.exit(isUsage ? ExitCode.Usage : 1);
}
