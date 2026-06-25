/**
 * `capture_views` — the core "eye" of Argus.
 *
 * Opens one or more routes of a running app at one or more viewports and returns
 * a screenshot per route/viewport, console/network diagnostics, and the rendered
 * DOM once per route. Full-page by default (auto-scrolling to trigger lazy
 * content); authenticated routes are reached via a Playwright storageState.
 *
 * A failed route/viewport is reported as a text block and does not abort the
 * rest; the result is only marked `isError` when every capture failed.
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

import type { BrowserEngine, CaptureResult, PageCapturer } from "../browser/browser-driver.interface.js";
import type { ToolRegistration } from "./tool-registration.interface.js";
import { describeError, toErrorResult } from "./tool-result.js";
import { describeViewport, resolveViewport, type Viewport } from "../viewports/viewport.js";

const MAX_DIAGNOSTIC_LINES = 50;

const inputSchema = {
  baseUrl: z.string().describe("Origin of the running app, e.g. http://localhost:5173"),
  routes: z
    .array(z.string())
    .optional()
    .describe('Paths to capture under baseUrl, e.g. ["/", "/pricing", "/faq"]. Omit to capture baseUrl as-is.'),
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
  fullPage: z
    .boolean()
    .default(true)
    .describe("Capture the full scrollable page (default). Set false for just the above-the-fold viewport."),
  autoScroll: z
    .boolean()
    .default(true)
    .describe("Before a full-page capture, scroll through the page to trigger lazy-loaded content."),
  storageState: z
    .string()
    .optional()
    .describe("Path to a Playwright storageState JSON to reach authenticated routes (see scripts/login.ts)."),
  includeHtml: z.boolean().default(true).describe("Include the rendered DOM once per route."),
  waitForSelector: z.string().optional().describe("CSS selector to wait for before capturing."),
  waitForMs: z.number().int().nonnegative().optional().describe("Extra wait (ms) before capturing."),
};

interface ResolvedRoute {
  readonly label: string;
  readonly url: string;
}

export class CaptureViewsTool implements ToolRegistration {
  constructor(private readonly capturer: PageCapturer) {}

  register(server: McpServer): void {
    server.registerTool(
      "capture_views",
      {
        title: "Capture frontend views",
        description:
          "Render one or more routes of a running frontend at one or more viewport sizes and " +
          "return a screenshot per route/viewport, console/network diagnostics, and the rendered " +
          "DOM. Full-page by default. Use it to see how the UI looks and iterate until the visual " +
          "goal is met.",
        inputSchema,
      },
      async (args) => this.handle(args),
    );
  }

  private async handle(args: {
    baseUrl: string;
    routes?: string[];
    engine: BrowserEngine;
    viewports: ReadonlyArray<{ preset?: "mobile" | "tablet" | "laptop" | "desktop"; width?: number; height?: number; label?: string }>;
    fullPage: boolean;
    autoScroll: boolean;
    storageState?: string;
    includeHtml: boolean;
    waitForSelector?: string;
    waitForMs?: number;
  }): Promise<CallToolResult> {
    let viewports: Viewport[];
    let routes: ResolvedRoute[];
    try {
      viewports = args.viewports.map((input) => resolveViewport(input));
      routes = resolveRoutes(args.baseUrl, args.routes);
    } catch (error) {
      return toErrorResult(error);
    }

    const content: CallToolResult["content"] = [];
    let succeeded = 0;
    let failed = 0;

    for (const route of routes) {
      let renderedHtml: string | undefined;

      for (const viewport of viewports) {
        try {
          const result = await this.capturer.capture({
            target: route.url,
            engine: args.engine,
            viewport,
            fullPage: args.fullPage,
            autoScroll: args.autoScroll,
            storageState: args.storageState,
            waitForSelector: args.waitForSelector,
            waitForMs: args.waitForMs,
          });

          if (renderedHtml === undefined) {
            renderedHtml = result.html;
          }

          content.push({ type: "image", data: result.screenshotBase64, mimeType: "image/png" });
          content.push({ type: "text", text: formatViewportReport(route, viewport, args.engine, result) });
          succeeded += 1;
        } catch (error) {
          failed += 1;
          content.push({
            type: "text",
            text: `Failed to capture ${route.label} at ${describeViewport(viewport)} (${args.engine}): ${describeError(error)}`,
          });
        }
      }

      if (args.includeHtml && renderedHtml !== undefined) {
        content.push({
          type: "text",
          text: `Rendered DOM (after JS) for ${route.label}:\n\n${renderedHtml}`,
        });
      }
    }

    if (succeeded === 0 && failed > 0) {
      return { content, isError: true };
    }
    return { content };
  }
}

export function resolveRoutes(baseUrl: string, routes?: string[]): ResolvedRoute[] {
  if (routes === undefined || routes.length === 0) {
    return [{ label: baseUrl, url: baseUrl }];
  }
  return routes.map((route) => ({ label: route, url: new URL(route, baseUrl).href }));
}

function formatViewportReport(
  route: ResolvedRoute,
  viewport: Viewport,
  engine: BrowserEngine,
  result: CaptureResult,
): string {
  const lines: string[] = [`Route: ${route.label} | Viewport: ${describeViewport(viewport)} | Engine: ${engine}`];

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
