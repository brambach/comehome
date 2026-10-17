# comehome

When a pet goes missing around Lake Tahoe and Truckee, the owner makes one shareable page in about five minutes: the last-known point, a photo, public sightings drawn as a movement corridor instead of one pin, and a QR flyer to print. Strangers who land on it from a flyer or a Facebook group report a sighting in under 30 seconds, with no account.

![Juniper's page with 8 sightings](docs/screenshots/m3-corridor-mobile.png)

## What's in it

- **Create** (`/new`): name, species, 1 to 3 photos, description, last-known point on a map, time, owner email. No accounts: the owner gets a private edit link on screen and by email.
- **Public page** (`/p/[slug]`): photo, name, last seen, "I saw this pet", the corridor map with sightings listed as text, and an Open Graph image for Facebook and Nextdoor previews.
- **Report** (`/p/[slug]/seen`): tap the map or use your location; time defaults to now; photo, note and contact are optional. Honeypot plus a Postgres rate limit. Every upload is re-encoded with all EXIF removed.
- **Corridor**: a time-ordered path plus a buffered hull, older sightings faded. The owner can hide bad reports.
- **Flyer** (`/p/[slug]/flyer.pdf`): letter-size PDF with the photo, a huge name, a QR code and the short URL. See [`docs/flyer-sample.pdf`](docs/flyer-sample.pdf).
- **Owner email** on each new sighting, and **mark found**, which shows a banner and closes the form.

Out of scope for now: neighbor alerts (parked in [`docs/INTERVIEWS.md`](docs/INTERVIEWS.md)), accounts, payments, trackers, AI matching, native apps, an admin dashboard, and anywhere outside Tahoe.

## Stack

Next.js 16 (App Router, TypeScript, pnpm) · Postgres via Drizzle (postgres-js) · MapLibre GL with OpenFreeMap tiles · Turf for the corridor · @react-pdf/renderer and qrcode for the flyer · sharp for EXIF stripping · Vercel Blob and Resend behind adapters · Vitest and Playwright · Fraunces and Hanken Grotesk via @fontsource.

## Run it locally

Needs Node 22, pnpm 10 and Postgres 16.

```bash
pnpm install                      # also copies MapLibre's worker into public/vendor
cp .env.example .env              # defaults work against a local Postgres

# one-time database setup (adjust to your Postgres)
createuser -s comehome; psql -c "alter user comehome password 'comehome'"
createdb -O comehome comehome
createdb -O comehome comehome_test

pnpm db:migrate                   # apply drizzle/ migrations
pnpm seed                         # demo pet "Juniper" with 8 sightings; prints public + edit links
pnpm dev                          # http://localhost:3000/p/juniper-demo
```

In dev, uploads go to `.data/uploads` and emails print to the terminal.

## Commands

| Command | What it does |
|---|---|
| `pnpm dev` | Dev server on :3000 |
| `pnpm build` / `pnpm start` | Production build and server |
| `pnpm lint` | ESLint, then route type generation and `tsc --noEmit` |
| `pnpm test` | Vitest unit tests (uses `TEST_DATABASE_URL`, migrated automatically) |
| `pnpm e2e` | Build, then Playwright against `next start` on :3100 (uses `DATABASE_URL`) |
| `pnpm seed` | Replace the demo pet and print its links |
| `pnpm db:generate` | Generate a migration after editing `src/lib/db/schema.ts` |
| `pnpm db:migrate` | Apply migrations to `DATABASE_URL` |
| `pnpm screenshot <url> <out.png> [w] [h] [selector]` | Screenshot with the e2e browser |

## Environment variables

| Variable | Required | Dev default | Notes |
|---|---|---|---|
| `DATABASE_URL` | yes | `postgres://comehome:comehome@localhost:5432/comehome` | Neon or Supabase in prod. Use the pooled connection string; the client runs with `prepare: false` so PgBouncer is fine. |
| `SITE_URL` | yes in prod | `http://localhost:3000` | Public origin used in QR codes, emails and OG tags. Read at request time, so one build works on any domain. Falls back to `VERCEL_PROJECT_PRODUCTION_URL`. |
| `STORAGE_DRIVER` | no | `disk` | `disk` writes to `.data/uploads` (dev only: Vercel's filesystem is read-only). Set `blob` in prod. |
| `BLOB_READ_WRITE_TOKEN` | with `blob` | | Set by Vercel when you connect a Blob store. |
| `MAIL_DRIVER` | no | `console` | `console` logs emails. Set `resend` in prod. |
| `RESEND_API_KEY` | with `resend` | | From the Resend dashboard. |
| `MAIL_FROM` | with `resend` | `comehome <alerts@example.com>` | Must be on a domain verified in Resend. |
| `RATE_LIMIT_SALT` | yes in prod | `change-me` | Any long random string. IPs are stored only as salted hashes. |
| `TEST_DATABASE_URL` | for tests | `.../comehome_test` | Unit tests never touch `DATABASE_URL`. |

No secrets are committed; `.env` is gitignored.

## Deploy to Vercel

1. **Import the repo** into Vercel. The framework preset is Next.js; pnpm is detected from `packageManager`.
2. **Database.** Create a Neon (Vercel Marketplace) or Supabase Postgres and set `DATABASE_URL` to its pooled URL for Production and Preview.
3. **Migrations.** Run them once from your machine with `DATABASE_URL="<prod url>" pnpm db:migrate`, and again whenever `drizzle/` changes. Or, to migrate on every deploy, set the Build Command to `pnpm db:migrate && pnpm build` (simple, but a bad migration then fails the deploy).
4. **Photos.** In Storage, create a Blob store and connect it to the project, which sets `BLOB_READ_WRITE_TOKEN`. Then set `STORAGE_DRIVER=blob`. `next.config.ts` already allows `*.public.blob.vercel-storage.com` images.
5. **Email.** Verify a sending domain in Resend, then set `MAIL_DRIVER=resend`, `RESEND_API_KEY` and `MAIL_FROM`.
6. **The rest.** Set `SITE_URL` (for example `https://comehome.yourdomain.com`) and `RATE_LIMIT_SALT`.
7. **Deploy**, then on the production URL make a test page, report a sighting from your phone, and check the email arrives and the Facebook preview shows the photo (Facebook's Sharing Debugger re-scrapes it).

Things to know:
- Routes that touch images, PDFs or the database pin `runtime = "nodejs"` (sharp and react-pdf need Node).
- `pnpm install` runs `scripts/copy-maplibre-worker.mjs`, which copies MapLibre's web worker to `public/vendor/`. If the map is blank and the console says "Worker failed to load", that step didn't run.
- The rate limit keys on the first `x-forwarded-for` hop. Vercel sets that header itself; behind another proxy, make sure it can't be spoofed by clients.

## Privacy

- Public pages read only through `src/lib/public.ts`, which names its columns: no owner email, reporter contact, IP hash or token hash. `tests/unit/public.test.ts` checks this.
- The edit link holds a random token; only its SHA-256 hash is stored, and it's compared in constant time. The owner page is `noindex` and sends no referrer.
- Every upload goes through `stripExif` (`src/lib/exif.ts`), which auto-orients, then re-encodes to JPEG with no EXIF, XMP, IPTC or ICC. `tests/unit/exif.test.ts` proves GPS is gone.
- Reporter contact goes only to the owner (owner page and email). Sighting notes are public, and the form says so.

## Layout

```
src/app/            pages and routes (/, /new, /p/[slug], /p/[slug]/seen, /p/[slug]/edit, flyer.pdf, opengraph-image, api/)
src/components/     client components: PointPicker, PetMap, CreatePetForm, SightingForm, PhotoInput, CopyField
src/lib/            corridor, exif, storage/, mail/, notify, public, pets, ratelimit, validate, flyer, db/
drizzle/            SQL migrations
scripts/            seed, migrate, screenshot, copy-maplibre-worker
tests/unit/         Vitest (corridor, exif, flyer QR, mail, privacy)
tests/e2e/          Playwright (create, sighting, hide, found, share, a11y)
docs/               DESIGN.md, INTERVIEWS.md, screenshots/, flyer-sample.pdf
```

## Credits

- Map tiles: [OpenFreeMap](https://openfreemap.org) (free, no key; attribution shown on the map) · © OpenMapTiles · data © OpenStreetMap contributors.
- Fonts: Fraunces and Hanken Grotesk, SIL Open Font License (`assets/fonts/`).
- Test and demo photos: CC0 from Wikimedia Commons (`tests/fixtures/README.md`).
- Studied for patterns, no code copied: Turf (MIT), MapLibre GL JS (BSD-3-Clause), react-pdf (MIT), node-qrcode (MIT), rubyforgood/homeward-tails (MIT). Notes in `docs/DESIGN.md`.
