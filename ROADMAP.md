# Argus Roadmap

**Guiding principle:** every feature must shorten the loop **see → understand → fix → re-see**. Ordered by value/effort.

## Phase 0 — Hardening _(in progress)_

The safety net that turns the prototype into something trustworthy to iterate with.

- **Tests** — unit for the viewport resolver and the `SourceReader` path-traversal guard; integration for the driver against a local HTML fixture (no dependency on a running `localhost`).
- **CI** (GitHub Actions) — `typecheck` + `build` + `test` + cached `playwright install`.
- **`.gitattributes`** (`* text=auto eol=lf`) — stop the CRLF warnings.
- **Clear errors** — when the app is down or a selector never appears, return `isError` with a useful message instead of a raw stack.
- **Robust full-page capture** _(active fix)_ — capture the whole page by default, auto-scrolling first to trigger lazy-loaded content; keep above-the-fold available via `fullPage: false`.

## Navigation & Coverage _(cross-cutting theme)_

Raised early: a single above-the-fold shot of one public route is not enough.

- **Full page vs viewport** — see _Robust full-page capture_ above.
- **Multiple routes** — capture several paths under a base URL (e.g. `/`, `/pricing`, `/faq`) in a controlled way, mindful of image/token volume.
- **Authenticated routes** — reach pages behind sign-in. Preferred approach: Playwright `storageState` (log in once, reuse the session) and/or a persistent browser profile; no credentials stored in Argus.
- **Pre-capture interaction** — click/scroll/fill before capturing (see Phase 3) for states and flows.

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
