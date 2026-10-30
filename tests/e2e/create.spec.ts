import { expect, test } from "@playwright/test";
import { createPet, DONNER } from "./helpers";

test.use({ geolocation: DONNER, permissions: ["geolocation"] });

test("owner creates a pet page and opens it", async ({ page }) => {
  const { publicUrl, editUrl, slug } = await createPet(page, "Mochi");

  expect(slug).toMatch(/^mochi-[a-z0-9]{4}$/);
  expect(new URL(editUrl).searchParams.get("t")).toBeTruthy();

  await page.getByTestId("open-public").click();
  await expect(page).toHaveURL(new URL(publicUrl).pathname);
  await expect(page.getByRole("heading", { level: 1, name: "Mochi" })).toBeVisible();
  await expect(page.getByRole("link", { name: "I saw this pet" })).toBeVisible();
  await expect(page.getByRole("img", { name: "Photo of Mochi" })).toBeVisible();

  // Nothing private on the public page.
  const html = await page.content();
  expect(html).not.toContain("owner@example.com");
  expect(html).not.toContain(new URL(editUrl).searchParams.get("t")!);
});

test("the edit link works and a wrong token does not", async ({ page }) => {
  const { editUrl, slug } = await createPet(page, "Pepper");
  await page.goto(editUrl.replace("&new=1", ""));
  await expect(page.getByRole("heading", { level: 1, name: "Pepper" })).toBeVisible();

  const res = await page.goto(`/p/${slug}/edit?t=not-the-token`);
  expect(res?.status()).toBe(404);
});
