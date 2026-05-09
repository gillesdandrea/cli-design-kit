// Augment citty's CommandMeta with our hints. The agent-context-builder reads
// these. `readOnly` propagates through the MCP twin as readOnlyHint /
// destructiveHint. `framework` excludes the command (and its descendants) from
// MCP tool generation entirely.
declare module "citty" {
  interface CommandMeta {
    readOnly?: boolean;
    framework?: boolean;
  }
}
export {};
