import { readUpload } from "@/lib/storage/disk";

/** Bytes for a stored image URL: dev disk uploads or a public Blob URL. */
export async function imageBytes(url: string): Promise<Buffer | null> {
  if (url.startsWith("/uploads/")) return readUpload(url.slice("/uploads/".length));
  try {
    const res = await fetch(url);
    return res.ok ? Buffer.from(await res.arrayBuffer()) : null;
  } catch {
    return null;
  }
}
