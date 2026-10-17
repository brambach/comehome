/** Service area: Lake Tahoe basin, Truckee and the surrounding ridges. */
export const SERVICE_BOUNDS = {
  south: 38.65,
  north: 39.65,
  west: -120.6,
  east: -119.75,
} as const;

export const TAHOE_CENTER: [number, number] = [-120.1, 39.2]; // [lng, lat]

export function inServiceArea(lat: number, lng: number): boolean {
  const b = SERVICE_BOUNDS;
  return lat >= b.south && lat <= b.north && lng >= b.west && lng <= b.east;
}
