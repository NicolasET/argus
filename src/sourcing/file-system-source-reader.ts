/**
 * Filesystem implementation of {@link SourceReader}.
 *
 * Matches patterns with Node's built-in glob, reads files relative to the
 * project root, and refuses to escape that root (path-traversal guard).
 */

import { glob, readFile, stat } from "node:fs/promises";
import { join, relative, resolve, sep } from "node:path";

import type {
  SourceFile,
  SourceReadRequest,
  SourceReadResult,
  SourceReader,
} from "./source-reader.interface.js";

export class FileSystemSourceReader implements SourceReader {
  async read(request: SourceReadRequest): Promise<SourceReadResult> {
    const root = resolve(request.projectRoot);
    const matched = await this.matchPaths(root, request.patterns);

    const selected = matched.slice(0, request.maxFiles);
    const skipped = matched.slice(request.maxFiles);

    const files: SourceFile[] = [];
    for (const relativePath of selected) {
      const file = await this.readOne(root, relativePath, request.maxBytesPerFile);
      if (file !== null) {
        files.push(file);
      }
    }

    return { files, skipped };
  }

  private async matchPaths(root: string, patterns: readonly string[]): Promise<string[]> {
    const matches = new Set<string>();
    for (const pattern of patterns) {
      for await (const entry of glob(pattern, { cwd: root })) {
        matches.add(entry);
      }
    }
    return [...matches].sort();
  }

  private async readOne(root: string, relativePath: string, maxBytes: number): Promise<SourceFile | null> {
    const absolutePath = resolve(join(root, relativePath));
    if (absolutePath !== root && !absolutePath.startsWith(root + sep)) {
      return null;
    }

    const info = await stat(absolutePath);
    if (!info.isFile()) {
      return null;
    }

    const buffer = await readFile(absolutePath);
    const truncated = buffer.byteLength > maxBytes;
    const content = buffer.subarray(0, maxBytes).toString("utf8");

    return {
      path: relative(root, absolutePath).split(sep).join("/"),
      content,
      truncated,
    };
  }
}
