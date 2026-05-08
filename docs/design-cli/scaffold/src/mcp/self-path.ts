import { existsSync } from "node:fs";

/**
 * Returns the path to the *currently running* binary, so the MCP server
 * spawns the same CLI it lives in for every tool call.
 *
 * Resolution order:
 * 1. process.execPath when it's a compiled binary (Bun's --compile output).
 * 2. process.argv[1] when running via `bun run` (dev mode entry script).
 * 3. env override `<UPPER_NAME>_CLI_PATH`.
 */
export function resolveSelfBinary(cliName: string): string {
  // 1. Bun's compile output: process.execPath points at the compiled binary.
  // The standard `bun` interpreter's execPath ends in /bun, /bun-darwin, etc.
  // A compiled binary's execPath ends in the cli's name.
  const exec = process.execPath;
  if (exec && !/\/(bun|node)(-[a-z0-9]+)?$/.test(exec) && existsSync(exec)) return exec;

  // 2. Dev mode: argv[1] is the entry script (e.g., src/cli.ts).
  const entry = process.argv[1];
  if (entry && existsSync(entry)) return entry;

  // 3. Environment override.
  const envKey = `${cliName.toUpperCase().replace(/-/g, "_")}_CLI_PATH`;
  const fromEnv = process.env[envKey];
  if (fromEnv && existsSync(fromEnv)) return fromEnv;

  throw new Error(`could not resolve CLI binary path; set ${envKey}=/path/to/${cliName}`);
}
