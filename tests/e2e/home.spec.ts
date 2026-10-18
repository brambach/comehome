import { expect, test } from "@playwright/test";
import { createPet, INCLINE } from "./helpers";

test("the home page leads with Incline Village and tells Boots's story", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Incline Village/);
  await expect(page.locator(".eyebrow").first()).toHaveText("Incline Village · Lake Tahoe");
  await expect(page.getByText(/Crystal Bay, Kings Beach and Tahoe Vista/)).toBeVisible();

  const story = page.getByRole("region", { name: "Why I built this" });
  await expect(story).toContainText("went missing in Incline Village for about 50 days");

  const photo = story.getByRole("img", { name: /Boots, a black-and-white tuxedo cat/ });
  await photo.scrollIntoViewIfNeeded();
  await expect(photo).toHaveAttribute("srcset", /\/_next\/image\?url=.*w=640.*w=1080/);
  await expect(photo).toHaveAttribute("loading", "lazy");
  await expect.poll(() => photo.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
  const served = await photo.evaluate((img: HTMLImageElement) => img.currentSrc);
  const res = await page.request.get(served);
  expect(res.ok()).toBe(true);
  expect((await res.body()).length).toBeLessThan(150 * 1024);
});

test.describe("a pet lost in Incline Village", () => {
  test.use({ geolocation: INCLINE, permissions: ["geolocation"] });

  test("its page says Incline Village & North Shore", async ({ page }) => {
    const { publicUrl } = await createPet(page, "Socks");
    await page.goto(publicUrl);
    await expect(page.locator(".eyebrow").first()).toHaveText("Lost dog · Incline Village & North Shore");
    await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", /near Incline Village/);
  });
});
