import { defineCommand } from "citty";
import { withGlobals } from "../flags";
import { applyAgentPreset } from "../agent-preset";
import { emit } from "../output";
import { fail } from "../errors";

export default defineCommand({
  meta: { name: "create", description: "Create an example (mutating; honors --dry-run / --yes)" },
  args: withGlobals({
    title: { type: "string", required: true, description: "Example title" },
  }),
  async run({ args }) {
    applyAgentPreset(args);
    const payload = { id: `ex_${Date.now()}`, title: args.title, status: "open", createdAt: new Date().toISOString() };
    if (args["dry-run"]) {
      emit({ wouldCreate: payload }, args);
      return;
    }
    const interactive = process.stdin.isTTY && !args["no-input"];
    if (!args.yes && !interactive) {
      fail("usage", "refusing to create without --yes in non-interactive mode", {
        hint: "pass --yes (or --agent) to proceed; --dry-run to preview",
        json: !!args.json,
      });
    }
    if (!args.yes && interactive) {
      process.stderr.write(`About to create "${args.title}". Re-run with --yes to skip this notice.\n`);
      return;
    }
    emit({ created: payload }, args);
  },
});
