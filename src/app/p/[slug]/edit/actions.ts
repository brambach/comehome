"use server";

import { after } from "next/server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { alertFound } from "@/lib/neighbors";
import { getOwnedPet, setFound, setSightingHidden, updatePetDetails } from "@/lib/pets";
import { petEditInput } from "@/lib/validate";

async function owned(form: FormData) {
  const slug = String(form.get("slug") ?? "");
  const token = String(form.get("t") ?? "");
  const pet = await getOwnedPet(slug, token);
  if (!pet) throw new Error("Not allowed");
  return { pet, back: `/p/${slug}/edit?t=${encodeURIComponent(token)}` };
}

export async function toggleSighting(form: FormData) {
  const { pet, back } = await owned(form);
  const id = z.string().uuid().parse(form.get("sightingId"));
  await setSightingHidden(pet, id, form.get("hidden") === "1");
  redirect(`${back}#sightings`);
}

export async function toggleFound(form: FormData) {
  const { pet, back } = await owned(form);
  const found = form.get("found") === "1";
  const note = z.string().trim().max(600).catch("").parse(form.get("foundNote") ?? "");
  await setFound(pet, found, note);
  // Everyone who was asked to look hears that it's over.
  if (found) after(() => alertFound(pet).catch((err) => console.error("alertFound", err)).then(() => {}));
  redirect(found ? `/p/${pet.slug}?home=1` : back);
}

export async function saveDetails(form: FormData) {
  const { pet, back } = await owned(form);
  const parsed = petEditInput.safeParse({ name: form.get("name"), description: form.get("description") });
  if (parsed.success) await updatePetDetails(pet, parsed.data);
  redirect(`${back}${parsed.success ? "&saved=1" : "&invalid=1"}#details`);
}
