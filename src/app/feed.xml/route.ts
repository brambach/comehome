import { rssFeed } from "@/lib/feed";
import { getOpenPets } from "@/lib/public";

export const dynamic = "force-dynamic";

export async function GET() {
  return new Response(rssFeed(await getOpenPets()), {
    headers: { "content-type": "application/rss+xml; charset=utf-8", "cache-control": "public, max-age=60" },
  });
}
