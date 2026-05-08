import type { RunResult, Target } from "./types";

export type RunOptions = {
  args: string[];
  env?: Record<string, string>;
  stdin?: string;
  stdout?: "pipe" | "inherit";
  stderr?: "pipe" | "inherit";
  timeoutMs?: number;
  fakeTty?: boolean;
};

export async function run(target: Target, opts: RunOptions): Promise<RunResult> {
  const { args, env = {}, stdin, timeoutMs = 5000 } = opts;
  const argv = [...target.argv, ...args];
  const start = Date.now();

  const proc = Bun.spawn({
    cmd: [target.argv0, ...argv],
    stdin: stdin ? "pipe" : "ignore",
    stdout: "pipe",
    stderr: "pipe",
    env: { ...process.env, ...env },
  });

  if (stdin && proc.stdin) {
    proc.stdin.write(stdin);
    proc.stdin.end();
  }

  const timer = setTimeout(() => proc.kill(), timeoutMs);
  let timedOut = false;
  try {
    const exitCode = await proc.exited;
    clearTimeout(timer);
    const stdout = await new Response(proc.stdout).text();
    const stderr = await new Response(proc.stderr).text();
    return { exitCode, stdout, stderr, timedOut, durationMs: Date.now() - start };
  } catch {
    timedOut = true;
    return { exitCode: -1, stdout: "", stderr: "", timedOut: true, durationMs: Date.now() - start };
  }
}

export function tokenize(cmd: string): string[] {
  return cmd.match(/(?:[^\s"]+|"[^"]*")+/g)?.map(s => s.replace(/^"|"$/g, "")) ?? [];
}

const ANSI = /\x1b\[[0-9;]*m/g;
export function hasAnsi(s: string): boolean {
  return ANSI.test(s);
}
