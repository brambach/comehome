import path from "node:path";
import { expect, type Page } from "@playwright/test";

export const fixture = (name: string) => path.join(__dirname, "..", "fixtures", name);

// Donner Lake, near Truckee.
export const DONNER = { latitude: 39.3226, longitude: -120.2667 };

/** Fills the create form the way an owner would and lands on the owner page. */
let owners = 0;

export async function createPet(page: Page, name = "Mochi") {
  // Each simulated owner gets its own address, so a full run stays under the
  // 10-pages-per-hour limit the way real owners on different phones would.
  owners += 1;
  await page.setExtraHTTPHeaders({ "x-forwarded-for": `198.51.100.${(owners % 250) + 1}` });
  await page.goto("/new");
  await page.getByLabel("Pet's name").fill(name);
  await page.getByRole("radio", { name: "Dog" }).check();
  await page.getByLabel("Photos").setInputFiles(fixture("dog-window.jpg"));
  await page.getByLabel(/Description/).fill("Shiba, red coat, blue collar. Shy: please don't chase.");
  await page.getByRole("button", { name: "Use my location" }).click();
  await expect(page.getByTestId("point-status")).toContainText("Pin at 39.32");
  await page.getByLabel("Your email").fill("owner@example.com");
  await page.getByRole("button", { name: "Publish the page" }).click();
  await expect(page.getByTestId("created-notice")).toBeVisible({ timeout: 20_000 });
  const publicUrl = await page.getByTestId("public-link").inputValue();
  const editUrl = page.url();
  return { publicUrl, editUrl, slug: new URL(publicUrl).pathname.split("/").pop()! };
}
