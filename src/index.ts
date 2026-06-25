#!/usr/bin/env node
/**
 * Argus entry point.
 *
 * Composition root: constructs the concrete implementations, wires them into the
 * tools, builds the server and connects it over stdio. This is the only place
 * that knows about concrete classes; everything else depends on abstractions.
 */

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { PlaywrightDriver } from "./browser/playwright-driver.js";
import { FileSystemSourceReader } from "./sourcing/file-system-source-reader.js";
import { ArgusServer } from "./server/argus-server.js";
import { CaptureViewsTool } from "./tools/capture-views.tool.js";
import { InspectStylesTool } from "./tools/inspect-styles.tool.js";
import { ReadSourceTool } from "./tools/read-source.tool.js";

async function main(): Promise<void> {
  const driver = new PlaywrightDriver();
  const sourceReader = new FileSystemSourceReader();

  const server = new ArgusServer([
    new CaptureViewsTool(driver),
    new InspectStylesTool(driver),
    new ReadSourceTool(sourceReader),
  ]).build();

  const transport = new StdioServerTransport();
  await server.connect(transport);

  const shutdown = (): void => {
    void driver.dispose().finally(() => process.exit(0));
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((error: unknown) => {
  process.stderr.write(`Argus failed to start: ${String(error)}\n`);
  process.exit(1);
});
