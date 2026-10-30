import { randomBytes } from "node:crypto";

// No vowels or look-alikes, so random suffixes never spell words or get misread off a flyer.
const ALPHABET = "bcdfghjkmnpqrstvwxz23456789";

export function slugify(name: string): string {
  return (
    name
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 24)
      .replace(/-+$/, "") || "pet"
  );
}

export function randomSuffix(length = 4): string {
  const bytes = randomBytes(length);
  let out = "";
  for (const b of bytes) out += ALPHABET[b % ALPHABET.length];
  return out;
}

/** e.g. "Mochi" -> "mochi-k7q2". Short enough to type from a flyer. */
export function petSlug(name: string): string {
  return `${slugify(name)}-${randomSuffix()}`;
}
