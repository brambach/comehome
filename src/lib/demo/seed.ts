/**
 * The demo town: three made-up pets on the North Shore, a handful of
 * neighbors signed up for alerts, and the alerts they got. Times are relative
 * to now, so the trail is always fresh. Used by `pnpm seed` and by the live
 * demo, which runs it into an in-memory database on every cold start.
 */
import { inArray } from "drizzle-orm";
import type { Db } from "@/lib/db";
import { alerts, petPhotos, pets, sightings, watchers } from "@/lib/db/schema";
import { destination } from "@/lib/geo";
import { hashToken, newEditToken } from "@/lib/tokens";

export const DEMO_SLUGS = ["juniper-demo", "pepper-demo", "mochi-demo"] as const;

type Trail = { h: number; lat: number; lng: number; note: string }[];

// Lost near Burnt Cedar Beach in the fireworks, drifting east through Incline
// Village toward Diamond Peak.
const JUNIPER: Trail = [
  { h: 27, lat: 39.2481, lng: -119.9652, note: "Trotting along Lakeshore Blvd near the beach." },
  { h: 24, lat: 39.2476, lng: -119.9596, note: "Under a deck off Lakeshore. Ran when I opened the door." },
  { h: 20, lat: 39.2489, lng: -119.9547, note: "" },
  { h: 15, lat: 39.2505, lng: -119.9499, note: "Crossing Tahoe Blvd by the gas station, heading east." },
  { h: 10, lat: 39.2524, lng: -119.9451, note: "Drinking from Third Creek behind the condos." },
  { h: 6, lat: 39.2541, lng: -119.9399, note: "Tan dog with a chain collar by the grocery store lot at dusk." },
  { h: 2.5, lat: 39.2556, lng: -119.9347, note: "Lying in the field by the rec center trail. Didn't approach." },
  { h: 0.7, lat: 39.2562, lng: -119.9292, note: "Near the Diamond Peak lot, sniffing around the bins." },
];

const PEPPER: Trail = [
  { h: 52, lat: 39.2401, lng: -120.0262, note: "Small dog on the bike path behind the library." },
  { h: 30, lat: 39.2418, lng: -120.0236, note: "" },
];

const MOCHI: Trail = [
  { h: 70, lat: 39.2335, lng: -120.0021, note: "Saw a dog like this near the casino parking garage." },
  { h: 55, lat: 39.2361, lng: -119.9972, note: "In the trees above Highway 28." },
  { h: 49, lat: 39.2378, lng: -119.9915, note: "Same dog, sitting by a mailbox on Gonowabie." },
];

export async function seedDemo(db: Db, now = Date.now()) {
  const ago = (h: number) => new Date(now - h * 3600_000);
  await db.delete(pets).where(inArray(pets.slug, [...DEMO_SLUGS]));
  await db.delete(watchers).where(inArray(watchers.email, demoEmails()));

  const token = newEditToken();
  const [juniper, pepper, mochi] = await db
    .insert(pets)
    .values([
      {
        slug: "juniper-demo",
        name: "Juniper",
        species: "dog",
        description:
          "Tan mixed breed, about 60 lb, black muzzle, chain collar with a heart tag. Friendly but spooked by the fireworks. Please don't chase: sit down, look away, and call us.",
        lastSeenAt: ago(30),
        lastLat: 39.2468,
        lastLng: -119.9706,
        ownerEmail: "demo-owner@example.com",
        editTokenHash: hashToken(token),
        textCode: "JUNI42",
        flyerScans: 14,
      },
      {
        slug: "pepper-demo",
        name: "Pepper",
        species: "dog",
        description: "Small black and white terrier mix, red harness, very shy. Slipped out of a gate in Kings Beach.",
        lastSeenAt: ago(60),
        lastLat: 39.2386,
        lastLng: -120.0281,
        ownerEmail: "demo-owner-2@example.com",
        editTokenHash: hashToken(newEditToken()),
        textCode: "PEPP7K",
        flyerScans: 3,
      },
      {
        slug: "mochi-demo",
        name: "Mochi",
        species: "dog",
        description: "Brown shepherd mix, green collar.",
        lastSeenAt: ago(74),
        lastLat: 39.2318,
        lastLng: -120.0049,
        ownerEmail: "demo-owner-3@example.com",
        editTokenHash: hashToken(newEditToken()),
        textCode: "MOCH3T",
        status: "found",
        foundAt: ago(46),
        foundNote:
          "A neighbor on Gonowabie saw the alert, put out a bowl of water and called us. She was asleep on their porch when we got there.",
      },
    ])
    .returning();

  await db.insert(petPhotos).values([
    { petId: juniper.id, url: "/demo/juniper.jpg", width: 1280, height: 853, position: 0 },
    { petId: pepper.id, url: "/demo/pepper.jpg", width: 1280, height: 853, position: 0 },
    { petId: mochi.id, url: "/demo/mochi.jpg", width: 1280, height: 960, position: 0 },
  ]);

  const rows = (petId: string, trail: Trail) =>
    trail.map((s, i) => ({
      petId,
      lat: s.lat,
      lng: s.lng,
      seenAt: ago(s.h),
      note: s.note,
      reporterContact: i % 3 === 0 ? `775-555-01${String(10 + i)}` : null,
    }));
  await db.insert(sightings).values([
    ...rows(juniper.id, JUNIPER),
    ...rows(pepper.id, PEPPER),
    ...rows(mochi.id, MOCHI),
    // A prank the owner hid: it never reaches the public map.
    { petId: juniper.id, lat: 38.9399, lng: -119.9772, seenAt: ago(3), note: "lol saw it in South Lake", hidden: true },
  ]);

  // Neighbors scattered around the North Shore, all confirmed.
  const people = demoEmails().map((email, i) => {
    const around = i % 3 === 0 ? { lat: 39.2386, lng: -120.0281 } : { lat: 39.2505, lng: -119.9499 };
    const p = destination(around, (i * 137.5) % 360, 250 + ((i * 397) % 2600));
    return {
      email,
      lat: p.lat,
      lng: p.lng,
      radiusM: [800, 1600, 3200][i % 3],
      tokenHash: hashToken(newEditToken()),
      confirmedAt: ago(24 * 30),
    };
  });
  const seeded = await db.insert(watchers).values(people).returning();
  const told = (petId: string, n: number, at: number, kind: "missing" | "nearby" = "missing") =>
    seeded.slice(0, n).map((w) => ({ watcherId: w.id, petId, kind, channel: "email" as const, sentAt: ago(at) }));
  await db.insert(alerts).values([...told(juniper.id, 23, 29.9), ...told(pepper.id, 9, 59.9), ...told(mochi.id, 12, 73.9)]);

  return { juniper, token };
}

function demoEmails() {
  return Array.from({ length: 41 }, (_, i) => `neighbor-${i + 1}@demo.comehome`);
}
