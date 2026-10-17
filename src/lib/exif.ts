import sharp from "sharp";

export const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;
const MAX_EDGE = 1600;

export type CleanImage = { data: Buffer; width: number; height: number; contentType: "image/jpeg" };

export class ImageError extends Error {}

/**
 * Re-encode an upload so nothing but pixels survives: EXIF (GPS, camera,
 * timestamps), XMP, IPTC and ICC are all dropped. The image is rotated
 * upright first so dropping the orientation tag doesn't flip it.
 */
export async function stripExif(input: Buffer | ArrayBuffer | Uint8Array): Promise<CleanImage> {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input as ArrayBuffer);
  if (buf.byteLength === 0) throw new ImageError("That file is empty.");
  if (buf.byteLength > MAX_UPLOAD_BYTES) throw new ImageError("That photo is over 12 MB.");

  try {
    const { data, info } = await sharp(buf, { limitInputPixels: 64_000_000, failOn: "error" })
      .rotate()
      .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 82, mozjpeg: true })
      .toBuffer({ resolveWithObject: true });
    return { data, width: info.width, height: info.height, contentType: "image/jpeg" };
  } catch {
    throw new ImageError("We couldn't read that photo. Try a JPEG or PNG.");
  }
}
