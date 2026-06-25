/**
 * Builds the Argus McpServer and registers the tools it is given.
 *
 * It depends only on the {@link ToolRegistration} abstraction, so new tools are
 * added by passing them in — never by editing this class (Open/Closed).
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import type { ToolRegistration } from "../tools/tool-registration.interface.js";

const SERVER_NAME = "argus";
const SERVER_VERSION = "0.1.0";

export class ArgusServer {
  private readonly server: McpServer;

  constructor(private readonly tools: readonly ToolRegistration[]) {
    this.server = new McpServer({ name: SERVER_NAME, version: SERVER_VERSION });
  }

  build(): McpServer {
    for (const tool of this.tools) {
      tool.register(this.server);
    }
    return this.server;
  }
}
