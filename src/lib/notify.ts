import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { pets, type Pet, type Sighting } from "@/lib/db/schema";
import { mailer, type Mail } from "@/lib/mail";
import { petUrl, siteUrl } from "@/lib/site";
import { formatWhen } from "@/lib/time";

export function editUrl(slug: string, token: string): string {
  return `${siteUrl()}/p/${slug}/edit?t=${encodeURIComponent(token)}`;
}

/** Sent once, right after the page is made: the edit link is the owner's only key. */
export function petCreatedMail(pet: Pick<Pet, "name" | "slug" | "ownerEmail">, token: string): Mail {
  const share = petUrl(pet.slug);
  const edit = editUrl(pet.slug, token);
  const text = [
    `${pet.name}'s page is live.`,
    "",
    `Share this link: ${share}`,
    "",
    `Your private edit link (don't share it): ${edit}`,
    "Use it to hide bad reports, print the flyer, or mark " + pet.name + " found.",
    "",
    "We'll email you here every time someone reports a sighting.",
  ].join("\n");
  const html = `
    <p><strong>${esc(pet.name)}'s page is live.</strong></p>
    <p>Share this link: <a href="${share}">${share}</a></p>
    <p>Your private edit link (don't share it):<br><a href="${edit}">${edit}</a></p>
    <p>Use it to hide bad reports, print the flyer, or mark ${esc(pet.name)} found.</p>
    <p>We'll email you here every time someone reports a sighting.</p>`;
  return { to: pet.ownerEmail, subject: `${pet.name}'s page is live`, text, html };
}

export function sightingMail(
  pet: Pick<Pet, "name" | "slug" | "ownerEmail">,
  sighting: Pick<Sighting, "lat" | "lng" | "seenAt" | "note" | "reporterContact" | "photoUrl">,
): Mail {
  const share = petUrl(pet.slug);
  const where = `${sighting.lat.toFixed(5)}, ${sighting.lng.toFixed(5)}`;
  const mapLink = `https://www.openstreetmap.org/?mlat=${sighting.lat}&mlon=${sighting.lng}#map=17/${sighting.lat}/${sighting.lng}`;
  const photo = sighting.photoUrl
    ? sighting.photoUrl.startsWith("http")
      ? sighting.photoUrl
      : `${siteUrl()}${sighting.photoUrl}`
    : null;
  const lines = [
    `Someone saw ${pet.name}.`,
    "",
    `When: ${formatWhen(sighting.seenAt)}`,
    `Where: ${where} (${mapLink})`,
    sighting.note ? `Note: ${sighting.note}` : null,
    sighting.reporterContact ? `Reporter contact (private to you): ${sighting.reporterContact}` : "The reporter didn't leave contact info.",
    photo ? `Photo: ${photo}` : null,
    "",
    `See the corridor: ${share}`,
  ].filter((l): l is string => l !== null);
  const html = `
    <p><strong>Someone saw ${esc(pet.name)}.</strong></p>
    <p>When: ${esc(formatWhen(sighting.seenAt))}<br>
    Where: <a href="${mapLink}">${where}</a></p>
    ${sighting.note ? `<p>Note: ${esc(sighting.note)}</p>` : ""}
    <p>${sighting.reporterContact ? `Reporter contact (private to you): ${esc(sighting.reporterContact)}` : "The reporter didn't leave contact info."}</p>
    ${photo ? `<p><a href="${photo}">Their photo</a></p>` : ""}
    <p><a href="${share}">See the corridor</a></p>`;
  return { to: pet.ownerEmail, subject: `New sighting: ${pet.name}`, text: lines.join("\n"), html };
}

export async function notifyPetCreated(pet: Pet, token: string) {
  await mailer().send(petCreatedMail(pet, token));
}

export async function notifySighting(petId: string, sighting: Sighting) {
  const [pet] = await db()
    .select({ name: pets.name, slug: pets.slug, ownerEmail: pets.ownerEmail })
    .from(pets)
    .where(eq(pets.id, petId))
    .limit(1);
  if (pet) await mailer().send(sightingMail(pet, sighting));
}

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}
