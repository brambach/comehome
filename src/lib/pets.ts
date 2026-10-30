import { and, asc, eq, sql } from "drizzle-orm";
import type { z } from "zod";
import { db } from "@/lib/db";
import { petPhotos, pets, sightings, type Pet, type Sighting } from "@/lib/db/schema";
import { petSlug } from "@/lib/slug";
import { saveImage } from "@/lib/storage";
import { textCodeFor } from "@/lib/textReports";
import { hashToken, newEditToken, tokenMatches } from "@/lib/tokens";
import type { petEditInput, petInput, sightingInput } from "@/lib/validate";

export async function createPet(input: z.infer<typeof petInput>, photos: Blob[]) {
  const stored: Awaited<ReturnType<typeof saveImage>>[] = [];
  for (const photo of photos.slice(0, 3)) stored.push(await saveImage(photo, "pets"));

  const token = newEditToken();
  for (let attempt = 0; attempt < 5; attempt++) {
    const slug = petSlug(input.name);
    try {
      const pet = await db().transaction(async (tx) => {
        const [row] = await tx
          .insert(pets)
          .values({
            slug,
            name: input.name,
            species: input.species,
            description: input.description,
            lastSeenAt: input.lastSeenAt,
            lastLat: input.lat,
            lastLng: input.lng,
            ownerEmail: input.ownerEmail,
            editTokenHash: hashToken(token),
            textCode: textCodeFor(input.name),
            alertNeighbors: input.alertNeighbors,
          })
          .returning();
        if (stored.length) {
          await tx
            .insert(petPhotos)
            .values(stored.map((p, position) => ({ ...p, petId: row.id, position })));
        }
        return row;
      });
      return { pet, token };
    } catch (err) {
      if (isUniqueViolation(err)) continue; // slug or text code collision: try other suffixes
      throw err;
    }
  }
  throw new Error("Couldn't find a free slug");
}

export async function createSighting(
  pet: Pick<Pet, "id">,
  input: z.infer<typeof sightingInput>,
  photo: Blob | null,
  ipHash: string | null,
  /** From a text report: its already-stored photo and the sender's number. */
  fromText?: { photoUrl: string | null; phone: string },
): Promise<Sighting> {
  const stored = photo ? await saveImage(photo, "sightings") : fromText?.photoUrl ? { url: fromText.photoUrl } : null;
  const [row] = await db()
    .insert(sightings)
    .values({
      petId: pet.id,
      lat: input.lat,
      lng: input.lng,
      seenAt: input.seenAt,
      note: input.note,
      reporterContact: input.contact || fromText?.phone || null,
      photoUrl: stored?.url ?? null,
      ipHash,
    })
    .returning();
  return row;
}

/** Full pet record for its owner, or null when the token doesn't match. */
export async function getOwnedPet(slug: string, token: string | null | undefined) {
  const [pet] = await db().select().from(pets).where(eq(pets.slug, slug)).limit(1);
  if (!pet || !tokenMatches(token, pet.editTokenHash)) return null;
  return pet;
}

export async function getOwnerSightings(petId: string) {
  return db()
    .select()
    .from(sightings)
    .where(eq(sightings.petId, petId))
    .orderBy(asc(sightings.seenAt));
}

export async function setSightingHidden(pet: Pet, sightingId: string, hidden: boolean) {
  await db()
    .update(sightings)
    .set({ hidden })
    .where(and(eq(sightings.id, sightingId), eq(sightings.petId, pet.id)));
}

export async function setFound(pet: Pet, found: boolean, foundNote = "") {
  await db()
    .update(pets)
    .set({ status: found ? "found" : "lost", foundAt: found ? new Date() : null, foundNote: found ? foundNote : "" })
    .where(eq(pets.id, pet.id));
}

/** A flyer QR scan. Counted, nothing else stored. */
export async function countFlyerScan(petId: string) {
  await db()
    .update(pets)
    .set({ flyerScans: sql`${pets.flyerScans} + 1` })
    .where(eq(pets.id, petId));
}

export async function updatePetDetails(pet: Pet, input: z.infer<typeof petEditInput>) {
  await db().update(pets).set(input).where(eq(pets.id, pet.id));
}

function isUniqueViolation(err: unknown): boolean {
  const e = err as { code?: string; cause?: { code?: string } };
  return e?.code === "23505" || e?.cause?.code === "23505";
}
