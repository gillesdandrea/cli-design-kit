import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

import { resolveSelfBinary } from "./self-path";
import { fetchAgentContext } from "./fetch-context";
import { buildToolsFromContext, spawnToolCall } from "./tools";

const CLI_NAME = "demo-cli";

export async function runMcpServer(): Promise<void> {
  const selfBin = resolveSelfBinary(CLI_NAME);
  const ctx = await fetchAgentContext(selfBin);
  const tools = buildToolsFromContext(ctx);

  const server = new Server(
    { name: `${ctx.cli.name}-mcp`, version: ctx.cli.version },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));
  server.setRequestHandler(CallToolRequestSchema, async (req) =>
    spawnToolCall(selfBin, ctx, req.params),
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
}
