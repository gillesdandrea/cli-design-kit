import { defineCommand } from "citty";
import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

const dbPath = `${process.env.HOME}/.config/demo-cli/profiles.sqlite`;
mkdirSync(dirname(dbPath), { recursive: true });
const db = new Database(dbPath, { create: true });
db.run(`CREATE TABLE IF NOT EXISTS profiles (name TEXT PRIMARY KEY, json TEXT)`);

export function loadProfile(name: string): Record<string, unknown> | null {
  const row = db.query<{ json: string }, [string]>(`SELECT json FROM profiles WHERE name = ?`).get(name);
  if (!row) return null;
  return JSON.parse(row.json) as Record<string, unknown>;
}

export default defineCommand({
  meta: { name: "profile", description: "Save / load named flag profiles", framework: true },
  subCommands: {
    save: defineCommand({
      meta: { name: "save", description: "Save a profile (--json '{\"data-source\":\"live\"}')" },
      args: {
        name: { type: "positional", required: true },
        json: { type: "string", required: true, description: "Flag values as JSON" },
      },
      run({ args }) {
        const name = String(args.name);
        const json = String(args.json);
        try {
          JSON.parse(json);
        } catch {
          process.stderr.write(`error: --json is not valid JSON\n`);
          process.exit(2);
        }
        db.run(`INSERT OR REPLACE INTO profiles (name, json) VALUES (?, ?)`, [name, json]);
        process.stdout.write(`saved profile ${name}\n`);
      },
    }),
    list: defineCommand({
      meta: { name: "list", description: "List saved profiles", readOnly: true },
      run() {
        const rows = db.query<{ name: string }, []>(`SELECT name FROM profiles ORDER BY name`).all();
        for (const r of rows) process.stdout.write(`${r.name}\n`);
      },
    }),
    delete: defineCommand({
      meta: { name: "delete", description: "Delete a profile" },
      args: { name: { type: "positional", required: true } },
      run({ args }) { db.run(`DELETE FROM profiles WHERE name = ?`, [String(args.name)]); },
    }),
  },
});
