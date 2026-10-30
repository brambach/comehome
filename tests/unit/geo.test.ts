import exifr from "exifr";
import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { areaName, INCLINE_VILLAGE, inServiceArea, onNorthShore } from "@/lib/geo";

// Town centers from Wikipedia and OpenStreetMap, as [lat, lng].
const NORTH_SHORE_TOWNS = {
  "Incline Village": [39.2548, -119.9538],
  "Crystal Bay": [39.2278, -120.0044],
  "Kings Beach": [39.2514, -120.0231],
  "Tahoe Vista": [39.2506, -120.0561],
} as const;

describe("service area", () => {
  it("leads with Incline Village and the north shore", () => {
    const [lng, lat] = INCLINE_VILLAGE;
    expect(inServiceArea(lat, lng)).toBe(true);
    for (const [town, [la, ln]] of Object.entries(NORTH_SHORE_TOWNS)) {
      expect(onNorthShore(la, ln), town).toBe(true);
      expect(areaName(la, ln).label, town).toBe("Incline Village & North Shore");
    }
  });

  it("still covers Truckee and the south shore, labelled as the wider area", () => {
    const donner = [39.3209, -120.2712] as const;
    const southLake = [38.9399, -119.9772] as const;
    for (const [la, ln] of [donner, southLake]) {
      expect(inServiceArea(la, ln)).toBe(true);
      expect(areaName(la, ln).label).toBe("Tahoe & Truckee");
    }
    expect(inServiceArea(37.7749, -122.4194)).toBe(false); // San Francisco
  });
});

describe("the Boots photo on the home page", () => {
  it("carries no EXIF, GPS, XMP or ICC metadata", async () => {
    const file = await readFile(path.join(process.cwd(), "assets/images/boots.jpg"));
    const meta = await sharp(file).metadata();
    expect(meta.exif).toBeUndefined();
    expect(meta.xmp).toBeUndefined();
    expect(meta.icc).toBeUndefined();
    expect(await exifr.gps(file).catch(() => undefined)).toBeFalsy();
    expect(Math.max(meta.width ?? 0, meta.height ?? 0)).toBeLessThanOrEqual(1600);
  });
});
