import { defineCommand } from "citty";
import { ExitCode } from "../errors";
import { capabilities as index } from "../capabilities";

export default defineCommand({
  meta: { name: "which", description: "Find the command that implements a capability (exit 0 = match, 2 = none)" },
  args: {
    query: { type: "positional", required: true, valueHint: "QUERY" },
  },
  run({ args }) {
    const q = args.query.toLowerCase();
    const ranked = index
      .map(e => {
        let score = 0;
        for (const t of e.tokens) {
          if (q === t) score += 3;
          else if (q.includes(t)) score += 2;
        }
        return { e, score };
      })
      .filter(r => r.score > 0)
      .sort((a, b) => b.score - a.score);
    if (!ranked.length) {
      process.stderr.write(`no match for "${args.query}"\n`);
      process.exit(ExitCode.Usage);
    }
    for (const { e } of ranked) process.stdout.write(`${e.command}\t${e.capability}\n`);
  },
});
