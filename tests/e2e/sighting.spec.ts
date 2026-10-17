import { expect, test } from "@playwright/test";
import { createPet, DONNER, fixture } from "./helpers";

test.use({ geolocation: DONNER, permissions: ["geolocation"] });

test("a stranger reports a sighting with at most 4 required inputs", async ({ page }) => {
  const { publicUrl, editUrl } = await createPet(page, "Biscuit");

  await page.goto(publicUrl);
  await page.getByRole("link", { name: "I saw this pet" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("You saw Biscuit?");

  // Required inputs: the location picker plus any field marked required (time is prefilled).
  const form = page.locator("form");
  const requiredFields = await form.locator("[required]").count();
  const required = 1 + requiredFields;
  expect(required).toBeLessThanOrEqual(4);
  await expect(page.getByLabel("When")).not.toHaveValue("");

  // The only thing the reporter does: share location, then send.
  await page.getByRole("button", { name: "Use my location" }).click();
  await expect(page.getByTestId("point-status")).toContainText("Pin at 39.32");
  await page.getByRole("button", { name: "Send to the owner" }).click();
  await expect(page.getByTestId("sighting-sent")).toBeVisible();

  await page.goto(publicUrl);
  await expect(page.getByTestId("latest-sighting")).toContainText("1 reported");

  await page.goto(editUrl);
  await expect(page.getByTestId("owner-sighting")).toHaveCount(1);
});

test("optional photo, note and contact reach the owner but not the public", async ({ page }) => {
  const { publicUrl, editUrl } = await createPet(page, "Clover");
  await page.goto(`${publicUrl}/seen`);
  await page.getByRole("button", { name: "Use my location" }).click();
  await page.getByLabel(/Photo/).setInputFiles(fixture("dog-road.jpg"));
  await page.getByLabel(/Anything else/).fill("Trotting east on Donner Pass Rd");
  await page.getByLabel(/Your phone or email/).fill("reporter-555-0199");
  await page.getByRole("button", { name: "Send to the owner" }).click();
  await expect(page.getByTestId("sighting-sent")).toBeVisible();

  await page.goto(editUrl);
  const row = page.getByTestId("owner-sighting");
  await expect(row).toContainText("Trotting east");
  await expect(row).toContainText("reporter-555-0199");
  await expect(row.getByRole("link", { name: "See their photo" })).toBeVisible();

  await page.goto(publicUrl);
  expect(await page.content()).not.toContain("reporter-555-0199");
});

test("honeypot submissions are dropped and floods are rate limited", async ({ page, request }) => {
  const { slug, editUrl } = await createPet(page, "Rascal");
  const url = `/api/pets/${slug}/sightings`;
  const fields = { lat: "39.33", lng: "-120.19", seenAt: new Date().toISOString() };

  const bot = await request.post(url, { multipart: { ...fields, website: "http://spam.example" } });
  expect(bot.ok()).toBe(true);
  await page.goto(editUrl);
  await expect(page.getByTestId("owner-sighting")).toHaveCount(0);

  const statuses: number[] = [];
  for (let i = 0; i < 7; i++) statuses.push((await request.post(url, { multipart: fields })).status());
  expect(statuses.slice(0, 6)).toEqual([200, 200, 200, 200, 200, 200]);
  expect(statuses[6]).toBe(429);
});

test("reports outside the Tahoe area are refused", async ({ page, request }) => {
  const { slug } = await createPet(page, "Scout");
  const res = await request.post(`/api/pets/${slug}/sightings`, {
    multipart: { lat: "37.77", lng: "-122.42", seenAt: new Date().toISOString() },
  });
  expect(res.status()).toBe(400);
  expect((await res.json()).errors.lat).toMatch(/Tahoe/);
});
