#!/usr/bin/env bun
import { resolve } from "node:path";

const TOOL_ROOT = resolve(import.meta.dir, "..");

const extract = Bun.spawn({
  cmd: ["bun", "run", resolve(TOOL_ROOT, "src/extract.ts")],
  cwd: TOOL_ROOT,
  stdout: "inherit",
  stderr: "inherit",
});
const extractCode = await extract.exited;
if (extractCode !== 0) {
  process.stderr.write(`extract failed (exit ${extractCode})\n`);
  process.exit(extractCode);
}

const tsc = Bun.spawn({
  cmd: ["bunx", "tsc", "--noEmit", "-p", resolve(TOOL_ROOT, "tsconfig.json")],
  cwd: TOOL_ROOT,
  stdout: "inherit",
  stderr: "inherit",
});
const tscCode = await tsc.exited;
if (tscCode === 0) {
  process.stdout.write("recipes typecheck: OK\n");
}
process.exit(tscCode);
