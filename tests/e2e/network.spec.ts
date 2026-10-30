import { expect, test } from "@playwright/test";
import { twilioSignature } from "../../src/lib/sms/twilio";
import { createPet, INCLINE } from "./helpers";

test.use({ geolocation: INCLINE, permissions: ["geolocation"] });

test("a neighbor signs up, confirms from the email link, and can stop", async ({ page, request }) => {
  await page.goto("/neighbors");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Be the eyes on your street.");
  await page.getByRole("button", { name: "Use my location" }).click();
  await expect(page.getByTestId("point-status")).toContainText("Pin at 39.25");
  await page.getByRole("radio", { name: "Half a mile" }).check();
  const email = `neighbor-${Date.now()}@example.com`;
  await page.getByLabel("Your email", { exact: true }).fill(email);
  await page.getByRole("button", { name: "Send me the confirm link" }).click();
  await expect(page.getByTestId("neighbor-sent")).toContainText(email);

  // The confirm link only goes out by email (tests/unit/neighbors.test.ts covers
  // confirming). Here: a page without a real token shows nothing about anyone.
  await page.goto("/neighbors/you?t=not-a-real-token");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("That link has expired.");

  const bad = await request.post("/api/neighbors", {
    multipart: { email: "not-an-email", lat: "39.25", lng: "-119.95", radiusM: "1600" },
  });
  expect(bad.status()).toBe(400);
});

test("a stop link only works with its signature", async ({ page }) => {
  await page.goto("/neighbors/stop?w=00000000-0000-0000-0000-000000000000&s=forged");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("That link doesn't work.");
});

test("open pages show on the town board and in the feeds", async ({ page, request }) => {
  const { slug } = await createPet(page, "Pickle");
  await page.goto("/lost");
  await expect(page.getByTestId("open-pets")).toContainText("Pickle");

  const json = await (await request.get("/feed.json")).json();
  const item = json.items.find((i: { url: string }) => i.url.endsWith(`/p/${slug}`));
  expect(item.title).toBe("Lost dog: Pickle");
  expect(JSON.stringify(json)).not.toContain("owner@example.com");

  const rss = await (await request.get("/feed.xml")).text();
  expect(rss).toContain("<title>Lost dog: Pickle</title>");
});

test("a texted sighting lands on its pin page with the photo attached", async ({ page, request }) => {
  const { slug, editUrl } = await createPet(page, "Noodle");
  // No code in the text, as when someone texts from memory: they pick the pet on the page.
  const form = { From: "+17755550142", Body: "saw a dog by the library", NumMedia: "0" };
  const url = `${new URL(page.url()).origin}/api/sms`;

  const forged = await request.post("/api/sms", { form, headers: { "x-twilio-signature": "forged" } });
  expect(forged.status()).toBe(403);

  const sms = await request.post("/api/sms", {
    form,
    headers: { "x-twilio-signature": twilioSignature("e2e-twilio", url, form) },
  });
  expect(sms.ok()).toBe(true);
  const xml = await sms.text();
  const link = xml.match(/\/r\/[\w-]+/)?.[0];
  expect(link).toBeTruthy();

  await page.goto(`${link}?pet=${slug}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("You saw Noodle?");
  await page.getByRole("button", { name: "Use my location" }).click();
  await page.getByRole("button", { name: "Send to the owner" }).click();
  await expect(page.getByTestId("sighting-thanks")).toBeVisible();

  await page.goto(editUrl);
  await expect(page.getByTestId("owner-sighting")).toContainText("+17755550142");
  await page.goto(link!);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Already on the map.");
});
