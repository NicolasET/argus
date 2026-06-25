import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { FileSystemSourceReader } from "../dist/sourcing/file-system-source-reader.js";

describe("FileSystemSourceReader", () => {
  const reader = new FileSystemSourceReader();
  let root: string;

  before(() => {
    root = mkdtempSync(join(tmpdir(), "argus-src-"));
    mkdirSync(join(root, "src"), { recursive: true });
    writeFileSync(join(root, "src", "a.css"), "body{color:red}");
    writeFileSync(join(root, "src", "b.css"), "h1{font-size:2rem}");
    writeFileSync(join(root, "secret.txt"), "shhh");
  });

  after(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it("reads files matching a glob", async () => {
    const result = await reader.read({
      projectRoot: root,
      patterns: ["src/*.css"],
      maxFiles: 10,
      maxBytesPerFile: 1024,
    });
    const paths = result.files.map((file) => file.path).sort();
    assert.deepEqual(paths, ["src/a.css", "src/b.css"]);
  });

  it("truncates files over maxBytesPerFile", async () => {
    const result = await reader.read({
      projectRoot: root,
      patterns: ["src/a.css"],
      maxFiles: 10,
      maxBytesPerFile: 4,
    });
    assert.equal(result.files.length, 1);
    assert.equal(result.files[0]?.truncated, true);
    assert.equal(result.files[0]?.content, "body");
  });

  it("respects maxFiles and reports the rest as skipped", async () => {
    const result = await reader.read({
      projectRoot: root,
      patterns: ["src/*.css"],
      maxFiles: 1,
      maxBytesPerFile: 1024,
    });
    assert.equal(result.files.length, 1);
    assert.equal(result.skipped.length, 1);
  });

  it("does not escape the project root", async () => {
    const result = await reader.read({
      projectRoot: join(root, "src"),
      patterns: ["../secret.txt"],
      maxFiles: 10,
      maxBytesPerFile: 1024,
    });
    assert.equal(result.files.length, 0);
  });
});
