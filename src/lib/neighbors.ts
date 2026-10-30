/**
 * The neighbor network: people who asked to hear when a pet goes missing
 * near home. Everything here is private. Public pages only ever see a count.
 *
 * The rules that keep alerts from turning into spam:
 * - Nothing goes out until the neighbor confirms from the emailed link.
 * - One "missing" alert per pet. A "seen near you" alert only when a sighting
 *   lands inside their radius, and at most once per pet every 12 hours.
 * - Three alerts a day per neighbor, whatever happens.
 * - Everyone who heard about a pet hears when it's home, once.
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import { and, count, eq, gte, inArray, isNotNull, isNull, lte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { alerts, pets, watchers, type Pet, type Sighting, type Watcher } from "@/lib/db/schema";
import { boxAround, distanceM, formatDistance, type LatLng } from "@/lib/geo";
import { mailer, type Mail } from "@/lib/mail";
import { petUrl, siteUrl } from "@/lib/site";
import { texter } from "@/lib/sms";
import { ago } from "@/lib/time";
import { hashToken, newEditToken } from "@/lib/tokens";

export const RADII = [
  { m: 800, label: "Half a mile" },
  { m: 1600, label: "1 mile" },
  { m: 3200, label: "2 miles" },
] as const;
export const MAX_RADIUS_M = 3200;
export const DAILY_CAP = 3;
const NEARBY_GAP_MS = 12 * 3600_000;

type AlertPet = Pick<Pet, "id" | "name" | "slug" | "species" | "ownerEmail">;
type Kind = "missing" | "nearby" | "found";

export function manageUrl(token: string) {
  return `${siteUrl()}/neighbors/you?t=${encodeURIComponent(token)}`;
}

/** Sign up, or update an existing signup. Returns the token for the confirm link. */
export async function subscribe(input: {
  email: string;
  phone: string | null;
  lat: number;
  lng: number;
  radiusM: number;
}): Promise<{ token: string; watcher: Watcher }> {
  const token = newEditToken();
  const values = { ...input, tokenHash: hashToken(token) };
  const [watcher] = await db()
    .insert(watchers)
    .values(values)
    // Same email again: move their pin, keep their confirmation, start alerts again.
    .onConflictDoUpdate({ target: watchers.email, set: { ...values, stoppedAt: null } })
    .returning();
  return { token, watcher };
}

export async function watcherByToken(token: string | null | undefined): Promise<Watcher | null> {
  if (!token) return null;
  const [w] = await db().select().from(watchers).where(eq(watchers.tokenHash, hashToken(token))).limit(1);
  return w ?? null;
}

export async function confirmWatcher(w: Watcher) {
  await db().update(watchers).set({ confirmedAt: w.confirmedAt ?? new Date(), stoppedAt: null }).where(eq(watchers.id, w.id));
}

export async function stopWatcher(w: Watcher) {
  await db().update(watchers).set({ stoppedAt: new Date() }).where(eq(watchers.id, w.id));
}

/** A reply of STOP to any alert text. Twilio also blocks further texts on its side. */
export async function stopPhone(phone: string) {
  await db().update(watchers).set({ phone: null }).where(eq(watchers.phone, phone));
}

/** Confirmed, active neighbors whose radius covers the point. */
export async function watchersCovering(p: LatLng): Promise<Watcher[]> {
  const box = boxAround(p, MAX_RADIUS_M);
  const rows = await db()
    .select()
    .from(watchers)
    .where(
      and(
        isNotNull(watchers.confirmedAt),
        isNull(watchers.stoppedAt),
        gte(watchers.lat, box.south),
        lte(watchers.lat, box.north),
        gte(watchers.lng, box.west),
        lte(watchers.lng, box.east),
      ),
    );
  return rows.filter((w) => distanceM(w, p) <= w.radiusM);
}

/** How many neighbors have been told about this pet. The only number public pages get. */
export async function neighborsAlerted(petId: string): Promise<number> {
  const [row] = await db()
    .select({ n: sql<number>`count(distinct ${alerts.watcherId})::int` })
    .from(alerts)
    .where(and(eq(alerts.petId, petId), inArray(alerts.kind, ["missing", "nearby"])));
  return Number(row?.n ?? 0);
}

export async function alertForNewPet(pet: Pet): Promise<number> {
  if (pet.status !== "lost" || !pet.alertNeighbors) return 0;
  const here = { lat: pet.lastLat, lng: pet.lastLng };
  const people = await eligible(await watchersCovering(here), pet, "missing");
  for (const w of people) {
    await deliver(w, pet, "missing", missingMessage(pet, w, here, pet.lastSeenAt));
  }
  return people.length;
}

export async function alertForSighting(petId: string, sighting: Pick<Sighting, "id" | "lat" | "lng" | "seenAt">) {
  const [pet] = await db().select().from(pets).where(eq(pets.id, petId)).limit(1);
  if (!pet || pet.status !== "lost" || !pet.alertNeighbors) return 0;
  const people = await eligible(await watchersCovering(sighting), pet, "nearby");
  for (const w of people) {
    await deliver(w, pet, "nearby", nearbyMessage(pet, w, sighting, sighting.seenAt), sighting.id);
  }
  return people.length;
}

/** Close the loop for everyone who was asked to look. */
export async function alertFound(pet: Pet): Promise<number> {
  const told = await db()
    .selectDistinct({ watcher: watchers })
    .from(alerts)
    .innerJoin(watchers, eq(alerts.watcherId, watchers.id))
    .where(and(eq(alerts.petId, pet.id), inArray(alerts.kind, ["missing", "nearby"]), isNull(watchers.stoppedAt)));
  const already = await db()
    .select({ id: alerts.watcherId })
    .from(alerts)
    .where(and(eq(alerts.petId, pet.id), eq(alerts.kind, "found")));
  const done = new Set(already.map((a) => a.id));
  const people = told.map((t) => t.watcher).filter((w) => !done.has(w.id));
  for (const w of people) await deliver(w, pet, "found", foundMessage(pet, w));
  return people.length;
}

/** Drops the owner, anyone at the daily cap, and anyone who already heard about this pet recently. */
async function eligible(candidates: Watcher[], pet: AlertPet, kind: Kind): Promise<Watcher[]> {
  if (!candidates.length) return [];
  const ids = candidates.map((w) => w.id);
  const dayAgo = new Date(Date.now() - 24 * 3600_000);
  const today = await db()
    .select({ id: alerts.watcherId, n: count() })
    .from(alerts)
    .where(and(inArray(alerts.watcherId, ids), gte(alerts.sentAt, dayAgo), inArray(alerts.kind, ["missing", "nearby"])))
    .groupBy(alerts.watcherId);
  const busy = new Set(today.filter((r) => Number(r.n) >= DAILY_CAP).map((r) => r.id));

  const history = await db()
    .select({ id: alerts.watcherId, sentAt: alerts.sentAt })
    .from(alerts)
    .where(and(inArray(alerts.watcherId, ids), eq(alerts.petId, pet.id), inArray(alerts.kind, ["missing", "nearby"])));
  const heard = new Map<string, number>();
  for (const h of history) heard.set(h.id, Math.max(heard.get(h.id) ?? 0, h.sentAt.getTime()));

  return candidates.filter((w) => {
    if (w.email === pet.ownerEmail || busy.has(w.id)) return false;
    const last = heard.get(w.id);
    if (last === undefined) return true;
    return kind === "nearby" && Date.now() - last > NEARBY_GAP_MS;
  });
}

type Message = { mail: Omit<Mail, "to">; text: string };

async function deliver(w: Watcher, pet: AlertPet, kind: Kind, msg: Message, sightingId?: string) {
  // Record first: if a send fails halfway, we'd rather miss one than send twice.
  await db().insert(alerts).values({ watcherId: w.id, petId: pet.id, kind, sightingId, channel: w.phone ? "sms" : "email" });
  const sends: Promise<void>[] = [mailer().send({ to: w.email, ...msg.mail })];
  if (w.phone) sends.push(texter().send({ to: w.phone, body: msg.text }));
  const results = await Promise.allSettled(sends);
  for (const r of results) if (r.status === "rejected") console.error("neighbor alert", r.reason);
}

const KIND_WORD = { dog: "dog", cat: "cat", other: "pet" } as const;

function stopLine(w: Pick<Watcher, "id">) {
  return `You get these because you asked for alerts near home. Stop or change them: ${manageUrlFor(w)}`;
}

// We only keep a hash of the neighbor's token, so alerts carry a signed stop
// link instead: one tap, no login, can't be forged for someone else.
function manageUrlFor(w: Pick<Watcher, "id">) {
  return stopUrl(w.id);
}

export function stopSignature(watcherId: string): string {
  const secret = process.env.ALERT_SECRET || process.env.RATE_LIMIT_SALT || "dev-secret";
  return createHmac("sha256", secret).update(`stop:${watcherId}`).digest("base64url").slice(0, 22);
}

export function stopUrl(watcherId: string): string {
  return `${siteUrl()}/neighbors/stop?w=${watcherId}&s=${stopSignature(watcherId)}`;
}

export function validStop(watcherId: string, sig: string): boolean {
  const a = Buffer.from(stopSignature(watcherId));
  const b = Buffer.from(sig);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function watcherById(id: string): Promise<Watcher | null> {
  const [w] = await db().select().from(watchers).where(eq(watchers.id, id)).limit(1);
  return w ?? null;
}

export function missingMessage(pet: AlertPet, w: Pick<Watcher, "id" | "lat" | "lng">, at: LatLng, when: Date): Message {
  const away = formatDistance(distanceM(w, at));
  const url = petUrl(pet.slug);
  const kind = KIND_WORD[pet.species];
  const lead = `${pet.name} is missing, ${away} from you. Last seen ${ago(when)}.`;
  return {
    text: `comehome: lost ${kind}. ${lead} Photo and map: ${url}\nPlease look, don't chase. Reply STOP to stop.`,
    mail: {
      subject: `Lost ${kind} near you: ${pet.name}`,
      text: [lead, "", `Photo and map: ${url}`, "", "If you see them, tap \"I saw this pet\" on the page. Please don't chase.", "", stopLine(w)].join("\n"),
      html: alertHtml(lead, url, 'Please don\'t chase. If you see them, tap "I saw this pet" on the page.', w),
    },
  };
}

export function nearbyMessage(pet: AlertPet, w: Pick<Watcher, "id" | "lat" | "lng">, at: LatLng, when: Date): Message {
  const away = formatDistance(distanceM(w, at));
  const url = petUrl(pet.slug);
  const lead = `${pet.name} was seen ${away} from you, ${ago(when)}.`;
  return {
    text: `comehome: ${lead} Map: ${url}\nPlease look, don't chase. Reply STOP to stop.`,
    mail: {
      subject: `${pet.name} was seen near you`,
      text: [lead, "", `See where: ${url}`, "", stopLine(w)].join("\n"),
      html: alertHtml(lead, url, "Scared pets hide close and move at dawn and dusk. Check under decks and in open garages.", w),
    },
  };
}

export function foundMessage(pet: AlertPet, w: Pick<Watcher, "id">): Message {
  const lead = `${pet.name} is home. Thank you for looking.`;
  const url = petUrl(pet.slug);
  return {
    text: `comehome: ${lead} ${url}`,
    mail: {
      subject: `${pet.name} is home`,
      text: [lead, "", url, "", stopLine(w)].join("\n"),
      html: alertHtml(lead, url, "", w),
    },
  };
}

function alertHtml(lead: string, url: string, tip: string, w: Pick<Watcher, "id">) {
  return `
    <p style="font-size:18px"><strong>${esc(lead)}</strong></p>
    <p><a href="${url}">See the photo and map</a></p>
    ${tip ? `<p>${esc(tip)}</p>` : ""}
    <p style="color:#6b645b;font-size:13px">You get these because you asked for alerts near home.
    <a href="${manageUrlFor(w)}">Stop or change them</a>.</p>`;
}

export function confirmMail(email: string, token: string): Mail {
  const url = manageUrl(token);
  return {
    to: email,
    subject: "Confirm comehome alerts",
    text: [
      "Tap to start getting alerts when a pet goes missing near you:",
      url,
      "",
      "If this wasn't you, ignore this email and nothing happens.",
    ].join("\n"),
    html: `<p>Tap to start getting alerts when a pet goes missing near you:</p>
      <p><a href="${url}">Confirm alerts</a></p>
      <p style="color:#6b645b">If this wasn't you, ignore this email and nothing happens.</p>`,
  };
}

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}
