// MapLibre loads on demand so pages without a map never pay for it.
export const STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";

export async function loadMapLibre() {
  const maplibregl = await import("maplibre-gl");
  // The worker is copied to public/ on install (scripts/copy-maplibre-worker.mjs).
  maplibregl.setWorkerUrl(`/vendor/maplibre-gl-worker.mjs?v=${maplibregl.getVersion()}`);
  return maplibregl;
}
