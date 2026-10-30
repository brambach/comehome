import { NextResponse } from "next/server";
import type { FieldErrors } from "@/lib/validate";

export function badRequest(errors: FieldErrors) {
  return NextResponse.json({ ok: false, errors }, { status: 400 });
}

export function tooMany() {
  return NextResponse.json(
    { ok: false, errors: { form: "That's a lot of reports in a short time. Try again in a few minutes." } },
    { status: 429 },
  );
}
