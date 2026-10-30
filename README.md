<div align="center">

# comehome

**A lost-pet network for Lake Tahoe. When a pet goes missing, the neighbors nearby hear in minutes, every sighting draws onto one trail, and the owner sees where to look at dusk.**

[Live demo](https://comehome-bryce-rambachs-projects.vercel.app/p/juniper-demo) · [Why I built it](#why-i-built-it) · [What's in it](#whats-in-it) · [Run it](#run-it-locally) · [Deploy](#deploy-to-vercel) · [Privacy](#privacy)

</div>

<p align="center">
  <img src="docs/readme/hero.jpg" alt="The comehome home page, Bring them home, next to Juniper's public page on a phone with the I saw this pet button" width="100%">
</p>

<p align="center">
  <img src="docs/readme/trail.jpg" alt="Juniper's sightings drawn as a corridor along Donner Lake toward Truckee, next to the printable flyer with a QR code" width="100%">
</p>

<p align="center"><sub>Screenshots use the demo pets from <code>pnpm seed</code>. Their photos are CC0 from Wikimedia Commons.</sub></p>

The owner makes a page: a pin, a photo, a time. Neighbors who signed up for alerts near that pin get one text or email right away. Anyone who sees the pet taps "I saw this pet" (or texts a photo to one number) and drops a pin, no account. Each sighting extends the trail on an ink map, and once the sightings agree on a direction, the page shows a careful guess at where the pet is heading and when the sun sets tonight.

It starts in Incline Village and the North Shore (Crystal Bay, Kings Beach, Tahoe Vista), and pages work anywhere around Lake Tahoe and Truckee.

> **Status.** Built and tested end to end, with a [live demo](https://comehome-bryce-rambachs-projects.vercel.app/p/juniper-demo) running on an in-memory database with made-up pets. The real thing needs a Postgres, an email sender and a Twilio number ([Deploy to Vercel](#deploy-to-vercel)), and owner interviews come next ([`docs/INTERVIEWS.md`](docs/INTERVIEWS.md)).

## Why I built it

Boots is my family's cat, a black-and-white tuxedo. She went missing in Incline Village for 51 days.

My parents put up flyers and went door to door, and she did come home. Making a page was never the hard part. Getting the right neighbors looking, fast, and turning what they saw into a direction was. comehome does the knocking for the next family.

## What's in it

- **Neighbor alerts** (`/neighbors`): drop a pin on your street, pick half a mile, 1 or 2 miles, confirm from an email. You get one alert when a pet goes missing inside that radius, another if it's later seen near you (at most every 12 hours per pet), never more than three a day, and one when it's home. Owners see how many neighbors were alerted; nobody sees where anyone lives.
- **Text a sighting**: text a photo, and the flyer's code if you have it, to the comehome number. The reply is a link where you drop the pin with the photo already attached. Your number only reaches the owner.
- **Create** (`/new`): name, species, 1 to 3 photos, description, last-known point, time, owner email, and whether to alert neighbors (on by default). No accounts: the owner gets a private edit link on screen and by email.
- **Public page** (`/p/[slug]`): it reads like the flyer came alive. Photo as a print, a huge name, "I saw this pet", then the trail drawn in ink over an engraved map. The trail draws itself once; on a return visit only the new sightings draw in, and the list marks them. Under it: the likely heading, labeled as a guess, and tonight's sunset.
- **Report** (`/p/[slug]/seen`): tap the map or use your location; time defaults to now; everything else is optional. After sending you land back on the page and watch your pin drop onto the trail.
- **Found**: the owner can add a few lines on how they came home. The page turns into that story ("Missing 28 hours. 3 sightings from neighbors, across 0.8 mi.") and the route closes with one stroke. Everyone who was alerted hears.
- **Flyer** (`/p/[slug]/flyer.pdf`): letter-size PDF with the photo, a huge name, a QR code (scans are counted) and the text option. See [`docs/flyer-sample.pdf`](docs/flyer-sample.pdf).
- **Town board and feeds** (`/lost`, `/feed.xml`, `/feed.json`): every open page, newest activity first, for neighbors and for shelters, vets and rescue groups.

Out of scope for now: accounts, payments, trackers, AI matching, native apps, an admin dashboard, auto-posting to Facebook, and anywhere outside Tahoe.

## Stack

Next.js 16 (App Router, TypeScript, pnpm) · Postgres via Drizzle (postgres-js), or PGlite in memory for the demo · MapLibre GL with OpenFreeMap vector tiles and a hand-written ink style · Turf for the corridor · Twilio's REST API for texts, no SDK · @react-pdf/renderer and qrcode for the flyer · sharp for EXIF stripping · Vercel Blob and Resend behind adapters · Vitest and Playwright · Instrument Serif and Instrument Sans via @fontsource · my shared design tokens, vendored in `vendor/design-tokens`.

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
pnpm seed                         # Juniper (8 sightings), Pepper, Mochi (home) and 41 demo neighbors
pnpm dev                          # http://localhost:3000/p/juniper-demo
```

In dev, uploads go to `.data/uploads`, and emails and texts print to the terminal.

Or skip Postgres entirely and run the demo the way it's hosted: `DEMO=1 STORAGE_DRIVER=memory pnpm dev`.

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
| `ALERT_SECRET` | yes in prod | `change-me` | Signs the one-tap stop links in neighbor alerts. |
| `SMS_DRIVER` | no | unset | `twilio` sends real texts; unset logs them. |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM` | with `twilio` | | The comehome number. Point its incoming-message webhook at `https://<site>/api/sms`. Requests without a valid Twilio signature get a 403. |
| `TEXT_NUMBER_DISPLAY` | no | | How the number prints on flyers and pages, e.g. `(775) 555-0142`. Leave empty to hide the text option. |
| `DEMO` | no | unset | `1` runs on an in-memory PGlite seeded with demo pets on every cold start. Pair with `STORAGE_DRIVER=memory`. |
| `TEST_DATABASE_URL` | for tests | `.../comehome_test` | Unit tests never touch `DATABASE_URL`. |

No secrets are committed; `.env` is gitignored.

## Deploy to Vercel

The Vercel project `comehome` is connected to this repo and runs the demo (`DEMO=1`, `STORAGE_DRIVER=memory`, `MAIL_DRIVER=console`). To run it for real:

1. **Import the repo** into Vercel. The framework preset is Next.js; pnpm is detected from `packageManager`.
2. **Database.** Create a Neon (Vercel Marketplace) or Supabase Postgres and set `DATABASE_URL` to its pooled URL for Production and Preview.
3. **Migrations.** Run them once from your machine with `DATABASE_URL="<prod url>" pnpm db:migrate`, and again whenever `drizzle/` changes. Or, to migrate on every deploy, set the Build Command to `pnpm db:migrate && pnpm build` (simple, but a bad migration then fails the deploy).
4. **Photos.** In Storage, create a Blob store and connect it to the project, which sets `BLOB_READ_WRITE_TOKEN`. Then set `STORAGE_DRIVER=blob`. `next.config.ts` already allows `*.public.blob.vercel-storage.com` images.
5. **Email.** Verify a sending domain in Resend, then set `MAIL_DRIVER=resend`, `RESEND_API_KEY` and `MAIL_FROM`.
6. **Texts.** Buy a Twilio number, register it for A2P 10DLC (US carriers require it for app texts), set the `TWILIO_*` variables, `SMS_DRIVER=twilio` and `TEXT_NUMBER_DISPLAY`, and point the number's webhook at `/api/sms`.
7. **The rest.** Set `SITE_URL` (for example `https://comehome.brycerambach.com`), `RATE_LIMIT_SALT` and `ALERT_SECRET`, and remove `DEMO` and `STORAGE_DRIVER=memory`.
8. **Deploy**, then on the production URL make a test page, report a sighting from your phone, and check the email arrives and the Facebook preview shows the photo (Facebook's Sharing Debugger re-scrapes it).

Things to know:
- Routes that touch images, PDFs or the database pin `runtime = "nodejs"` (sharp and react-pdf need Node).
- `pnpm install` runs `scripts/copy-maplibre-worker.mjs`, which copies MapLibre's web worker to `public/vendor/`. If the map is blank and the console says "Worker failed to load", that step didn't run.
- The rate limit keys on the first `x-forwarded-for` hop. Vercel sets that header itself; behind another proxy, make sure it can't be spoofed by clients.

## Privacy

- Public pages read only through `src/lib/public.ts`, which names its columns: no owner email, reporter contact, IP hash or token hash. `tests/unit/public.test.ts` checks this.
- The edit link holds a random token; only its SHA-256 hash is stored, and it's compared in constant time. The owner page is `noindex` and sends no referrer.
- Every upload goes through `stripExif` (`src/lib/exif.ts`), which auto-orients, then re-encodes to JPEG with no EXIF, XMP, IPTC or ICC. `tests/unit/exif.test.ts` proves GPS is gone.
- Reporter contact goes only to the owner (owner page and email). Sighting notes are public, and the form says so.
- Neighbors' pins and emails never leave `src/lib/neighbors.ts`. Public pages get one number, how many were alerted, and the signup page shows only a network-wide total, so nobody can probe a street to find who lives there. Stop links are HMAC-signed.
- A texter's number goes to the owner like any reporter contact. Twilio media is only fetched from `api.twilio.com`, and texted photos go through `stripExif` too.
- The shelter feeds round locations to about 100 m and carry no contact details.

## Layout

```
src/app/            pages and routes (/, /new, /p/[slug], seen, edit, flyer.pdf, opengraph-image, /neighbors, /r/[token], /lost, feeds, api/)
src/components/     CorridorMap (the ink trail), inkStyle (the map), PointPicker, NeighborForm, OpenPets, forms
src/lib/            neighbors, textReports, heading, sun, story, corridor, exif, storage/, mail/, sms/, notify, public, pets, demo/, db/
src/instrumentation.ts  seeds the in-memory demo database on boot
drizzle/            SQL migrations
scripts/            seed, migrate, screenshot, copy-maplibre-worker
tests/unit/         Vitest (alerts rules, text reports, Twilio signatures, heading, sun, corridor, exif, flyer QR, mail, privacy)
tests/e2e/          Playwright (create, sighting and pin drop, hide, found story, share, neighbors, texts, feeds, a11y)
docs/               DESIGN.md, INTERVIEWS.md, screenshots/, flyer-sample.pdf
```

## Credits

- Map tiles: [OpenFreeMap](https://openfreemap.org) (free, no key; attribution shown on the map) · © OpenMapTiles · data © OpenStreetMap contributors.
- Fonts: Instrument Serif, Instrument Sans and JetBrains Mono, SIL Open Font License, via @fontsource. Copies of the first two for the OG image and flyer are in `assets/fonts/`.
- Test and demo photos: CC0 from Wikimedia Commons (`tests/fixtures/README.md`).
- Studied for patterns, no code copied: Turf (MIT), MapLibre GL JS (BSD-3-Clause), react-pdf (MIT), node-qrcode (MIT), rubyforgood/homeward-tails (MIT). Notes in `docs/DESIGN.md`.
