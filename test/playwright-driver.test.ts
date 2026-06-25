import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";

import { PlaywrightDriver } from "../dist/browser/playwright-driver.js";

describe("PlaywrightDriver", () => {
  const driver = new PlaywrightDriver();
  let server: Server;
  let baseUrl: string;

  before(async () => {
    server = createServer((_request, response) => {
      response.setHeader("content-type", "text/html");
      response.end(
        '<!doctype html><html><body><h1 id="title">Hello Argus</h1><div style="height:3000px"></div></body></html>',
      );
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const port = (server.address() as AddressInfo).port;
    baseUrl = `http://127.0.0.1:${port}/`;
  });

  after(async () => {
    await driver.dispose();
    await new Promise<void>((resolve) => {
      server.close(() => {
        resolve();
      });
    });
  });

  it("captures a screenshot and the rendered DOM", async () => {
    const result = await driver.capture({
      target: baseUrl,
      engine: "chromium",
      viewport: { width: 800, height: 600 },
      fullPage: true,
      autoScroll: true,
    });
    assert.ok(result.screenshotBase64.length > 0);
    assert.match(result.html, /Hello Argus/);
  });

  it("rejects when the target is unreachable", async () => {
    await assert.rejects(() =>
      driver.capture({
        target: "http://127.0.0.1:1/",
        engine: "chromium",
        viewport: { width: 800, height: 600 },
        fullPage: false,
        autoScroll: false,
      }),
    );
  });
});
