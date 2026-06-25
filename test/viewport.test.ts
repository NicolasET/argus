import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { describeViewport, resolveViewport, VIEWPORT_PRESETS } from "../dist/viewports/viewport.js";

describe("resolveViewport", () => {
  it("resolves a preset", () => {
    assert.deepEqual(resolveViewport({ preset: "mobile" }), VIEWPORT_PRESETS.mobile);
  });

  it("prefers explicit width/height over a preset", () => {
    const viewport = resolveViewport({ preset: "mobile", width: 500, height: 400 });
    assert.equal(viewport.width, 500);
    assert.equal(viewport.height, 400);
  });

  it("uses the fallback when nothing is provided", () => {
    assert.deepEqual(resolveViewport({}, VIEWPORT_PRESETS.desktop), VIEWPORT_PRESETS.desktop);
  });

  it("throws when nothing is provided and there is no fallback", () => {
    assert.throws(() => resolveViewport({}));
  });
});

describe("describeViewport", () => {
  it("includes the label when present", () => {
    assert.equal(describeViewport({ width: 375, height: 667, label: "mobile" }), "mobile (375x667)");
  });

  it("falls back to dimensions without a label", () => {
    assert.equal(describeViewport({ width: 800, height: 600 }), "800x600");
  });
});
