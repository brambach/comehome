/**
 * The map as one ink on paper, in the same language as the flyer: no colored
 * tiles, the lake engraved with hatching, roads as pen lines, labels small.
 * Vector tiles from OpenFreeMap (OpenMapTiles schema), drawn by this style.
 */
import type { Map as MlMap, StyleSpecification } from "maplibre-gl";
import { palette } from "@/lib/palette";

const PAPER = palette.paper;
const INK = palette.ink;
const WATER = "#e9e6dc";

export const ATTRIBUTION =
  '<a href="https://openfreemap.org" target="_blank" rel="noopener">OpenFreeMap</a> <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">© OpenStreetMap</a>';

const width = (stops: [number, number][]) =>
  ["interpolate", ["exponential", 1.5], ["zoom"], ...stops.flat()] as unknown as number;

export function inkStyle(): StyleSpecification {
  return {
    version: 8,
    glyphs: "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf",
    sources: {
      omt: { type: "vector", url: "https://tiles.openfreemap.org/planet", attribution: ATTRIBUTION },
    },
    layers: [
      { id: "paper", type: "background", paint: { "background-color": PAPER } },
      {
        id: "wood",
        type: "fill",
        source: "omt",
        "source-layer": "landcover",
        filter: ["==", ["get", "class"], "wood"],
        paint: { "fill-pattern": "ink-stipple", "fill-opacity": 0.55 },
      },
      {
        id: "park",
        type: "fill",
        source: "omt",
        "source-layer": "park",
        paint: { "fill-color": INK, "fill-opacity": 0.025 },
      },
      {
        id: "water",
        type: "fill",
        source: "omt",
        "source-layer": "water",
        paint: { "fill-color": WATER },
      },
      {
        id: "water-hatch",
        type: "fill",
        source: "omt",
        "source-layer": "water",
        paint: { "fill-pattern": "ink-hatch", "fill-opacity": 0.9 },
      },
      {
        id: "shore",
        type: "line",
        source: "omt",
        "source-layer": "water",
        paint: { "line-color": INK, "line-opacity": 0.55, "line-width": width([[10, 0.6], [16, 1.4]]) },
      },
      {
        id: "waterway",
        type: "line",
        source: "omt",
        "source-layer": "waterway",
        paint: { "line-color": INK, "line-opacity": 0.4, "line-width": width([[11, 0.5], [17, 2]]) },
      },
      {
        id: "building",
        type: "fill",
        source: "omt",
        "source-layer": "building",
        minzoom: 14,
        paint: { "fill-color": INK, "fill-opacity": 0.07, "fill-outline-color": "rgba(43,39,34,0.25)" },
      },
      {
        id: "path",
        type: "line",
        source: "omt",
        "source-layer": "transportation",
        minzoom: 13,
        filter: ["in", ["get", "class"], ["literal", ["path", "track"]]],
        paint: { "line-color": INK, "line-opacity": 0.45, "line-width": 0.9, "line-dasharray": [2, 2.5] },
      },
      {
        id: "road-minor",
        type: "line",
        source: "omt",
        "source-layer": "transportation",
        filter: ["in", ["get", "class"], ["literal", ["minor", "service"]]],
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": INK, "line-opacity": 0.5, "line-width": width([[12, 0.3], [15, 1], [18, 3]]) },
      },
      {
        id: "road-major-casing",
        type: "line",
        source: "omt",
        "source-layer": "transportation",
        filter: ["in", ["get", "class"], ["literal", ["motorway", "trunk", "primary", "secondary", "tertiary"]]],
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": INK, "line-opacity": 0.75, "line-width": width([[9, 0.8], [13, 3], [17, 9]]) },
      },
      {
        id: "road-major",
        type: "line",
        source: "omt",
        "source-layer": "transportation",
        filter: ["in", ["get", "class"], ["literal", ["motorway", "trunk", "primary", "secondary", "tertiary"]]],
        layout: { "line-cap": "round", "line-join": "round" },
        // Paper inside an ink casing: the double line of an engraved map.
        paint: { "line-color": PAPER, "line-width": width([[9, 0], [13, 1.4], [17, 6.5]]) },
      },
      {
        id: "road-label",
        type: "symbol",
        source: "omt",
        "source-layer": "transportation_name",
        minzoom: 14,
        layout: {
          "symbol-placement": "line",
          "text-field": ["get", "name"],
          "text-font": ["Noto Sans Regular"],
          "text-size": 11,
        },
        paint: { "text-color": INK, "text-opacity": 0.7, "text-halo-color": PAPER, "text-halo-width": 1.6 },
      },
      {
        id: "water-label",
        type: "symbol",
        source: "omt",
        "source-layer": "water_name",
        layout: {
          "text-field": ["get", "name"],
          "text-font": ["Noto Sans Italic"],
          "text-size": 13,
          "text-letter-spacing": 0.2,
        },
        paint: { "text-color": INK, "text-opacity": 0.6, "text-halo-color": WATER, "text-halo-width": 1.5 },
      },
      {
        id: "place-label",
        type: "symbol",
        source: "omt",
        "source-layer": "place",
        filter: ["in", ["get", "class"], ["literal", ["town", "village", "suburb", "neighbourhood", "hamlet"]]],
        layout: {
          "text-field": ["get", "name"],
          "text-font": ["Noto Sans Regular"],
          "text-size": ["match", ["get", "class"], ["town", "village"], 13, 11],
          "text-transform": "uppercase",
          "text-letter-spacing": 0.12,
        },
        paint: { "text-color": INK, "text-opacity": 0.75, "text-halo-color": PAPER, "text-halo-width": 2 },
      },
    ],
  };
}

/**
 * The engraving textures: diagonal hatching for water, a sparse stipple for
 * woods. Drawn once on a canvas and handed to MapLibre when the style asks.
 */
export function addInkPatterns(map: MlMap) {
  map.on("styleimagemissing", (e) => {
    if (map.hasImage(e.id)) return;
    const img = e.id === "ink-hatch" ? hatch() : e.id === "ink-stipple" ? stipple() : null;
    if (img) map.addImage(e.id, img, { pixelRatio: 2 });
  });
}

function canvas(size: number) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  return [c, c.getContext("2d")!] as const;
}

function hatch() {
  const size = 16;
  const [, g] = canvas(size);
  g.strokeStyle = INK;
  g.globalAlpha = 0.22;
  g.lineWidth = 1.1;
  g.lineCap = "square";
  // Two strokes so the lines join across tile edges.
  for (const o of [0, size]) {
    g.beginPath();
    g.moveTo(o - size, size);
    g.lineTo(o, 0);
    g.stroke();
  }
  return g.getImageData(0, 0, size, size);
}

function stipple() {
  const size = 24;
  const [, g] = canvas(size);
  g.fillStyle = INK;
  g.globalAlpha = 0.28;
  for (const [x, y, r] of [
    [4, 5, 0.9],
    [15, 3, 0.7],
    [10, 13, 1],
    [21, 16, 0.8],
    [5, 20, 0.7],
    [17, 22, 0.6],
  ]) {
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  }
  return g.getImageData(0, 0, size, size);
}
