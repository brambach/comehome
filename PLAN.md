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
- **Fonts.** `@fontsource/fraunces` (display) and `@fontsource/hanken-grotesk` (UI); the .woff files are reused for the OG image and the PDF.

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

## Out of scope

See the non-goals in the brief and the "Pending interviews" list in `docs/INTERVIEWS.md`. Nothing is built for neighbor alerts.
