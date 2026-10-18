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

## M5: owner email, mark found

- Each sighting emails the owner through the `Mailer` adapter (console in dev, Resend in prod) with the time in Tahoe time, the coordinates plus an OpenStreetMap link, the note, the reporter's contact (private to the owner) or a line saying there's none, a photo link, and the page link. User text is HTML-escaped. It's sent with `after()`, so the reporter's response doesn't wait on email.
- The create flow also emails the owner their private edit link.
- Mark found on the owner page: the public page shows a green "is home" banner, "I saw this pet" disappears, `/seen` says the form is closed, and the API refuses new sightings with a 400. "Reopen the search" reverses it.
- Also fixed: the owner page's Hide/Show buttons were squeezed to one letter per line on phones, and single-point maps now stop at zoom 14 so you can see the neighbourhood.

```
$ pnpm test
 ✓ tests/unit/mail.test.ts (5 tests)
   - goes to the owner with the time, place, note, private contact and page link
       to: juniper-owner@example.com · subject: "New sighting: Juniper" · contact, OSM link, page URL in body · <b> escaped in HTML
   - says so when the reporter left no contact
   - carries the share link and the private edit link
   - resend adapter sends the same message through Resend with the configured sender
   - throws when Resend rejects the message
      Tests  27 passed (27)

$ pnpm exec playwright test
[3/9] found.spec.ts › marking found shows the banner and closes the form
  9 passed (27.0s)
```

Screenshots: `docs/screenshots/m5-found-mobile.png`, `docs/screenshots/m5-owner-mobile.png`

## M6: seed, README, accessibility

- `pnpm seed` makes "Juniper": lost near Donner Lake 28 hours ago, 8 sightings drifting into downtown Truckee, and 1 prank report in South Lake that the owner has hidden. It prints the public and edit links and replaces itself on re-run.
- `README.md` covers local setup, every env var, Vercel deploy steps (Neon/Supabase, migrations, Blob, Resend), privacy, layout and credits.
- Axe (`@axe-core/playwright`) on `/`, `/new`, the public page, the report page and the owner page: no serious or critical issues. The MapLibre canvas is excluded because the same data is listed as text.
- Weight: MapLibre (~1 MB) now loads only when the map comes within 200px of the viewport. A test holds the first view under 550 KB of uncompressed JS (measured at 472 KB, which is the Next and React runtime plus our two small components).
- Fixed on the way: `next/image` now allows Vercel Blob hosts. Without this, production photos would have failed. The e2e helper gives each simulated owner its own forwarded IP, because a full run makes more than 10 pages and correctly hit the per-IP limit.
- The SessionStart hook runs `pnpm install` when `CLAUDE_CODE_REMOTE=true` (exit 0) and does nothing locally.

```
$ pnpm lint && pnpm test && pnpm build      # exit 0
✓ Types generated successfully
 Test Files  6 passed (6)
      Tests  27 passed (27)
✓ Compiled successfully
┌ ○ /                         ├ ƒ /p/[slug]
├ ƒ /api/pets                 ├ ƒ /p/[slug]/edit
├ ƒ /api/pets/[slug]/sightings├ ƒ /p/[slug]/flyer.pdf
├ ○ /new                      ├ ƒ /p/[slug]/opengraph-image
                              ├ ƒ /p/[slug]/seen
                              └ ƒ /uploads/[...key]

$ pnpm exec playwright test
axe serious/critical: {"/":[],"/new":[],"/p/pickles-zvmm":[],"/p/pickles-zvmm/seen":[],"/p/pickles-zvmm/edit":[]}
public page JS, uncompressed: 472 KB before the map, 1513 KB once it loads
  11 passed (27.3s)
```

## Summary

**Built:** everything in the MVP list. That covers create, the public page with OG image, the sighting form with EXIF stripping, honeypot and rate limit, the corridor map with hide, the QR flyer, owner emails, mark found, the seed and the README. There are 27 unit tests and 11 e2e tests.

**Stubbed or local-only:** storage is disk and email is console in dev. The Blob and Resend adapters are written, and Resend is unit-tested with a mocked client, but neither has run against the real services. `docs/flyer-sample.pdf` points its QR at the placeholder `comehome.example`. Nothing was deployed. No hosts were blocked. Wikimedia Commons returned one 429 while fetching the CC0 photos, and the retry worked.

**Needed from Bryce:** a Postgres (Neon or Supabase) `DATABASE_URL`, a Vercel Blob store, a Resend key with a verified sender domain, the production `SITE_URL` and a `RATE_LIMIT_SALT`. Then run `pnpm db:migrate` once against prod (see README). Interview notes go in `docs/INTERVIEWS.md`.

## Design-taste pass (17 Oct)

Checked against `brambach/design-taste` (`APPLY.md`, `built/arro.md`). Fixes and the open font question are in `docs/DESIGN.md`; the four type options are in `docs/mockups/type-options.png`. CLAUDE.md now points at the taste repo.

```
$ pnpm lint && pnpm test && pnpm build   # exit 0
      Tests  27 passed (27)
$ pnpm exec playwright test
  11 passed (31.1s)
```

Screenshot at Bryce's preview size: `docs/screenshots/taste-pass-1052.png` (1052x854, 2x)

## Shared design tokens and type (18 Oct)

comehome now uses `@brambach/design-tokens` from design-taste commit `e8404234`, vendored in `vendor/design-tokens` with the `tokens.css` and `themes/warm-paper.css` layers. The ~33 hand-copied variables in `globals.css` are down to four project values. Type is option C: Instrument Serif at one weight, Instrument Sans, and JetBrains Mono as the mono token. The OG image and flyer use the same faces. Fraunces, Hanken Grotesk and their @fontsource packages are removed. Details and the name mapping are in `docs/DESIGN.md`.

- `pnpm build` runs `sync.sh --check` first. Appending a byte to `tokens.css`, or adding a file to the folder, fails the build (checked both).
- The flyer's "LOST DOG" letter-spacing went from 4 to 1.5pt. At 4pt with Instrument Sans, `pdftotext` read it as "LO S T D O G", and the flyer test caught it.
- First-view JS is unchanged at 472 KB. The map reads `--primary` from computed style instead of importing `tokens.json`.

```
$ pnpm lint && pnpm test                    # exit 0
✓ Types generated successfully
 Test Files  6 passed (6)
      Tests  27 passed (27)
$ pnpm e2e                                  # build + playwright, exit 0
design-tokens: vendor/design-tokens matches e8404234a6e8570c4c79002aca256b1483e3e95e (e8404234a6e8)
✓ Compiled successfully
axe serious/critical: {"/":[],"/new":[],"/p/pickles-svrq":[],"/p/pickles-svrq/seen":[],"/p/pickles-svrq/edit":[]}
public page JS, uncompressed: 472 KB before the map, 1513 KB once it loads
  11 passed (19.6s)
```

Screenshots at 390px, 2x: `docs/screenshots/tokens-home-mobile.png`, `docs/screenshots/tokens-pet-mobile.png`

## Incline Village first, and Boots (18 Oct)

- **Incline Village leads.** The site title, description and home eyebrow lead with Incline Village. The home page says where comehome starts (Incline Village, Crystal Bay, Kings Beach, Tahoe Vista). The create map opens on Incline (OpenStreetMap place node 39.2548, -119.9538; Wikipedia gives 39.2458, -119.95) at zoom 11, which frames Crystal Bay to Tahoe Vista.
- **Per-pet labels follow the pet.** The pet page eyebrow, meta description, OG image, flyer and the owner's share hint say "Incline Village & North Shore" when the last-seen point is on the north shore (`areaName` in `src/lib/geo.ts`) and "Tahoe & Truckee" otherwise. `SERVICE_BOUNDS` is unchanged, so existing pets and the Donner Lake tests still work.
- **Why I built this.** A short home section about Boots, written only from the facts Bryce gave. The photo went through `stripExif` (1200x1600, 145 KB, no metadata). It's served with a `getImageProps` srcset as a plain `<img>`, so it adds no client JS; phones get a 27 KB WebP. `tests/unit/geo.test.ts` keeps metadata out of the committed file, and `tests/e2e/home.spec.ts` covers the copy, alt text, srcset and served size.

```
$ pnpm lint                                 # exit 0
✓ Types generated successfully
$ pnpm test                                 # exit 0
 Test Files  7 passed (7)
      Tests  30 passed (30)
$ pnpm e2e                                  # build + playwright, exit 0
design-tokens: vendor/design-tokens matches e8404234a6e8570c4c79002aca256b1483e3e95e (e8404234a6e8)
✓ Compiled successfully
axe serious/critical: {"/":[],"/new":[],"/p/pickles-fk6s":[],"/p/pickles-fk6s/seen":[],"/p/pickles-fk6s/edit":[]}
public page JS, uncompressed: 472 KB before the map, 1513 KB once it loads
  13 passed (22.8s)
```

Screenshots: `docs/screenshots/incline-home-mobile.png` (390px, 2x), `docs/screenshots/incline-home-desktop.png` (1280px, 2x)
