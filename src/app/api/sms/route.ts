import { NextResponse, type NextRequest } from "next/server";
import { siteUrl } from "@/lib/site";
import { fetchTwilioMedia, validTwilioRequest } from "@/lib/sms/twilio";
import { handleInbound } from "@/lib/textReports";
import { formFields } from "@/lib/validate";

export const runtime = "nodejs";

/** Twilio's incoming-message webhook for the comehome number. Replies with TwiML. */
export async function POST(req: NextRequest) {
  const params = formFields(await req.formData());
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (authToken) {
    // Twilio signs the URL it was configured with, which is the public one, not the proxied request URL.
    const url = `${siteUrl()}/api/sms`;
    if (!validTwilioRequest(authToken, url, params, req.headers.get("x-twilio-signature"))) {
      return new NextResponse("bad signature", { status: 403 });
    }
  } else if (process.env.NODE_ENV === "production") {
    return new NextResponse("texting isn't set up", { status: 503 });
  }

  const media = Array.from({ length: Math.min(5, Number(params.NumMedia ?? 0) || 0) }, (_, i) => ({
    url: params[`MediaUrl${i}`] ?? "",
    type: params[`MediaContentType${i}`] ?? "",
  })).filter((m) => m.url);

  const reply = await handleInbound({ from: params.From ?? "", body: params.Body ?? "", media }, fetchTwilioMedia);
  const xml = reply
    ? `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escapeXml(reply)}</Message></Response>`
    : `<?xml version="1.0" encoding="UTF-8"?><Response/>`;
  return new NextResponse(xml, { headers: { "content-type": "text/xml" } });
}

function escapeXml(s: string) {
  return s.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c]!);
}
