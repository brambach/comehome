# Progress

Evidence per milestone: the command, the tail of its output, and screenshot paths.

## Setup notes

- `brambach/comehome` didn't exist when the session started. Bryce created it empty; I pushed a one-line README to `main` as the PR base and work on `claude/comehome-mvp`.
- The repo had no `design/` folder. Bryce asked mid-session to use his other repos as reference, especially Dervo, so the tokens follow `brambach/dervo`, `brambach/dervo-website` and `brambach/portfolio-site`. See `docs/DESIGN.md`.
- Next 16.4 scaffold. `cacheComponents` is off: pet pages read live data on every request.

## M0: scaffold

```
$ pnpm lint && pnpm test && pnpm build
> eslint . && next typegen && tsc --noEmit
✓ Types generated successfully
 Test Files  1 passed (1)
      Tests  3 passed (3)
Route (app)
┌ ○ /
└ ○ /_not-found
```

Screenshot (390px): `docs/screenshots/m0.png`

## M1: create flow, public page, edit link

- `POST /api/pets` (multipart, honeypot, rate limit, zod) creates the pet; photos go through `saveImage` → `stripExif` → storage adapter.
- `/p/[slug]` is server-rendered: photo, name, last seen, the "I saw this pet" button, description. It reads only through `src/lib/public.ts`.
- `/p/[slug]/edit?t=…` is the owner page: token checked against a SHA-256 hash in constant time, `noindex`, `no-referrer`. Owner actions are server actions (hide/show sighting, mark found, edit details).
- The owner gets an email with the edit link on create (console mailer in dev).
- Photos for tests and the seed are three CC0 images from Wikimedia Commons (`tests/fixtures/README.md`).

```
$ pnpm test
 ✓ tests/unit/basics.test.ts (3 tests)
 ✓ tests/unit/public.test.ts (3 tests)   # public queries never return owner email, token hash, reporter contact; hidden sightings excluded
 Test Files  2 passed (2)
      Tests  6 passed (6)

$ pnpm exec playwright test
[1/2] [mobile] › tests/e2e/create.spec.ts › owner creates a pet page and opens it
[2/2] [mobile] › tests/e2e/create.spec.ts › the edit link works and a wrong token does not
  2 passed (5.4s)
```

Screenshots: `docs/screenshots/m1-pet-mobile.png`, `docs/screenshots/m1-pet-desktop.png`, `docs/screenshots/m1-new-mobile.png`

## M2: sightings and upload

- `/p/[slug]/seen` is the report page; the public page's "I saw this pet" is a plain link to it, so the share page carries no form JS.
- Required inputs: the location (tap the map or "Use my location") and the time, which is prefilled with now. That makes 2 required; photo, note and contact are optional. The e2e reporter does exactly one thing (share location) and taps send.
- `POST /api/pets/[slug]/sightings`: honeypot (silently accepted, nothing saved), Postgres fixed-window rate limit (6 per pet per IP per 10 min, 30 per IP per hour), service-area check, zod validation.
- Photos are shrunk in the browser (for one bar of signal and serverless body limits), then always re-encoded server-side by `stripExif`.

```
$ pnpm test
 ✓ tests/unit/exif.test.ts (3 tests)
   - removes GPS and all other EXIF   # fixture has GPS 39.3267N; after stripExif exifr.gps() is undefined, no EXIF/ICC/XMP
   - keeps the image upright when it drops the orientation tag
   - downsizes large photos and rejects non-images
 Test Files  3 passed (3)
      Tests  9 passed (9)

$ pnpm exec playwright test
[3/6] sighting.spec.ts › a stranger reports a sighting with at most 4 required inputs
[4/6] sighting.spec.ts › optional photo, note and contact reach the owner but not the public
[5/6] sighting.spec.ts › honeypot submissions are dropped and floods are rate limited
[6/6] sighting.spec.ts › reports outside the Tahoe area are refused
  6 passed (13.7s)
```

Screenshot: `docs/screenshots/m2-seen-mobile.png`

## M3: map and corridor

- `corridor(sightings, { origin })` in `src/lib/corridor.ts` is pure and returns a GeoJSON FeatureCollection: the owner's last-known point, visible sightings in time order with an `age` ramp (0 oldest, 1 newest), the path between them, and a hull (convex hull buffered 300 m; a buffered point or line when there are fewer than 3 points or they're collinear). Hidden reports are dropped. It is computed on the server and passed to the client map as data.
- `PetMap` (MapLibre + OpenFreeMap `liberty`) draws hull, path, faded sighting dots and the origin ring, with cooperative gestures so phones can scroll past it. The same sightings are listed as text under the map for no-JS and screen readers.
- Owner hides a report from `/p/[slug]/edit`; it leaves the public list, the count and the corridor.
- Fixes found on the way: MapLibre v6 loads its web worker relative to its own module URL, which Turbopack doesn't copy. `scripts/copy-maplibre-worker.mjs` (postinstall) copies it to `public/vendor/`, and `setWorkerUrl` points at it. Turf had to be added to `serverExternalPackages` ("d is not a constructor" in the server bundle).
- OpenFreeMap terms, checked at https://openfreemap.org: the public instance is free with no keys, registration or view limits; attribution is required, and MapLibre adds it from the style (visible bottom right in the screenshots).

```
$ pnpm test
 ✓ tests/unit/corridor.test.ts (10 tests)
   0 points · 1 point · 2 points · 8 points · out-of-order input · ISO strings · hidden reports
   · origin starts the path · collinear points · input not mutated
 Test Files  4 passed (4)
      Tests  19 passed (19)

$ pnpm seed
Seeded Juniper with 8 sightings (+1 hidden).

$ pnpm exec playwright test
[3/7] hide.spec.ts › the owner hides a bad report and it leaves the public page
  7 passed (17.3s)
```

Screenshots of the seeded pet with 8 sightings: `docs/screenshots/m3-corridor-mobile.png`, `docs/screenshots/m3-corridor-desktop.png`

## M4: flyer and OG image

- `/p/[slug]/flyer.pdf`: letter-size PDF from `@react-pdf/renderer` (`src/lib/flyer.tsx`). It has the photo, the name as large as the line allows, last seen, description, a QR code from `qrcode`, and the short URL. Ink on white, because flyers get photocopied.
- `/p/[slug]/opengraph-image`: 1200×630 PNG via `next/og`, with the photo on the left, the name in Fraunces, last seen, and a "Seen them? Tap to report" pill. A found pet switches to a "home" version. `generateMetadata` sets the title to "Lost dog: Juniper" and adds the description.
- The fonts are vendored into `assets/fonts/` (OFL, licenses alongside) and traced via `outputFileTracingIncludes`, so the PDF and OG routes can read them on Vercel.
- `docs/flyer-sample.pdf` is the seeded Juniper rendered with `SITE_URL=https://comehome.example`, a placeholder until there's a real domain. The QR encodes `https://comehome.example/p/juniper-demo`.

```
$ pnpm test
 ✓ tests/unit/flyer.test.ts (3 tests)
   - renders a letter-size PDF whose QR code opens the pet page
       pdfinfo: Pages 1, 612 x 792 pts (letter); pdftoppm → jsQR decodes "https://comehome.test/p/juniper-k7q2"
   - stays on one page with the longest name and description
   - sizes long names down so they fit
      Tests  22 passed (22)

$ pnpm exec playwright test
[2/8] share.spec.ts › the page links a flyer PDF and advertises an OG image
  8 passed (24.0s)
```

Files: `docs/flyer-sample.pdf`, preview `docs/screenshots/m4-flyer.png`, OG image `docs/screenshots/m4-og.png`
