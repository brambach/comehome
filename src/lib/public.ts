/**
 * The only module public pages read from. Every query names its columns, so
 * owner emails, reporter contacts, IP hashes and token hashes can't leak by
 * accident when the schema grows. tests/unit/public.test.ts holds the line.
 */
import { and, asc, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { petPhotos, pets, sightings } from "@/lib/db/schema";

export const publicPetColumns = {
  id: pets.id,
  slug: pets.slug,
  name: pets.name,
  species: pets.species,
  description: pets.description,
  lastSeenAt: pets.lastSeenAt,
  lastLat: pets.lastLat,
  lastLng: pets.lastLng,
  status: pets.status,
  foundAt: pets.foundAt,
  foundNote: pets.foundNote,
  textCode: pets.textCode,
  flyerScans: pets.flyerScans,
};

export const publicSightingColumns = {
  id: sightings.id,
  lat: sightings.lat,
  lng: sightings.lng,
  seenAt: sightings.seenAt,
  note: sightings.note,
  photoUrl: sightings.photoUrl,
};

export type PublicPhoto = { url: string; width: number; height: number };
export type PublicPet = {
  id: string;
  slug: string;
  name: string;
  species: "dog" | "cat" | "other";
  description: string;
  lastSeenAt: Date;
  lastLat: number;
  lastLng: number;
  status: "lost" | "found";
  foundAt: Date | null;
  foundNote: string;
  /** Printed on the flyer: text a photo with this word. */
  textCode: string | null;
  flyerScans: number;
  photos: PublicPhoto[];
};
export type PublicSighting = {
  id: string;
  lat: number;
  lng: number;
  seenAt: Date;
  note: string;
  photoUrl: string | null;
};

export async function getPublicPet(slug: string): Promise<PublicPet | null> {
  const [pet] = await db().select(publicPetColumns).from(pets).where(eq(pets.slug, slug)).limit(1);
  if (!pet) return null;
  const photos = await db()
    .select({ url: petPhotos.url, width: petPhotos.width, height: petPhotos.height })
    .from(petPhotos)
    .where(eq(petPhotos.petId, pet.id))
    .orderBy(asc(petPhotos.position));
  return { ...pet, photos };
}

/** Visible sightings, oldest first. Hidden reports never leave the database. */
export async function getPublicSightings(petId: string): Promise<PublicSighting[]> {
  return db()
    .select(publicSightingColumns)
    .from(sightings)
    .where(and(eq(sightings.petId, petId), eq(sightings.hidden, false)))
    .orderBy(asc(sightings.seenAt));
}

export type OpenPet = Omit<PublicPet, "photos"> & {
  photo: PublicPhoto | null;
  sightingCount: number;
  latestSeenAt: Date;
};

/**
 * Pets still missing, newest activity first: the town board, the home page
 * list and the feed shelters and vets subscribe to. Pages quiet for more than
 * `days` drop off so the board stays about now.
 */
export async function getOpenPets(days = 60): Promise<OpenPet[]> {
  const since = new Date(Date.now() - days * 24 * 3600_000);
  const latest = sql<Date>`greatest(${pets.lastSeenAt}, coalesce(max(${sightings.seenAt}), ${pets.lastSeenAt}))`;
  const rows = await db()
    .select({
      ...publicPetColumns,
      sightingCount: sql<number>`count(${sightings.id})::int`,
      latestSeenAt: latest,
    })
    .from(pets)
    .leftJoin(sightings, and(eq(sightings.petId, pets.id), eq(sightings.hidden, false)))
    .where(eq(pets.status, "lost"))
    .groupBy(pets.id)
    .having(gte(latest, since))
    .orderBy(desc(latest))
    .limit(50);
  if (!rows.length) return [];
  const photos = await db()
    .select({ petId: petPhotos.petId, url: petPhotos.url, width: petPhotos.width, height: petPhotos.height })
    .from(petPhotos)
    .where(and(inArray(petPhotos.petId, rows.map((r) => r.id)), eq(petPhotos.position, 0)));
  const byPet = new Map(photos.map((p) => [p.petId, { url: p.url, width: p.width, height: p.height }]));
  return rows.map((r) => ({
    ...r,
    latestSeenAt: new Date(r.latestSeenAt),
    sightingCount: Number(r.sightingCount),
    photo: byPet.get(r.id) ?? null,
  }));
}

/** Pets found in the last `days`, for the "home" strip. */
export async function getRecentlyFound(days = 90) {
  const since = new Date(Date.now() - days * 24 * 3600_000);
  return db()
    .select({ slug: pets.slug, name: pets.name, foundAt: pets.foundAt, lastSeenAt: pets.lastSeenAt })
    .from(pets)
    .where(and(eq(pets.status, "found"), gte(pets.foundAt, since)))
    .orderBy(desc(pets.foundAt))
    .limit(6);
}
