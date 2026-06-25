# Argus

> An MCP server that gives an AI **eyes** on your frontend — screenshots + rendered DOM at any viewport, for infinite visual iteration.

Argus is a [Model Context Protocol](https://modelcontextprotocol.io) server. It lets an AI assistant render a running frontend at one or more viewport sizes, get back a screenshot of each, read the computed CSS of specific elements, and pull the original source files — so it can *see* what it builds and iterate until the visual goal is met.

Named after **Argus Panoptes**, the hundred-eyed giant of Greek myth.

## Tools

| Tool | What it does |
| --- | --- |
| `capture_views` | Render a running app at one or more viewports; returns a **screenshot per viewport** + console/network diagnostics + the **rendered DOM** once. The core iteration loop. |
| `inspect_styles` | Return **computed CSS** (box model, colors, fonts, spacing) and bounding box for selected CSS selectors at a given viewport. |
| `read_source` | Read the project's **original source files** (by relative path or glob) so the AI can correlate the rendered UI with the code behind it. |

## How it works

You run your dev server yourself (`npm run dev`, `vite`, etc.). Argus only **observes** it over a URL — it never starts or owns your app, which keeps it decoupled from any framework.

Rendering is done with [Playwright](https://playwright.dev) across three engines, selectable per call:

| `engine` value | Renderer | Note |
| --- | --- | --- |
| `chromium` *(default)* | Chromium | Same engine as Chrome. |
| `firefox` | Gecko | Playwright's Firefox build. |
| `webkit` | WebKit | The engine **behind Safari** — runs on Windows/Linux too. |

## Requirements

- Node.js >= 20
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

## Viewport presets

`capture_views` and `inspect_styles` accept either a preset name or a custom `{ width, height }`.

| Preset | Size |
| --- | --- |
| `mobile` | 375 × 667 |
| `tablet` | 768 × 1024 |
| `laptop` | 1366 × 768 |
| `desktop` | 1920 × 1080 |

## Example

With your app running at `http://localhost:5173`, ask the assistant something like:

> "Capture the homepage at mobile, tablet and desktop with Argus, then make the hero section match the mockup."

Under the hood the assistant calls `capture_views` with:

```json
{
  "target": "http://localhost:5173",
  "engine": "chromium",
  "viewports": [{ "preset": "mobile" }, { "preset": "tablet" }, { "preset": "desktop" }]
}
```

…sees the three screenshots, edits the code, and captures again — looping until it looks right.

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
```

## Roadmap

- Cross-engine capture (same viewport across `chromium`/`firefox`/`webkit`) in one call
- Optional `chromium` channel to drive the real installed Chrome
- Element-level screenshots (clip to a selector)

## License

MIT
