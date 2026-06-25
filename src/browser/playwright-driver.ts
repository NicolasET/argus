/**
 * Playwright-backed implementation of the browser capabilities.
 *
 * One browser process is launched lazily per engine and reused across calls;
 * each capture runs in its own context (isolated cookies/storage, or a provided
 * authenticated storageState) and is closed afterwards. Implements the narrow
 * capability interfaces so tools never see Playwright directly.
 */

import { chromium, firefox, webkit, type Browser, type BrowserType, type Page } from "playwright";

import type {
  BrowserEngine,
  CaptureRequest,
  CaptureResult,
  ConsoleMessage,
  Disposable,
  ElementStyles,
  FailedRequest,
  PageCapturer,
  StyleInspectionRequest,
  StyleInspectionResult,
  StyleInspector,
} from "./browser-driver.interface.js";

const ENGINES: Readonly<Record<BrowserEngine, BrowserType>> = {
  chromium,
  firefox,
  webkit,
};

/** Properties returned by `inspect_styles` when the caller does not pick its own. */
const DEFAULT_STYLE_PROPERTIES: readonly string[] = [
  "display",
  "position",
  "width",
  "height",
  "margin",
  "padding",
  "color",
  "background-color",
  "font-family",
  "font-size",
  "font-weight",
  "line-height",
  "border",
  "border-radius",
  "flex-direction",
  "justify-content",
  "align-items",
  "gap",
  "z-index",
  "opacity",
  "box-shadow",
];

const NAVIGATION_TIMEOUT_MS = 30_000;
const SELECTOR_TIMEOUT_MS = 15_000;
const AUTO_SCROLL_STEP_DELAY_MS = 80;
const AUTO_SCROLL_SETTLE_MS = 400;
const MAX_AUTO_SCROLL_PX = 50_000;

export class PlaywrightDriver implements PageCapturer, StyleInspector, Disposable {
  private readonly browsers = new Map<BrowserEngine, Browser>();

  async capture(request: CaptureRequest): Promise<CaptureResult> {
    const page = await this.openPage(request);
    const consoleMessages: ConsoleMessage[] = [];
    const failedRequests: FailedRequest[] = [];

    page.on("console", (message) => {
      consoleMessages.push({ type: message.type(), text: message.text() });
    });
    page.on("pageerror", (error) => {
      consoleMessages.push({ type: "error", text: error.message });
    });
    page.on("requestfailed", (failed) => {
      failedRequests.push({
        url: failed.url(),
        method: failed.method(),
        failure: failed.failure()?.errorText ?? "unknown error",
      });
    });

    try {
      await page.goto(request.target, { waitUntil: "networkidle", timeout: NAVIGATION_TIMEOUT_MS });
      await this.applyWaits(page, request.waitForSelector, request.waitForMs);

      if (request.fullPage && request.autoScroll) {
        await this.autoScroll(page);
      }

      const screenshot = await page.screenshot({ fullPage: request.fullPage, type: "png" });
      const html = await page.content();

      return {
        screenshotBase64: screenshot.toString("base64"),
        html,
        consoleMessages,
        failedRequests,
      };
    } finally {
      await page.context().close();
    }
  }

  async inspectStyles(request: StyleInspectionRequest): Promise<StyleInspectionResult> {
    const page = await this.openPage(request);
    const properties = request.properties.length > 0 ? request.properties : DEFAULT_STYLE_PROPERTIES;

    try {
      await page.goto(request.target, { waitUntil: "networkidle", timeout: NAVIGATION_TIMEOUT_MS });
      await this.applyWaits(page, request.waitForSelector, request.waitForMs);

      const elements = await this.extractStyles(page, request.selectors, properties);
      return { elements };
    } finally {
      await page.context().close();
    }
  }

  async dispose(): Promise<void> {
    const open = [...this.browsers.values()];
    this.browsers.clear();
    await Promise.all(open.map((browser) => browser.close()));
  }

  private async openPage(request: {
    engine: BrowserEngine;
    viewport: { width: number; height: number };
    storageState?: string;
  }): Promise<Page> {
    const browser = await this.getBrowser(request.engine);
    const context = await browser.newContext({
      viewport: { width: request.viewport.width, height: request.viewport.height },
      storageState: request.storageState,
    });
    return context.newPage();
  }

  private async getBrowser(engine: BrowserEngine): Promise<Browser> {
    const existing = this.browsers.get(engine);
    if (existing !== undefined && existing.isConnected()) {
      return existing;
    }
    const browser = await ENGINES[engine].launch({ headless: true });
    this.browsers.set(engine, browser);
    return browser;
  }

  private async applyWaits(page: Page, waitForSelector?: string, waitForMs?: number): Promise<void> {
    if (waitForSelector !== undefined) {
      await page.waitForSelector(waitForSelector, { timeout: SELECTOR_TIMEOUT_MS });
    }
    if (waitForMs !== undefined && waitForMs > 0) {
      await page.waitForTimeout(waitForMs);
    }
  }

  /**
   * Scroll through the page in viewport-sized steps to trigger lazy-loaded
   * content (images, sections), then return to the top. Bounded by
   * {@link MAX_AUTO_SCROLL_PX} so infinite-scroll pages terminate.
   */
  private async autoScroll(page: Page): Promise<void> {
    const step = Math.max(200, await page.evaluate(() => window.innerHeight));
    let scrolled = 0;

    while (scrolled < MAX_AUTO_SCROLL_PX) {
      const reachedBottom = await page.evaluate((delta: number) => {
        window.scrollBy(0, delta);
        return window.scrollY + window.innerHeight >= document.body.scrollHeight;
      }, step);
      scrolled += step;
      await page.waitForTimeout(AUTO_SCROLL_STEP_DELAY_MS);
      if (reachedBottom) {
        break;
      }
    }

    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(AUTO_SCROLL_SETTLE_MS);
  }

  private async extractStyles(
    page: Page,
    selectors: readonly string[],
    properties: readonly string[],
  ): Promise<ElementStyles[]> {
    return page.evaluate(
      ({ selectors: selectorList, properties: propertyList }) => {
        return selectorList.map((selector): ElementStyles => {
          const element = document.querySelector(selector);
          if (element === null) {
            return { selector, matched: false, styles: {} };
          }
          const computed = window.getComputedStyle(element);
          const styles: Record<string, string> = {};
          for (const property of propertyList) {
            styles[property] = computed.getPropertyValue(property);
          }
          const rect = element.getBoundingClientRect();
          return {
            selector,
            matched: true,
            styles,
            boundingBox: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
          };
        });
      },
      { selectors: [...selectors], properties: [...properties] },
    );
  }
}
