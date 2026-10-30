import { expect, test } from "@playwright/test";
import { createPet, DONNER } from "./helpers";

test.use({ geolocation: DONNER, permissions: ["geolocation"] });

test("marking found turns the page into the found story and closes the form", async ({ page, request }) => {
  const { slug, publicUrl, editUrl } = await createPet(page, "Waffles");

  await page.goto(editUrl);
  await page.getByLabel(/How did they come home/).fill("Asleep under the neighbor's deck.");
  await page.getByTestId("toggle-found").click();

  // The owner lands on the public page, where the route closes.
  await expect(page).toHaveURL(new RegExp(`/p/${slug}\\?home=1`));
  await expect(page.getByTestId("found-banner")).toBeVisible();
  await expect(page.getByTestId("found-banner")).toContainText("Waffles is home.");
  await expect(page.getByTestId("found-banner")).toContainText("Missing");
  await expect(page.getByTestId("found-banner")).toContainText("Asleep under the neighbor's deck.");

  await page.goto(editUrl);
  await expect(page.getByTestId("toggle-found")).toHaveText("Reopen the search");
  await page.goto(publicUrl);
  await expect(page.getByRole("link", { name: "I saw this pet" })).toHaveCount(0);

  await page.goto(`${publicUrl}/seen`);
  await expect(page.getByTestId("form-closed")).toBeVisible();
  await expect(page.locator("form")).toHaveCount(0);

  const res = await request.post(`/api/pets/${slug}/sightings`, {
    multipart: { lat: "39.33", lng: "-120.19", seenAt: new Date().toISOString() },
  });
  expect(res.status()).toBe(400);

  // Reopening brings the button back.
  await page.goto(editUrl);
  await page.getByTestId("toggle-found").click();
  await page.goto(publicUrl);
  await expect(page.getByTestId("found-banner")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "I saw this pet" })).toBeVisible();
});
