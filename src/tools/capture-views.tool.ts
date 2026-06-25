/**
 * `capture_views` — the core "eye" of Argus.
 *
 * Opens a running app at one or more viewports and returns a screenshot per
 * viewport plus console/network diagnostics, and the rendered DOM once (the
 * HTML is shared across viewports; only the CSS-driven layout changes). This is
 * the tool an AI calls repeatedly to iterate towards a visual goal.
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

import type {
  BrowserEngine,
  CaptureResult,
  PageCapturer,
} from "../browser/browser-driver.interface.js";
import type { ToolRegistration } from "./tool-registration.interface.js";
import { describeViewport, resolveViewport, type Viewport } from "../viewports/viewport.js";

const MAX_DIAGNOSTIC_LINES = 50;

const inputSchema = {
  target: z.string().describe("URL of the running app, e.g. http://localhost:5173"),
  engine: z
    .enum(["chromium", "firefox", "webkit"])
    .default("chromium")
    .describe("Rendering engine. webkit is the engine behind Safari."),
  viewports: z
    .array(
      z.object({
        preset: z.enum(["mobile", "tablet", "laptop", "desktop"]).optional(),
        width: z.number().int().positive().optional(),
        height: z.number().int().positive().optional(),
        label: z.string().optional(),
      }),
    )
    .min(1)
    .describe("One or more viewports; each is a preset or a custom { width, height }."),
  fullPage: z.boolean().default(false).describe("Capture the full scrollable page."),
  includeHtml: z
    .boolean()
    .default(true)
    .describe("Include the rendered DOM once in the response."),
  waitForSelector: z.string().optional().describe("CSS selector to wait for before capturing."),
  waitForMs: z.number().int().nonnegative().optional().describe("Extra wait (ms) before capturing."),
};

export class CaptureViewsTool implements ToolRegistration {
  constructor(private readonly capturer: PageCapturer) {}

  register(server: McpServer): void {
    server.registerTool(
      "capture_views",
      {
        title: "Capture frontend views",
        description:
          "Render a running frontend at one or more viewport sizes and return a screenshot " +
          "per viewport, console/network diagnostics, and the rendered DOM. Use it to see how " +
          "the UI looks and iterate until the visual goal is met.",
        inputSchema,
      },
      async (args) => this.handle(args),
    );
  }

  private async handle(args: {
    target: string;
    engine: BrowserEngine;
    viewports: ReadonlyArray<{ preset?: "mobile" | "tablet" | "laptop" | "desktop"; width?: number; height?: number; label?: string }>;
    fullPage: boolean;
    includeHtml: boolean;
    waitForSelector?: string;
    waitForMs?: number;
  }): Promise<CallToolResult> {
    let viewports: Viewport[];
    try {
      viewports = args.viewports.map((input) => resolveViewport(input));
    } catch (error) {
      return errorResult(error);
    }

    const content: CallToolResult["content"] = [];
    let renderedHtml: string | undefined;

    for (const viewport of viewports) {
      const result = await this.capturer.capture({
        target: args.target,
        engine: args.engine,
        viewport,
        fullPage: args.fullPage,
        waitForSelector: args.waitForSelector,
        waitForMs: args.waitForMs,
      });

      if (renderedHtml === undefined) {
        renderedHtml = result.html;
      }

      content.push({ type: "image", data: result.screenshotBase64, mimeType: "image/png" });
      content.push({ type: "text", text: formatViewportReport(viewport, args.engine, result) });
    }

    if (args.includeHtml && renderedHtml !== undefined) {
      content.push({
        type: "text",
        text: `Rendered DOM (after JS), shared across viewports:\n\n${renderedHtml}`,
      });
    }

    return { content };
  }
}

function formatViewportReport(viewport: Viewport, engine: BrowserEngine, result: CaptureResult): string {
  const lines: string[] = [`Viewport: ${describeViewport(viewport)} | Engine: ${engine}`];

  if (result.consoleMessages.length === 0) {
    lines.push("Console: (no messages)");
  } else {
    lines.push(`Console (${result.consoleMessages.length}):`);
    for (const message of result.consoleMessages.slice(0, MAX_DIAGNOSTIC_LINES)) {
      lines.push(`  [${message.type}] ${message.text}`);
    }
  }

  if (result.failedRequests.length === 0) {
    lines.push("Failed requests: (none)");
  } else {
    lines.push(`Failed requests (${result.failedRequests.length}):`);
    for (const failed of result.failedRequests.slice(0, MAX_DIAGNOSTIC_LINES)) {
      lines.push(`  ${failed.method} ${failed.url} — ${failed.failure}`);
    }
  }

  return lines.join("\n");
}

function errorResult(error: unknown): CallToolResult {
  const message = error instanceof Error ? error.message : String(error);
  return { content: [{ type: "text", text: message }], isError: true };
}
