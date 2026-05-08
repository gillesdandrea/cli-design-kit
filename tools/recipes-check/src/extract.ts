#!/usr/bin/env bun
import { mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

const RECIPES = resolve(import.meta.dir, "../../../docs/design-cli/recipes.md");
const TMP = resolve(import.meta.dir, "../.tmp");

type Block = { path: string | null; preview: string; content: string; startLine: number };

function parseBlocks(md: string): Block[] {
  const lines = md.split("\n");
  const blocks: Block[] = [];
  let inBlock = false;
  let buf: string[] = [];
  let startLine = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    if (!inBlock) {
      if (line === "```ts" || line === "```typescript") {
        inBlock = true;
        buf = [];
        startLine = i + 1;
      }
      continue;
    }
    if (line === "```") {
      // close block
      const path = findPathTag(buf);
      const content = path ? stripPathTag(buf, path).join("\n") + "\n" : buf.join("\n") + "\n";
      const preview = (buf.find(l => l.trim().length > 0) ?? "").slice(0, 80);
      blocks.push({ path, preview, content, startLine });
      inBlock = false;
      buf = [];
      continue;
    }
    buf.push(line);
  }
  return blocks;
}

const PATH_TAG = /^\/\/\s*(src\/[\w./-]+\.ts)\s*$/;

function findPathTag(buf: string[]): string | null {
  // Look at the first 3 non-empty lines for a path tag.
  let seen = 0;
  for (const line of buf) {
    if (line.trim().length === 0) continue;
    seen++;
    const m = PATH_TAG.exec(line);
    if (m && m[1]) return m[1];
    if (seen >= 3) return null;
  }
  return null;
}

function stripPathTag(buf: string[], path: string): string[] {
  const out: string[] = [];
  let stripped = false;
  for (const line of buf) {
    if (!stripped) {
      const m = PATH_TAG.exec(line);
      if (m && m[1] === path) {
        stripped = true;
        continue;
      }
    }
    out.push(line);
  }
  return out;
}

async function main() {
  const md = await Bun.file(RECIPES).text();
  const blocks = parseBlocks(md);

  await rm(TMP, { recursive: true, force: true });
  await mkdir(TMP, { recursive: true });

  // version.ts in the recipes imports ../../package.json — provide a stub.
  await writeFile(join(TMP, "package.json"), JSON.stringify({ name: "recipes", version: "0.0.0" }, null, 2) + "\n");

  let extracted = 0;
  let skipped = 0;
  const merged = new Map<string, string[]>();

  for (const b of blocks) {
    if (!b.path) {
      skipped++;
      process.stderr.write(`skip (no path tag) at recipes.md:${b.startLine} — ${b.preview}\n`);
      continue;
    }
    const arr = merged.get(b.path) ?? [];
    arr.push(b.content);
    merged.set(b.path, arr);
  }

  for (const [path, parts] of merged) {
    const dest = join(TMP, path);
    await mkdir(dirname(dest), { recursive: true });
    await writeFile(dest, parts.join("\n"));
    extracted++;
  }

  process.stdout.write(`extracted: ${extracted} files (${blocks.length - skipped} blocks), skipped: ${skipped}\n`);
}

await main();
