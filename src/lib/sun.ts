/**
 * Sunrise and sunset for a point and day (NOAA's simplified solar position
 * equations, good to a minute or two). Scared pets move most at dawn and
 * dusk, so the page tells a tired owner when to be out.
 */
const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;

export type SunTimes = { sunrise: Date; sunset: Date };

export function sunTimes(lat: number, lng: number, day: Date = new Date()): SunTimes | null {
  // Julian day at local solar noon for the given UTC calendar day.
  const start = Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate());
  const jd = start / 86_400_000 + 2440587.5;
  const n = Math.round(jd - 2451545.0 + 0.0008); // days since J2000
  const jStar = n - lng / 360;
  const m = (357.5291 + 0.98560028 * jStar) % 360;
  const c = 1.9148 * Math.sin(rad(m)) + 0.02 * Math.sin(rad(2 * m)) + 0.0003 * Math.sin(rad(3 * m));
  const lambda = (m + c + 180 + 102.9372) % 360;
  const transit = 2451545.0 + jStar + 0.0053 * Math.sin(rad(m)) - 0.0069 * Math.sin(rad(2 * lambda));
  const sinDec = Math.sin(rad(lambda)) * Math.sin(rad(23.4397));
  const cosDec = Math.cos(Math.asin(sinDec));
  const cosW = (Math.sin(rad(-0.833)) - Math.sin(rad(lat)) * sinDec) / (Math.cos(rad(lat)) * cosDec);
  if (cosW < -1 || cosW > 1) return null; // polar day or night
  const w = deg(Math.acos(cosW));
  const toDate = (j: number) => new Date((j - 2440587.5) * 86_400_000);
  return { sunrise: toDate(transit - w / 360), sunset: toDate(transit + w / 360) };
}
