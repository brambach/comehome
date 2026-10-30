"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import type { Map as MlMap } from "maplibre-gl";
import { useEffect, useRef, useState } from "react";
import { addInkPatterns, inkStyle } from "./inkStyle";
import { loadMapLibre } from "./maplibre";
import styles from "./CorridorMap.module.css";

export type Stop = {
  id: string;
  kind: "origin" | "sighting";
  lat: number;
  lng: number;
  /** ms since epoch */
  t: number;
};

type Ring = [number, number][];

type Props = {
  slug: string;
  label: string;
  stops: Stop[];
  hull: Ring | null;
  cone: Ring | null;
  found: boolean;
  /** A sighting this visitor just sent: its pin drops in and the trail extends to it. */
  fresh?: string;
  /** Short labels at the two ends of the trail, e.g. "Lost here" and "40 min ago". */
  startLabel: string;
  endLabel: string;
};

type Project = (lng: number, lat: number) => [number, number];

const REDUCED = () => typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
const EASE_MOVE = [0.45, 0, 0.55, 1] as const;
const EASE_OUT = "cubic-bezier(.2,.7,.2,1)";
const EASE_SIGNATURE = "cubic-bezier(.34,1.5,.64,1)";

/**
 * The trail, drawn in ink over the engraved map. The pen draws the route once
 * when it scrolls into view; on a return visit only what's new draws in. A
 * pin you just sent drops in and the route extends to it. When the pet is
 * home, one stroke closes the route. Everything else holds still.
 *
 * The overlay is plain SVG projected through MapLibre, so it keeps working
 * (on blank paper) if the map tiles never arrive.
 */
export function CorridorMap(props: Props) {
  const { stops, cone, slug } = props;
  const frame = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const [near, setNear] = useState(false);
  const [tiles, setTiles] = useState<"loading" | "ready" | "failed">("loading");
  const [newCount, setNewCount] = useState(0);

  // MapLibre is about 1 MB. Fetch it only as the map nears the viewport.
  useEffect(() => {
    const el = frame.current;
    if (!el) return;
    const io = new IntersectionObserver((e) => e.some((x) => x.isIntersecting) && setNear(true), {
      rootMargin: "300px 0px",
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!near || !box.current || !svg.current || !stops.length) return;
    const container = box.current;
    const overlay = svg.current;
    let map: MlMap | null = null;
    let project: Project = fallbackProjection(container, stops, cone);
    let cancelled = false;
    let raf = 0;

    const redraw = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => draw(overlay, project, props));
    };
    redraw();
    const ro = new ResizeObserver(() => {
      if (!map) project = fallbackProjection(container, stops, cone);
      redraw();
    });
    ro.observe(container);

    // Play once the trail is on screen and the map has settled (or given up), so
    // the pen never draws on blank paper and then jumps when the streets arrive.
    let played = false;
    let visible = false;
    let settled = false;
    const tryPlay = () => {
      if (played || !visible || !settled) return;
      played = true;
      draw(overlay, project, props);
      setNewCount(play(overlay, props));
    };
    const settle = () => {
      settled = true;
      tryPlay();
    };
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        visible = true;
        io.disconnect();
        tryPlay();
      },
      { threshold: 0.45 },
    );
    io.observe(container);
    const giveUp = setTimeout(settle, 2500);

    const bounds = boundsOf(stops, cone);
    loadMapLibre()
      .then((maplibregl) => {
        if (cancelled) return;
        map = new maplibregl.Map({
          container,
          style: inkStyle(),
          bounds,
          fitBoundsOptions: { padding: 56, maxZoom: 15.5 },
          attributionControl: { compact: true },
          cooperativeGestures: true,
          fadeDuration: 0,
        });
        addInkPatterns(map);
        map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
        const m = map;
        project = (lng, lat) => {
          const p = m.project([lng, lat]);
          return [p.x, p.y];
        };
        m.on("move", redraw);
        m.on("resize", redraw);
        m.on("load", () => {
          setTiles("ready");
          redraw();
          settle();
        });
        // Tiles or fonts blocked: keep the ink trail on bare paper and say so.
        m.on("error", () => {
          setTiles((s) => (s === "ready" ? s : "failed"));
          settle();
        });
        redraw();
      })
      .catch(() => {
        setTiles("failed");
        settle();
      });

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      clearTimeout(giveUp);
      ro.disconnect();
      io.disconnect();
      map?.remove();
    };
    // Props are fixed for the life of the page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [near]);

  // Mark list rows the map just drew as new, so the list and the map agree.
  useEffect(() => {
    if (!newCount) return;
    const since = Number(sessionMark(slug) ?? 0);
    document.querySelectorAll<HTMLElement>("[data-sighting-t]").forEach((el) => {
      if (Number(el.dataset.sightingT) > since) el.dataset.new = "1";
    });
  }, [newCount, slug]);

  return (
    <figure className={styles.frame} ref={frame}>
      <div className={styles.paper} data-tiles={tiles}>
        <div
          ref={box}
          className={styles.map}
          role="img"
          aria-label={props.label}
          data-testid="pet-map"
          data-state={tiles}
        />
        <svg ref={svg} className={styles.ink} aria-hidden="true" data-testid="trail">
          <defs>
            <pattern id="cone-hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(-35)">
              <line x1="0" y1="0" x2="0" y2="7" className={styles.hatchLine} />
            </pattern>
          </defs>
          <path data-part="hull" className={styles.hull} />
          <path data-part="cone" className={styles.cone} />
          <path data-part="trail" className={styles.trail} pathLength={1} />
          <path data-part="close" className={styles.close} pathLength={1} />
          <g data-part="stops" />
          <g data-part="labels" className={styles.labels} />
        </svg>
        {tiles === "failed" ? (
          <p className={styles.note}>The street map didn&apos;t load, so here&apos;s the trail on its own.</p>
        ) : null}
      </div>
      {newCount > 0 ? (
        <p className={styles.newNote} role="status">
          <span className={styles.newMark} aria-hidden="true" />
          {newCount === 1 ? "1 new sighting" : `${newCount} new sightings`} since you last looked
        </p>
      ) : null}
    </figure>
  );
}

/* ---------- drawing ---------- */

function draw(svg: SVGSVGElement, project: Project, props: Props) {
  const { stops, hull, cone } = props;
  const pts = stops.map((s) => project(s.lng, s.lat));
  part(svg, "trail").setAttribute("d", smoothPath(pts));
  part(svg, "hull").setAttribute("d", hull ? ringPath(hull.map(([x, y]) => project(x, y))) : "");
  part(svg, "cone").setAttribute("d", cone ? ringPath(cone.map(([x, y]) => project(x, y))) : "");
  const last = pts.at(-1)!;
  part(svg, "close").setAttribute("d", props.found && pts.length > 1 ? closingPath(last, pts[0]) : "");

  const g = part(svg, "stops");
  if (g.childElementCount !== stops.length) {
    g.replaceChildren(
      ...stops.map((s, i) => {
        const node = el("g", { "data-id": s.id, "data-i": String(i) });
        const mark = el("g", { "data-mark": "" });
        const newest = i === stops.length - 1 && s.kind === "sighting";
        if (s.kind === "origin") {
          mark.append(el("circle", { r: "7.5", "data-role": "origin" }));
          mark.append(el("circle", { r: "2.6", "data-role": "origin-dot" }));
        } else {
          if (newest) mark.append(el("circle", { r: "12", "data-role": "halo" }));
          mark.append(el("circle", { r: newest ? "6.5" : "4.5", "data-role": newest ? "newest" : "stop" }));
        }
        node.append(mark);
        return node;
      }),
    );
  }
  Array.from(g.children).forEach((node, i) => {
    node.setAttribute("transform", `translate(${pts[i][0].toFixed(1)} ${pts[i][1].toFixed(1)})`);
  });

  const labels = part(svg, "labels");
  if (!labels.childElementCount) {
    const a = el("text", { "data-at": "start" });
    a.textContent = props.found ? "Home" : props.startLabel;
    labels.append(a);
    if (stops.length > 1) {
      const b = el("text", { "data-at": "end" });
      b.textContent = props.endLabel;
      labels.append(b);
    }
  }
  const [startEl, endEl] = Array.from(labels.children) as SVGTextElement[];
  const width = svg.clientWidth || 600;
  placeLabel(startEl, pts[0], width);
  if (endEl) placeLabel(endEl, last, width);
}

/**
 * Labels sit above their point (below it near the top edge), centered and
 * kept inside the frame, so the trail and the heading cone stay clear.
 */
function placeLabel(t: SVGTextElement, at: [number, number], width: number) {
  let w = 0;
  try {
    w = t.getComputedTextLength();
  } catch {}
  const half = w / 2 + 8;
  const x = Math.min(Math.max(at[0], half), Math.max(half, width - half));
  const y = at[1] < 40 ? at[1] + 24 : at[1] - 16;
  t.setAttribute("x", x.toFixed(1));
  t.setAttribute("y", y.toFixed(1));
  t.setAttribute("text-anchor", "middle");
}

/* ---------- motion ---------- */

/** Plays the arrival. Returns how many sightings are new since this visitor last looked. */
function play(svg: SVGSVGElement, props: Props): number {
  const { stops, slug, fresh, found } = props;
  const trail = part(svg, "trail") as SVGPathElement;
  const close = part(svg, "close") as SVGPathElement;
  const cone = part(svg, "cone");
  const nodes = Array.from(part(svg, "stops").children) as SVGGElement[];
  const labels = Array.from(part(svg, "labels").children) as SVGElement[];
  const latest = stops.at(-1)!.t;
  const seenUntil = Number(readMark(slug) ?? 0);
  writeMark(slug, latest);

  // Where the pen starts: the last stop this visitor has already seen.
  const freshIndex = fresh ? stops.findIndex((s) => s.id === fresh) : -1;
  let from = 0;
  if (freshIndex > 0) from = freshIndex - 1;
  else if (seenUntil) from = Math.max(0, stops.findLastIndex((s) => s.t <= seenUntil));
  const newCount = seenUntil && freshIndex < 0 ? stops.filter((s) => s.t > seenUntil && s.kind === "sighting").length : 0;
  if (seenUntil && freshIndex < 0) sessionMarkSet(slug, seenUntil);

  const fractions = cumulative(nodes.map((n) => translateOf(n)));
  const startF = fractions[from] ?? 0;

  svg.dataset.played = "1";
  if (REDUCED() || (from === stops.length - 1 && !found)) {
    // Nothing new to draw, or the visitor asked for no motion: show the finished drawing.
    showAll(trail, close, nodes, labels, cone, found);
    return newCount;
  }

  // Hide what the pen hasn't reached yet.
  trail.style.strokeDasharray = "1 1";
  trail.style.strokeDashoffset = String(1 - startF);
  cone.style.opacity = "0";
  close.style.opacity = "0";
  nodes.forEach((n, i) => (n.style.opacity = i <= from ? "1" : "0"));
  labels.forEach((l, i) => (l.style.opacity = i === 0 ? "1" : "0"));

  const legs = stops.length - 1 - from;
  const freshDrop = freshIndex > 0;
  const drawMs = freshDrop ? 380 : Math.min(1800, Math.max(700, 260 + 170 * legs));
  const dropMs = freshDrop ? 480 : 0;

  // A pin you just sent drops in first, then the route reaches out to it.
  if (freshDrop) {
    const pin = nodes[freshIndex];
    pin.style.opacity = "1";
    pin.querySelector("[data-mark]")?.animate(
      [
        { transform: "translateY(-26px)", opacity: 0 },
        { transform: "translateY(0)", opacity: 1 },
      ],
      { duration: dropMs, easing: EASE_SIGNATURE, fill: "backwards" },
    );
  }

  trail.animate([{ strokeDashoffset: 1 - startF }, { strokeDashoffset: 0 }], {
    duration: drawMs,
    delay: dropMs,
    easing: `cubic-bezier(${EASE_MOVE.join(",")})`,
    fill: "forwards",
  });

  // Each stop appears as the pen reaches it.
  for (let i = from + 1; i < nodes.length; i++) {
    if (freshDrop && i === freshIndex) continue;
    const at = (fractions[i] - startF) / Math.max(0.0001, 1 - startF);
    const delay = dropMs + drawMs * timeAt(at);
    nodes[i].style.opacity = "1";
    nodes[i].querySelector("[data-mark]")?.animate(
      [
        { opacity: 0, transform: "scale(0.4)" },
        { opacity: 1, transform: "scale(1)" },
      ],
      { duration: 220, delay, easing: EASE_OUT, fill: "backwards" },
    );
  }
  const end = dropMs + drawMs;
  labels.slice(1).forEach((l) => fadeIn(l, end - 60, 220));
  fadeIn(cone, end + 80, 480);
  if (found) {
    close.style.opacity = "1";
    close.style.strokeDasharray = "1 1";
    close.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], {
      duration: 640,
      delay: end + 120,
      easing: EASE_OUT,
      fill: "both",
    });
  }
  return newCount;
}

function showAll(trail: SVGElement, close: SVGElement, nodes: SVGElement[], labels: SVGElement[], cone: SVGElement, found: boolean) {
  trail.style.strokeDasharray = "";
  trail.style.strokeDashoffset = "";
  close.style.opacity = found ? "1" : "0";
  cone.style.opacity = "1";
  for (const n of [...nodes, ...labels]) n.style.opacity = "1";
}

function fadeIn(node: SVGElement, delay: number, duration: number) {
  node.style.opacity = "1";
  node.animate([{ opacity: 0 }, { opacity: 1 }], { duration, delay, easing: EASE_OUT, fill: "backwards" });
}

/* ---------- geometry ---------- */

function boundsOf(stops: Stop[], cone: Ring | null): [[number, number], [number, number]] {
  const xs = [...stops.map((s) => s.lng), ...(cone ?? []).map((c) => c[0])];
  const ys = [...stops.map((s) => s.lat), ...(cone ?? []).map((c) => c[1])];
  const pad = 0.002;
  return [
    [Math.min(...xs) - pad, Math.min(...ys) - pad],
    [Math.max(...xs) + pad, Math.max(...ys) + pad],
  ];
}

/** Web Mercator fitted to the box, used until (or unless) MapLibre takes over. */
function fallbackProjection(container: HTMLElement, stops: Stop[], cone: Ring | null): Project {
  const [[w, s], [e, n]] = boundsOf(stops, cone);
  const merc = (lat: number) => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
  const W = container.clientWidth || 600;
  const H = container.clientHeight || 400;
  const pad = 56;
  const spanX = ((e - w) * Math.PI) / 180;
  const spanY = merc(n) - merc(s);
  const k = Math.min((W - 2 * pad) / spanX, (H - 2 * pad) / spanY);
  const cx = ((w + e) / 2) * (Math.PI / 180);
  const cy = (merc(n) + merc(s)) / 2;
  return (lng, lat) => [W / 2 + ((lng * Math.PI) / 180 - cx) * k, H / 2 - (merc(lat) - cy) * k];
}

/** A Catmull-Rom curve through every stop: smooth like a pen, and it still passes through each point. */
function smoothPath(p: [number, number][]): string {
  if (p.length < 2) return "";
  let d = `M${f(p[0][0])} ${f(p[0][1])}`;
  for (let i = 0; i < p.length - 1; i++) {
    const p0 = p[i - 1] ?? p[i];
    const p1 = p[i];
    const p2 = p[i + 1];
    const p3 = p[i + 2] ?? p2;
    const t = 0.18;
    d += ` C${f(p1[0] + (p2[0] - p0[0]) * t)} ${f(p1[1] + (p2[1] - p0[1]) * t)} ${f(p2[0] - (p3[0] - p1[0]) * t)} ${f(p2[1] - (p3[1] - p1[1]) * t)} ${f(p2[0])} ${f(p2[1])}`;
  }
  return d;
}

/** The closing stroke: a gentle arc from the last sighting back home. */
function closingPath(a: [number, number], b: [number, number]): string {
  const mx = (a[0] + b[0]) / 2;
  const my = (a[1] + b[1]) / 2;
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const bulge = 0.22;
  return `M${f(a[0])} ${f(a[1])} Q${f(mx - dy * bulge)} ${f(my + dx * bulge)} ${f(b[0])} ${f(b[1])}`;
}

function ringPath(p: [number, number][]): string {
  return p.length ? `M${p.map(([x, y]) => `${f(x)} ${f(y)}`).join(" L")} Z` : "";
}

/** Share of the total straight-line length reached at each point. */
function cumulative(p: [number, number][]): number[] {
  const out = [0];
  let total = 0;
  for (let i = 1; i < p.length; i++) {
    total += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]);
    out.push(total);
  }
  return out.map((v) => (total ? v / total : 1));
}

/** Inverse of the draw easing: at what share of the time has the pen covered `share` of the line. */
function timeAt(share: number): number {
  const [x1, y1, x2, y2] = EASE_MOVE;
  const bez = (t: number, a: number, b: number) => 3 * a * t * (1 - t) ** 2 + 3 * b * t * t * (1 - t) + t ** 3;
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    if (bez(mid, y1, y2) < share) lo = mid;
    else hi = mid;
  }
  return bez((lo + hi) / 2, x1, x2);
}

function translateOf(n: Element): [number, number] {
  const m = /translate\(([-\d.]+) ([-\d.]+)\)/.exec(n.getAttribute("transform") ?? "");
  return m ? [Number(m[1]), Number(m[2])] : [0, 0];
}

const f = (n: number) => n.toFixed(1);

function part(svg: SVGSVGElement, name: string) {
  return svg.querySelector(`[data-part="${name}"]`) as SVGElement;
}

function el(tag: string, attrs: Record<string, string>) {
  const node = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  return node;
}

/* ---------- "since you last looked" ---------- */

const key = (slug: string) => `comehome:seen:${slug}`;

function readMark(slug: string): string | null {
  try {
    return localStorage.getItem(key(slug));
  } catch {
    return null;
  }
}

function writeMark(slug: string, t: number) {
  try {
    localStorage.setItem(key(slug), String(t));
  } catch {}
}

// The previous mark, kept for this tab so the list can flag the same rows the map drew.
function sessionMarkSet(slug: string, t: number) {
  try {
    sessionStorage.setItem(key(slug), String(t));
  } catch {}
}

function sessionMark(slug: string): string | null {
  try {
    return sessionStorage.getItem(key(slug));
  } catch {
    return null;
  }
}
