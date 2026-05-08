import { defineCommand } from "citty";
import { ExitCode } from "../errors";

type Check = { name: string; ok: boolean; detail: string };

async function ping(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: "HEAD", signal: AbortSignal.timeout(2000) });
    return res.ok || res.status === 405;
  } catch {
    return false;
  }
}

export default defineCommand({
  meta: { name: "doctor", description: "Diagnose env, creds, and connectivity", readOnly: true },
  async run() {
    const checks: Check[] = [];

    const apiKey = process.env.DEMO_API_KEY;
    checks.push({
      name: "DEMO_API_KEY",
      ok: !!apiKey,
      detail: apiKey ? `set (${apiKey.slice(0, 4)}…)` : "missing — export DEMO_API_KEY=…",
    });

    const reach = await ping("https://example.com");
    checks.push({ name: "example.com reachable", ok: reach, detail: reach ? "ok" : "no response" });

    for (const c of checks) {
      process.stdout.write(`${c.ok ? "✓" : "✗"} ${c.name}: ${c.detail}\n`);
    }

    const failures = checks.filter(c => !c.ok);
    if (!failures.length) return;
    const exitCode = failures.some(c => c.name.includes("KEY")) ? ExitCode.Auth : ExitCode.Api;
    process.exit(exitCode);
  },
});
