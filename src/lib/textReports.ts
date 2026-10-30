/**
 * Text-to-report. Someone texts a photo (and maybe the flyer's code) to the
 * comehome number. A text has no location, so we store the photo and reply
 * with a one-tap link where they drop the pin. The photo goes through
 * stripExif like every other upload; the phone number reaches the owner only.
 */
import { createHash, randomBytes } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { pets, textReports, type Pet, type TextReport } from "@/lib/db/schema";
import { stopPhone } from "@/lib/neighbors";
import { rateLimit } from "@/lib/ratelimit";
import { randomSuffix } from "@/lib/slug";
import { siteUrl } from "@/lib/site";
import { saveImage } from "@/lib/storage";
import { hashToken } from "@/lib/tokens";

export type Inbound = { from: string; body: string; media: { url: string; type: string }[] };

const STOP_WORDS = new Set(["STOP", "STOPALL", "UNSUBSCRIBE", "CANCEL", "END", "QUIT"]);

/** "Juniper" -> "JUNI" + two characters, e.g. "JUNI4K". Short enough to read off a flyer and type. */
export function textCodeFor(name: string): string {
  const letters = name
    .normalize("NFKD")
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .slice(0, 4);
  return `${letters || "PET"}${randomSuffix(2).toUpperCase()}`;
}

export async function petByCode(body: string): Promise<Pick<Pet, "id" | "name" | "slug"> | null> {
  const words = body.toUpperCase().match(/[A-Z0-9]{4,8}/g) ?? [];
  for (const word of words) {
    const [pet] = await db()
      .select({ id: pets.id, name: pets.name, slug: pets.slug })
      .from(pets)
      .where(and(eq(pets.textCode, word), eq(pets.status, "lost")))
      .limit(1);
    if (pet) return pet;
  }
  return null;
}

export function reportUrl(token: string) {
  return `${siteUrl()}/r/${token}`;
}

/**
 * Handle one inbound text. Returns the reply to send back, or null for no reply.
 * `download` fetches a media URL (Twilio's needs credentials; tests pass a stub).
 */
export async function handleInbound(msg: Inbound, download: (url: string) => Promise<Buffer>): Promise<string | null> {
  const body = msg.body.trim();
  if (STOP_WORDS.has(body.toUpperCase())) {
    await stopPhone(msg.from);
    return null; // Twilio sends the carrier-required confirmation itself.
  }

  const phoneKey = createHash("sha256").update(`sms:${msg.from}`).digest("hex").slice(0, 32);
  if (!(await rateLimit(`sms:${phoneKey}`, 10, 3600))) {
    return "comehome: that's a lot of texts in an hour. Try again in a bit.";
  }

  const pet = await petByCode(body);
  const image = msg.media.find((m) => m.type.startsWith("image/"));
  let photoUrl: string | null = null;
  if (image) {
    try {
      photoUrl = (await saveImage(await download(image.url), "sightings")).url;
    } catch (err) {
      console.error("text report photo", err);
    }
  }

  const token = randomBytes(18).toString("base64url");
  await db().insert(textReports).values({
    tokenHash: hashToken(token),
    phone: msg.from,
    body: body.slice(0, 500),
    photoUrl,
    petId: pet?.id ?? null,
  });

  const link = reportUrl(token);
  const got = photoUrl ? "Got your photo. " : "";
  return pet
    ? `comehome: thank you. ${got}Tap to drop a pin where you saw ${pet.name}: ${link}\nYour number only goes to the owner.`
    : `comehome: thank you. ${got}Tap to pick the pet and drop a pin where you saw it: ${link}\nYour number only goes to the owner.`;
}

export async function textReportByToken(token: string): Promise<TextReport | null> {
  const [r] = await db().select().from(textReports).where(eq(textReports.tokenHash, hashToken(token))).limit(1);
  return r ?? null;
}

export async function markTextReportUsed(id: string, petId: string, sightingId: string) {
  await db().update(textReports).set({ petId, sightingId }).where(eq(textReports.id, id));
}
