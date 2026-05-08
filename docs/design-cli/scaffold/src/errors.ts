export const ExitCode = {
  Ok: 0,
  Usage: 2,
  NotFound: 3,
  Auth: 4,
  Api: 5,
  RateLimit: 7,
  Config: 10,
} as const;
export type ExitCode = typeof ExitCode[keyof typeof ExitCode];

export type ErrorKind = "usage" | "not_found" | "auth" | "api" | "rate_limit" | "config";

const codeForKind: Record<ErrorKind, ExitCode> = {
  usage: ExitCode.Usage,
  not_found: ExitCode.NotFound,
  auth: ExitCode.Auth,
  api: ExitCode.Api,
  rate_limit: ExitCode.RateLimit,
  config: ExitCode.Config,
};

export function fail(kind: ErrorKind, message: string, opts: { hint?: string; json?: boolean } = {}): never {
  const code = codeForKind[kind];
  const safeMessage = sanitize(message);
  const safeHint = opts.hint ? sanitize(opts.hint) : undefined;
  if (opts.json) {
    process.stderr.write(JSON.stringify({ error: { code: kind, message: safeMessage, hint: safeHint } }) + "\n");
  } else {
    process.stderr.write(`error: ${safeMessage}\n`);
    if (safeHint) process.stderr.write(`hint:  ${safeHint}\n`);
  }
  process.exit(code);
}

const SECRET = /(api[_-]?key|token|password|secret|bearer)\s*[:=]\s*([A-Za-z0-9_\-+./=]{8,})/gi;
export function sanitize(s: string): string {
  return s.replace(SECRET, (_m, key: string) => `${key}=***REDACTED***`);
}
