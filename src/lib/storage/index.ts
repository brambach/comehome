import { randomBytes } from "node:crypto";
import { stripExif } from "@/lib/exif";
import { blobStorage } from "./blob";
import { diskStorage } from "./disk";
import { memoryStorage } from "./memory";

export type StoredFile = { url: string };

export interface Storage {
  put(key: string, data: Buffer, contentType: string): Promise<StoredFile>;
}

export function storage(): Storage {
  if (process.env.STORAGE_DRIVER === "blob") return blobStorage();
  if (process.env.STORAGE_DRIVER === "memory") return memoryStorage();
  return diskStorage();
}

/** The only way images reach storage: strip metadata, then store under a random key. */
export async function saveImage(file: Blob | Buffer, prefix: "pets" | "sightings") {
  const raw = Buffer.isBuffer(file) ? file : Buffer.from(await file.arrayBuffer());
  const clean = await stripExif(raw);
  const key = `${prefix}/${randomBytes(12).toString("base64url")}.jpg`;
  const { url } = await storage().put(key, clean.data, clean.contentType);
  return { url, width: clean.width, height: clean.height };
}
