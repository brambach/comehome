import { readFile } from "node:fs/promises";
import path from "node:path";
import { createPet, createSighting } from "@/lib/pets";

export const fixture = (name: string) => readFile(path.join(__dirname, "..", "fixtures", name));

export async function makePet(overrides: Partial<{ name: string; ownerEmail: string }> = {}) {
  return createPet(
    {
      name: overrides.name ?? "Juniper",
      species: "dog",
      description: "Tan, black muzzle, chain collar.",
      lat: 39.3279,
      lng: -120.1833,
      lastSeenAt: new Date(Date.now() - 6 * 3600_000),
      ownerEmail: overrides.ownerEmail ?? "owner-secret@example.com",
    },
    [new Blob([new Uint8Array(await fixture("dog-grass.jpg"))])],
  );
}

export async function addSighting(
  petId: string,
  opts: { minutesAgo: number; lat?: number; lng?: number; contact?: string; note?: string },
) {
  return createSighting(
    { id: petId },
    {
      lat: opts.lat ?? 39.33,
      lng: opts.lng ?? -120.19,
      seenAt: new Date(Date.now() - opts.minutesAgo * 60_000),
      note: opts.note ?? "",
      contact: opts.contact ?? "",
    },
    null,
    null,
  );
}
