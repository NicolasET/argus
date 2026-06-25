/**
 * Dev helper: open a real (headed) browser, let you sign in manually, and save
 * the authenticated session as a Playwright storageState JSON. Pass that file to
 * capture_views / inspect_styles via their `storageState` option to capture
 * pages behind a login. No credentials are ever stored in Argus.
 *
 * Runs on Node's native TypeScript support:
 *   node scripts/login.ts [url] [outPath]
 *   npm run login -- http://localhost:5173/ .auth/state.json
 */

import { chromium } from "playwright";
import { createInterface } from "node:readline/promises";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const url: string = process.argv[2] ?? "http://localhost:5173/";
const outPath: string = process.argv[3] ?? fileURLToPath(new URL("../.auth/state.json", import.meta.url));

mkdirSync(dirname(outPath), { recursive: true });

const browser = await chromium.launch({ headless: false });
const context = await browser.newContext();
const page = await context.newPage();
await page.goto(url);

const rl = createInterface({ input: process.stdin, output: process.stdout });
await rl.question(`\nA browser opened at ${url}.\nSign in there, then press Enter here to save the session... `);
rl.close();

await context.storageState({ path: outPath });
console.log(`Saved storage state to ${outPath}`);

await browser.close();
