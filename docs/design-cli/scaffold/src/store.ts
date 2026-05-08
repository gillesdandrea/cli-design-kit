import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

const storePath = `${process.env.HOME}/.local/share/demo-cli/store.sqlite`;
mkdirSync(dirname(storePath), { recursive: true });

export const store = new Database(storePath, { create: true });
store.run(`CREATE TABLE IF NOT EXISTS examples (id TEXT PRIMARY KEY, json TEXT, syncedAt INTEGER)`);

export type DataSource = "auto" | "live";

export async function readExamples(
  args: { "data-source"?: string },
  fetchLive: () => Promise<unknown[]>,
): Promise<{ source: "local" | "live"; data: unknown[] }> {
  const source = (args["data-source"] ?? "auto") as DataSource;
  if (source === "live") return { source: "live", data: await fetchLive() };
  const rows = store.query<{ json: string }, []>(`SELECT json FROM examples`).all();
  if (rows.length > 0) return { source: "local", data: rows.map(r => JSON.parse(r.json) as unknown) };
  return { source: "live", data: await fetchLive() };
}

export function writeExamples(examples: { id: string; [k: string]: unknown }[]): number {
  const stmt = store.prepare(`INSERT OR REPLACE INTO examples (id, json, syncedAt) VALUES (?, ?, ?)`);
  const tx = store.transaction((rows: { id: string; json: string }[]) => {
    for (const r of rows) stmt.run(r.id, r.json, Date.now());
  });
  tx(examples.map(e => ({ id: e.id, json: JSON.stringify(e) })));
  return examples.length;
}
