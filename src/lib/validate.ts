import { z } from "zod";
import { inServiceArea } from "@/lib/geo";
import { SPECIES } from "@/lib/db/schema";

const lat = z.coerce.number().min(-90).max(90);
const lng = z.coerce.number().min(-180).max(180);

// Times come from the browser as ISO strings. Allow a little clock skew into the future.
const pastTime = z.coerce
  .date()
  .refine((d) => d.getTime() <= Date.now() + 10 * 60_000, "That time is in the future.")
  .refine((d) => d.getTime() >= Date.now() - 365 * 24 * 3600_000, "That's more than a year ago.");

const outsideArea = {
  message: "comehome only covers the Tahoe and Truckee area for now.",
  path: ["lat"],
};

export const petInput = z
  .object({
    name: z.string().trim().min(1, "Add your pet's name.").max(40),
    species: z.enum(SPECIES, { message: "Pick dog, cat or other." }),
    description: z.string().trim().max(600).default(""),
    lat,
    lng,
    lastSeenAt: pastTime,
    ownerEmail: z.string().trim().toLowerCase().email("That email doesn't look right.").max(200),
  })
  .refine((v) => inServiceArea(v.lat, v.lng), outsideArea);

export const sightingInput = z
  .object({
    lat,
    lng,
    seenAt: pastTime,
    note: z.string().trim().max(500).default(""),
    contact: z.string().trim().max(200).default(""),
  })
  .refine((v) => inServiceArea(v.lat, v.lng), outsideArea);

export const petEditInput = z.object({
  name: z.string().trim().min(1, "Add your pet's name.").max(40),
  description: z.string().trim().max(600).default(""),
});

export type FieldErrors = Record<string, string>;

export function fieldErrors(error: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    out[key] ??= issue.message;
  }
  return out;
}

/** FormData -> plain object of strings, ignoring files. */
export function formFields(form: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of form.entries()) if (typeof v === "string") out[k] = v;
  return out;
}

export function formFiles(form: FormData, name: string): File[] {
  return form
    .getAll(name)
    .filter((v): v is File => typeof v !== "string" && v.size > 0);
}
