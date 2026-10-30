import { NextResponse, type NextRequest } from "next/server";
import { badRequest, tooMany } from "@/lib/http";
import { mailer } from "@/lib/mail";
import { confirmMail, subscribe } from "@/lib/neighbors";
import { clientIp, hashIp, rateLimit } from "@/lib/ratelimit";
import { normalizePhone } from "@/lib/sms";
import { fieldErrors, formFields, watcherInput } from "@/lib/validate";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const fields = formFields(await req.formData());
  if (fields.website) return NextResponse.json({ ok: true });
  if (!(await rateLimit(`neighbors:${hashIp(clientIp(req.headers))}`, 8, 3600))) return tooMany();

  const parsed = watcherInput.safeParse(fields);
  if (!parsed.success) return badRequest(fieldErrors(parsed.error));
  const { email, phone: rawPhone, texts, lat, lng, radiusM } = parsed.data;

  // A number only counts with the consent box ticked, and only if it's a real US number.
  let phone: string | null = null;
  if (texts && rawPhone) {
    phone = normalizePhone(rawPhone);
    if (!phone) return badRequest({ phone: "That doesn't look like a US phone number." });
  }

  const { token } = await subscribe({ email, phone, lat, lng, radiusM });
  await mailer().send(confirmMail(email, token));
  return NextResponse.json({ ok: true });
}
