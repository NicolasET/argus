# Argus — Project Guide for AI Sessions

Argus is an MCP server that gives an AI **eyes** on a frontend: it renders a running app with Playwright at chosen viewports/engines and returns screenshots, rendered DOM, computed styles, console/network diagnostics, and project source. This file is the contract every change must follow — read it before editing.

## Golden rules

- **Ask before deciding.** Surface architecture / tooling / naming choices; don't assume. Recommend, then let the user choose.
- **No AI slop.** Every change compiles, lints, is formatted, and is tested/justified. `npm run check` must be green before a task is "done".
- **English everything** in code, comments, identifiers, and docs (chat may be Spanish).
- **No barrel files** — never an `index.ts` that only re-exports.
- **SOLID, dependency-inverted.** Tools depend on interfaces, never on Playwright/`fs` directly.
- **Keep this guide current.** It is living documentation and part of the definition of done — update it in the same change as any structural, convention, or workflow change.

## Maintaining this guide

Treat this file like code — **stale guidance is a bug**, and keeping it current is part of the definition of done. This is why the sections below describe _shape and rules_, not file inventories.

- **Sync in the same change.** When you add/rename/move/delete a directory or shift a responsibility, or change a script, convention, or workflow, update the affected section here in the _same_ commit.
- **Describe shape, not every file.** Capture layers, responsibilities, rules, and gotchas — these age well. For an exact, current file list, read the repo (`git ls-files src`) rather than duplicating it here; duplicated inventories are exactly what rots.
- **Reconcile before finishing.** Before calling a task done, skim this file against what you changed; fix anything now wrong, and add any gotcha worth warning the next session about.
- **Prune.** Delete guidance that no longer applies. Short and correct beats long and stale.

## Architecture

Argus is layered and dependency-inverted. The list below is the **durable shape** — responsibilities and rules, not a file inventory. Update it when a _layer or responsibility_ changes; for the current files, read the repo (`git ls-files src`).

**Dependency rule:** dependencies point inward, toward abstractions. A tool depends on a capability **interface**, never on a concrete implementation (Playwright, `fs`, SDK internals).

Layers (outer → inner):

- **Composition root** (`src/index.ts`) — the _only_ place that names concrete classes. Constructs implementations, injects them into tools, starts the stdio transport.
- **Server** (`src/server/`) — builds the `McpServer` and registers the `ToolRegistration`s it is given (Open/Closed: add a tool by passing it in, never by editing the server).
- **Tools** (`src/tools/`) — one `*.tool.ts` per MCP tool; each implements `ToolRegistration` and depends on a narrow capability interface. Cross-tool helpers stay separate (e.g. the shared error/result helper).
- **Capabilities** (e.g. `src/browser/`, `src/sourcing/`) — a `*.interface.ts` naming a capability (`PageCapturer`, `StyleInspector`, `SourceReader`, …) plus its concrete implementation (e.g. the Playwright driver — the _only_ Playwright-aware file). Add one here, then inject it at the composition root.
- **Domain helpers** (e.g. `src/viewports/`) — pure logic (presets, resolution) with no I/O.

Not shipped: `scripts/` (dev helpers run via Node native TS) and `test/` (`node:test`, importing the compiled `dist/*.js`).

To add a capability: define/extend the relevant `*.interface.ts`, implement it, inject it at the composition root. A tool must never import a concrete implementation.

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
