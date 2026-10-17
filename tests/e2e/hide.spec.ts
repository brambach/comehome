import { expect, test } from "@playwright/test";
import { createPet, DONNER } from "./helpers";

test.use({ geolocation: DONNER, permissions: ["geolocation"] });

test("the owner hides a bad report and it leaves the public page", async ({ page, request }) => {
  const { slug, publicUrl, editUrl } = await createPet(page, "Hazel");
  const post = (note: string) =>
    request.post(`/api/pets/${slug}/sightings`, {
      multipart: { lat: "39.33", lng: "-120.19", seenAt: new Date().toISOString(), note },
    });
  expect((await post("Real one: by the river trail")).ok()).toBe(true);
  expect((await post("prank report")).ok()).toBe(true);

  await page.goto(publicUrl);
  await expect(page.getByTestId("sighting-list")).toContainText("prank report");

  await page.goto(editUrl);
  const prank = page.getByTestId("owner-sighting").filter({ hasText: "prank report" });
  await prank.getByRole("button", { name: "Hide" }).click();
  await expect(prank).toContainText("Hidden");

  await page.goto(publicUrl);
  await expect(page.getByTestId("sighting-list")).not.toContainText("prank report");
  await expect(page.getByTestId("sighting-list")).toContainText("by the river trail");
  await expect(page.getByTestId("latest-sighting")).toContainText("1 reported");
  await expect(page.getByTestId("pet-map")).toBeVisible();
});
