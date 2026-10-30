import { describe, expect, it } from "vitest";
import { destination, distanceM } from "@/lib/geo";
import { compassWord, likelyHeading } from "@/lib/heading";
import { sunTimes } from "@/lib/sun";

const NOW = new Date("2026-10-30T20:00:00Z");
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 3600_000);
const start = { lat: 39.2508, lng: -119.9529 };

/** A walk of `n` legs, `metres` each, on the given bearings, one leg per hour ending `endH` ago. */
function walk(bearings: number[], metres = 400, endH = 1) {
  const stops = [{ ...start, at: hoursAgo(endH + bearings.length) }];
  let here = start;
  bearings.forEach((b, i) => {
    here = destination(here, b, metres);
    stops.push({ ...here, at: hoursAgo(endH + bearings.length - i - 1) });
  });
  return stops;
}

describe("likely heading", () => {
  it("points the way a steady walk is going", () => {
    const h = likelyHeading(walk([90, 92, 88, 90]), NOW)!;
    expect(h).not.toBeNull();
    expect(h.toward).toBe("east");
    expect(Math.abs(h.bearing - 90)).toBeLessThan(3);
    expect(h.agreement).toBeGreaterThan(0.95);
  });

  it("starts the cone at the newest sighting", () => {
    const stops = walk([45, 45, 45]);
    const h = likelyHeading(stops, NOW)!;
    const [apexLng, apexLat] = h.cone.geometry.coordinates[0][0];
    const last = stops.at(-1)!;
    expect(distanceM({ lat: apexLat, lng: apexLng }, last)).toBeLessThan(1);
  });

  it("stays quiet when the sightings don't agree on a direction", () => {
    expect(likelyHeading(walk([0, 180, 0, 180]), NOW)).toBeNull();
    expect(likelyHeading(walk([0, 90, 180, 270]), NOW)).toBeNull();
  });

  it("needs at least two real legs", () => {
    expect(likelyHeading(walk([90]), NOW)).toBeNull();
    // Three reports of the same porch aren't a direction.
    expect(likelyHeading(walk([90, 90], 10), NOW)).toBeNull();
  });

  it("goes away when the trail is two days cold", () => {
    expect(likelyHeading(walk([90, 90, 90], 400, 49), NOW)).toBeNull();
  });

  it("follows a turn: newer legs count more", () => {
    const h = likelyHeading(walk([90, 90, 0, 0]), NOW)!;
    expect(h).not.toBeNull();
    expect(h.bearing).toBeLessThan(45);
  });

  it("keeps its reach between 250 m and 2 km", () => {
    expect(likelyHeading(walk([90, 90, 90], 60), NOW)!.reachM).toBe(250);
    expect(likelyHeading(walk([90, 90, 90], 3000, 10), NOW)!.reachM).toBe(2000);
  });

  it("names all eight directions", () => {
    expect([0, 45, 90, 135, 180, 225, 270, 315, 359].map(compassWord)).toEqual([
      "north", "northeast", "east", "southeast", "south", "southwest", "west", "northwest", "north",
    ]);
  });
});

describe("sun times", () => {
  it("matches the almanac for Incline Village within a few minutes", () => {
    const tz = { timeZone: "America/Los_Angeles", hour: "numeric", minute: "2-digit" } as const;
    const june = sunTimes(39.2508, -119.9529, new Date("2026-06-21T12:00:00Z"))!;
    // NOAA: sunrise 5:33 AM, sunset 8:29 PM PDT.
    expect(june.sunrise.toLocaleTimeString("en-US", tz)).toMatch(/^5:3[0-6] AM$/);
    expect(june.sunset.toLocaleTimeString("en-US", tz)).toMatch(/^8:(2[6-9]|3[0-2]) PM$/);
    const dec = sunTimes(39.2508, -119.9529, new Date("2026-12-21T12:00:00Z"))!;
    expect(dec.sunset.toLocaleTimeString("en-US", tz)).toMatch(/^4:(3[7-9]|4[0-3]) PM$/);
  });
});
