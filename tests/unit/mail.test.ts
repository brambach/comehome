import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { closeDb } from "@/lib/db";
import { mailer } from "@/lib/mail";
import { outbox } from "@/lib/mail/console";
import { notifySighting, petCreatedMail } from "@/lib/notify";
import { addSighting, makePet } from "./db-helpers";

const sent = vi.hoisted(() => [] as unknown[]);
vi.mock("resend", () => ({
  Resend: class {
    emails = {
      send: async (payload: unknown) => {
        sent.push(payload);
        return (payload as { to: string }).to.includes("bounce")
          ? { data: null, error: { message: "invalid recipient" } }
          : { data: { id: "email_1" }, error: null };
      },
    };
  },
}));

afterAll(closeDb);
beforeEach(() => {
  outbox.splice(0);
  sent.splice(0);
  process.env.MAIL_DRIVER = "console";
});

describe("owner email on a new sighting", () => {
  it("goes to the owner with the time, place, note, private contact and page link", async () => {
    const { pet } = await makePet({ name: "Juniper", ownerEmail: "juniper-owner@example.com" });
    const sighting = await addSighting(pet.id, {
      minutesAgo: 12,
      lat: 39.3283,
      lng: -120.1858,
      note: "By the river park bins <b>",
      contact: "530-555-0142",
    });

    await notifySighting(pet.id, sighting);

    expect(outbox).toHaveLength(1);
    const mail = outbox[0];
    expect(mail.to).toBe("juniper-owner@example.com");
    expect(mail.subject).toBe("New sighting: Juniper");
    expect(mail.text).toContain("Someone saw Juniper.");
    expect(mail.text).toContain("By the river park bins");
    expect(mail.text).toContain("Reporter contact (private to you): 530-555-0142");
    expect(mail.text).toContain("39.32830, -120.18580");
    expect(mail.text).toContain("https://www.openstreetmap.org/?mlat=39.3283&mlon=-120.1858");
    expect(mail.text).toContain(`https://comehome.test/p/${pet.slug}`);
    // user text is escaped in HTML
    expect(mail.html).toContain("By the river park bins &#60;b&#62;");
    expect(mail.html).not.toContain("<b>");
  });

  it("says so when the reporter left no contact", async () => {
    const { pet } = await makePet();
    await notifySighting(pet.id, await addSighting(pet.id, { minutesAgo: 5 }));
    expect(outbox[0].text).toContain("The reporter didn't leave contact info.");
  });
});

describe("pet created email", () => {
  it("carries the share link and the private edit link", () => {
    const mail = petCreatedMail({ name: "Mochi", slug: "mochi-k7q2", ownerEmail: "o@example.com" }, "tok_123");
    expect(mail.to).toBe("o@example.com");
    expect(mail.text).toContain("https://comehome.test/p/mochi-k7q2");
    expect(mail.text).toContain("https://comehome.test/p/mochi-k7q2/edit?t=tok_123");
  });
});

describe("resend adapter", () => {
  it("sends the same message through Resend with the configured sender", async () => {
    process.env.MAIL_DRIVER = "resend";
    process.env.RESEND_API_KEY = "re_test";
    process.env.MAIL_FROM = "comehome <alerts@comehome.test>";

    await mailer().send({ to: "owner@example.com", subject: "New sighting: Juniper", text: "t", html: "<p>h</p>" });

    expect(sent).toEqual([
      {
        from: "comehome <alerts@comehome.test>",
        to: "owner@example.com",
        subject: "New sighting: Juniper",
        text: "t",
        html: "<p>h</p>",
      },
    ]);
    expect(outbox).toHaveLength(0);
  });

  it("throws when Resend rejects the message", async () => {
    process.env.MAIL_DRIVER = "resend";
    process.env.RESEND_API_KEY = "re_test";
    await expect(
      mailer().send({ to: "bounce@example.com", subject: "s", text: "t", html: "h" }),
    ).rejects.toThrow("Resend: invalid recipient");
  });
});
