import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { createPet, DONNER } from "./helpers";

test.use({ geolocation: DONNER, permissions: ["geolocation"] });

async function seriousIssues(page: Page) {
  const results = await new AxeBuilder({ page })
    // MapLibre's canvas and controls are third-party; the page lists the same data as text.
    .exclude(".maplibregl-map")
    .analyze();
  return results.violations
    .filter((v) => v.impact === "serious" || v.impact === "critical")
    .map((v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`);
}

test("no serious or critical axe issues on any page", async ({ page, request }) => {
  const { slug, publicUrl, editUrl } = await createPet(page, "Pickles");
  await request.post(`/api/pets/${slug}/sightings`, {
    multipart: { lat: "39.33", lng: "-120.19", seenAt: new Date().toISOString(), note: "By the river" },
  });

  const pages = ["/", "/new", publicUrl, `${publicUrl}/seen`, editUrl];
  const report: Record<string, string[]> = {};
  for (const url of pages) {
    await page.goto(url);
    await page.waitForTimeout(1000); // let the statement move finish so contrast is measured at rest
    report[new URL(url, "http://x").pathname] = await seriousIssues(page);
  }
  console.log("axe serious/critical:", JSON.stringify(report));
  expect(Object.values(report).flat()).toEqual([]);
});

test("the public page keeps MapLibre off the first view", async ({ page }) => {
  const { publicUrl } = await createPet(page, "Noodle");
  // Short enough that the map starts more than the 200px preload margin below the fold.
  await page.setViewportSize({ width: 390, height: 460 });
  const js: { url: string; bytes: number }[] = [];
  page.on("response", async (res) => {
    if (res.request().resourceType() === "script" && res.url().includes("/_next/")) {
      const body = await res.body().catch(() => Buffer.alloc(0));
      js.push({ url: res.url(), bytes: body.length });
    }
  });
  await page.goto(publicUrl);
  await page.waitForLoadState("networkidle");
  const mapTop = await page.getByTestId("pet-map").evaluate((el) => el.getBoundingClientRect().top);
  expect(mapTop).toBeGreaterThan(460 + 200);
  const kb = (n: number) => Math.round(n / 1024);
  const firstView = js.reduce((n, f) => n + f.bytes, 0);
  await expect(page.getByTestId("pet-map")).toHaveAttribute("data-state", "loading");

  await page.getByTestId("pet-map").scrollIntoViewIfNeeded();
  await expect(page.getByTestId("pet-map")).not.toHaveAttribute("data-state", "loading", { timeout: 20_000 });
  const withMap = js.reduce((n, f) => n + f.bytes, 0);
  console.log(`public page JS, uncompressed: ${kb(firstView)} KB before the map, ${kb(withMap)} KB once it loads`);

  // ~470 KB is the Next + React runtime and our two small components. MapLibre alone is ~1 MB.
  expect(kb(firstView)).toBeLessThan(550);
});
