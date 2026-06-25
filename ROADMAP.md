# Argus Roadmap

**Guiding principle:** every feature must shorten the loop **see → understand → fix → re-see**. Ordered by value/effort.

## Phase 0 — Hardening ✅ _(done)_

The safety net that turns the prototype into something trustworthy to iterate with.

- [x] **Tests** — `node:test` units (viewport/route resolvers, `SourceReader` path-traversal guard) + driver integration against a local fixture server.
- [x] **CI** (GitHub Actions) — runs `npm run check` (format + build + lint + tests) on Node 22 with Playwright Chromium.
- [x] **`.gitattributes`** (`* text=auto eol=lf`) — no more CRLF warnings.
- [x] **Clear errors** — failed captures are reported per route/viewport; tool handlers return `isError` instead of a raw stack.
- [x] **Robust full-page capture** — full page by default, auto-scrolling to trigger lazy-loaded content; `fullPage: false` for above-the-fold.
- [x] **Quality gate** — strong-typed `tsconfig`, ESLint (typescript-eslint strict-type-checked) + Prettier, Husky (pre-commit lint-staged, pre-push `check`), and `CLAUDE.md`.

## Navigation & Coverage _(cross-cutting theme)_

Raised early: a single above-the-fold shot of one public route is not enough.

- [x] **Full page vs viewport** — full-page default with auto-scroll.
- [x] **Multiple routes** — `capture_views` takes `baseUrl` + `routes[]`.
- [x] **Authenticated routes** — Playwright `storageState` on both tools + `scripts/login.ts` to generate it.
- [ ] **Pre-capture interaction** — click/scroll/fill before capturing (see Phase 3).

## Phase 1 — Sharper eyes

- **Cross-engine capture** in one call — same viewport across `chromium`/`firefox`/`webkit`.
- **Element-scoped screenshot** (clip to a selector) — capture just a component.
- **Device emulation** — retina (`deviceScaleFactor`), `prefers-color-scheme: dark`, `prefers-reduced-motion`, touch/UA.

## Phase 2 — Close the loop _(biggest differentiator)_

- **Visual diff** — current vs previous (or vs a target mockup) → diff image + % pixels changed.
- **Mockup overlay** — overlay the target image at low opacity to align pixel-perfect.
- **Capture history** — timestamped folder + manifest to track the iteration.

## Phase 3 — Reach states

- **Interaction before capture** — click/scroll/hover/fill (open a modal, trigger validation errors, menus).
- **Multi-state** in one run — default / hover / focus / error.

## Phase 4 — Deeper insight

- **Accessibility snapshot** — a11y tree / axe-core findings.
- **Full network capture** — every request with status/timing, not only failures.
- **DOM → source mapping** via source maps — jump from a pixel to the file.

## Phase 5 — Distribution & DX

- Publish as `argus-mcp` on npm → `npx argus-mcp` (zero setup).
- Configurable defaults (engine, viewports, base URL).
- Expose captures as **MCP resources** + templated prompts.
