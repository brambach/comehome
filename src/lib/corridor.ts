/**
 * A pet's movement corridor as GeoJSON: where it started, every visible
 * sighting in time order, the path joining them, and a buffered hull around
 * the lot. Pure: same input, same output, no I/O. Drawn by CorridorMap and
 * tested in tests/unit/corridor.test.ts.
 */
import buffer from "@turf/buffer";
import convex from "@turf/convex";
import { featureCollection, lineString, point } from "@turf/helpers";
import type { Feature, LineString, MultiPolygon, Point, Polygon } from "geojson";

export type CorridorInput = {
  id: string;
  lat: number;
  lng: number;
  seenAt: Date | string;
  hidden?: boolean;
};

export type CorridorOrigin = { lat: number; lng: number; at: Date | string };

export type CorridorOptions = {
  /** The owner's last-known point. Starts the path. */
  origin?: CorridorOrigin;
  /** Hull padding in kilometres. */
  bufferKm?: number;
};

export type PointProps =
  | { kind: "origin"; seenAt: string; order: number; age: number }
  | { kind: "sighting"; id: string; seenAt: string; order: number; age: number };
export type CorridorFeature =
  | Feature<Point, PointProps>
  | Feature<LineString, { kind: "path" }>
  | Feature<Polygon | MultiPolygon, { kind: "hull" }>;

export type Corridor = {
  type: "FeatureCollection";
  features: CorridorFeature[];
  bbox?: [number, number, number, number];
};

export const DEFAULT_BUFFER_KM = 0.3;

export function corridor(sightings: readonly CorridorInput[], options: CorridorOptions = {}): Corridor {
  const bufferKm = options.bufferKm ?? DEFAULT_BUFFER_KM;

  type Stop = { lng: number; lat: number; t: number; props: Omit<PointProps, "order" | "age"> };
  const stops: Stop[] = sightings
    .filter((s) => !s.hidden)
    .map((s) => {
      const at = new Date(s.seenAt);
      return {
        lng: s.lng,
        lat: s.lat,
        t: at.getTime(),
        props: { kind: "sighting" as const, id: s.id, seenAt: at.toISOString() },
      };
    });
  if (options.origin) {
    const at = new Date(options.origin.at);
    stops.push({
      lng: options.origin.lng,
      lat: options.origin.lat,
      t: at.getTime(),
      props: { kind: "origin", seenAt: at.toISOString() },
    });
  }

  // Time order; ties keep the origin first so the path starts where the owner lost them.
  stops.sort((a, b) => a.t - b.t || (a.props.kind === "origin" ? -1 : b.props.kind === "origin" ? 1 : 0));

  if (stops.length === 0) return { type: "FeatureCollection", features: [] };

  const first = stops[0].t;
  const span = stops[stops.length - 1].t - first;
  const coords = stops.map((s) => [s.lng, s.lat] as [number, number]);

  const points = stops.map((s, order) =>
    point(coords[order], {
      ...s.props,
      order,
      // 0 = oldest, 1 = newest. A single stop is "newest".
      age: span > 0 ? round((s.t - first) / span) : 1,
    } as PointProps),
  );

  const path = stops.length >= 2 ? lineString(coords, { kind: "path" as const }) : null;
  const hull = hullAround(coords, path, bufferKm);

  const features: CorridorFeature[] = [];
  if (hull) features.push(hull);
  if (path) features.push(path);
  features.push(...points);

  return { type: "FeatureCollection", features, bbox: bboxOf(hull ? ringCoords(hull) : coords) };
}

function hullAround(
  coords: [number, number][],
  path: Feature<LineString> | null,
  bufferKm: number,
): Feature<Polygon | MultiPolygon, { kind: "hull" }> | null {
  let shape: Feature<Point | LineString | Polygon> | null = null;
  if (coords.length >= 3) shape = convex(featureCollection(coords.map((c) => point(c))));
  // Fewer than 3 points, or all in a line: buffer the path or the point instead.
  if (!shape) shape = path ?? point(coords[0]);
  const buffered = buffer(shape, bufferKm, { units: "kilometers", steps: 16 });
  if (!buffered) return null;
  return { type: "Feature", geometry: buffered.geometry, properties: { kind: "hull" } };
}

function ringCoords(f: Feature<Polygon | MultiPolygon>): [number, number][] {
  const g = f.geometry;
  const rings = g.type === "Polygon" ? [g.coordinates[0]] : g.coordinates.map((p) => p[0]);
  return rings.flat() as [number, number][];
}

function bboxOf(coords: [number, number][]): [number, number, number, number] {
  let [w, s, e, n] = [Infinity, Infinity, -Infinity, -Infinity];
  for (const [x, y] of coords) {
    w = Math.min(w, x);
    s = Math.min(s, y);
    e = Math.max(e, x);
    n = Math.max(n, y);
  }
  return [w, s, e, n];
}

function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}
