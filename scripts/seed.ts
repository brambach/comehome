/**
 * Demo data: Juniper, lost near Donner Lake, with 8 sightings drifting
 * toward downtown Truckee and one prank report the owner has hidden.
 * Re-running replaces the demo pet. Prints the public and edit links.
 */
import "dotenv/config";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { eq } from "drizzle-orm";
import { closeDb, db } from "../src/lib/db";
import { petPhotos, pets, sightings } from "../src/lib/db/schema";
import { editUrl } from "../src/lib/notify";
import { petUrl } from "../src/lib/site";
import { saveImage } from "../src/lib/storage";
import { hashToken, newEditToken } from "../src/lib/tokens";

const SLUG = "juniper-demo";
const hoursAgo = (h: number) => new Date(Date.now() - h * 3600_000);

const trail = [
  { h: 26.5, lat: 39.3236, lng: -120.2618, note: "Trotting along the Donner Lake shoreline, west end of the beach." },
  { h: 24, lat: 39.3252, lng: -120.2512, note: "Under a deck on South Shore Dr. Ran when I opened the door." },
  { h: 19, lat: 39.3268, lng: -120.2405, note: "" },
  { h: 14.5, lat: 39.3294, lng: -120.2296, note: "Crossing Donner Pass Rd near the gas station, heading east." },
  { h: 9, lat: 39.3311, lng: -120.2188, note: "Drinking from Donner Creek behind the apartments." },
  { h: 5.5, lat: 39.3286, lng: -120.2079, note: "Saw a tan dog with a chain collar by the Safeway lot at dusk." },
  { h: 2.25, lat: 39.3302, lng: -120.1962, note: "Lying in the field by the river trail. Didn't approach." },
  { h: 0.7, lat: 39.3283, lng: -120.1858, note: "Near the Truckee River Regional Park entrance, sniffing around the bins." },
];

const prank = { h: 3, lat: 38.9399, lng: -119.9772, note: "lol saw it in South Lake" };

async function main() {
  await db().delete(pets).where(eq(pets.slug, SLUG));

  const photo = await readFile(path.join(process.cwd(), "tests", "fixtures", "dog-grass.jpg"));
  const stored = await saveImage(photo, "pets");
  const token = newEditToken();

  const [pet] = await db()
    .insert(pets)
    .values({
      slug: SLUG,
      name: "Juniper",
      species: "dog",
      description:
        "Tan mixed breed, about 60 lb, black muzzle, chain collar with a heart tag. Friendly but spooked by the fireworks. Please don't chase: sit down, look away, and call us.",
      lastSeenAt: hoursAgo(28),
      lastLat: 39.3209,
      lastLng: -120.2712,
      ownerEmail: "demo-owner@example.com",
      editTokenHash: hashToken(token),
    })
    .returning();

  await db().insert(petPhotos).values({ petId: pet.id, ...stored, position: 0 });
  await db()
    .insert(sightings)
    .values([
      ...trail.map((s, i) => ({
        petId: pet.id,
        lat: s.lat,
        lng: s.lng,
        seenAt: hoursAgo(s.h),
        note: s.note,
        reporterContact: i % 3 === 0 ? `530-555-01${String(10 + i)}` : null,
      })),
      { petId: pet.id, lat: prank.lat, lng: prank.lng, seenAt: hoursAgo(prank.h), note: prank.note, hidden: true },
    ]);

  console.log(`Seeded Juniper with ${trail.length} sightings (+1 hidden).`);
  console.log(`Public: ${petUrl(SLUG)}`);
  console.log(`Edit:   ${editUrl(SLUG, token)}`);
  await closeDb();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
