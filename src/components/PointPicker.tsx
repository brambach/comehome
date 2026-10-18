"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import type { Map as MlMap, Marker } from "maplibre-gl";
import { useEffect, useRef, useState } from "react";
import { DEFAULT_ZOOM, INCLINE_VILLAGE, SERVICE_BOUNDS } from "@/lib/geo";
import { loadMapLibre, STYLE_URL } from "./maplibre";
import styles from "./PointPicker.module.css";

type Point = { lat: number; lng: number };

/**
 * Tap the map or use your location. Writes hidden lat/lng inputs so the
 * surrounding form posts them like any other field.
 */
export function PointPicker({
  label,
  hint,
  error,
  centerLat,
  centerLng,
}: {
  label: string;
  hint?: string;
  error?: string;
  centerLat?: number;
  centerLng?: number;
}) {
  const box = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MlMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const [point, setPoint] = useState<Point | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "failed">("loading");
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  useEffect(() => {
    const hasCenter = centerLat !== undefined && centerLng !== undefined;
    let cancelled = false;
    let map: MlMap | null = null;
    loadMapLibre()
      .then((maplibregl) => {
        if (cancelled || !box.current) return;
        const m = new maplibregl.Map({
          container: box.current,
          style: STYLE_URL,
          center: hasCenter ? [centerLng!, centerLat!] : INCLINE_VILLAGE,
          zoom: hasCenter ? 13 : DEFAULT_ZOOM,
          maxBounds: [
            [SERVICE_BOUNDS.west - 0.3, SERVICE_BOUNDS.south - 0.3],
            [SERVICE_BOUNDS.east + 0.3, SERVICE_BOUNDS.north + 0.3],
          ],
          attributionControl: { compact: true },
          cooperativeGestures: false,
        });
        map = m;
        m.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
        // MapLibre positions the marker element with transform, so the shape lives in a child.
        const el = document.createElement("div");
        const shape = document.createElement("div");
        shape.className = styles.pin;
        el.appendChild(shape);
        markerRef.current = new maplibregl.Marker({ element: el, anchor: "bottom" });
        m.on("click", (e) => setPoint({ lat: e.lngLat.lat, lng: e.lngLat.lng }));
        m.on("load", () => setStatus("ready"));
        m.on("error", () => setStatus((s) => (s === "ready" ? s : "failed")));
        mapRef.current = m;
        // The canvas is usable for taps even if tiles are slow.
        setStatus((s) => (s === "loading" ? "ready" : s));
      })
      .catch(() => setStatus("failed"));
    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [centerLat, centerLng]);

  useEffect(() => {
    const map = mapRef.current;
    const marker = markerRef.current;
    if (!map || !marker || !point) return;
    marker.setLngLat([point.lng, point.lat]).addTo(map);
  }, [point]);

  function useMyLocation() {
    if (!("geolocation" in navigator)) {
      setGeoError("This browser can't share location. Tap the map instead.");
      return;
    }
    setLocating(true);
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setPoint(p);
        setLocating(false);
        mapRef.current?.flyTo({ center: [p.lng, p.lat], zoom: 15, duration: 600 });
      },
      () => {
        setLocating(false);
        setGeoError("Couldn't get your location. Tap the map instead.");
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 60_000 },
    );
  }

  return (
    <fieldset className="field">
      <legend>{label}</legend>
      {hint ? <p className="hint">{hint}</p> : null}
      <div className={styles.frame}>
        <div
          ref={box}
          className={styles.map}
          data-testid="point-picker-map"
          role="application"
          aria-label="Map. Tap to drop a pin."
        />
        {status === "failed" ? (
          <p className={styles.fallback}>The map didn&apos;t load. Use your location instead.</p>
        ) : null}
      </div>
      <div className={styles.row}>
        <button type="button" className="btn btn-quiet" onClick={useMyLocation} disabled={locating}>
          {locating ? "Finding you…" : "Use my location"}
        </button>
        <p className={`${styles.status} num`} aria-live="polite" data-testid="point-status">
          {point
            ? `Pin at ${point.lat.toFixed(4)}, ${point.lng.toFixed(4)}`
            : "Tap the map where it happened."}
        </p>
      </div>
      {geoError ? <p className="field-error">{geoError}</p> : null}
      {error ? <p className="field-error">{error}</p> : null}
      <input type="hidden" name="lat" value={point?.lat ?? ""} />
      <input type="hidden" name="lng" value={point?.lng ?? ""} />
    </fieldset>
  );
}
