import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { resolveRoutes } from "../dist/tools/capture-views.tool.js";

describe("resolveRoutes", () => {
  it("returns the baseUrl as-is when no routes are given", () => {
    assert.deepEqual(resolveRoutes("http://localhost:5173/"), [
      { label: "http://localhost:5173/", url: "http://localhost:5173/" },
    ]);
  });

  it("joins each route against the baseUrl", () => {
    const result = resolveRoutes("http://localhost:5173", ["/", "/pricing"]);
    assert.deepEqual(
      result.map((route) => ({ label: route.label, url: route.url })),
      [
        { label: "/", url: "http://localhost:5173/" },
        { label: "/pricing", url: "http://localhost:5173/pricing" },
      ],
    );
  });
});
