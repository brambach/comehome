"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
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
  await setFound(pet, form.get("found") === "1");
  redirect(back);
}

export async function saveDetails(form: FormData) {
  const { pet, back } = await owned(form);
  const parsed = petEditInput.safeParse({ name: form.get("name"), description: form.get("description") });
  if (parsed.success) await updatePetDetails(pet, parsed.data);
  redirect(`${back}${parsed.success ? "&saved=1" : "&invalid=1"}#details`);
}
