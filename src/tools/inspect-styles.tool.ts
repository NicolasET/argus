/**
 * `inspect_styles` — read computed CSS for specific elements at one viewport.
 *
 * Complements `capture_views`: once the AI can see the page, this returns the
 * exact box model, colors, fonts and spacing of selected elements so layout can
 * be debugged precisely instead of guessed from a screenshot.
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

import type { BrowserEngine, ElementStyles, StyleInspector } from "../browser/browser-driver.interface.js";
import type { ToolRegistration } from "./tool-registration.interface.js";
import { describeViewport, resolveViewport, VIEWPORT_PRESETS, type Viewport } from "../viewports/viewport.js";

const inputSchema = {
  target: z.string().describe("URL to inspect, e.g. http://localhost:5173/pricing"),
  engine: z
    .enum(["chromium", "firefox", "webkit"])
    .default("chromium")
    .describe("Rendering engine. webkit is the engine behind Safari."),
  preset: z.enum(["mobile", "tablet", "laptop", "desktop"]).optional().describe("Viewport preset."),
  width: z.number().int().positive().optional().describe("Custom viewport width (px)."),
  height: z.number().int().positive().optional().describe("Custom viewport height (px)."),
  selectors: z.array(z.string()).min(1).describe("CSS selectors to inspect."),
  properties: z
    .array(z.string())
    .optional()
    .describe("CSS properties to read; defaults to a curated layout/typography set."),
  storageState: z
    .string()
    .optional()
    .describe("Path to a Playwright storageState JSON to inspect authenticated pages (see scripts/login.ts)."),
  waitForSelector: z.string().optional().describe("CSS selector to wait for before reading."),
  waitForMs: z.number().int().nonnegative().optional().describe("Extra wait (ms) before reading."),
};

export class InspectStylesTool implements ToolRegistration {
  constructor(private readonly inspector: StyleInspector) {}

  register(server: McpServer): void {
    server.registerTool(
      "inspect_styles",
      {
        title: "Inspect computed styles",
        description:
          "Return the computed CSS (box model, colors, fonts, spacing) and bounding box of " +
          "selected elements at a given viewport, to debug layout precisely.",
        inputSchema,
      },
      async (args) => this.handle(args),
    );
  }

  private async handle(args: {
    target: string;
    engine: BrowserEngine;
    preset?: "mobile" | "tablet" | "laptop" | "desktop";
    width?: number;
    height?: number;
    selectors: string[];
    properties?: string[];
    storageState?: string;
    waitForSelector?: string;
    waitForMs?: number;
  }): Promise<CallToolResult> {
    const viewport: Viewport = resolveViewport(
      { preset: args.preset, width: args.width, height: args.height },
      VIEWPORT_PRESETS.desktop,
    );

    const result = await this.inspector.inspectStyles({
      target: args.target,
      engine: args.engine,
      viewport,
      selectors: args.selectors,
      properties: args.properties ?? [],
      storageState: args.storageState,
      waitForSelector: args.waitForSelector,
      waitForMs: args.waitForMs,
    });

    const header = `Computed styles at ${describeViewport(viewport)} | Engine: ${args.engine}`;
    const blocks = result.elements.map((element) => formatElementStyles(element));

    return { content: [{ type: "text", text: [header, "", ...blocks].join("\n\n") }] };
  }
}

function formatElementStyles(element: ElementStyles): string {
  if (!element.matched) {
    return `Selector "${element.selector}": no element matched.`;
  }

  const lines: string[] = [`Selector "${element.selector}":`];
  if (element.boundingBox !== undefined) {
    const box = element.boundingBox;
    lines.push(`  box: x=${round(box.x)} y=${round(box.y)} w=${round(box.width)} h=${round(box.height)}`);
  }
  for (const [property, value] of Object.entries(element.styles)) {
    lines.push(`  ${property}: ${value}`);
  }
  return lines.join("\n");
}

function round(value: number): number {
  return Math.round(value);
}
