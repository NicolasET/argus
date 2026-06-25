/**
 * Shared helpers for building MCP tool results, so every tool surfaces failures
 * the same way: a clear text message with `isError` set, instead of letting an
 * exception propagate as a raw stack.
 */

import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

export function describeError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

export function toErrorResult(error: unknown): CallToolResult {
  return { content: [{ type: "text", text: describeError(error) }], isError: true };
}
