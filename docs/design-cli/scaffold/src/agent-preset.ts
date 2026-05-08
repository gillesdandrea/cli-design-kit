export type CommonArgs = {
  agent?: boolean;
  json?: boolean;
  compact?: boolean;
  "no-input"?: boolean;
  "no-color"?: boolean;
  yes?: boolean;
};

export function applyAgentPreset(args: CommonArgs): void {
  if (!args.agent) return;
  args.json = true;
  args.compact = true;
  args["no-input"] = true;
  args["no-color"] = true;
  args.yes = true;
}
