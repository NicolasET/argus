# Argus — Project Guide for AI Sessions

Argus is an MCP server that gives an AI **eyes** on a frontend: it renders a running app with Playwright at chosen viewports/engines and returns screenshots, rendered DOM, computed styles, console/network diagnostics, and project source. This file is the contract every change must follow — read it before editing.

## Golden rules

- **Ask before deciding.** Surface architecture / tooling / naming choices; don't assume. Recommend, then let the user choose.
- **No AI slop.** Every change compiles, lints, is formatted, and is tested/justified. `npm run check` must be green before a task is "done".
- **English everything** in code, comments, identifiers, and docs (chat may be Spanish).
- **No barrel files** — never an `index.ts` that only re-exports.
- **SOLID, dependency-inverted.** Tools depend on interfaces, never on Playwright/`fs` directly.

## Architecture

- `src/index.ts` — composition root; the **only** place that names concrete classes. Wires implementations into tools and starts the stdio server.
- `src/server/` — builds the `McpServer` and registers `ToolRegistration`s (Open/Closed: add a tool by passing it in, never by editing the server).
- `src/tools/` — one file per MCP tool (`*.tool.ts`); each implements `ToolRegistration` and depends on a **narrow capability interface**. Shared result helpers live in `tool-result.ts`.
- `src/browser/` — `browser-driver.interface.ts` (capabilities `PageCapturer` / `StyleInspector` / `Disposable`) and `playwright-driver.ts` (the only Playwright-aware file).
- `src/sourcing/` — `SourceReader` interface + filesystem implementation (path-traversal guarded).
- `src/viewports/` — viewport presets + resolution.
- `scripts/` — dev helpers run via Node native TS (`capture.ts`, `login.ts`). Not shipped.
- `test/` — `node:test` suites; import the **compiled `dist/*.js`** (see TypeScript below).

Adding a capability: define/extend the relevant `*.interface.ts`, implement it, inject it at the composition root. A tool must never import a concrete implementation.

## TypeScript & typing (two roles — don't confuse them)

- **`tsc` (+ `tsconfig.json`, `@types/node`)** = the type-safety net **and** the shipped artifact in `dist/` (what `bin` / `claude mcp add` runs).
- **Node native TS stripping (`node x.ts`)** = runs `.ts` with **no type-checking**; used only for `scripts/` and `test/`. It never validates types — `tsc` does.
- Strong typing is mandatory: `strict` + `noUncheckedIndexedAccess`, `noUnusedLocals/Parameters`, `noImplicitReturns`, etc. (see `tsconfig.json`). **No `any` in `src/`** — typescript-eslint `strict-type-checked` enforces it. Prefer `unknown` + narrowing.
- Use `import type` for type-only imports; relative imports use the `.js` extension (NodeNext).
- `readonly` for data that shouldn't mutate. Interfaces name capabilities (`PageCapturer`, not `ICapturer`).

## MCP specifics

- `inputSchema` passed to `registerTool` is a **Zod raw shape** (`{ key: z.string() }`), NOT a wrapped `z.object({...})`.
- Content blocks: `{ type: "text", text }` and `{ type: "image", data: <base64>, mimeType }`; type the array as `CallToolResult["content"]`.
- Report failures with `toErrorResult` (sets `isError`). Never let an exception escape a tool handler.
- **stdout is the protocol channel — never `console.log` in the server.** Send diagnostics to stderr.

## Naming

- Files: kebab-case with a role suffix — `*.tool.ts`, `*.interface.ts`, `*.driver.ts`, `*.test.ts`.
- Classes / types / interfaces: PascalCase (no `I` prefix). Functions / vars: camelCase. Module constants: UPPER_SNAKE_CASE.

## Workflow — definition of done

Run **`npm run check`** and it must pass. It runs, in order: `format:check` → `build` → `lint` → tests (build is before lint/tests because tests import `dist/`).

- `npm run build` — `tsc` to `dist/`.
- `npm run lint` / `lint:fix` — ESLint (type-aware).
- `npm run format` / `format:check` — Prettier.
- `npm test` — build + `node --test`.
- `npm run check` — the full gate.

Git hooks (Husky): **pre-commit** → lint-staged (format + lint on staged files); **pre-push** → `npm run check`.

## Tests

- `node:test` + `node:assert/strict`; files `test/*.test.ts`, importing from `../dist/*.js`.
- Unit-test pure logic (resolvers, guards); integration-test the driver against a **local fixture server** (no external network). New behavior ships with tests.

## Git

- Conventional commits (`feat:`, `fix:`, `chore:`, ...). **No `Co-Authored-By` trailer.**
- Never commit `captures/`, `.auth/`, `dist/`, `node_modules/` (all git-ignored).

## Don't

- No barrels. No `any` in `src/`. No `console.log` to stdout. No concrete dependencies inside tools. No committing secrets or screenshots.
