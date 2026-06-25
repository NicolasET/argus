/**
 * Dev helper: drive the Argus MCP server like a client, capture a URL at
 * mobile/tablet/desktop, and save the PNGs to ../captures so you can open them.
 *
 * Runs on Node's native TypeScript support (type stripping), no build step:
 *   node scripts/capture.ts [url] [engine] [--open]
 *   npm run capture -- http://localhost:5173/ chromium --open
 *
 * In a real MCP client (Claude Code/Desktop) the screenshots render inline in
 * the chat; this script is only for viewing captures outside such a client.
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const repoRoot: string = fileURLToPath(new URL("../", import.meta.url));
const serverEntry: string = fileURLToPath(new URL("../dist/index.js", import.meta.url));
const capturesDir: string = fileURLToPath(new URL("../captures/", import.meta.url));

const positional: string[] = process.argv.slice(2).filter((arg) => !arg.startsWith("--"));
const url: string = positional[0] ?? "http://localhost:5173/";
const engine: string = positional[1] ?? "chromium";
const shouldOpen: boolean = process.argv.includes("--open");

const viewports = [{ preset: "mobile" }, { preset: "tablet" }, { preset: "desktop" }] as const;
const labels: readonly string[] = viewports.map((viewport) => viewport.preset);

mkdirSync(capturesDir, { recursive: true });

const transport = new StdioClientTransport({ command: process.execPath, args: [serverEntry], cwd: repoRoot });
const client = new Client({ name: "argus-capture", version: "0" });

try {
  await client.connect(transport);
  console.log(`Capturing ${url} (${engine}) at mobile/tablet/desktop ...`);

  const result = await client.callTool(
    { name: "capture_views", arguments: { baseUrl: url, engine, viewports: [...viewports], includeHtml: false } },
    undefined,
    { timeout: 150_000 },
  );

  let imageIndex = 0;
  for (const block of result.content) {
    if (block.type === "image") {
      const label = labels[imageIndex] ?? `view-${imageIndex}`;
      const file = `${capturesDir}${engine}-${label}.png`;
      writeFileSync(file, Buffer.from(block.data, "base64"));
      console.log(`  saved ${file}`);
      imageIndex += 1;
    } else if (block.type === "text") {
      const errors = block.text
        .split("\n")
        .filter((line) => line.includes("[error]") || line.startsWith("Failed requests ("));
      if (errors.length > 0) {
        console.log(`  diagnostics: ${errors.join(" | ").slice(0, 300)}`);
      }
    }
  }

  console.log(`\nDone. Captures in: ${capturesDir}`);

  if (shouldOpen) {
    const { spawn } = await import("node:child_process");
    spawn("explorer.exe", [capturesDir], { detached: true, stdio: "ignore" }).unref();
  }
} catch (error) {
  const reason = error instanceof Error ? (error.stack ?? error.message) : String(error);
  console.error(`Capture failed: ${reason}`);
  process.exitCode = 1;
} finally {
  await client.close();
}
