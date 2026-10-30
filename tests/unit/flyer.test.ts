import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import jsQR from "jsqr";
import { PNG } from "pngjs";
import { describe, expect, it } from "vitest";
import { nameSize, renderFlyer } from "@/lib/flyer";
import { petUrl, shortPetUrl } from "@/lib/site";
import { fixture } from "./db-helpers";

/** Rasterize page 1 with poppler and decode whatever QR code is on it. */
function decodeQr(pdf: Buffer): string | null {
  const dir = mkdtempSync(path.join(tmpdir(), "flyer-"));
  writeFileSync(path.join(dir, "flyer.pdf"), pdf);
  execFileSync("pdftoppm", ["-r", "150", "-png", "-f", "1", "-l", "1", "flyer.pdf", "page"], { cwd: dir });
  const file = readdirSync(dir).find((f) => f.endsWith(".png"))!;
  const png = PNG.sync.read(readFileSync(path.join(dir, file)));
  return jsQR(new Uint8ClampedArray(png.data), png.width, png.height)?.data ?? null;
}

function pdfText(pdf: Buffer): string {
  const dir = mkdtempSync(path.join(tmpdir(), "flyer-"));
  writeFileSync(path.join(dir, "flyer.pdf"), pdf);
  return execFileSync("pdftotext", ["flyer.pdf", "-"], { cwd: dir }).toString();
}

describe("flyer", () => {
  it("renders a letter-size PDF whose QR code opens the pet page", async () => {
    const slug = "juniper-k7q2";
    const pdf = await renderFlyer({
      name: "Juniper",
      species: "dog",
      description: "Tan mixed breed, black muzzle, chain collar.",
      lastSeenAt: new Date("2026-10-15T01:51:00Z"),
      status: "lost",
      url: petUrl(slug),
      shortUrl: shortPetUrl(slug),
      area: "Incline Village & North Shore",
      photo: await fixture("dog-grass.jpg"),
    });

    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    const info = execFileSync("pdfinfo", ["-"], { input: pdf }).toString();
    expect(info).toMatch(/Pages:\s+1/);
    expect(info).toMatch(/Page size:\s+612 x 792 pts \(letter\)/);

    expect(decodeQr(pdf)).toBe("https://comehome.test/p/juniper-k7q2?f=1");

    const text = pdfText(pdf);
    expect(text).toContain("LOST DOG");
    expect(text).toContain("Juniper");
    expect(text).toContain("Incline Village & North Shore");
    expect(text).toContain("comehome.test/p/juniper-k7q2");
  });

  it("stays on one page with the longest name and description", async () => {
    const pdf = await renderFlyer({
      name: "Sir Reginald Fluffington III of Tahoe",
      species: "cat",
      description: "Very long description. ".repeat(40),
      lastSeenAt: new Date(),
      status: "lost",
      url: petUrl("sir-reginald-abcd"),
      shortUrl: shortPetUrl("sir-reginald-abcd"),
      area: "Tahoe & Truckee",
      photo: await fixture("dog-window.jpg"),
    });
    expect(execFileSync("pdfinfo", ["-"], { input: pdf }).toString()).toMatch(/Pages:\s+1/);
    expect(decodeQr(pdf)).toBe("https://comehome.test/p/sir-reginald-abcd?f=1");
  });

  it("sizes long names down so they fit", () => {
    expect(nameSize("Bo")).toBe(112);
    expect(nameSize("Juniper")).toBeGreaterThan(nameSize("Sir Reginald Fluffington"));
    expect(nameSize("Sir Reginald Fluffington III")).toBeGreaterThanOrEqual(44);
  });
});
