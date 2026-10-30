import { readUpload } from "@/lib/storage/disk";
import { readMemoryUpload } from "@/lib/storage/memory";

export const runtime = "nodejs";

/** Serves dev uploads from disk, and demo uploads from memory. In production images live on Vercel Blob. */
export async function GET(_req: Request, ctx: RouteContext<"/uploads/[...key]">) {
  if (process.env.STORAGE_DRIVER === "blob") return new Response("Not found", { status: 404 });
  const { key } = await ctx.params;
  const data =
    process.env.STORAGE_DRIVER === "memory"
      ? readMemoryUpload(key.join("/"))
      : await readUpload(key.join("/")).catch(() => null);
  if (!data) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(data), {
    headers: {
      "content-type": "image/jpeg",
      "cache-control": "public, max-age=31536000, immutable",
    },
  });
}
