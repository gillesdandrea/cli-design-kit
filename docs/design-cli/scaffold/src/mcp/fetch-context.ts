import type { AgentContext } from "../agent-context-builder";

/** Spawn `<bin> agent-context` and parse the v2 JSON. Throws on shape mismatch. */
export async function fetchAgentContext(bin: string): Promise<AgentContext> {
  const proc = Bun.spawn({
    cmd: process.argv[1] && bin === process.argv[1]
      ? [process.execPath, bin, "agent-context"]
      : [bin, "agent-context"],
    stdout: "pipe",
    stderr: "pipe",
  });
  const exitCode = await proc.exited;
  const stdout = await new Response(proc.stdout).text();
  if (exitCode !== 0) {
    const stderr = await new Response(proc.stderr).text();
    throw new Error(`agent-context exited ${exitCode}: ${stderr.slice(0, 200)}`);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(stdout.trim());
  } catch (e) {
    throw new Error(`agent-context output not JSON: ${(e as Error).message}`);
  }
  const obj = parsed as AgentContext;
  if (obj.schemaVersion !== "2") {
    throw new Error(`agent-context schemaVersion is ${JSON.stringify(obj.schemaVersion)}, expected "2"`);
  }
  return obj;
}
