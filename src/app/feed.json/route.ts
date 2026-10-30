import { jsonFeed } from "@/lib/feed";
import { getOpenPets } from "@/lib/public";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(jsonFeed(await getOpenPets()), {
    headers: { "content-type": "application/feed+json; charset=utf-8", "cache-control": "public, max-age=60" },
  });
}
