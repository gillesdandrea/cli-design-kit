import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

const cachePath = `${process.env.HOME}/.cache/demo-cli/http.sqlite`;
mkdirSync(dirname(cachePath), { recursive: true });

const db = new Database(cachePath, { create: true });
db.run(`CREATE TABLE IF NOT EXISTS http (key TEXT PRIMARY KEY, body TEXT, expiresAt INTEGER)`);

const TTL_MS = 5 * 60 * 1000;

export type CachedFetchInit = RequestInit & { noCache?: boolean };

export async function cachedFetch(url: string, init: CachedFetchInit = {}): Promise<Response> {
  const method = (init.method ?? "GET").toUpperCase();
  if (method !== "GET") return fetch(url, init);

  const key = `GET ${url}`;
  if (init.noCache) {
    db.run(`DELETE FROM http WHERE key = ?`, [key]);
  } else {
    const row = db
      .query<{ body: string; expiresAt: number }, [string]>(`SELECT body, expiresAt FROM http WHERE key = ?`)
      .get(key);
    if (row && row.expiresAt > Date.now()) return new Response(row.body);
  }
  const res = await fetch(url, init);
  if (res.ok) {
    const body = await res.clone().text();
    db.run(`INSERT OR REPLACE INTO http (key, body, expiresAt) VALUES (?, ?, ?)`, [key, body, Date.now() + TTL_MS]);
  }
  return res;
}

export function clearCache(): number {
  const before = db.query<{ n: number }, []>(`SELECT COUNT(*) AS n FROM http`).get();
  db.run(`DELETE FROM http`);
  return before?.n ?? 0;
}
