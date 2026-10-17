import { describe, expect, it } from "vitest";
import { petSlug, slugify } from "@/lib/slug";
import { hashToken, newEditToken, tokenMatches } from "@/lib/tokens";

describe("slug", () => {
  it("normalizes names", () => {
    expect(slugify("Señor Biscuit!!")).toBe("senor-biscuit");
    expect(slugify("   ")).toBe("pet");
  });

  it("adds a short unambiguous suffix", () => {
    expect(petSlug("Mochi")).toMatch(/^mochi-[bcdfghjkmnpqrstvwxz2-9]{4}$/);
  });
});

describe("edit tokens", () => {
  it("matches only the original token", () => {
    const token = newEditToken();
    const hash = hashToken(token);
    expect(tokenMatches(token, hash)).toBe(true);
    expect(tokenMatches(newEditToken(), hash)).toBe(false);
    expect(tokenMatches(undefined, hash)).toBe(false);
  });
});
