/** Service area: Lake Tahoe basin, Truckee and the surrounding ridges. */
export const SERVICE_BOUNDS = {
  south: 38.65,
  north: 39.65,
  west: -120.6,
  east: -119.75,
} as const;

/** Incline Village, NV (OpenStreetMap place node). Where comehome launches first. */
export const INCLINE_VILLAGE: [number, number] = [-119.9538, 39.2548]; // [lng, lat]
/** Default map view: Incline in the middle, Crystal Bay to Tahoe Vista in frame. */
export const DEFAULT_ZOOM = 11;

/** The north shore: Sand Harbor and Incline Village west through Crystal Bay, Kings Beach and Tahoe Vista. */
const NORTH_SHORE = { south: 39.19, north: 39.32, west: -120.09, east: -119.88 } as const;

export function inServiceArea(lat: number, lng: number): boolean {
  const b = SERVICE_BOUNDS;
  return lat >= b.south && lat <= b.north && lng >= b.west && lng <= b.east;
}

export function onNorthShore(lat: number, lng: number): boolean {
  const b = NORTH_SHORE;
  return lat >= b.south && lat <= b.north && lng >= b.west && lng <= b.east;
}

/** Where a pet page says it is, from the last-seen point. */
export function areaName(lat: number, lng: number): { label: string; prose: string } {
  return onNorthShore(lat, lng)
    ? { label: "Incline Village & North Shore", prose: "Incline Village and the North Shore" }
    : { label: "Tahoe & Truckee", prose: "Tahoe and Truckee" };
}

const EARTH_M = 6_371_008.8;
const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;

export type LatLng = { lat: number; lng: number };

/** Great-circle distance in metres. */
export function distanceM(a: LatLng, b: LatLng): number {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Initial bearing from a to b, degrees clockwise from north, 0 to 360. */
export function bearingDeg(a: LatLng, b: LatLng): number {
  const y = Math.sin(rad(b.lng - a.lng)) * Math.cos(rad(b.lat));
  const x =
    Math.cos(rad(a.lat)) * Math.sin(rad(b.lat)) -
    Math.sin(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.cos(rad(b.lng - a.lng));
  return (deg(Math.atan2(y, x)) + 360) % 360;
}

/** The point `distance` metres from `from` along `bearing`. */
export function destination(from: LatLng, bearing: number, distance: number): LatLng {
  const d = distance / EARTH_M;
  const b = rad(bearing);
  const lat1 = rad(from.lat);
  const lng1 = rad(from.lng);
  const lat2 = Math.asin(Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(b));
  const lng2 = lng1 + Math.atan2(Math.sin(b) * Math.sin(d) * Math.cos(lat1), Math.cos(d) - Math.sin(lat1) * Math.sin(lat2));
  return { lat: deg(lat2), lng: ((deg(lng2) + 540) % 360) - 180 };
}

/** A lat/lng box around a point, for a cheap index scan before the exact distance check. */
export function boxAround(p: LatLng, metres: number) {
  const dLat = deg(metres / EARTH_M);
  const dLng = dLat / Math.max(0.01, Math.cos(rad(p.lat)));
  return { south: p.lat - dLat, north: p.lat + dLat, west: p.lng - dLng, east: p.lng + dLng };
}

/** "0.4 mi", "1.2 mi", "250 ft". US units: it's read by people in Nevada and California. */
export function formatDistance(m: number): string {
  const miles = m / 1609.344;
  if (miles < 0.1) return `${Math.max(50, Math.round((m * 3.28084) / 50) * 50)} ft`;
  return `${miles < 10 ? miles.toFixed(1) : Math.round(miles)} mi`;
}
