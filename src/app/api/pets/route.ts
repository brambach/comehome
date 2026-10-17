import { after, NextResponse, type NextRequest } from "next/server";
import { ImageError } from "@/lib/exif";
import { badRequest, tooMany } from "@/lib/http";
import { notifyPetCreated } from "@/lib/notify";
import { createPet } from "@/lib/pets";
import { clientIp, hashIp, rateLimit } from "@/lib/ratelimit";
import { fieldErrors, formFields, formFiles, petInput } from "@/lib/validate";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const fields = formFields(form);

  // Honeypot: pretend it worked so bots don't learn anything.
  if (fields.website) return NextResponse.json({ ok: true, slug: null });

  if (!(await rateLimit(`pet:${hashIp(clientIp(req.headers))}`, 10, 3600))) return tooMany();

  const parsed = petInput.safeParse(fields);
  if (!parsed.success) return badRequest(fieldErrors(parsed.error));

  const photos = formFiles(form, "photos");
  if (photos.length === 0) return badRequest({ photos: "Add at least one photo." });
  if (photos.length > 3) return badRequest({ photos: "Three photos at most." });

  try {
    const { pet, token } = await createPet(parsed.data, photos);
    after(() => notifyPetCreated(pet, token).catch((err) => console.error("notifyPetCreated", err)));
    return NextResponse.json({ ok: true, slug: pet.slug, token });
  } catch (err) {
    if (err instanceof ImageError) return badRequest({ photos: err.message });
    throw err;
  }
}
