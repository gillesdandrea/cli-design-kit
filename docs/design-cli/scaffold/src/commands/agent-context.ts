import { defineCommand } from "citty";

const SCHEMA_VERSION = "1";

export default defineCommand({
  meta: { name: "agent-context", description: "Emit the CLI's machine-readable schema (versioned JSON)" },
  run() {
    const ctx = {
      schemaVersion: SCHEMA_VERSION,
      cli: { name: "demo-cli", version: "0.1.0" },
      exitCodes: [
        { code: 0,  name: "ok" },
        { code: 2,  name: "usage" },
        { code: 3,  name: "not_found" },
        { code: 4,  name: "auth" },
        { code: 5,  name: "api" },
        { code: 7,  name: "rate_limit" },
        { code: 10, name: "config" },
      ],
      flags: [
        "--json", "--compact", "--select", "--quiet", "--no-color", "--no-input",
        "--yes", "--dry-run", "--no-cache", "--data-source", "--agent", "--profile",
      ],
      commands: [
        { path: "example list",   readOnly: true,  description: "List examples" },
        { path: "example create", readOnly: false, description: "Create an example" },
        { path: "sync",           readOnly: false, description: "Populate local store" },
        { path: "which",          readOnly: true,  description: "Capability lookup" },
        { path: "agent-context",  readOnly: true,  description: "This command" },
        { path: "doctor",         readOnly: true,  description: "Diagnose env/creds" },
        { path: "completion",     readOnly: true,  description: "Shell completion" },
        { path: "version",        readOnly: true,  description: "Print version" },
        { path: "profile save",   readOnly: false, description: "Save flag profile" },
        { path: "profile list",   readOnly: true,  description: "List flag profiles" },
        { path: "feedback",       readOnly: true,  description: "Open feedback URL" },
      ],
      capabilities: [
        "list examples",
        "create an example",
        "diagnose",
        "sync local store",
      ],
    };
    process.stdout.write(JSON.stringify(ctx) + "\n");
  },
});
