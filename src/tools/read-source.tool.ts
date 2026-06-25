/**
 * `read_source` — return the project's original source files from disk.
 *
 * Lets the AI correlate what it sees (via `capture_views` / `inspect_styles`)
 * with the actual code it needs to change.
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

import type { SourceFile, SourceReader } from "../sourcing/source-reader.interface.js";
import type { ToolRegistration } from "./tool-registration.interface.js";
import { toErrorResult } from "./tool-result.js";

const DEFAULT_MAX_FILES = 20;
const DEFAULT_MAX_BYTES_PER_FILE = 64 * 1024;
const MAX_SKIPPED_LISTED = 20;

const inputSchema = {
  projectRoot: z.string().describe("Absolute path to the frontend project root."),
  patterns: z
    .array(z.string())
    .min(1)
    .describe('Relative paths or globs, e.g. "src/App.tsx", "src/**/*.css".'),
  maxFiles: z.number().int().positive().default(DEFAULT_MAX_FILES).describe("Max files to return."),
  maxBytesPerFile: z
    .number()
    .int()
    .positive()
    .default(DEFAULT_MAX_BYTES_PER_FILE)
    .describe("Max bytes read per file before truncating."),
};

export class ReadSourceTool implements ToolRegistration {
  constructor(private readonly reader: SourceReader) {}

  register(server: McpServer): void {
    server.registerTool(
      "read_source",
      {
        title: "Read project source files",
        description:
          "Read original source files from the frontend project (by relative path or glob) so " +
          "the AI can correlate the rendered UI with the code that produces it.",
        inputSchema,
      },
      async (args) => this.handle(args),
    );
  }

  private async handle(args: {
    projectRoot: string;
    patterns: string[];
    maxFiles: number;
    maxBytesPerFile: number;
  }): Promise<CallToolResult> {
    try {
      const result = await this.reader.read({
        projectRoot: args.projectRoot,
        patterns: args.patterns,
        maxFiles: args.maxFiles,
        maxBytesPerFile: args.maxBytesPerFile,
      });

      if (result.files.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: `No files matched under ${args.projectRoot} for patterns: ${args.patterns.join(", ")}`,
            },
          ],
          isError: true,
        };
      }

      const content: CallToolResult["content"] = result.files.map((file) => ({
        type: "text",
        text: formatSourceFile(file),
      }));

      if (result.skipped.length > 0) {
        content.push({
          type: "text",
          text:
            `Skipped ${result.skipped.length} file(s) due to maxFiles=${args.maxFiles}: ` +
            result.skipped.slice(0, MAX_SKIPPED_LISTED).join(", "),
        });
      }

      return { content };
    } catch (error) {
      return toErrorResult(error);
    }
  }
}

function formatSourceFile(file: SourceFile): string {
  const header = file.truncated ? `// ${file.path} (truncated)` : `// ${file.path}`;
  return `${header}\n${file.content}`;
}
