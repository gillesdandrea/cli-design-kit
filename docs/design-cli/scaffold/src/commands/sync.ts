import { defineCommand } from "citty";
import { writeExamples } from "../store";
import { emit } from "../output";
import { withGlobals } from "../flags";

const sampleExamples = [
  { id: "ex_001", title: "First example",  status: "open",   updatedAt: "2025-01-15T10:00:00Z" },
  { id: "ex_002", title: "Second example", status: "closed", updatedAt: "2025-02-01T14:30:00Z" },
  { id: "ex_003", title: "Third example",  status: "open",   updatedAt: "2025-03-10T09:15:00Z" },
];

export default defineCommand({
  meta: { name: "sync", description: "Populate the local store from the API" },
  args: withGlobals({}),
  async run({ args }) {
    // Replace this with a real fetch in your CLI.
    const count = writeExamples(sampleExamples);
    emit({ synced: count, source: "stub" }, args, () => `synced ${count} examples\n`);
  },
});
