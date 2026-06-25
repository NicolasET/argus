# Argus

> An MCP server that gives an AI **eyes** on your frontend — screenshots + rendered DOM at any viewport, across routes and behind login, for infinite visual iteration.

Argus is a [Model Context Protocol](https://modelcontextprotocol.io) server. It lets an AI assistant render a running frontend at one or more viewport sizes, get back a screenshot of each, read the computed CSS of specific elements, and pull the original source files — so it can _see_ what it builds and iterate until the visual goal is met.

Named after **Argus Panoptes**, the hundred-eyed giant of Greek myth.

## Tools

| Tool             | What it does                                                                                                                                                                                                                                                                                                     |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `capture_views`  | Render **one or more routes** at **one or more viewports**; returns a screenshot per route/viewport + console/network diagnostics + the rendered DOM once per route. **Full-page by default** (auto-scrolls to trigger lazy content). Supports authenticated routes via `storageState`. The core iteration loop. |
| `inspect_styles` | Return **computed CSS** (box model, colors, fonts, spacing) and bounding box for selected CSS selectors at a given viewport. Supports `storageState`.                                                                                                                                                            |
| `read_source`    | Read the project's **original source files** (by relative path or glob) so the AI can correlate the rendered UI with the code behind it.                                                                                                                                                                         |

## How it works

You run your dev server yourself (`npm run dev`, `vite`, etc.). Argus only **observes** it over a URL — it never starts or owns your app, which keeps it decoupled from any framework.

Rendering is done with [Playwright](https://playwright.dev) across three engines, selectable per call:

| `engine` value         | Renderer | Note                                                      |
| ---------------------- | -------- | --------------------------------------------------------- |
| `chromium` _(default)_ | Chromium | Same engine as Chrome.                                    |
| `firefox`              | Gecko    | Playwright's Firefox build.                               |
| `webkit`               | WebKit   | The engine **behind Safari** — runs on Windows/Linux too. |

### Routes & full-page

`capture_views` takes a `baseUrl` plus an optional `routes` array of paths:

```json
{
  "baseUrl": "http://localhost:5173",
  "routes": ["/", "/pricing", "/faq"],
  "viewports": [{ "preset": "mobile" }, { "preset": "desktop" }]
}
```

That captures every route × every viewport. Captures are **full-page by default**; Argus scrolls through the page first (`autoScroll`) so lazy-loaded images/sections are present. Set `fullPage: false` for just the above-the-fold viewport.

### Authenticated routes

To reach pages behind a sign-in, generate a Playwright **storageState** once and pass it to the tools — no credentials are stored in Argus:

```bash
npm run login -- http://localhost:5173/ .auth/state.json
# A real browser opens. Sign in, then press Enter to save the session.
```

Then capture with:

```json
{
  "baseUrl": "http://localhost:5173",
  "routes": ["/dashboard"],
  "storageState": ".auth/state.json",
  "viewports": [{ "preset": "desktop" }]
}
```

`.auth/` and `captures/` are git-ignored, so sessions and screenshots never get committed.

## Requirements

- Node.js >= 20 (uses native TypeScript execution for the dev scripts)
- Playwright browser binaries (installed automatically via `postinstall`)

## Install & build

```bash
npm install        # installs deps and downloads chromium, firefox, webkit
npm run build      # compiles TypeScript to dist/
```

## Connect to Claude Code

```bash
claude mcp add argus -- node /absolute/path/to/argus/dist/index.js
```

Or add it to your MCP client config manually:

```json
{
  "mcpServers": {
    "argus": {
      "command": "node",
      "args": ["/absolute/path/to/argus/dist/index.js"]
    }
  }
}
```

In an MCP client, the screenshots returned by `capture_views` render **inline in the chat**.

## Viewing captures without an MCP client

For quick local viewing, the `capture` script drives Argus and saves PNGs to `captures/`:

```bash
npm run capture -- http://localhost:5173/ chromium --open
```

## Viewport presets

`capture_views` and `inspect_styles` accept either a preset name or a custom `{ width, height }`.

| Preset    | Size        |
| --------- | ----------- |
| `mobile`  | 375 × 667   |
| `tablet`  | 768 × 1024  |
| `laptop`  | 1366 × 768  |
| `desktop` | 1920 × 1080 |

## Architecture

Layered and dependency-inverted so the rendering engine and file-reading strategy are swappable, and tools are added without touching the server:

```
src/
  index.ts                          # composition root: wires deps, starts stdio server
  server/argus-server.ts            # builds McpServer, registers ToolRegistrations
  tools/
    tool-registration.interface.ts  # ToolRegistration abstraction (Open/Closed)
    capture-views.tool.ts           # -> PageCapturer
    inspect-styles.tool.ts          # -> StyleInspector
    read-source.tool.ts             # -> SourceReader
  browser/
    browser-driver.interface.ts     # PageCapturer / StyleInspector / Disposable
    playwright-driver.ts            # Playwright implementation (one browser per engine)
  sourcing/
    source-reader.interface.ts      # SourceReader abstraction
    file-system-source-reader.ts    # filesystem implementation (glob + traversal guard)
  viewports/viewport.ts             # presets + resolution
scripts/
  capture.ts                        # dev helper: save captures to captures/
  login.ts                          # dev helper: save an authenticated storageState
```

## Roadmap

See [ROADMAP.md](ROADMAP.md).

## License

MIT
