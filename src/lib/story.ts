/**
 * The facts a pet page states about a search, computed once on the server:
 * how long, how many sightings, how far. Pure, so the found story and the
 * owner's page say the same thing.
 */
import { distanceM, formatDistance, type LatLng } from "@/lib/geo";

export function trailLengthM(points: readonly LatLng[]): number {
  let m = 0;
  for (let i = 1; i < points.length; i++) m += distanceM(points[i - 1], points[i]);
  return m;
}

/** "51 days", "28 hours", "40 minutes". */
export function duration(ms: number): string {
  const mins = Math.max(1, Math.round(ms / 60_000));
  if (mins < 90) return `${mins} minute${mins === 1 ? "" : "s"}`;
  const hours = Math.round(mins / 60);
  if (hours < 48) return `${hours} hours`;
  const days = Math.round(hours / 24);
  return `${days} days`;
}

/** "Missing 51 days. 8 sightings, across 2.4 mi." */
export function foundStory(input: { lostAt: Date; foundAt: Date; sightings: number; trail: readonly LatLng[] }): string {
  const parts = [`Missing ${duration(input.foundAt.getTime() - input.lostAt.getTime())}.`];
  if (input.sightings > 0) {
    const across = input.trail.length > 1 ? `, across ${formatDistance(trailLengthM(input.trail))}` : "";
    parts.push(`${input.sightings} sighting${input.sightings === 1 ? "" : "s"} from neighbors${across}.`);
  }
  return parts.join(" ");
}
