export type VerifyConfig = {
  bin: string;
  runner?: string | null;
  sampleReadCommand: string;
  sampleMutateCommand: string;
  capability: string;
  knownField: string;
  /** Path to SKILL.md (relative to the config file). When set, skill-* rules run. */
  skill?: string;
  /** Extra flag names (without `--`) the SKILL pairing rules should accept as declared. */
  commonFlags?: string[];
  /** Argv to start an MCP server from `bin` (e.g., ["mcp"]). When set, the mcp-twin-shape rule runs. */
  mcpArgs?: string[];
};

export type AgentContextV2 = {
  schemaVersion: "2";
  cli: { name: string; version: string; description?: string };
  exitCodes: { code: number; name: string }[];
  globalFlags: { name: string; type: "string" | "boolean"; description?: string; default?: unknown }[];
  commands: {
    path: string;
    description?: string;
    readOnly?: boolean;
    flags: { name: string; type: "string" | "boolean"; description?: string }[];
    positionals: { name: string; required: boolean; description?: string }[];
  }[];
  capabilities: string[];
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
