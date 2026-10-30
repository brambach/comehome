import { after, NextResponse, type NextRequest } from "next/server";
import { ImageError } from "@/lib/exif";
import { badRequest, tooMany } from "@/lib/http";
import { alertForSighting } from "@/lib/neighbors";
import { notifySighting } from "@/lib/notify";
import { createSighting } from "@/lib/pets";
import { getPublicPet } from "@/lib/public";
import { clientIp, hashIp, rateLimit } from "@/lib/ratelimit";
import { markTextReportUsed, textReportByToken } from "@/lib/textReports";
import { fieldErrors, formFields, formFiles, sightingInput } from "@/lib/validate";

export const runtime = "nodejs";

export async function POST(req: NextRequest, ctx: RouteContext<"/api/pets/[slug]/sightings">) {
  const { slug } = await ctx.params;
  const pet = await getPublicPet(slug);
  if (!pet) return NextResponse.json({ ok: false }, { status: 404 });
  if (pet.status === "found") {
    return badRequest({ form: `${pet.name} has been found. Thank you for looking.` });
  }

  const form = await req.formData();
  const fields = formFields(form);
  if (fields.website) return NextResponse.json({ ok: true });

  const ipHash = hashIp(clientIp(req.headers));
  const allowed =
    (await rateLimit(`sighting:${ipHash}:${pet.id}`, 6, 600)) &&
    (await rateLimit(`sighting:${ipHash}`, 30, 3600));
  if (!allowed) return tooMany();

  const parsed = sightingInput.safeParse(fields);
  if (!parsed.success) return badRequest(fieldErrors(parsed.error));

  // Started as a text: attach the photo they texted and their number (owner-only).
  const report = parsed.data.report ? await textReportByToken(parsed.data.report) : null;
  if (parsed.data.report && (!report || report.sightingId || (report.petId && report.petId !== pet.id))) {
    return badRequest({ form: "That text link has already been used. Thank you for sending it." });
  }

  const [photo] = formFiles(form, "photo");
  try {
    const sighting = await createSighting(
      pet,
      parsed.data,
      photo ?? null,
      ipHash,
      report ? { photoUrl: report.photoUrl, phone: report.phone } : undefined,
    );
    if (report) await markTextReportUsed(report.id, pet.id, sighting.id);
    // Reply first: the reporter may be on one bar. The owner email and neighbor alerts go out after.
    after(async () => {
      await notifySighting(pet.id, sighting).catch((err) => console.error("notifySighting", err));
      await alertForSighting(pet.id, sighting).catch((err) => console.error("alertForSighting", err));
    });
    return NextResponse.json({ ok: true, id: sighting.id });
  } catch (err) {
    if (err instanceof ImageError) return badRequest({ photo: err.message });
    throw err;
  }
}
