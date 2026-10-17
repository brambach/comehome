/**
 * The only module public pages read from. Every query names its columns, so
 * owner emails, reporter contacts, IP hashes and token hashes can't leak by
 * accident when the schema grows. tests/unit/public.test.ts holds the line.
 */
import { and, asc, eq } from "drizzle-orm";
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
