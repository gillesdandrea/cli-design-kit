import { defineCommand, type CommandDef } from "citty";
import { buildAgentContext } from "../agent-context-builder";
import { capabilities } from "../capabilities";

const exitCodes = [
  { code: 0,  name: "ok" },
  { code: 2,  name: "usage" },
  { code: 3,  name: "not_found" },
  { code: 4,  name: "auth" },
  { code: 5,  name: "api" },
  { code: 7,  name: "rate_limit" },
  { code: 10, name: "config" },
];

let getRoot: (() => CommandDef) | null = null;

export function setRoot(fn: () => CommandDef): void {
  getRoot = fn;
}

export default defineCommand({
  meta: { name: "agent-context", description: "Emit the CLI's machine-readable schema (versioned JSON)" },
  async run() {
    const fn = getRoot;
    if (!fn) {
      process.stderr.write("agent-context: root not initialized\n");
      process.exit(1);
    }
    const ctx = await buildAgentContext(fn(), {
      exitCodes,
      capabilities: capabilities.map(c => c.capability),
    });
    process.stdout.write(JSON.stringify(ctx) + "\n");
  },
});
