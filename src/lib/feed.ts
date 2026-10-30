/**
 * Open pages as a feed, for shelters, vets and rescue groups. comehome gets
 * better by being the one place scattered reports end up, and the feed is how
 * it hands them back out: a shelter can watch it in any feed reader, or paste
 * it into whatever their intake desk already uses.
 */
import { areaName } from "@/lib/geo";
import type { OpenPet } from "@/lib/public";
import { petUrl, siteUrl } from "@/lib/site";
import { formatWhen } from "@/lib/time";

const KIND = { dog: "dog", cat: "cat", other: "pet" } as const;

function absolute(url: string) {
  return url.startsWith("http") ? url : `${siteUrl()}${url}`;
}

export function summary(p: OpenPet): string {
  const where = areaName(p.lastLat, p.lastLng).prose;
  const seen = p.sightingCount
    ? ` ${p.sightingCount} sighting${p.sightingCount === 1 ? "" : "s"} since, latest ${formatWhen(p.latestSeenAt)}.`
    : "";
  return `Lost ${KIND[p.species]} last seen ${formatWhen(p.lastSeenAt)} near ${where}.${seen}`;
}

export function jsonFeed(pets: OpenPet[]) {
  return {
    version: "https://jsonfeed.org/version/1.1",
    title: "comehome: pets missing around Lake Tahoe",
    home_page_url: siteUrl(),
    feed_url: `${siteUrl()}/feed.json`,
    description: "Every open comehome page, newest activity first. Updated live.",
    items: pets.map((p) => ({
      id: p.id,
      url: petUrl(p.slug),
      title: `Lost ${KIND[p.species]}: ${p.name}`,
      content_text: [summary(p), p.description].filter(Boolean).join("\n\n"),
      image: p.photo ? absolute(p.photo.url) : undefined,
      date_published: p.lastSeenAt.toISOString(),
      date_modified: p.latestSeenAt.toISOString(),
      _comehome: {
        species: p.species,
        last_seen: { lat: round(p.lastLat), lng: round(p.lastLng), at: p.lastSeenAt.toISOString() },
        sightings: p.sightingCount,
      },
    })),
  };
}

export function rssFeed(pets: OpenPet[]): string {
  const items = pets
    .map(
      (p) => `
    <item>
      <title>${x(`Lost ${KIND[p.species]}: ${p.name}`)}</title>
      <link>${x(petUrl(p.slug))}</link>
      <guid isPermaLink="false">${p.id}</guid>
      <pubDate>${p.latestSeenAt.toUTCString()}</pubDate>
      <description>${x([summary(p), p.description].filter(Boolean).join(" "))}</description>${
        p.photo ? `\n      <enclosure url="${x(absolute(p.photo.url))}" type="image/jpeg" length="0"/>` : ""
      }
    </item>`,
    )
    .join("");
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>comehome: pets missing around Lake Tahoe</title>
    <link>${x(siteUrl())}</link>
    <description>Every open comehome page, newest activity first.</description>${items}
  </channel>
</rss>
`;
}

// Three decimals is about 100 m: enough to know the neighborhood, not the house.
function round(n: number) {
  return Math.round(n * 1000) / 1000;
}

function x(s: string) {
  return s.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c]!);
}
