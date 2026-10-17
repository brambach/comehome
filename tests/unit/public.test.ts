import { afterAll, describe, expect, it } from "vitest";
import { closeDb } from "@/lib/db";
import { setSightingHidden } from "@/lib/pets";
import { getPublicPet, getPublicSightings } from "@/lib/public";
import { addSighting, makePet } from "./db-helpers";

afterAll(closeDb);

describe("public queries", () => {
  it("never return the owner's email, the token hash, or reporter contacts", async () => {
    const { pet, token } = await makePet({ ownerEmail: "very-private@example.com" });
    await addSighting(pet.id, { minutesAgo: 30, contact: "555-0100 reporter-private" });

    const publicPet = await getPublicPet(pet.slug);
    const publicSightings = await getPublicSightings(pet.id);
    const blob = JSON.stringify({ publicPet, publicSightings });

    expect(publicPet?.name).toBe("Juniper");
    expect(publicSightings).toHaveLength(1);
    expect(blob).not.toContain("very-private@example.com");
    expect(blob).not.toContain("reporter-private");
    expect(blob).not.toContain(pet.editTokenHash);
    expect(blob).not.toContain(token);
    expect(Object.keys(publicSightings[0]).sort()).toEqual(
      ["id", "lat", "lng", "note", "photoUrl", "seenAt"].sort(),
    );
  });

  it("leaves hidden sightings out", async () => {
    const { pet } = await makePet();
    const keep = await addSighting(pet.id, { minutesAgo: 60 });
    const bad = await addSighting(pet.id, { minutesAgo: 30 });
    await setSightingHidden(pet, bad.id, true);

    const visible = await getPublicSightings(pet.id);
    expect(visible.map((s) => s.id)).toEqual([keep.id]);
  });

  it("can't hide another pet's sighting", async () => {
    const a = await makePet({ name: "A" });
    const b = await makePet({ name: "B" });
    const s = await addSighting(b.pet.id, { minutesAgo: 10 });
    await setSightingHidden(a.pet, s.id, true);
    expect(await getPublicSightings(b.pet.id)).toHaveLength(1);
  });
});
