import { defineCommand } from "citty";
import { withGlobals } from "../flags";
import { applyAgentPreset } from "../agent-preset";
import { emit, applyCompact } from "../output";
import { readExamples } from "../store";

const COMPACT_FIELDS = ["id", "title", "status", "updatedAt"] as const;

const sampleLive = [
  { id: "ex_001", title: "First example",  status: "open",   updatedAt: "2025-01-15T10:00:00Z", owner: { name: "alex" } },
  { id: "ex_002", title: "Second example", status: "closed", updatedAt: "2025-02-01T14:30:00Z", owner: { name: "blair" } },
  { id: "ex_003", title: "Third example",  status: "open",   updatedAt: "2025-03-10T09:15:00Z", owner: { name: "casey" } },
];

export default defineCommand({
  meta: { name: "list", description: "List examples (read-only; honors --select / --compact / --data-source)", readOnly: true },
  args: withGlobals({}),
  async run({ args }) {
    applyAgentPreset(args);
    const { source, data } = await readExamples(args, async () => sampleLive);
    const records = (data as Record<string, unknown>[]).map(r => applyCompact(r, COMPACT_FIELDS, args));
    emit(records, args, (p) =>
      `# source: ${source}\n` +
      (p as Array<{ id: string; title?: string; status?: string }>)
        .map(r => `${r.id}\t${r.title ?? ""}\t${r.status ?? ""}`)
        .join("\n")
    );
  },
});
