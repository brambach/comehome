// MapLibre v6 loads its web worker from a URL next to its own module, which
// bundlers don't copy. Serve it from public/ instead (see src/components/maplibre.ts).
import { copyFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const pkgDir = path.dirname(require.resolve("maplibre-gl/package.json"));
const out = path.join(process.cwd(), "public", "vendor");
mkdirSync(out, { recursive: true });
copyFileSync(path.join(pkgDir, "dist", "maplibre-gl-worker.mjs"), path.join(out, "maplibre-gl-worker.mjs"));
console.log("copied maplibre-gl-worker.mjs to public/vendor");
