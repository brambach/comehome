# comehome plan

One shareable page per lost pet around Tahoe and Truckee: last-known point, photos, public sightings drawn as a movement corridor, a QR flyer. Owners get a secret edit link; strangers report a sighting in under 30 seconds with no account.

## Decisions

- **Next.js 16 App Router, plain CSS.** Server-rendered public pages; client JS only for the map and the sighting form. `cacheComponents` is off: every pet page reads live data per request.
- **Postgres via Drizzle + postgres-js.** Local Postgres 16 in dev; `DATABASE_URL` points at Neon or Supabase later. Migrations with drizzle-kit, checked in.
- **No accounts.** Each pet has a random 24-byte `editToken`; only its SHA-256 hash is stored. The edit link is `/p/[slug]/edit?t=...`. Owner actions compare hashes in constant time.
- **Privacy at the query layer.** `src/lib/public.ts` is the only module public pages read from, and it selects explicit columns that exclude `ownerEmail`, `reporterContact`, and `editTokenHash`. A test checks that.
- **Uploads.** Every image goes through `stripExif` (sharp: auto-orient, re-encode to JPEG, no metadata, max 1600px) before reaching the `Storage` adapter (disk under `.data/uploads` in dev, Vercel Blob in prod).
- **Email.** `Mailer` adapter: console in dev and tests (with an in-memory outbox for assertions), Resend in prod.
- **Abuse.** Honeypot field, plus a Postgres-backed fixed-window rate limit keyed by a hashed IP. No external services needed.
- **Corridor.** `corridor(sightings)` is a pure function returning a GeoJSON FeatureCollection: the last-known point, sighting points with an `age` ramp (0 = oldest, 1 = newest), a time-ordered LineString, and a hull (convex hull buffered by 300 m, or a buffered point or line when there are fewer than 3 points). Hidden sightings are excluded.
- **Map.** MapLibre GL + OpenFreeMap `liberty` style, loaded only on pages that need it.
- **Flyer.** `@react-pdf/renderer`, letter size, QR code from `qrcode` as a PNG data URL. Served from `/p/[slug]/flyer.pdf`.
- **OG image.** `opengraph-image.tsx` per pet via `next/og`, using the first photo.
- **Fonts.** `@fontsource/instrument-serif` (display) and `@fontsource/instrument-sans` (UI), per the shared tokens (Fraunces and Hanken Grotesk until 18 Oct, see `docs/DESIGN.md`); the .woff files are reused for the OG image and the PDF.

## File layout

```
src/
  app/
    page.tsx                  landing + "Create a page"
    new/                      create form + server action
    p/[slug]/
      page.tsx                public page
      opengraph-image.tsx     OG image
      flyer.pdf/route.ts      PDF
      edit/                   owner page (token-gated): hide sightings, mark found
      sightings/route.ts      POST sighting (multipart)
    uploads/[...key]/route.ts dev-only disk storage reader
  components/                 Map (client), SightingForm (client), small server components
  lib/
    db/ (schema.ts, index.ts) Drizzle
    corridor.ts               pure GeoJSON corridor
    exif.ts                   stripExif
    storage/ mail/            adapters
    tokens.ts ratelimit.ts slug.ts validate.ts public.ts flyer.tsx
drizzle/                      migrations
scripts/seed.ts
tests/unit/ tests/e2e/
docs/ (INTERVIEWS.md, screenshots/, flyer-sample.pdf)
```

## Milestones

| | Scope | Check |
|---|---|---|
| M0 | Scaffold, CLAUDE.md, SessionStart hook, lint/test/build wiring, design tokens | `pnpm lint && pnpm test && pnpm build`; `docs/screenshots/m0.png` at 390px |
| M1 | Schema, create flow, public page, edit link | e2e creates a pet and opens it; mobile + desktop screenshots |
| M2 | Sighting form, uploads, stripExif, honeypot, rate limit | unit test proves GPS EXIF is gone; e2e submits a sighting with ≤4 required inputs |
| M3 | Map, corridor, hide reports | corridor unit tests (0, 1, 2, 8 points, out of order, hidden); screenshot of a seeded 8-sighting pet |
| M4 | Flyer PDF, OG image | test renders the PDF, rasterizes it, decodes the QR to the page URL; `docs/flyer-sample.pdf` |
| M5 | Owner email on sighting, mark found | adapter test asserts recipient and content; e2e shows the banner |
| M6 | Seed script, README, axe | build passes; axe finds no serious issues |

## Risks

- **OpenFreeMap tiles in headless tests.** If tiles fail, screenshots show an empty map; e2e must not depend on tiles. Map screenshots wait for the style to load and fall back gracefully.
- **Next 16 changes.** Async `params` everywhere, `proxy` instead of `middleware`, ESLint CLI instead of `next lint`. Follow the bundled docs in `node_modules/next/dist/docs`.
- **sharp on Vercel.** Fine on the Node runtime; every route that touches images pins `runtime = "nodejs"`.
- **Rate limit by IP behind proxies.** Uses `x-forwarded-for` first hop; good enough for an MVP, noted in README.
- **Playwright browser version.** The container ships Chromium 1194; config points at `/opt/pw-browsers` and never downloads.

## The network (Oct 30)

The page was step one. The product is a town's lost-pet network: get the right neighbors looking in the first hour, and turn what they see into a direction.

- **Neighbor alerts** (`src/lib/neighbors.ts`). Neighbors sign up at `/neighbors` with a pin and a radius (half a mile, 1 or 2 miles), confirm from an email, and get one alert when a pet goes missing inside their radius. A sighting inside someone's radius alerts them too, at most once per pet per 12 hours. Three alerts a day per person, whatever happens. Everyone who was alerted hears when the pet is home. Stop links are HMAC-signed, so one tap stops them and nobody can stop someone else. Public pages only ever see a count.
- **Text a sighting** (`src/lib/textReports.ts`, `/api/sms`). Twilio posts incoming texts; the signature is checked. A text has no location, so the photo is stored (through `stripExif`) and the reply links to `/r/[token]`, where they drop the pin with the photo attached. The flyer prints the number and the pet's code (`JUNI42`) when `TEXT_NUMBER_DISPLAY` is set.
- **Likely heading** (`src/lib/heading.ts`). A cone from the newest sighting, pointing along the weighted circular mean of the last few legs. Hidden when the legs disagree, when there are fewer than two real legs, or when the trail is 48 hours cold. It knows nothing about roads, water or hills, and the page says so.
- **Dusk** (`src/lib/sun.ts`). Tonight's sunset (or tomorrow's sunrise), because that's when scared pets move.
- **Shelters and vets** (`/lost`, `/feed.json`, `/feed.xml`). Every open page, newest activity first. Locations rounded to about 100 m.
- **Flyer scans.** The QR code opens the page with `?f=1`, which bumps a counter. Nothing else is stored.

## Design: the flyer comes alive

- **The map is one ink on paper** (`src/components/inkStyle.ts`): OpenFreeMap vector tiles drawn as an engraving, with a hatched lake, double-line roads and stippled woods. No tile colors compete with the pet's photo.
- **The trail is SVG over the map** (`src/components/CorridorMap.tsx`), projected through MapLibre on every move. It keeps working on bare paper if tiles never load.
- **Motion the product causes, played once:** the pen draws the trail when it scrolls into view; on a return visit only what's new draws (remembered per pet in localStorage); a sighting you just sent drops in with the one overshoot and the route reaches out to it; marking found closes the route with one stroke in the done color. Reduced motion shows the finished drawing.

## Live demo

`DEMO=1` swaps Postgres for PGlite (Postgres compiled to WASM) in memory. `src/instrumentation.ts` migrates and seeds it on every cold start with `src/lib/demo/seed.ts`: Juniper lost by Burnt Cedar Beach with 8 sightings drifting east, Pepper in Kings Beach, Mochi already home, and 41 made-up neighbors. Uploads stay in memory (`STORAGE_DRIVER=memory`) and mail goes to the console. A band at the top says it's a demo.

## Out of scope

See the non-goals in the brief and the "Pending interviews" list in `docs/INTERVIEWS.md`.
