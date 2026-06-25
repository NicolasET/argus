/**
 * Abstraction for reading a frontend project's source files from disk, so the
 * AI can correlate what it sees on screen with the code it must change.
 *
 * Tools depend on {@link SourceReader}, not on Node's `fs`, keeping the reading
 * strategy (filesystem, in-memory, remote) swappable.
 */

export interface SourceFile {
  /** Path relative to the project root, using forward slashes. */
  readonly path: string;
  readonly content: string;
  /** True when `content` was cut off at `maxBytesPerFile`. */
  readonly truncated: boolean;
}

export interface SourceReadRequest {
  /** Absolute path to the frontend project root. */
  readonly projectRoot: string;
  /** Relative file paths or glob patterns, e.g. "src/App.tsx", "src/**\/*.css". */
  readonly patterns: readonly string[];
  readonly maxFiles: number;
  readonly maxBytesPerFile: number;
}

export interface SourceReadResult {
  readonly files: readonly SourceFile[];
  /** Paths matched but not read because `maxFiles` was reached. */
  readonly skipped: readonly string[];
}

export interface SourceReader {
  read(request: SourceReadRequest): Promise<SourceReadResult>;
}
