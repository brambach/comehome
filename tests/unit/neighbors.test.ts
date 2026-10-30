import { readFile } from "node:fs/promises";
import path from "node:path";
import { eq, sql } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { closeDb, db } from "@/lib/db";
import { alerts, pets, textReports } from "@/lib/db/schema";
import { destination } from "@/lib/geo";
import { outbox } from "@/lib/mail/console";
import {
  alertForNewPet,
  alertForSighting,
  alertFound,
  confirmWatcher,
  neighborsAlerted,
  stopWatcher,
  subscribe,
  validStop,
  stopSignature,
  watcherByToken,
} from "@/lib/neighbors";
import { setFound } from "@/lib/pets";
import { getPublicPet } from "@/lib/public";
import { sentTexts } from "@/lib/sms/console";
import { twilioSignature, validTwilioRequest } from "@/lib/sms/twilio";
import { handleInbound, petByCode, textReportByToken } from "@/lib/textReports";
import { addSighting, makePet } from "./db-helpers";

afterAll(closeDb);
beforeEach(async () => {
  await db().execute(sql`truncate watchers, alerts, text_reports, rate_limits cascade`);
  outbox.splice(0);
  sentTexts.splice(0);
});

// makePet puts the last-seen point here.
const LOST = { lat: 39.3279, lng: -120.1833 };
const near = (metres: number, bearing = 90) => destination(LOST, bearing, metres);

async function neighbor(email: string, at: { lat: number; lng: number }, radiusM = 1600, phone: string | null = null) {
  const { watcher } = await subscribe({ email, phone, ...at, radiusM });
  await confirmWatcher(watcher);
  return watcher;
}

describe("neighbor alerts", () => {
  it("tell confirmed neighbors whose radius covers the last-seen point, and nobody else", async () => {
    await neighbor("close@example.com", near(500), 800, "+17755550101");
    await neighbor("far@example.com", near(2500), 1600);
    await neighbor("wide@example.com", near(2500), 3200);
    await subscribe({ email: "unconfirmed@example.com", phone: null, ...near(100), radiusM: 1600 });
    const stopped = await neighbor("stopped@example.com", near(100));
    await stopWatcher(stopped);

    const { pet } = await makePet();
    expect(await alertForNewPet(pet)).toBe(2);
    expect(outbox.map((m) => m.to).sort()).toEqual(["close@example.com", "wide@example.com"]);
    expect(outbox[0].subject).toBe("Lost dog near you: Juniper");
    expect(outbox[0].text).toContain(`/p/${pet.slug}`);
    expect(outbox[0].text).toContain("/neighbors/stop?w=");
    expect(sentTexts).toHaveLength(1);
    expect(sentTexts[0].to).toBe("+17755550101");
    expect(sentTexts[0].body).toContain("Reply STOP");
    expect(sentTexts[0].body.length).toBeLessThan(320); // two SMS segments at most
    expect(await neighborsAlerted(pet.id)).toBe(2);
  });

  it("never alerts the owner about their own pet", async () => {
    await neighbor("owner-secret@example.com", near(100));
    const { pet } = await makePet();
    expect(await alertForNewPet(pet)).toBe(0);
  });

  it("respects the owner's choice to not alert", async () => {
    await neighbor("n@example.com", near(100));
    const { pet } = await makePet();
    await db().update(pets).set({ alertNeighbors: false }).where(eq(pets.id, pet.id));
    expect(await alertForNewPet({ ...pet, alertNeighbors: false })).toBe(0);
  });

  it("follows the corridor: a sighting near someone new alerts them, once per 12 hours", async () => {
    const east = destination(LOST, 90, 2500);
    await neighbor("first@example.com", near(200), 800);
    await neighbor("down-the-road@example.com", destination(east, 0, 300), 800);
    const { pet } = await makePet();
    await alertForNewPet(pet);
    expect(outbox.map((m) => m.to)).toEqual(["first@example.com"]);

    const s1 = await addSighting(pet.id, { minutesAgo: 20, ...east });
    expect(await alertForSighting(pet.id, s1)).toBe(1);
    expect(outbox.at(-1)?.to).toBe("down-the-road@example.com");
    expect(outbox.at(-1)?.subject).toBe("Juniper was seen near you");
    expect(outbox.at(-1)?.text).toMatch(/seen 0\.\d mi from you/);

    // Same spot again an hour later: they already know.
    const s2 = await addSighting(pet.id, { minutesAgo: 5, ...east });
    expect(await alertForSighting(pet.id, s2)).toBe(0);
  });

  it("caps everyone at three alerts a day", async () => {
    await neighbor("busy@example.com", near(100));
    for (let i = 0; i < 4; i++) {
      const { pet } = await makePet({ name: `Pet${i}` });
      await alertForNewPet(pet);
    }
    expect(outbox.filter((m) => m.to === "busy@example.com")).toHaveLength(3);
  });

  it("tells everyone who looked when the pet is home, once", async () => {
    await neighbor("a@example.com", near(100));
    await neighbor("b@example.com", near(300));
    const { pet } = await makePet();
    await alertForNewPet(pet);
    outbox.splice(0);
    await setFound(pet, true, "She was in the neighbor's shed.");
    const found = { ...pet, status: "found" as const };
    expect(await alertFound(found)).toBe(2);
    expect(outbox[0].subject).toBe("Juniper is home");
    expect(await alertFound(found)).toBe(0);
    expect((await getPublicPet(pet.slug))?.foundNote).toBe("She was in the neighbor's shed.");
  });

  it("re-signing up moves the pin and turns alerts back on", async () => {
    const w = await neighbor("move@example.com", near(100));
    await stopWatcher(w);
    const { token, watcher } = await subscribe({ email: "move@example.com", phone: null, ...near(2000), radiusM: 800 });
    expect(watcher.id).toBe(w.id);
    expect(watcher.stoppedAt).toBeNull();
    expect(watcher.confirmedAt).not.toBeNull();
    expect((await watcherByToken(token))?.id).toBe(w.id);
  });

  it("signs stop links so nobody can stop someone else's alerts", async () => {
    const w = await neighbor("sig@example.com", near(100));
    expect(validStop(w.id, stopSignature(w.id))).toBe(true);
    expect(validStop(w.id, "x".repeat(22))).toBe(false);
    expect(await db().select().from(alerts)).toHaveLength(0);
  });
});

describe("text a sighting", () => {
  const photo = () => readFile(path.join(__dirname, "..", "fixtures", "dog-road.jpg"));

  it("matches the flyer code, stores the photo and replies with a pin link", async () => {
    const { pet } = await makePet();
    const code = pet.textCode!;
    expect(code).toMatch(/^JUNI[A-Z0-9]{2}$/);
    expect((await petByCode(`saw her!! ${code.toLowerCase()} by safeway`))?.id).toBe(pet.id);

    const reply = await handleInbound(
      { from: "+17755550123", body: `${code} by the safeway`, media: [{ url: "https://api.twilio.com/m/1", type: "image/jpeg" }] },
      photo,
    );
    expect(reply).toContain("Got your photo.");
    expect(reply).toContain("where you saw Juniper");
    const token = reply!.match(/\/r\/([\w-]+)/)![1];
    const report = await textReportByToken(token);
    expect(report?.petId).toBe(pet.id);
    expect(report?.phone).toBe("+17755550123");
    expect(report?.photoUrl).toMatch(/^\/uploads\/sightings\/.+\.jpg$/);
  });

  it("still takes the report without a code, and asks them to pick the pet", async () => {
    const reply = await handleInbound({ from: "+17755550124", body: "black cat on my porch", media: [] }, photo);
    expect(reply).toContain("pick the pet");
    const [row] = await db().select().from(textReports);
    expect(row.petId).toBeNull();
  });

  it("STOP turns off texts and sends nothing back", async () => {
    await neighbor("t@example.com", near(100), 1600, "+17755550125");
    expect(await handleInbound({ from: "+17755550125", body: "stop", media: [] }, photo)).toBeNull();
    const { pet } = await makePet();
    await alertForNewPet(pet);
    expect(sentTexts).toHaveLength(0);
    expect(outbox).toHaveLength(1);
  });

  it("computes Twilio's documented example signature", () => {
    // https://www.twilio.com/docs/usage/security#validating-requests
    const params = { CallSid: "CA1234567890ABCDE", Caller: "+12349013030", Digits: "1234", From: "+12349013030", To: "+18005551212" };
    expect(twilioSignature("12345", "https://mycompany.com/myapp.php?foo=1&bar=2", params)).toBe("0/KCTR6DLpKmkAf8muzZqo1nDgQ=");
  });

  it("checks Twilio's signature", () => {
    const params = { From: "+17755550123", Body: "hi", NumMedia: "0" };
    const sig = twilioSignature("secret", "https://comehome.test/api/sms", params);
    expect(validTwilioRequest("secret", "https://comehome.test/api/sms", params, sig)).toBe(true);
    expect(validTwilioRequest("secret", "https://comehome.test/api/sms", { ...params, Body: "bye" }, sig)).toBe(false);
    expect(validTwilioRequest("secret", "https://comehome.test/api/sms", params, null)).toBe(false);
  });
});
