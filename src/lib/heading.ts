/**
 * "Likely heading": a cautious cone from the newest sighting, pointing the
 * way the last few sightings have been moving. Pure, like corridor.ts.
 *
 * It only knows direction and pace. It doesn't know about the lake, roads or
 * terrain, so the page labels it as a guess and it stays hidden whenever the
 * sightings don't agree on a direction or the trail has gone cold.
 */
import type { Feature, Polygon } from "geojson";
import { bearingDeg, destination, distanceM, type LatLng } from "@/lib/geo";

export type HeadingStop = LatLng & { at: Date | string };

export type Heading = {
  /** Degrees clockwise from north. */
  bearing: number;
  /** "east", "northeast", ... */
  toward: string;
  /** How far the cone reaches, in metres. */
  reachM: number;
  /** 0 to 1: how much the recent legs agree. */
  agreement: number;
  /** Legs the guess is built from. */
  legs: number;
  cone: Feature<Polygon, { kind: "heading" }>;
};

const MIN_LEG_M = 40;
const MAX_LEGS = 4;
const MIN_AGREEMENT = 0.6;
const STALE_MS = 48 * 3600_000;
const MIN_REACH_M = 600;
const MAX_REACH_M = 2000;

const COMPASS = ["north", "northeast", "east", "southeast", "south", "southwest", "west", "northwest"];

export function compassWord(bearing: number): string {
  return COMPASS[Math.round((((bearing % 360) + 360) % 360) / 45) % 8];
}

export function likelyHeading(stops: readonly HeadingStop[], now: Date = new Date()): Heading | null {
  const ordered = stops
    .map((s) => ({ lat: s.lat, lng: s.lng, t: new Date(s.at).getTime() }))
    .sort((a, b) => a.t - b.t);
  if (ordered.length < 3) return null;
  const last = ordered[ordered.length - 1];
  if (now.getTime() - last.t > STALE_MS) return null;

  // Newest legs first, skipping jitter (two reports of the same spot).
  type Leg = { bearing: number; m: number; ms: number };
  const legs: Leg[] = [];
  for (let i = ordered.length - 1; i > 0 && legs.length < MAX_LEGS; i--) {
    const a = ordered[i - 1];
    const b = ordered[i];
    const m = distanceM(a, b);
    if (m < MIN_LEG_M) continue;
    legs.push({ bearing: bearingDeg(a, b), m, ms: Math.max(60_000, b.t - a.t) });
  }
  if (legs.length < 2) return null;

  // Weighted circular mean: newer legs count more, so a turn shows up fast.
  let x = 0;
  let y = 0;
  let total = 0;
  legs.forEach((leg, i) => {
    const w = 1 / (i + 1);
    const r = (leg.bearing * Math.PI) / 180;
    x += Math.sin(r) * w;
    y += Math.cos(r) * w;
    total += w;
  });
  const agreement = Math.hypot(x, y) / total;
  if (agreement < MIN_AGREEMENT) return null;
  const bearing = ((Math.atan2(x, y) * 180) / Math.PI + 360) % 360;

  // Pace from the same legs, projected over the next few hours: at least 4, or the time since the newest sighting, up to 12.
  const metres = legs.reduce((s, l) => s + l.m, 0);
  const hours = legs.reduce((s, l) => s + l.ms, 0) / 3600_000;
  const elapsedH = Math.min(12, Math.max(4, (now.getTime() - last.t) / 3600_000));
  const reachM = clamp((metres / hours) * elapsedH, MIN_REACH_M, MAX_REACH_M);

  // Less agreement, wider cone: 25 degrees each side at best, 55 at worst.
  const half = 25 + (1 - agreement) * (30 / (1 - MIN_AGREEMENT));
  const ring: [number, number][] = [[last.lng, last.lat]];
  const steps = 12;
  for (let i = 0; i <= steps; i++) {
    const p = destination(last, bearing - half + (2 * half * i) / steps, reachM);
    ring.push([p.lng, p.lat]);
  }
  ring.push([last.lng, last.lat]);

  return {
    bearing: Math.round(bearing),
    toward: compassWord(bearing),
    reachM: Math.round(reachM),
    agreement: Math.round(agreement * 100) / 100,
    legs: legs.length,
    cone: { type: "Feature", geometry: { type: "Polygon", coordinates: [ring] }, properties: { kind: "heading" } },
  };
}

function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n));
}
