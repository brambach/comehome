/**
 * Screenshot a running app: pnpm screenshot <url> <out.png> [width] [height] [waitForSelector]
 * Uses the same Chromium as the e2e suite.
 */
import { existsSync } from "node:fs";
import { chromium } from "@playwright/test";

async function main() {
  const [url, out, width = "390", height = "844", waitFor] = process.argv.slice(2);
  if (!url || !out) throw new Error("usage: screenshot <url> <out.png> [width] [height] [selector]");
  const preinstalled = "/opt/pw-browsers/chromium";
  const browser = await chromium.launch({
    executablePath: process.env.PW_CHROMIUM_PATH ?? (existsSync(preinstalled) ? preinstalled : undefined),
  });
  const page = await browser.newPage({
    viewport: { width: Number(width), height: Number(height) },
    deviceScaleFactor: 2,
  });
  await page.goto(url, { waitUntil: "load" });
  if (waitFor) await page.waitForSelector(waitFor, { timeout: 20_000 });
  // Let the statement move finish, and map tiles paint if there is a map.
  await page.waitForTimeout(waitFor ? 9000 : 1200);
  await page.screenshot({ path: out, fullPage: true });
  await browser.close();
  console.log(`saved ${out}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
