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
