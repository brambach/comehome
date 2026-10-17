import { and, asc, eq } from "drizzle-orm";
import type { z } from "zod";
import { db } from "@/lib/db";
import { petPhotos, pets, sightings, type Pet, type Sighting } from "@/lib/db/schema";
import { petSlug } from "@/lib/slug";
import { saveImage } from "@/lib/storage";
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
      if (isUniqueViolation(err)) continue; // slug collision: try another suffix
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
): Promise<Sighting> {
  const stored = photo ? await saveImage(photo, "sightings") : null;
  const [row] = await db()
    .insert(sightings)
    .values({
      petId: pet.id,
      lat: input.lat,
      lng: input.lng,
      seenAt: input.seenAt,
      note: input.note,
      reporterContact: input.contact || null,
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

export async function setFound(pet: Pet, found: boolean) {
  await db()
    .update(pets)
    .set({ status: found ? "found" : "lost", foundAt: found ? new Date() : null })
    .where(eq(pets.id, pet.id));
}

export async function updatePetDetails(pet: Pet, input: z.infer<typeof petEditInput>) {
  await db().update(pets).set(input).where(eq(pets.id, pet.id));
}

function isUniqueViolation(err: unknown): boolean {
  const e = err as { code?: string; cause?: { code?: string } };
  return e?.code === "23505" || e?.cause?.code === "23505";
}
