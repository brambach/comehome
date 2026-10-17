import { expect, test } from "@playwright/test";
import { createPet, DONNER } from "./helpers";

test.use({ geolocation: DONNER, permissions: ["geolocation"] });

test("the page links a flyer PDF and advertises an OG image", async ({ page, request }) => {
  const { slug, publicUrl } = await createPet(page, "Olive");

  const pdf = await request.get(`/p/${slug}/flyer.pdf`);
  expect(pdf.status()).toBe(200);
  expect(pdf.headers()["content-type"]).toBe("application/pdf");
  expect((await pdf.body()).subarray(0, 5).toString()).toBe("%PDF-");

  await page.goto(publicUrl);
  const og = await page.locator('meta[property="og:image"]').getAttribute("content");
  expect(og).toContain(`/p/${slug}/opengraph-image`);
  const img = await request.get(new URL(og!).pathname + new URL(og!).search);
  expect(img.status()).toBe(200);
  expect(img.headers()["content-type"]).toBe("image/png");
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute("content", "Lost dog: Olive");
});
