import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import { describe, expect, it } from "vitest";
import { corridor, type CorridorInput } from "@/lib/corridor";

const T0 = new Date("2026-10-12T16:00:00Z").getTime();
const at = (minutes: number) => new Date(T0 + minutes * 60_000);

// A dog drifting from Donner Lake toward downtown Truckee over a day.
const route: CorridorInput[] = [
  { id: "a", lat: 39.3226, lng: -120.2667, seenAt: at(30) },
  { id: "b", lat: 39.3241, lng: -120.2551, seenAt: at(95) },
  { id: "c", lat: 39.3262, lng: -120.2432, seenAt: at(180) },
  { id: "d", lat: 39.3289, lng: -120.2315, seenAt: at(300) },
  { id: "e", lat: 39.3301, lng: -120.2201, seenAt: at(420) },
  { id: "f", lat: 39.3277, lng: -120.2098, seenAt: at(610) },
  { id: "g", lat: 39.3294, lng: -120.1987, seenAt: at(800) },
  { id: "h", lat: 39.3279, lng: -120.1863, seenAt: at(1100) },
];

const kinds = (c: ReturnType<typeof corridor>) => c.features.map((f) => f.properties.kind);
const pathOf = (c: ReturnType<typeof corridor>) =>
  c.features.find((f) => f.properties.kind === "path")?.geometry as { coordinates: number[][] } | undefined;
const hullOf = (c: ReturnType<typeof corridor>) => c.features.find((f) => f.properties.kind === "hull");
const sightingIds = (c: ReturnType<typeof corridor>) =>
  c.features.flatMap((f) => (f.properties.kind === "sighting" ? [f.properties.id] : []));

function contains(c: ReturnType<typeof corridor>, lng: number, lat: number) {
  const hull = hullOf(c);
  if (!hull) return false;
  return booleanPointInPolygon([lng, lat], hull as Parameters<typeof booleanPointInPolygon>[1]);
}

describe("corridor", () => {
  it("0 points: empty collection", () => {
    const c = corridor([]);
    expect(c.type).toBe("FeatureCollection");
    expect(c.features).toEqual([]);
    expect(c.bbox).toBeUndefined();
  });

  it("1 point: the point and a circle around it, no path", () => {
    const c = corridor([route[0]]);
    expect(kinds(c)).toEqual(["hull", "sighting"]);
    expect(contains(c, route[0].lng, route[0].lat)).toBe(true);
    // ~300 m buffer: a point 1 km away is outside.
    expect(contains(c, route[0].lng + 0.012, route[0].lat)).toBe(false);
    const p = c.features[1];
    expect(p.properties).toMatchObject({ kind: "sighting", order: 0, age: 1 });
  });

  it("2 points: a path between them inside a buffered line", () => {
    const c = corridor([route[0], route[1]]);
    expect(kinds(c)).toEqual(["hull", "path", "sighting", "sighting"]);
    expect(pathOf(c)?.coordinates).toEqual([
      [route[0].lng, route[0].lat],
      [route[1].lng, route[1].lat],
    ]);
    expect(contains(c, route[0].lng, route[0].lat)).toBe(true);
    expect(contains(c, route[1].lng, route[1].lat)).toBe(true);
    // the midpoint is covered too: it's a corridor, not two blobs
    expect(contains(c, (route[0].lng + route[1].lng) / 2, (route[0].lat + route[1].lat) / 2)).toBe(true);
  });

  it("8 points: time-ordered path, hull around all, older points fade", () => {
    const c = corridor(route);
    expect(pathOf(c)?.coordinates).toHaveLength(8);
    expect(sightingIds(c)).toEqual(["a", "b", "c", "d", "e", "f", "g", "h"]);
    for (const s of route) expect(contains(c, s.lng, s.lat)).toBe(true);

    const ages = c.features.flatMap((f) => (f.properties.kind === "sighting" ? [f.properties.age] : []));
    expect(ages[0]).toBe(0);
    expect(ages.at(-1)).toBe(1);
    expect([...ages].sort((x, y) => x - y)).toEqual(ages);

    const [w, s, e, n] = c.bbox!;
    expect(w).toBeLessThan(-120.2667);
    expect(e).toBeGreaterThan(-120.1863);
    expect(s).toBeLessThan(39.3226);
    expect(n).toBeGreaterThan(39.3301);
  });

  it("orders by sighting time, not by input order", () => {
    const shuffled = [route[5], route[0], route[7], route[2], route[1], route[6], route[3], route[4]];
    const c = corridor(shuffled);
    expect(sightingIds(c)).toEqual(["a", "b", "c", "d", "e", "f", "g", "h"]);
    expect(pathOf(c)?.coordinates[0]).toEqual([route[0].lng, route[0].lat]);
    expect(pathOf(c)?.coordinates[7]).toEqual([route[7].lng, route[7].lat]);
    expect(corridor(shuffled)).toEqual(corridor(route)); // same shape either way
  });

  it("accepts ISO strings for times", () => {
    const c = corridor(route.map((s) => ({ ...s, seenAt: (s.seenAt as Date).toISOString() })));
    expect(sightingIds(c)).toEqual(["a", "b", "c", "d", "e", "f", "g", "h"]);
  });

  it("drops hidden reports from points, path and hull", () => {
    const prank = { id: "x", lat: 39.25, lng: -120.05, seenAt: at(500), hidden: true };
    const c = corridor([...route, prank]);
    expect(sightingIds(c)).not.toContain("x");
    expect(pathOf(c)?.coordinates).toHaveLength(8);
    expect(contains(c, prank.lng, prank.lat)).toBe(false);
    expect(corridor([prank]).features).toEqual([]);
  });

  it("starts the path at the owner's last-known point", () => {
    const origin = { lat: 39.3201, lng: -120.2801, at: at(0) };
    const c = corridor(route.slice(0, 2), { origin });
    expect(c.features.filter((f) => f.properties.kind === "origin")).toHaveLength(1);
    expect(pathOf(c)?.coordinates[0]).toEqual([origin.lng, origin.lat]);
    expect(contains(c, origin.lng, origin.lat)).toBe(true);
  });

  it("handles points in a straight line (no convex hull)", () => {
    const line = [0, 1, 2].map((i) => ({ id: `l${i}`, lat: 39.3, lng: -120.2 + i * 0.01, seenAt: at(i * 10) }));
    const c = corridor(line);
    expect(hullOf(c)).toBeDefined();
    for (const s of line) expect(contains(c, s.lng, s.lat)).toBe(true);
  });

  it("doesn't mutate its input", () => {
    const input = [route[3], route[1]];
    const copy = structuredClone(input);
    corridor(input);
    expect(input).toEqual(copy);
  });
});
