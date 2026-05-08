export type VerifyConfig = {
  bin: string;
  runner?: string | null;
  sampleReadCommand: string;
  sampleMutateCommand: string;
  capability: string;
  knownField: string;
};

export type Severity = "pass" | "warn" | "fail";

export type RuleResult = {
  rule: string;
  severity: Severity;
  detail: string;
};

export type Rule = (target: Target, config: VerifyConfig) => Promise<RuleResult>;

export type Target = {
  argv0: string;
  argv: string[];
};

export type RunResult = {
  exitCode: number;
  stdout: string;
  stderr: string;
  timedOut: boolean;
  durationMs: number;
};
