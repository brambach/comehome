"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef, useState } from "react";
import type { Corridor } from "@/lib/corridor";
import { loadMapLibre, STYLE_URL } from "./maplibre";
import styles from "./PetMap.module.css";

// Pine, from the design tokens. Maps can't read CSS variables.
const PINE = "#22382b";

/** The public corridor map. The page renders the same data as text, so this is an enhancement. */
export function PetMap({ data, label }: { data: Corridor; label: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"loading" | "ready" | "failed">("loading");

  useEffect(() => {
    let cancelled = false;
    let remove: (() => void) | undefined;
    loadMapLibre()
      .then((maplibregl) => {
        if (cancelled || !box.current || !data.bbox) return;
        const map = new maplibregl.Map({
          container: box.current,
          style: STYLE_URL,
          bounds: data.bbox,
          fitBoundsOptions: { padding: 36, maxZoom: 14 },
          attributionControl: { compact: true },
          cooperativeGestures: true,
        });
        remove = () => map.remove();
        map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
        map.on("error", () => setState((s) => (s === "ready" ? s : "failed")));
        map.on("load", () => {
          map.addSource("corridor", { type: "geojson", data });
          map.addLayer({
            id: "hull",
            type: "fill",
            source: "corridor",
            filter: ["==", ["get", "kind"], "hull"],
            paint: { "fill-color": PINE, "fill-opacity": 0.12 },
          });
          map.addLayer({
            id: "hull-edge",
            type: "line",
            source: "corridor",
            filter: ["==", ["get", "kind"], "hull"],
            paint: { "line-color": PINE, "line-opacity": 0.45, "line-width": 1.5, "line-dasharray": [2, 2] },
          });
          map.addLayer({
            id: "path",
            type: "line",
            source: "corridor",
            filter: ["==", ["get", "kind"], "path"],
            layout: { "line-cap": "round", "line-join": "round" },
            paint: { "line-color": PINE, "line-width": 3, "line-opacity": 0.75 },
          });
          map.addLayer({
            id: "sightings",
            type: "circle",
            source: "corridor",
            filter: ["==", ["get", "kind"], "sighting"],
            paint: {
              "circle-color": PINE,
              "circle-radius": ["interpolate", ["linear"], ["get", "age"], 0, 5, 1, 9],
              "circle-opacity": ["interpolate", ["linear"], ["get", "age"], 0, 0.3, 1, 1],
              "circle-stroke-color": "#ffffff",
              "circle-stroke-width": 2,
              "circle-stroke-opacity": ["interpolate", ["linear"], ["get", "age"], 0, 0.4, 1, 1],
            },
          });
          map.addLayer({
            id: "origin",
            type: "circle",
            source: "corridor",
            filter: ["==", ["get", "kind"], "origin"],
            paint: {
              "circle-color": "#ffffff",
              "circle-radius": 7,
              "circle-stroke-color": PINE,
              "circle-stroke-width": 3,
            },
          });
          setState("ready");
        });
      })
      .catch(() => setState("failed"));
    return () => {
      cancelled = true;
      remove?.();
    };
  }, [data]);

  return (
    <figure className={styles.frame}>
      <div
        ref={box}
        className={styles.map}
        role="img"
        aria-label={label}
        data-testid="pet-map"
        data-state={state}
      />
      {state === "failed" ? (
        <p className={styles.fallback}>The map didn&apos;t load. The sightings are listed below.</p>
      ) : null}
      <figcaption className={styles.legend}>
        <span>
          <i className={styles.origin} /> Last seen by owner
        </span>
        <span>
          <i className={styles.dot} /> Sightings, older ones fade
        </span>
        <span>
          <i className={styles.area} /> Where they&apos;ve been moving
        </span>
      </figcaption>
    </figure>
  );
}
