import exifr from "exifr";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { ImageError, stripExif } from "@/lib/exif";

/** A JPEG with GPS, camera and timestamp EXIF, like a phone photo. */
async function photoWithGps() {
  return sharp({ create: { width: 800, height: 600, channels: 3, background: "#b07a4a" } })
    .withExif({
      IFD0: { Make: "Phone", Model: "Phone 15", Software: "comehome-test" },
      IFD2: { DateTimeOriginal: "2026:10:12 16:10:00" },
      IFD3: {
        GPSLatitudeRef: "N",
        GPSLatitude: "39/1 19/1 3600/100",
        GPSLongitudeRef: "W",
        GPSLongitude: "120/1 11/1 0/1",
      },
    })
    .jpeg()
    .toBuffer();
}

describe("stripExif", () => {
  it("removes GPS and all other EXIF", async () => {
    const original = await photoWithGps();
    const before = await exifr.gps(original);
    expect(before?.latitude).toBeCloseTo(39.3267, 3); // the fixture really has GPS

    const clean = await stripExif(original);

    expect(await exifr.gps(clean.data)).toBeUndefined();
    expect(await exifr.parse(clean.data, true)).toBeUndefined();
    const meta = await sharp(clean.data).metadata();
    expect(meta.exif).toBeUndefined();
    expect(meta.icc).toBeUndefined();
    expect(meta.xmp).toBeUndefined();
    expect(clean.contentType).toBe("image/jpeg");
  });

  it("keeps the image upright when it drops the orientation tag", async () => {
    const rotated = await sharp({ create: { width: 400, height: 200, channels: 3, background: "#333" } })
      .jpeg()
      .withMetadata({ orientation: 6 })
      .toBuffer();
    expect((await sharp(rotated).metadata()).orientation).toBe(6);
    const clean = await stripExif(rotated);
    expect([clean.width, clean.height]).toEqual([200, 400]);
  });

  it("downsizes large photos and rejects non-images", async () => {
    const big = await sharp({ create: { width: 4000, height: 3000, channels: 3, background: "#777" } })
      .jpeg()
      .toBuffer();
    const clean = await stripExif(big);
    expect(Math.max(clean.width, clean.height)).toBe(1600);
    await expect(stripExif(Buffer.from("not an image"))).rejects.toBeInstanceOf(ImageError);
  });
});
