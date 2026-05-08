import { defineCommand } from "citty";
import { runMcpServer } from "../mcp/server";

export default defineCommand({
  meta: {
    name: "mcp",
    description: "Run an MCP server exposing this CLI's commands as tools (stdio transport).",
    readOnly: true,
  },
  async run() {
    await runMcpServer();
  },
});
