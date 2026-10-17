// MapLibre loads on demand so pages without a map never pay for it.
export const STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";

export async function loadMapLibre() {
  return import("maplibre-gl");
}
