/**
 * A tool that knows how to register itself on an McpServer.
 *
 * The server depends on this abstraction and simply registers whatever tools it
 * is given, so adding a tool never requires editing the server (Open/Closed).
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export interface ToolRegistration {
  register(server: McpServer): void;
}
