/**
 * Abstractions for driving a headless browser.
 *
 * Tools depend on the narrow capability they need ({@link PageCapturer} or
 * {@link StyleInspector}), never on a concrete engine, so the Playwright
 * implementation can be swapped without touching the tool layer
 * (Dependency Inversion + Interface Segregation).
 */

import type { Viewport } from "../viewports/viewport.js";

/** Rendering engine. `webkit` is the engine behind Safari (cross-platform). */
export type BrowserEngine = "chromium" | "firefox" | "webkit";

export interface ConsoleMessage {
  /** Playwright console type: "log" | "error" | "warning" | "info" | ... */
  readonly type: string;
  readonly text: string;
}

export interface FailedRequest {
  readonly url: string;
  readonly method: string;
  /** Error text reported by the browser (e.g. "net::ERR_CONNECTION_REFUSED"). */
  readonly failure: string;
}

export interface CaptureRequest {
  /** URL of the running app, e.g. http://localhost:5173. */
  readonly target: string;
  readonly engine: BrowserEngine;
  readonly viewport: Viewport;
  /** Capture the full scrollable page instead of just the visible viewport. */
  readonly fullPage: boolean;
  /** Optional CSS selector to wait for before capturing. */
  readonly waitForSelector?: string;
  /** Optional extra delay (ms) before capturing, for late paints/animations. */
  readonly waitForMs?: number;
}

export interface CaptureResult {
  /** PNG screenshot encoded as base64 (no `data:` prefix). */
  readonly screenshotBase64: string;
  /** Rendered DOM after JS execution (full document). */
  readonly html: string;
  readonly consoleMessages: readonly ConsoleMessage[];
  readonly failedRequests: readonly FailedRequest[];
}

export interface StyleInspectionRequest {
  readonly target: string;
  readonly engine: BrowserEngine;
  readonly viewport: Viewport;
  /** CSS selectors to resolve and read computed styles from. */
  readonly selectors: readonly string[];
  /** CSS properties to read; when empty the driver uses a curated default set. */
  readonly properties: readonly string[];
  readonly waitForSelector?: string;
  readonly waitForMs?: number;
}

export interface BoundingBox {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface ElementStyles {
  readonly selector: string;
  readonly matched: boolean;
  readonly styles: Readonly<Record<string, string>>;
  readonly boundingBox?: BoundingBox;
}

export interface StyleInspectionResult {
  readonly elements: readonly ElementStyles[];
}

/** Captures a screenshot + rendered DOM + diagnostics for a single page load. */
export interface PageCapturer {
  capture(request: CaptureRequest): Promise<CaptureResult>;
}

/** Reads computed styles for selected elements at a given viewport. */
export interface StyleInspector {
  inspectStyles(request: StyleInspectionRequest): Promise<StyleInspectionResult>;
}

/** Releases underlying resources. Safe to call multiple times. */
export interface Disposable {
  dispose(): Promise<void>;
}
