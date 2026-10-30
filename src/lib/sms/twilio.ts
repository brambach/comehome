import { createHmac, timingSafeEqual } from "node:crypto";
import type { Texter } from "./index";

/**
 * Prod texter over Twilio's REST API (no SDK: it's one POST). Needs
 * TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and TWILIO_FROM (E.164).
 */
export function twilioTexter(): Texter {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM;
  if (!sid || !token || !from) throw new Error("TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and TWILIO_FROM must be set");
  return {
    async send({ to, body }) {
      const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
        method: "POST",
        headers: {
          authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
          "content-type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ To: to, From: from, Body: body }),
      });
      if (!res.ok) throw new Error(`Twilio: ${res.status} ${await res.text()}`);
    },
  };
}

/**
 * Twilio signs each webhook: base64 HMAC-SHA1 of the full URL followed by
 * every POST param, sorted by name, as key+value. See
 * https://www.twilio.com/docs/usage/webhooks/webhooks-security
 */
export function twilioSignature(authToken: string, url: string, params: Record<string, string>): string {
  const data = Object.keys(params)
    .sort()
    .reduce((acc, k) => acc + k + params[k], url);
  return createHmac("sha1", authToken).update(data, "utf8").digest("base64");
}

export function validTwilioRequest(
  authToken: string,
  url: string,
  params: Record<string, string>,
  signature: string | null,
): boolean {
  if (!signature) return false;
  const a = Buffer.from(twilioSignature(authToken, url, params));
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** MMS media URLs need the account's credentials to download. */
export async function fetchTwilioMedia(url: string): Promise<Buffer> {
  // Only ever Twilio's own media host, with our credentials.
  if (!/^https:\/\/api\.twilio\.com\//.test(url)) throw new Error("not a Twilio media URL");
  const sid = process.env.TWILIO_ACCOUNT_SID ?? "";
  const token = process.env.TWILIO_AUTH_TOKEN ?? "";
  const res = await fetch(url, {
    headers: { authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}` },
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`Twilio media: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}
