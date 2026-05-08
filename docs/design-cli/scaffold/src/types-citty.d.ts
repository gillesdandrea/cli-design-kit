// Augment citty's CommandMeta with our readOnly hint. The agent-context-builder
// reads this; the MCP twin propagates it as readOnlyHint / destructiveHint.
declare module "citty" {
  interface CommandMeta {
    readOnly?: boolean;
  }
}
export {};
